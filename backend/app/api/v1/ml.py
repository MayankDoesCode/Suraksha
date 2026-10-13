import logging
from flask import Blueprint, jsonify, request
from backend.app.ml import get_ml_service

logger = logging.getLogger(__name__)

ml_bp = Blueprint("ml", __name__, url_prefix="/ml")


@ml_bp.route("/status", methods=["GET"])
def get_ml_status():
    """
    Expose ML model availability, architecture, and validation metrics.
    Never fabricates metrics when data is unavailable.
    """
    service = get_ml_service()
    metadata = service.get_metadata()
    return jsonify({
        "success": True,
        "data": metadata
    }), 200


@ml_bp.route("/predict", methods=["POST"])
def predict_candidate_risk():
    """
    Run assistive ML inference on candidate metadata.
    
    Safety Rules:
    - Never automatically confirms a threat.
    - Advisory only.
    - Always requires human analyst verification.
    """
    payload = request.get_json(silent=True) or {}
    service = get_ml_service()

    if not service.is_available():
        return jsonify({
            "success": True,
            "data": {
                "available": False,
                "reason": "ML model is not loaded. Supervised training skipped due to lack of labelled dataset.",
                "advisory_only": True,
            }
        }), 200

    result = service.predict_candidate(payload)
    return jsonify({
        "success": True,
        "data": result
    }), 200


@ml_bp.route("/predict-url", methods=["POST"])
def predict_url_phishing():
    """
    Dedicated endpoint for URL and lookalike domain phishing risk classification.
    Evaluated with HuggingFace Olaroti/phishing-dataset (MIT License).
    """
    payload = request.get_json(silent=True) or {}
    url = payload.get("url") or payload.get("indicator") or payload.get("domain")
    if not url:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'url' or 'indicator' is required."
            }
        }), 422

    service = get_ml_service()
    result = service.predict_url_risk(url)
    return jsonify({
        "success": True,
        "data": result
    }), 200


@ml_bp.route("/predict-social", methods=["POST"])
def predict_social_account():
    """
    Dedicated endpoint for Social Profile threat classification.
    Uses InstaFake ML pipeline for fake account probability and
    deterministic heuristics for brand trademark corroboration.
    """
    payload = request.get_json(silent=True) or {}
    username = payload.get("username") or payload.get("handle") or payload.get("candidate_name") or payload.get("name")
    if not username:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'username' or 'handle' is required."
            }
        }), 422

    brand_profile = payload.get("brand_profile")
    if not brand_profile and payload.get("brand_name"):
        brand_profile = {"name": payload.get("brand_name")}

    service = get_ml_service()
    result = service.predict_social_risk(payload, brand_profile=brand_profile)
    return jsonify({
        "success": True,
        "data": result
    }), 200


@ml_bp.route("/predict-app", methods=["POST"])
def predict_mobile_app():
    """
    Dedicated endpoint for Mobile Application threat classification.
    Evaluates listing metadata, developer identities, and brand token signals.
    """
    payload = request.get_json(silent=True) or {}
    app_title = payload.get("candidate_name") or payload.get("name") or payload.get("app_title")
    if not app_title:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'candidate_name' or 'app_title' is required."
            }
        }), 422

    brand_profile = payload.get("brand_profile")
    if not brand_profile and payload.get("brand_name"):
        brand_profile = {"name": payload.get("brand_name")}

    service = get_ml_service()
    result = service.predict_app_risk(payload, brand_profile=brand_profile)
    return jsonify({
        "success": True,
        "data": result
    }), 200

