"""Inference for the look-alike name model. Advisory only; never overrides allowlist exclusion."""
import json, os
from backend.app.ml.artifact_compat import load_artifact
from backend.scripts.train_lookalike_model import features, norm

_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
_cache = {}


def _load():
    if "m" not in _cache:
        path = os.path.join(_DIR, "lookalike_model.joblib")
        try:
            manifest = json.load(open(os.path.join(_DIR, "lookalike_manifest.json"), encoding="utf-8"))
        except Exception:
            manifest = None
        model, _compat = load_artifact(path, "lookalike_name", manifest) if os.path.exists(path) else (None, None)
        _cache["m"] = model
    return _cache["m"]


def predict_lookalike(candidate, brand, official=()):
    if norm(candidate) in {norm(o) for o in official} or norm(candidate) == norm(brand):
        return {"available": True, "is_official_asset": True, "probability": 0.0}
    m = _load()
    if m is None:
        return {"available": False, "reason": "model artifact not found; run backend/scripts/train_lookalike_model.py"}
    p = float(m.predict_proba([features(candidate, brand)])[0][1])
    return {"available": True, "is_official_asset": False, "probability": round(p, 4), "advisory": True}
