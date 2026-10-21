"""Model-artifact version-compatibility guard (tmp artifacts are tiny synthetic estimators)."""

import json
import re
import warnings
from pathlib import Path

import joblib
import pandas as pd
import pytest
import sklearn
import sklearn.base
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from backend.app.ml import artifact_compat
from backend.app.ml.artifact_compat import (
    OVERRIDE_ENV,
    classify_versions,
    load_artifact,
    runtime_versions,
)
from backend.app.ml.service import MLService
from backend.app.ml.url_pipeline import URL_MANIFEST_FILENAME, URL_MODEL_FILENAME, train_and_evaluate_url_model

REPO_ROOT = Path(__file__).resolve().parents[2]


def tiny_pipeline():
    return Pipeline([("t", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 3))),
                     ("c", LogisticRegression())]).fit(["good.com", "bad-login.xyz", "fine.org", "evil-pay.top"], [0, 1, 0, 1])


def dump_as_version(model, path, monkeypatch, version):
    """Pickle `model` as if it had been written by scikit-learn `version`."""
    with monkeypatch.context() as m:
        m.setattr(sklearn.base, "__version__", version)
        joblib.dump(model, path)


def bump_patch(version, delta=1):
    major, minor, patch = (re.match(r"(\d+)\.(\d+)\.(\d+)", version).groups())
    return f"{major}.{minor}.{int(patch) + delta}"


def test_current_artifact_is_verified(tmp_path):
    path = tmp_path / "m.joblib"
    joblib.dump(tiny_pipeline(), path)
    model, compat = load_artifact(path, "t")
    assert model is not None and compat.loaded
    assert compat.status == "verified"
    assert compat.artifact_sklearn == sklearn.__version__


def test_minor_version_mismatch_is_refused(tmp_path, monkeypatch):
    path = tmp_path / "old.joblib"
    dump_as_version(tiny_pipeline(), path, monkeypatch, "1.2.0")
    model, compat = load_artifact(path, "t")
    assert model is None and compat.loaded is False
    assert compat.status == "mismatch"
    assert compat.artifact_sklearn == "1.2.0" and compat.runtime_sklearn == sklearn.__version__
    assert "scikit-learn==1.2.0" in compat.message  # tells the operator what to pin


def test_override_env_loads_but_flags(tmp_path, monkeypatch):
    path = tmp_path / "old.joblib"
    dump_as_version(tiny_pipeline(), path, monkeypatch, "1.2.0")
    monkeypatch.setenv(OVERRIDE_ENV, "1")
    model, compat = load_artifact(path, "t")
    assert model is not None
    assert compat.status == "mismatch_overridden" and compat.loaded


def test_patch_difference_loads_but_is_flagged(tmp_path, monkeypatch):
    path = tmp_path / "patch.joblib"
    older = bump_patch(sklearn.__version__, 1)  # same major.minor, different patch
    dump_as_version(tiny_pipeline(), path, monkeypatch, older)
    model, compat = load_artifact(path, "t")
    assert model is not None and compat.loaded
    assert compat.status == "patch_difference" and compat.artifact_sklearn == older


def test_classify_versions_rules():
    assert classify_versions("1.9.1", "1.9.1", False) == "verified"
    assert classify_versions("1.9.0", "1.9.1", False) == "patch_difference"
    assert classify_versions("1.8.0", "1.9.1", False) == "mismatch"
    assert classify_versions("2.0.0", "1.9.1", False) == "mismatch"
    assert classify_versions(None, "1.9.1", False) == "unknown"
    assert classify_versions(None, "1.9.1", True) == "mismatch"
    assert classify_versions("1.9.0", "1.9.1", True) == "patch_difference"


def test_missing_or_corrupt_artifact_never_raises(tmp_path):
    model, compat = load_artifact(tmp_path / "absent.joblib", "t")
    assert model is None and compat.status == "load_error"
    bad = tmp_path / "bad.joblib"
    bad.write_bytes(b"not a pickle")
    model, compat = load_artifact(bad, "t")
    assert model is None and compat.status == "load_error"


def test_ml_service_refuses_mismatched_url_model(tmp_path, monkeypatch):
    dump_as_version(tiny_pipeline(), tmp_path / URL_MODEL_FILENAME, monkeypatch, "1.2.0")
    (tmp_path / URL_MANIFEST_FILENAME).write_text(json.dumps({"trained": True, "model_version": "9.9.9"}))
    service = MLService(model_dir=str(tmp_path))
    assert service.is_url_model_available() is False
    assert service.artifact_compat["url_phishing"]["status"] == "mismatch"
    result = service.predict_url_risk("example.com")
    assert result["available"] is False and result["risk_score"] is None
    meta = service.get_metadata()
    assert meta["artifact_compatibility"]["url_phishing"]["status"] == "mismatch"
    assert meta["runtime_versions"]["scikit-learn"] == sklearn.__version__


def test_shipped_artifacts_match_the_runtime():
    """Fails when the environment drifts from the one that produced the committed artifacts."""
    service = MLService()
    assert service.artifact_compat, "no artifacts were checked"
    for name, compat in service.artifact_compat.items():
        assert compat["loaded"], f"{name}: {compat['message']}"
        assert compat["status"] in {"verified", "patch_difference"}, f"{name}: {compat['message']}"


def test_risk_classifier_refuses_mismatched_artifact(tmp_path, monkeypatch):
    from backend.app.ai.risk_classifier import RiskClassifier
    path = tmp_path / "rf.joblib"
    dump_as_version(tiny_pipeline(), path, monkeypatch, "1.2.0")
    clf = RiskClassifier(model_path=path, metadata_path=tmp_path / "none.json")
    assert clf.is_available() is False
    status = clf.get_status()
    assert status["artifact_compatibility"]["status"] == "mismatch"
    assert "Refusing" in status["error"]


def test_training_manifest_records_runtime_versions(tmp_path):
    rows = [{"indicator": f"site{i}.com", "label": 0} for i in range(40)] + \
           [{"indicator": f"http://bad{i}-login.xyz/verify", "label": 1} for i in range(40)]
    data = tmp_path / "d.csv"
    pd.DataFrame(rows).to_csv(data, index=False)
    manifest = train_and_evaluate_url_model(data_path=str(data), output_dir=str(tmp_path / "out"))
    assert manifest["trained"] is True
    assert manifest["runtime_versions"] == runtime_versions()
    assert manifest["runtime_versions"]["scikit-learn"] == sklearn.__version__


def test_requirements_pin_model_critical_libraries():
    reqs = (REPO_ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8")
    pins = dict(re.findall(r"^([A-Za-z0-9_.-]+)==([^\s#]+)", reqs, flags=re.M))
    assert pins.get("scikit-learn") == sklearn.__version__
    assert pins.get("joblib") == joblib.__version__


def test_url_model_is_skipped_on_render_unless_enabled(monkeypatch):
    from backend.app.ml.service import MLService
    monkeypatch.delenv("SURAKSHA_DISABLE_URL_MODEL", raising=False)
    monkeypatch.delenv("SURAKSHA_ENABLE_URL_MODEL", raising=False)
    monkeypatch.delenv("RENDER", raising=False)
    assert MLService._skip_url_model() is False
    monkeypatch.setenv("RENDER", "true")
    assert MLService._skip_url_model() is True
    monkeypatch.setenv("SURAKSHA_ENABLE_URL_MODEL", "1")
    assert MLService._skip_url_model() is False
    monkeypatch.setenv("SURAKSHA_DISABLE_URL_MODEL", "1")
    assert MLService._skip_url_model() is True
