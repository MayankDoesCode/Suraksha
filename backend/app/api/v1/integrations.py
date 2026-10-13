from flask import Blueprint, request, jsonify
from backend.app.connectors.registry import connector_registry
from backend.app.services.scan_service import ScanService
from backend.app.monitoring.scheduler import scheduler
from backend.app.utils.errors import NotFoundError, ValidationError
from backend.app.utils.auth import require_auth

integrations_bp = Blueprint("integrations", __name__)
scan_service = ScanService()

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
    """List all registered monitoring jobs."""
    brand_id = request.args.get("brand_id", default=None, type=str)
    jobs = scheduler.list_jobs(brand_id=brand_id)
    return jsonify({
        "success": True,
        "jobs": jobs,
        "count": len(jobs),
    }), 200

@integrations_bp.route("/monitoring/jobs", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def create_monitoring_job():
    """Schedule a recurring batch collection job for a brand."""
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
