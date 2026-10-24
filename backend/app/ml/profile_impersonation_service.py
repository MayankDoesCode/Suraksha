"""
Advisory brand-impersonation score for a social profile (handle + display name + bio), from the SYNTHETIC-trained model
written by backend/scripts/train_social_profile_model.py.

Advisory only: it never changes a risk score or a finding's status, and callers must exclude the brand's official
accounts before asking. Unavailable (returns None) when the artifact or manifest is missing, when the manifest is not a
synthetic-trained candidate, or when SURAKSHA_DISABLE_SYNTHETIC_PROFILE_MODEL=1.
"""
import json
import re
import logging
import os
import threading
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MANIFESTS = {
    "social": "social_impersonation_synthetic_manifest.json",
    "domain": "domain_impersonation_phishtank_manifest.json",  # real-label model replaced the synthetic one
    "app": "app_impersonation_synthetic_manifest.json",
}
ALLOWED_STATUSES = {"synthetic_trained_not_validated", "trained_real_labels_advisory"}
_lock = threading.Lock()
_cache: Dict[str, Dict[str, Any]] = {}


def _load(kind: str = "social"):
    with _lock:
        c = _cache.setdefault(kind, {})
        if "loaded" in c:
            return c.get("model"), c.get("manifest")
        c["loaded"] = True
        try:
            with open(os.path.join(MODEL_DIR, MANIFESTS[kind]), encoding="utf-8") as fh:
                manifest = json.load(fh)
            if manifest.get("status") not in ALLOWED_STATUSES:
                return None, None
            import joblib
            c["model"] = joblib.load(os.path.join(MODEL_DIR, manifest["model_artifact"]))
            c["manifest"] = manifest
        except Exception as exc:  # missing artifact, version mismatch: stay unavailable, never guess
            logger.warning("Synthetic %s impersonation model unavailable: %s", kind, exc)
        return c.get("model"), c.get("manifest")


def score_asset(kind: str, brand_name: str, fields: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Advisory synthetic-model probability for a domain ({'domain', 'text'}) or app ({'title', 'package', 'developer', 'text'})."""
    if os.getenv("SURAKSHA_DISABLE_SYNTHETIC_PROFILE_MODEL") == "1" or not brand_name:
        return None
    model, manifest = _load(kind)
    if model is None:
        return None
    import pandas as pd
    cols = manifest.get("input_columns", [])
    if "host" in cols:  # real-label domain model: host + short brand key
        host = re.sub(r"^https?://", "", str(fields.get("domain") or "").strip().lower()).split("/")[0]
        host = host[4:] if host.startswith("www.") else host
        if not host:
            return None
        frame = pd.DataFrame([{"host": host, "brand_key": re.sub(r"[^a-z0-9]", "", brand_name.lower().split()[0])}])
        row = {"text": ""}
    else:
        row = {c: str(fields.get(c) or "") for c in cols if c != "brand"}
        if not any(row.values()):
            return None
        frame = pd.DataFrame([{"brand": brand_name.strip().lower(), **row}])
    try:
        prob = float(model.predict_proba(frame)[0, 1])
    except Exception as exc:
        logger.warning("Synthetic %s impersonation scoring failed: %s", kind, exc)
        return None
    real = manifest.get("status") == "trained_real_labels_advisory"
    return {"probability": round(prob, 4), "model_version": manifest.get("model_version"),
            "training_data": "real" if real else "synthetic", "validated": real,
            "uses_text": "host" not in cols, "text_provided": bool(row.get("text"))}


def score_profile(brand_name: str, handle: str, display_name: str = "", bio: str = "") -> Optional[Dict[str, Any]]:
    if os.getenv("SURAKSHA_DISABLE_SYNTHETIC_PROFILE_MODEL") == "1" or not (brand_name and handle):
        return None
    model, manifest = _load("social")
    if model is None:
        return None
    import pandas as pd
    row = pd.DataFrame([{"brand": brand_name.strip().lower(), "handle": handle.strip().lstrip("@"),
                         "display": display_name or "", "bio": bio or ""}])
    try:
        prob = float(model.predict_proba(row)[0, 1])
    except Exception as exc:
        logger.warning("Synthetic profile impersonation scoring failed: %s", exc)
        return None
    return {
        "probability": round(prob, 4),
        "model_version": manifest.get("model_version"),
        "training_data": "synthetic",
        "validated": False,
        "bio_provided": bool(bio),
    }
