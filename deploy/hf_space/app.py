"""
SURAKSHA ML service for a Hugging Face Docker Space (16 GB RAM on the free tier, enough for the full URL model).

Endpoints (JSON):
  GET  /health                         model load state
  POST /predict/url                    {"url": "..."}
  POST /predict/social-fake            InstaFake-style profile fields
  POST /predict/impersonation/<kind>   kind = social | domain | app; body {"brand": "...", ...fields}
All outputs are advisory evidence, never verdicts. Set SPACE_API_TOKEN to require "Authorization: Bearer <token>".
"""
import os

from flask import Flask, jsonify, request

from backend.app.ml.profile_impersonation_service import health as imp_health, score_asset, score_profile
from backend.app.ml.service import MLService

os.environ.pop("SURAKSHA_ML_REMOTE_URL", None)  # this IS the remote: always serve locally
app = Flask(__name__)
ml = MLService()


@app.before_request
def _auth():
    token = os.getenv("SPACE_API_TOKEN")
    if token and request.path != "/health" and request.headers.get("Authorization") != f"Bearer {token}":
        return jsonify({"error": "unauthorized"}), 401
    return None


@app.get("/health")
def health():
    return jsonify({"url_model": ml.is_url_model_available(), "social_fake_model": ml.is_social_model_available(),
                    "impersonation_models": imp_health()})


@app.post("/predict/url")
def predict_url():
    url = (request.get_json(silent=True) or {}).get("url", "")
    return jsonify(ml.predict_url_risk(url) if url else {"error": "url is required"}), (200 if url else 422)


@app.post("/predict/social-fake")
def predict_social_fake():
    return jsonify(ml.predict_social_risk(request.get_json(silent=True) or {}))


@app.post("/predict/impersonation/<kind>")
def predict_impersonation(kind):
    body = request.get_json(silent=True) or {}
    brand = body.get("brand", "")
    if kind == "social":
        res = score_profile(brand, body.get("handle", ""), body.get("display_name", ""), body.get("bio", ""))
    elif kind in ("domain", "app"):
        res = score_asset(kind, brand, body)
    else:
        return jsonify({"error": "kind must be social, domain or app"}), 404
    return jsonify(res or {"available": False}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
