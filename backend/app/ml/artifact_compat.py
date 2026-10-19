"""
Model-artifact / runtime compatibility checks.

scikit-learn pickles are only guaranteed to work with the version that wrote them;
loading under another version can raise, or worse, silently give different results.
Estimators are stamped with the scikit-learn version that pickled them, but the stamp is
consumed at load time. The only place it surfaces is sklearn's InconsistentVersionWarning
(attribute `original_sklearn_version`), which is raised on any difference. So: warning =>
read the artifact's version from it; no warning on an estimator => it matches the runtime.

Policy:
  verified          embedded version == runtime version             -> load
  patch_difference  same major.minor, different patch               -> load, flagged
  unknown           no version embedded and no sklearn warning      -> load, flagged "unverified"
  mismatch          different major.minor (or sklearn warned)       -> REFUSE (caller falls back to rules)
  mismatch_overridden  as mismatch but SURAKSHA_ALLOW_ARTIFACT_VERSION_MISMATCH is set -> load, flagged
  load_error        file missing/corrupt                            -> no model

Only load artifacts this project produced: joblib/pickle can execute code on load.
"""

import logging
import os
import platform
import warnings
from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy
import sklearn

logger = logging.getLogger(__name__)

OVERRIDE_ENV = "SURAKSHA_ALLOW_ARTIFACT_VERSION_MISMATCH"
_LOADABLE = {"verified", "patch_difference", "unknown", "mismatch_overridden"}


def runtime_versions() -> Dict[str, str]:
    """Versions that matter for reproducing or loading a trained artifact."""
    return {
        "python": platform.python_version(),
        "scikit-learn": sklearn.__version__,
        "joblib": joblib.__version__,
        "numpy": numpy.__version__,
    }


@dataclass
class ArtifactCompat:
    name: str
    status: str
    loaded: bool
    runtime_sklearn: str
    artifact_sklearn: Optional[str] = None
    manifest_sklearn: Optional[str] = None
    message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _major_minor(version: Optional[str]) -> Optional[Tuple[str, str]]:
    if not version:
        return None
    parts = str(version).split(".")
    return (parts[0], parts[1]) if len(parts) >= 2 else (parts[0], "0")


def _version_from_warnings(caught) -> Tuple[bool, Optional[str]]:
    """(sklearn warned about a version difference, original version if it could be read)."""
    try:
        from sklearn.exceptions import InconsistentVersionWarning
    except ImportError:  # very old scikit-learn: fall back to message sniffing
        hit = [w for w in caught if "version" in str(w.message).lower() and "sklearn" in str(w.message).lower()]
        return bool(hit), None
    for w in caught:
        if issubclass(w.category, InconsistentVersionWarning):
            return True, str(getattr(w.message, "original_sklearn_version", "") or "") or None
    return False, None


def _override_enabled() -> bool:
    return os.environ.get(OVERRIDE_ENV, "").strip().lower() in {"1", "true", "yes"}


def classify_versions(artifact: Optional[str], runtime: str, sklearn_warned: bool) -> str:
    """Pure policy function. `artifact` is the version that wrote the file, if known."""
    if artifact is None:
        return "mismatch" if sklearn_warned else "unknown"
    if artifact == runtime:
        return "verified"
    if _major_minor(artifact) == _major_minor(runtime):
        return "patch_difference"
    return "mismatch"


def load_artifact(path: Any, name: str, manifest: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Any], ArtifactCompat]:
    """
    Load a joblib artifact and judge its compatibility with the running scikit-learn.
    Returns (model_or_None, ArtifactCompat). Never raises.
    """
    runtime = sklearn.__version__
    manifest_version = ((manifest or {}).get("runtime_versions") or {}).get("scikit-learn")

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            model = joblib.load(path)
        except Exception as exc:
            compat = ArtifactCompat(name, "load_error", False, runtime, manifest_sklearn=manifest_version,
                                    message=f"Failed to load artifact: {exc}")
            logger.error("Model artifact '%s' not loaded: %s", name, exc)
            return None, compat

    sklearn_warned, artifact_version = _version_from_warnings(caught)
    if not sklearn_warned:
        from sklearn.base import BaseEstimator
        # No warning on a scikit-learn estimator means its stamp equals the runtime version.
        artifact_version = runtime if isinstance(model, BaseEstimator) else None
    status = classify_versions(artifact_version, runtime, sklearn_warned)

    if status == "mismatch" and _override_enabled():
        status = "mismatch_overridden"

    loaded = status in _LOADABLE
    messages = {
        "verified": f"Artifact built with scikit-learn {artifact_version}; matches runtime.",
        "patch_difference": f"Artifact built with scikit-learn {artifact_version}, runtime is {runtime} (same minor version).",
        "unknown": "Artifact does not record its scikit-learn version; compatibility is unverified.",
        "mismatch": (f"Artifact built with scikit-learn {artifact_version or 'unknown'}, runtime is {runtime}. "
                     f"Refusing to use it; retrain, or pin scikit-learn=={artifact_version}. "
                     f"Set {OVERRIDE_ENV}=1 to override at your own risk."),
        "mismatch_overridden": (f"Artifact built with scikit-learn {artifact_version or 'unknown'}, runtime is {runtime}; "
                                f"loaded anyway because {OVERRIDE_ENV} is set. Predictions are unverified."),
    }
    compat = ArtifactCompat(name, status, loaded, runtime, artifact_version, manifest_version, messages[status])

    if manifest_version and artifact_version and manifest_version != artifact_version:
        compat.message += f" (Manifest records {manifest_version}, which disagrees with the artifact.)"

    if status == "mismatch":
        logger.error("Model artifact '%s' rejected: %s", name, compat.message)
    elif status != "verified":
        logger.warning("Model artifact '%s': %s", name, compat.message)
    return (model if loaded else None), compat
