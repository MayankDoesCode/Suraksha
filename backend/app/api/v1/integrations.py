from flask import Blueprint, request, jsonify
from backend.app.connectors.registry import connector_registry
from backend.app.services.scan_service import ScanService
from backend.app.monitoring.scheduler import scheduler
from backend.app.utils.errors import NotFoundError, ValidationError
from backend.app.services.brand_service import BrandService
from backend.app.utils.auth import require_auth, get_authenticated_user_optional, get_current_user

integrations_bp = Blueprint("integrations", __name__)
scan_service = ScanService()
brand_service = BrandService()

@integrations_bp.route("/integrations/status", methods=["GET"])
def get_integrations_status():
    """
    Retrieve integration availability, configuration status, and diagnostics.
    Guarantees no secret keys, tokens, or credentials are leaked.
    """
    statuses = connector_registry.get_all_status()
    return jsonify({
        "success": True,
        "providers": statuses,
        "count": len(statuses),
    }), 200

@integrations_bp.route("/integrations/<string:provider_id>/test", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def test_integration(provider_id: str):
    """Test live connectivity for a specific external connector."""
    connector = connector_registry.get(provider_id)
    if not connector:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Provider '{provider_id}' is not recognized.",
                "details": []
            }
        }), 404

    diag = connector.check_connection()
    return jsonify({
        "success": True,
        "provider_id": provider_id,
        "provider_name": connector.source_name,
        "diagnostic": diag,
    }), 200

@integrations_bp.route("/monitoring/jobs", methods=["GET"])
def list_monitoring_jobs():
    """List registered monitoring jobs, verifying brand authorization if brand_id specified."""
    brand_id = request.args.get("brand_id", default=None, type=str)
    if brand_id:
        user_info = get_authenticated_user_optional() or {}
        user_id = user_info.get("uid")
        is_admin = (user_info.get("role") == "admin")
        brand_service.get_brand(brand_id, requesting_user_id=user_id, is_admin=is_admin)

    jobs = scheduler.list_jobs(brand_id=brand_id)
    return jsonify({
        "success": True,
        "jobs": jobs,
        "count": len(jobs),
    }), 200

@integrations_bp.route("/monitoring/jobs", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def create_monitoring_job():
    """Schedule a recurring batch collection job for an authorized brand."""
    payload = request.get_json(silent=True) or {}
    brand_id = payload.get("brand_id")
    provider_id = payload.get("provider_id", "itunes_app_store")
    interval = payload.get("interval_minutes", 60)

    if not brand_id:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'brand_id' is required.",
                "details": []
            }
        }), 400

    user_info = get_current_user() or {}
    user_id = user_info.get("uid")
    is_admin = (user_info.get("role") == "admin")
    brand_service.get_brand(brand_id, requesting_user_id=user_id, is_admin=is_admin)


    job_id = scheduler.schedule_collection(
        brand_id=brand_id,
        connector_id=provider_id,
        interval_minutes=interval
    )
    job_status = scheduler.get_job_status(job_id)
    return jsonify({
        "success": True,
        "message": "Monitoring job registered successfully.",
        "job": job_status,
    }), 201

@integrations_bp.route("/monitoring/jobs/<string:job_id>", methods=["GET"])
def get_job_status(job_id: str):
    """Retrieve execution state of a specific monitoring job."""
    try:
        status = scheduler.get_job_status(job_id)
        return jsonify({"success": True, "job": status}), 200
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": str(e), "details": []}
        }), 404

@integrations_bp.route("/monitoring/jobs/<string:job_id>/run", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def run_job_now(job_id: str):
    """Trigger immediate execution of a scheduled collection job."""
    try:
        result = scheduler.execute_job(job_id)
        return jsonify({"success": True, "result": result}), 200
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": str(e), "details": []}
        }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "EXECUTION_ERROR", "message": str(e), "details": []}
        }), 500

@integrations_bp.route("/monitoring/jobs/<string:job_id>", methods=["DELETE"])
@require_auth(allowed_roles=["admin", "lead"])
def cancel_job(job_id: str):
    """Cancel a monitoring schedule (Admin / Lead only)."""
    cancelled = scheduler.cancel_job(job_id)
    if not cancelled:
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Job '{job_id}' not found.", "details": []}
        }), 404
    return jsonify({"success": True, "message": f"Job '{job_id}' cancelled successfully."}), 200

# -------------------------------------------------------------------------
# SecOps Webhook Alerts (Slack / Teams / Discord)
# -------------------------------------------------------------------------
from backend.app.services.webhook_service import WebhookService

webhook_service = WebhookService()

@integrations_bp.route("/integrations/webhook/test", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def test_webhook():
    """Send a verified test payload to validate destination webhook connectivity."""
    payload = request.get_json(silent=True) or {}
    webhook_url = payload.get("webhook_url", "").strip()
    if not webhook_url:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Field 'webhook_url' is required.", "details": []}
        }), 400

    test_alert = {
        "brand_name": payload.get("brand_name", "Acme Corporation"),
        "asset_identifier": "test-lookalike-detection.xyz",
        "asset_type": "domain",
        "severity": "CRITICAL",
        "risk_score": 92.0,
        "signals": ["TEST_WEBHOOK_PING", "VERIFIED_ALERT_DISPATCH"],
        "summary": "This is a verified test alert generated by SURAKSHA SecOps Watchtower to confirm live webhook integration.",
    }

    result = webhook_service.dispatch(webhook_url, test_alert)
    return jsonify({"success": result.get("success", False), "result": result}), 200

