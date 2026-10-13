from flask import Blueprint, request, jsonify
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.validation.threat_validator import VALID_REVIEW_STATUSES
from backend.app.utils.errors import NotFoundError, ValidationError
from backend.app.utils.auth import require_auth

findings_bp = Blueprint("findings", __name__)
threat_repo = ThreatRepository()

@findings_bp.route("/findings", methods=["GET"])
def list_findings():
    """List threat findings with comprehensive filtering, search, and pagination."""
    brand_id = request.args.get("brand_id", default=None, type=str)
    asset_type = request.args.get("asset_type", default=None, type=str)
    severity = request.args.get("severity", default=None, type=str)
    review_status = request.args.get("review_status", default=None, type=str)
    search = request.args.get("search", default=None, type=str)
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    offset = (page - 1) * per_page

    items, total_count = threat_repo.list_findings(
        brand_id=brand_id,
        asset_type=asset_type,
        severity=severity,
        review_status=review_status,
        search=search,
        offset=offset,
        limit=per_page,
    )

    return jsonify({
        "success": True,
        "data": [f.to_dict() for f in items],
        "pagination": {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page if total_count > 0 else 1,
        }
    }), 200

@findings_bp.route("/findings/<string:finding_id>", methods=["GET"])
def get_finding(finding_id: str):
    """Retrieve full details of a single finding with signals and evidence."""
    finding = threat_repo.get_by_id(finding_id)
    if not finding:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Finding with ID '{finding_id}' not found.",
                "details": []
            }
        }), 404

    data = finding.to_dict(include_relations=True)
    if finding.brand:
        data["brand_name"] = finding.brand.name

    return jsonify({
        "success": True,
        "data": data
    }), 200

@findings_bp.route("/findings/<string:finding_id>/status", methods=["PATCH", "PUT"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def update_finding_status(finding_id: str):
    """Update review status of a finding (e.g., CONFIRMED_THREAT, FALSE_POSITIVE)."""
    payload = request.get_json(silent=True)
    if not payload or "review_status" not in payload:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Field 'review_status' is required.",
                "details": []
            }
        }), 400

    new_status = str(payload["review_status"]).strip().upper()
    if new_status not in VALID_REVIEW_STATUSES:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"Invalid review status '{new_status}'. Allowed: {', '.join(sorted(VALID_REVIEW_STATUSES))}",
                "details": []
            }
        }), 422

    updated = threat_repo.update_status(finding_id, new_status)
    if not updated:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Finding with ID '{finding_id}' not found.",
                "details": []
            }
        }), 404

    return jsonify({
        "success": True,
        "message": f"Finding review status updated to '{new_status}'.",
        "data": updated.to_dict(include_relations=True)
    }), 200

@findings_bp.route("/metrics", methods=["GET"])
def get_metrics():
    """Retrieve aggregated platform metrics calculated from active database records."""
    metrics = threat_repo.get_metrics()
    return jsonify({
        "success": True,
        "data": metrics
    }), 200
