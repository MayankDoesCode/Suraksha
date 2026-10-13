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
