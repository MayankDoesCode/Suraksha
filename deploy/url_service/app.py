"""
SURAKSHA URL-model service: a separate free Render web service that serves ONLY the URL phishing model, so the main
app stays within its own 512 MB.

It deliberately does NOT import the `backend` package: importing it pulls in the whole web app (~230 MB) before the
model loads. Instead it loads the slim artifact (identical predictions, verified by
backend/scripts/build_slim_url_model.py) directly, and mirrors MLService.predict_url_risk's host normalisation and
response format. backend/tests/test_url_service.py checks the responses are identical to MLService's.

  GET  /health        {"url_model": true|false, ...}
  POST /predict/url   {"url": "..."}  -> same JSON as MLService.predict_url_risk
Set SERVICE_API_TOKEN to require "Authorization: Bearer <token>" on /predict/url.
"""
import hashlib
import json
import logging
import os

from flask import Flask, jsonify, request

logger = logging.getLogger(__name__)
MODEL_DIR = os.getenv("URL_MODEL_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "models"))
MODEL_FILE, MANIFEST_FILE = "url_phishing_pipeline.joblib", "url_phishing_manifest.json"


def canonical_host(indicator: str) -> str:
    """Same as backend.app.ml.url_eval.canonical_host (hostname, no trailing dot, no leading 'www.')."""
    s = str(indicator).strip().lower()
    s = s.split("://", 1)[-1]
    s = s.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
    s = s.rsplit("@", 1)[-1]
    h = s.split(":", 1)[0].rstrip(".")
    return h[4:] if h.startswith("www.") else h


def _register_host_features():
    """The pickled pipeline references backend.app.ml.url_host_features.host_feats. Register that one module (the same
    file, shipped beside this app) under its original name, without importing the heavy `backend` package."""
    import importlib.util
    import sys
    import types
    name = "backend.app.ml.url_host_features"
    if name in sys.modules:
        return
    for pkg in ("backend", "backend.app", "backend.app.ml"):
        if pkg not in sys.modules:
            stub = types.ModuleType(pkg)
            stub.__path__ = []  # mark as a package
            sys.modules[pkg] = stub
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [os.path.join(here, "url_host_features.py"),
                  os.path.join(here, "..", "..", "backend", "app", "ml", "url_host_features.py")]
    path = next(p for p in candidates if os.path.exists(p))
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)


def _load():
    try:
        with open(os.path.join(MODEL_DIR, MANIFEST_FILE), encoding="utf-8") as fh:
            manifest = json.load(fh)
        path = os.path.join(MODEL_DIR, MODEL_FILE)
        expected = manifest.get("artifact_sha256")
        if expected:
            h = hashlib.sha256()
            with open(path, "rb") as fh:
                for chunk in iter(lambda: fh.read(1 << 20), b""):
                    h.update(chunk)
            if h.hexdigest() != expected:
                logger.error("URL model refused: checksum does not match manifest")
                return None, manifest, "checksum_mismatch"
        _register_host_features()
        import joblib
        return joblib.load(path), manifest, None
    except Exception as exc:  # stay up and report unavailable; callers fall back to rules
        logger.error("URL model not loaded: %s", exc)
        return None, {}, f"{type(exc).__name__}: {exc}"


MODEL, MANIFEST, LOAD_ERROR = _load()
app = Flask(__name__)


def predict_url_risk(url_or_domain: str) -> dict:
    """Mirror of MLService.predict_url_risk for a loaded model."""
    if MODEL is None:
        return {"available": False, "task": "url_phishing_detection", "reason": "URL phishing model is not loaded.",
                "risk_score": None, "risk_probability": None}
    clean_url = str(url_or_domain).strip()
    scored_input = canonical_host(clean_url) or clean_url
    try:
        probs = MODEL.predict_proba([scored_input])[0]
        classes = list(MODEL.classes_)
        prob_phishing = float(probs[classes.index(1)]) if 1 in classes else float(probs[-1])
        risk_score = round(prob_phishing * 100.0, 1)
        tier = "HIGH" if risk_score >= 80.0 else "MEDIUM" if risk_score >= 50.0 else "LOW"
        return {
            "available": True,
            "task": "url_phishing_detection",
            "model_version": MANIFEST.get("model_version", "1.0.0"),
            "indicator": clean_url,
            "scored_input": scored_input,
            "is_phishing_risk": prob_phishing >= 0.5,
            "risk_probability": round(prob_phishing, 4),
            "risk_score": risk_score,
            "severity_tier": tier,
            "requires_analyst_review": True,
            "auto_confirmed": False,
            "scope_note": "Evaluated strictly by URL/domain lexical model (OTX/Tranco). Requires analyst corroboration.",
        }
    except Exception as exc:
        logger.error("Error evaluating URL risk: %s", exc)
        return {"available": False, "task": "url_phishing_detection", "error": str(exc), "risk_score": None}


@app.get("/health")
def health():
    ok = MODEL is not None
    return jsonify({"url_model": ok, "model_version": MANIFEST.get("model_version"),
                    "derived_from": MANIFEST.get("derived_from"), "error": LOAD_ERROR}), (200 if ok else 503)


@app.post("/predict/url")
def predict_url():
    token = os.getenv("SERVICE_API_TOKEN")
    if token and request.headers.get("Authorization") != f"Bearer {token}":
        return jsonify({"error": "unauthorized"}), 401
    url = str((request.get_json(silent=True) or {}).get("url", "")).strip()
    if not url:
        return jsonify({"error": "url is required"}), 422
    return jsonify(predict_url_risk(url)), 200
