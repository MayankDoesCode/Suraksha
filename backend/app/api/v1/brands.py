from flask import Blueprint, request, jsonify
from backend.app.services.brand_service import BrandService
from backend.app.utils.auth import require_auth

brands_bp = Blueprint("brands", __name__)
brand_service = BrandService()

@brands_bp.route("/brands", methods=["GET"])
def list_brands():
    """List brand profiles with optional search and pagination."""
    search = request.args.get("search", default=None, type=str)
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    result = brand_service.list_brands(search=search, page=page, per_page=per_page)
    return jsonify({
        "success": True,
        "data": result["items"],
        "pagination": result["pagination"]
    }), 200

@brands_bp.route("/brands", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def create_brand():
    """Register a new brand profile with verified identity assets."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    brand = brand_service.create_brand(payload)
    return jsonify({
        "success": True,
        "message": "Brand profile created successfully",
        "data": brand
    }), 201

@brands_bp.route("/brands/<string:brand_id>", methods=["GET"])
def get_brand(brand_id: str):
    """Retrieve detailed brand profile by ID."""
    brand = brand_service.get_brand(brand_id)
    return jsonify({
        "success": True,
        "data": brand
    }), 200

@brands_bp.route("/brands/<string:brand_id>", methods=["PUT"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def update_brand(brand_id: str):
    """Update existing brand profile and associated verified assets."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    brand = brand_service.update_brand(brand_id, payload)
    return jsonify({
        "success": True,
        "message": "Brand profile updated successfully",
        "data": brand
    }), 200

@brands_bp.route("/brands/<string:brand_id>", methods=["DELETE"])
@require_auth(allowed_roles=["admin", "lead"])
def delete_brand(brand_id: str):
    """Delete a brand profile and safely cascade delete relational records (Lead/Admin only)."""
    brand_service.delete_brand(brand_id)
    return jsonify({
        "success": True,
        "message": "Brand profile deleted successfully"
    }), 200

@brands_bp.route("/brands/<string:brand_id>/scan", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def scan_candidate(brand_id: str):
    """
    Evaluate candidate asset against brand profile or run provider-based scan.
    If 'provider_id' is supplied, retrieves live external candidates.
    Otherwise evaluates the submitted single candidate payload.
    """
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    provider_id = payload.get("provider_id") or payload.get("provider")
    if provider_id:
        from backend.app.services.scan_service import ScanService
        scan_service = ScanService()
        limit = payload.get("limit", 25)
        result = scan_service.run_provider_scan(brand_id, provider_id=provider_id, limit=limit)
        return jsonify({
            "success": True,
            "data": result
        }), 200

    from backend.app.services.detection_service import DetectionService
    detection_service = DetectionService()
    result = detection_service.evaluate_candidate(brand_id, payload)
    return jsonify({
        "success": True,
        "data": result
    }), 200

@brands_bp.route("/brands/<string:brand_id>/scan-provider", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def scan_brand_provider(brand_id: str):
    """
    Retrieve genuine candidates from configured external provider,
    exclude official brand assets, run detection engine, and persist findings.
    """
    from backend.app.services.scan_service import ScanService
    scan_service = ScanService()
    payload = request.get_json(silent=True) or {}
    provider_id = payload.get("provider_id", "itunes_app_store")
    limit = payload.get("limit", 25)

    result = scan_service.run_provider_scan(brand_id, provider_id=provider_id, limit=limit)
    return jsonify({
        "success": True,
        "data": result
    }), 200


@brands_bp.route("/brands/<string:brand_id>/watchtower/evaluate", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def evaluate_brand_watchtower(brand_id: str):
    """
    Brand Impersonation Watchtower:
    Compare candidate domains, URLs, or social handles directly against registered brand assets,
    generate explainable similarity signals and risk indicators, and optionally route to investigation.
    """
    from backend.app.services.watchtower_service import watchtower_service
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    scan_mode = payload.get("scan_mode", "scan_on_demand")
    persist = bool(payload.get("persist_to_investigation", False))

    result = watchtower_service.evaluate_watchtower(
        brand_id=brand_id,
        candidate_data=payload,
        scan_mode=scan_mode,
        persist_to_investigation=persist,
    )
    return jsonify({
        "success": True,
        "data": result
    }), 200


@brands_bp.route("/brands/<string:brand_id>/watchtower/summary", methods=["GET"])
def get_brand_watchtower_summary(brand_id: str):
    """
    Retrieve Watchtower surveillance summary for a brand, including registered assets scope,
    active threat findings count, and scheduled monitoring status.
    """
    from backend.app.repositories.brand_repository import BrandRepository
    from backend.app.repositories.threat_repository import ThreatRepository
    from backend.app.monitoring.scheduler import scheduler
    from backend.app.utils.errors import NotFoundError

    brand_repo = BrandRepository()
    threat_repo = ThreatRepository()

    brand = brand_repo.get_by_id(brand_id)
    if not brand:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Brand with ID '{brand_id}' not found.",
                "details": []
            }
        }), 404

    bdict = brand.to_dict(include_relations=True)
    findings, total_findings = threat_repo.list_findings(brand_id=brand_id, limit=100)
    scheduled_jobs = scheduler.list_jobs(brand_id=brand_id)

    return jsonify({
        "success": True,
        "data": {
            "brand_id": brand_id,
            "brand_name": brand.name,
            "monitored_domains_count": len(bdict.get("domains", [])),
            "monitored_socials_count": len(bdict.get("social_handles", [])),
            "monitored_apps_count": len(bdict.get("app_identifiers", [])),
            "total_screened_findings": total_findings,
            "active_unresolved_threats": sum(
                1 for f in findings if f.review_status not in ("FALSE_POSITIVE", "RESOLVED")
            ),
            "scheduled_monitoring_jobs_count": len(scheduled_jobs),
            "scheduled_jobs": scheduled_jobs,
            "watchtower_status": "ACTIVE_SURVEILLANCE",
            "clarification": "Watchtower compares on-demand queries and scheduled batch cycles against registered brand assets.",
        }
    }), 200


