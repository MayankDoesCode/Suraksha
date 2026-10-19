from datetime import datetime, timezone
from flask import Blueprint, jsonify, current_app
from backend.app.database import check_db_connection
from backend.app.ai.risk_classifier import risk_classifier
from backend.app.utils.limiter import limiter

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
@limiter.exempt
def get_health():
    """
    System, database, and ML risk classification engine health check endpoint.
    Reports operational status without exposing private filesystem details.
    """
    db_ok, db_message = check_db_connection()
    ml_status = risk_classifier.get_status()
    is_healthy = db_ok

    payload = {
        "success": is_healthy,
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "SURAKSHA API",
        "version": "1.0.0",
        "environment": current_app.config.get("ENV", "development"),
        "database": {
            "connected": db_ok,
            "status": db_message,
        },
        "ml_service": {
            "available": ml_status["available"],
            "loaded": ml_status["loaded"],
            "model_version": ml_status["model_version"],
            "algorithm": ml_status["algorithm"],
            "model_type": ml_status["model_type"],
            "status": ml_status["status"],
        }
    }
    status_code = 200 if is_healthy else 503
    return jsonify(payload), status_code
