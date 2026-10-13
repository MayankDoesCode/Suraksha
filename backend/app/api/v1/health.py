from datetime import datetime, timezone
from flask import Blueprint, jsonify, current_app
from backend.app.database import check_db_connection

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def get_health():
    """
    System and database health check endpoint.
    Reports operational status and database availability.
    """
    db_ok, db_message = check_db_connection()
    status_code = 200 if db_ok else 503

    payload = {
        "success": db_ok,
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "SURAKSHA API",
        "version": "1.0.0",
        "environment": current_app.config.get("ENV", "development"),
        "database": {
            "connected": db_ok,
            "status": db_message,
        }
    }
    return jsonify(payload), status_code
