from flask import Blueprint, request, jsonify, g, current_app
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.models.brand import Brand
from backend.app.validation.threat_validator import VALID_REVIEW_STATUSES
from backend.app.utils.errors import NotFoundError, ValidationError, ForbiddenError, UnauthorizedError
from backend.app.utils.auth import require_auth, get_authenticated_user_optional, get_current_user
from backend.app.utils.limiter import limiter

findings_bp = Blueprint("findings", __name__)
threat_repo = ThreatRepository()

@findings_bp.route("/findings", methods=["GET"])
def list_findings():
    """
    List threat findings with tenant workspace isolation.
    - Real users only see findings for brands they own (is_sample=False).
    - If is_sample=true or demo=true is specified, returns isolated sample findings.
    - If unauthenticated without demo flag, returns empty list.
    """
    brand_id = request.args.get("brand_id", default=None, type=str)
    asset_type = request.args.get("asset_type", default=None, type=str)
    severity = request.args.get("severity", default=None, type=str)
    review_status = request.args.get("review_status", default=None, type=str)
    detection_source = request.args.get("detection_source", default=None, type=str)
    search = request.args.get("search", default=None, type=str)
    sort_by = request.args.get("sort_by", default="risk_score", type=str)
    sort_order = request.args.get("sort_order", default="desc", type=str)
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    is_demo = (
        request.args.get("is_sample", "").lower() in ("true", "1", "yes")
        or request.args.get("demo", "").lower() in ("true", "1", "yes")
    )

    page = max(1, page or 1)
    per_page = min(max(1, per_page or 20), 100)
    offset = (page - 1) * per_page

    user_info = get_authenticated_user_optional()

    if is_demo:
        # Isolated demo findings feed
        items, total_count = threat_repo.list_findings(
            brand_id=brand_id,
            asset_type=asset_type,
            severity=severity,
            review_status=review_status,
            search=search,
            is_sample=True,
            detection_source=detection_source,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=offset,
            limit=per_page,
        )
    elif user_info:
        user_id = user_info.get("uid")
        user_role = user_info.get("role")

        if user_role == "admin":
            user_brands = threat_repo.session.query(Brand).filter(Brand.is_sample == False).all()
        else:
            user_brands = threat_repo.session.query(Brand).filter(
                Brand.owner_id == user_id,
                Brand.is_sample == False
            ).all()

        authorized_brand_ids = [b.id for b in user_brands]

        if not authorized_brand_ids:
            return jsonify({
                "success": True,
                "data": [],
                "pagination": {
                    "total": 0,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": 1,
                    "sort_by": sort_by,
                    "sort_order": sort_order,
                }
            }), 200

        if brand_id and brand_id not in authorized_brand_ids:
            return jsonify({
                "success": True,
                "data": [],
                "pagination": {
                    "total": 0,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": 1,
                    "sort_by": sort_by,
                    "sort_order": sort_order,
                }
            }), 200

        target_brand_ids = [brand_id] if brand_id else authorized_brand_ids
        items, total_count = threat_repo.list_findings(
            brand_ids=target_brand_ids,
            asset_type=asset_type,
            severity=severity,
            review_status=review_status,
            search=search,
            is_sample=False,
            detection_source=detection_source,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=offset,
            limit=per_page,
        )
    else:
        # Unauthenticated real query: return empty results
        items, total_count = [], 0

    return jsonify({
        "success": True,
        "data": [f.to_dict() for f in items],
        "pagination": {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page if total_count > 0 else 1,
            "sort_by": sort_by,
            "sort_order": sort_order,
        }
    }), 200


@findings_bp.route("/findings/<string:finding_id>", methods=["GET"])
def get_finding(finding_id: str):
    """Retrieve full details of a single finding with signals and evidence, enforcing tenant authorization."""
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

    # Real workspace findings must belong to caller
    if not finding.is_sample:
        user_info = get_authenticated_user_optional()
        if not user_info:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required to access real threat finding.",
                    "details": []
                }
            }), 401

        user_id = user_info.get("uid")
        is_admin = (user_info.get("role") == "admin")
        if finding.brand and finding.brand.owner_id and finding.brand.owner_id != user_id and not is_admin:
            return jsonify({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to view this finding.",
                    "details": []
                }
            }), 403

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
    """Update review status of a finding (e.g., CONFIRMED_THREAT, FALSE_POSITIVE), enforcing ownership."""
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

    user_info = get_current_user() or {}
    user_id = user_info.get("uid")
    is_admin = (user_info.get("role") == "admin")

    if not finding.is_sample and finding.brand and finding.brand.owner_id and finding.brand.owner_id != user_id and not is_admin:
        return jsonify({
            "success": False,
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not authorized to modify this finding.",
                "details": []
            }
        }), 403

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

    # Extract analyst attribution and optional note for immutable audit log
    analyst = payload.get("analyst") or user_info.get("displayName") or user_info.get("email")
    note = payload.get("note")

    updated = threat_repo.update_status(
        finding_id=finding_id,
        new_status=new_status,
        analyst=analyst,
        note=note,
    )

    return jsonify({
        "success": True,
        "message": f"Finding review status updated to '{new_status}'.",
        "data": updated.to_dict(include_relations=True)
    }), 200

@findings_bp.route("/metrics", methods=["GET"])
def get_metrics():
    """Retrieve aggregated platform metrics scoped strictly to authorized tenant records."""
    is_demo = (
        request.args.get("is_sample", "").lower() in ("true", "1", "yes")
        or request.args.get("demo", "").lower() in ("true", "1", "yes")
    )
    user_info = get_authenticated_user_optional()

    if is_demo:
        metrics = threat_repo.get_metrics(is_sample=True)
    elif user_info:
        user_id = user_info.get("uid")
        user_role = user_info.get("role")
        if user_role == "admin":
            user_brands = threat_repo.session.query(Brand).filter(Brand.is_sample == False).all()
        else:
            user_brands = threat_repo.session.query(Brand).filter(
                Brand.owner_id == user_id,
                Brand.is_sample == False
            ).all()

        authorized_brand_ids = [b.id for b in user_brands]
        metrics = threat_repo.get_metrics(brand_ids=authorized_brand_ids, is_sample=False)
    else:
        # Unauthenticated: zero metrics
        metrics = threat_repo.get_metrics(brand_ids=[], is_sample=False)

    return jsonify({
        "success": True,
        "data": metrics
    }), 200


@findings_bp.route("/findings/<string:finding_id>/explain", methods=["GET"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def explain_finding(finding_id: str):
    """
    Explainable AI Investigation Assistant:
    Provides deep explainability dossier for an existing finding, decomposing into:
    - Observed Facts
    - Model Inferences & Detection Rules
    - Unverified Claims & Intelligence Gaps
    - Validated statistical confidence score
    - Evidence-based next steps with zero auto-confirmation guarantee.
    """
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

    if not finding.is_sample:
        user_info = get_authenticated_user_optional()
        if not user_info:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required to access finding explanation.",
                    "details": []
                }
            }), 401
        user_id = user_info.get("uid")
        is_admin = (user_info.get("role") == "admin")
        if finding.brand and finding.brand.owner_id and finding.brand.owner_id != user_id and not is_admin:
            return jsonify({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to access this finding.",
                    "details": []
                }
            }), 403

    from backend.app.services.watchtower_service import watchtower_service
    result = watchtower_service.explain_finding_by_id(finding_id)

    # Optional AI copilot synthesis parameter
    include_ai = request.args.get("ai", "").lower() in ("true", "1", "yes")
    if include_ai:
        from backend.app.ai.groq_service import groq_service
        brand_dict = finding.brand.to_dict(include_relations=True) if finding.brand else {}
        signals_dict = [s.to_dict() for s in finding.signals]
        evidence_dict = [e.to_dict() for e in finding.evidence]
        ai_brief = groq_service.generate_investigation_brief(
            brand_profile=brand_dict,
            finding=finding.to_dict(),
            signals=signals_dict,
            evidence=evidence_dict,
            comparison=result.get("comparison", {}),
        )
        result["ai_investigation"] = ai_brief

    return jsonify({
        "success": True,
        "data": result
    }), 200


@findings_bp.route("/findings/<string:finding_id>/ai-investigate", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def ai_investigate_finding(finding_id: str):
    """
    Dedicated Groq + LangSmith AI Investigation Pipeline:
    Performs evidence-grounded epistemic synthesis of detector telemetry.
    Strictly enforces workspace tenant authorization.
    """
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

    if not finding.is_sample:
        user_info = get_authenticated_user_optional()
        if not user_info:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required to access finding investigation.",
                    "details": []
                }
            }), 401
        user_id = user_info.get("uid")
        is_admin = (user_info.get("role") == "admin")
        if finding.brand and finding.brand.owner_id and finding.brand.owner_id != user_id and not is_admin:
            return jsonify({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to investigate this finding.",
                    "details": []
                }
            }), 403

    from backend.app.services.watchtower_service import watchtower_service
    from backend.app.ai.groq_service import groq_service

    dossier = watchtower_service.explain_finding_by_id(finding_id)
    brand_dict = finding.brand.to_dict(include_relations=True) if finding.brand else {}
    signals_dict = [s.to_dict() for s in finding.signals]
    evidence_dict = [e.to_dict() for e in finding.evidence]

    ai_result = groq_service.generate_investigation_brief(
        brand_profile=brand_dict,
        finding=finding.to_dict(),
        signals=signals_dict,
        evidence=evidence_dict,
        comparison=dossier.get("comparison", {}),
    )

    return jsonify({
        "success": True,
        "data": {
            "finding_id": finding.id,
            "brand_id": finding.brand_id,
            "candidate_name": finding.candidate_name,
            "asset_type": finding.asset_type,
            "detector_risk_score": float(finding.risk_score),
            "severity": finding.severity,
            "is_sample": bool(finding.is_sample),
            "investigation": ai_result,
        }
    }), 200


@findings_bp.route("/findings/explain", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def explain_candidate():
    """
    On-demand candidate explainability:
    Evaluates a candidate payload against target brand assets and decomposes into
    Observed Facts, Model Inferences, and Unverified Claims.
    """
    from backend.app.services.watchtower_service import watchtower_service
    payload = request.get_json(silent=True) or {}
    brand_id = payload.get("brand_id")
    if not brand_id:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'brand_id' is required for explainability evaluation.",
                "details": []
            }
        }), 422

    result = watchtower_service.evaluate_watchtower(
        brand_id=brand_id,
        candidate_data=payload,
        scan_mode=payload.get("scan_mode", "scan_on_demand"),
        persist_to_investigation=False,
    )
    return jsonify({
        "success": True,
        "data": result
    }), 200


@findings_bp.route("/findings/ai-investigate-candidate", methods=["POST"])
def ai_investigate_candidate():
    """
    On-demand candidate Groq + LangSmith investigation:
    Evaluates candidate against brand assets and generates an evidence-grounded AI brief.
    """
    from backend.app.services.watchtower_service import watchtower_service
    from backend.app.ai.groq_service import groq_service
    from backend.app.repositories.brand_repository import BrandRepository

    payload = request.get_json(silent=True) or {}
    brand_id = payload.get("brand_id")
    if not brand_id:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Field 'brand_id' is required for AI candidate investigation.",
                "details": []
            }
        }), 422

    brand_repo = BrandRepository()
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

    # Authorization verification
    if not brand.is_sample:
        user_info = get_authenticated_user_optional()
        if not user_info:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required to run AI candidate investigation.",
                    "details": []
                }
            }), 401
        user_id = user_info.get("uid")
        is_admin = (user_info.get("role") == "admin")
        if brand.owner_id and brand.owner_id != user_id and not is_admin:
            return jsonify({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to investigate against this brand.",
                    "details": []
                }
            }), 403

    eval_result = watchtower_service.evaluate_watchtower(
        brand_id=brand_id,
        candidate_data=payload,
        scan_mode=payload.get("scan_mode", "scan_on_demand"),
        persist_to_investigation=False,
    )

    brand_dict = brand.to_dict(include_relations=True)
    sim_result = eval_result.get("similarity_result", {})
    signals = sim_result.get("signals", [])
    candidate_finding = {
        "candidate_name": payload.get("candidate_name") or payload.get("identifier"),
        "asset_type": payload.get("asset_type", "domain"),
        "source_url": payload.get("url"),
        "risk_score": eval_result.get("risk_score", 0.0),
        "severity": eval_result.get("severity", "low"),
        "detection_source": "Watchtower Candidate Scanner",
        "observed_at": "Active",
    }

    ai_result = groq_service.generate_investigation_brief(
        brand_profile=brand_dict,
        finding=candidate_finding,
        signals=signals,
        evidence=[],
        comparison=eval_result.get("comparison", {}),
    )

    return jsonify({
        "success": True,
        "data": {
            "brand_id": brand_id,
            "candidate_name": candidate_finding["candidate_name"],
            "eval_result": eval_result,
            "investigation": ai_result,
        }
    }), 200


def _owned_finding(finding_id: str, allow_sample: bool = False):
    """Fetch a finding the caller may act on (owner or admin); sample findings are optionally allowed for drafting."""
    user_info = get_current_user() or {}
    finding = threat_repo.get_by_id(finding_id)
    if not finding:
        raise NotFoundError(f"Finding with ID '{finding_id}' not found.")
    is_admin = user_info.get("role") == "admin"
    if finding.is_sample:
        if allow_sample:
            return finding, user_info
        raise ForbiddenError("You do not have access to this finding.")
    if finding.brand and finding.brand.owner_id and finding.brand.owner_id != user_info.get("uid") and not is_admin:
        raise ForbiddenError("You do not have access to this finding.")
    return finding, user_info


@findings_bp.route("/findings/<string:finding_id>/enrich", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_DISCOVER", "3 per minute"))
def enrich_finding(finding_id: str):
    """Passive DNS / RDAP / TLS observation recorded as evidence (idempotent)."""
    _owned_finding(finding_id)
    from backend.app.services.enrichment_service import EnrichmentService
    return jsonify({"success": True, "data": EnrichmentService().enrich_finding(finding_id)}), 200


@findings_bp.route("/findings/<string:finding_id>/report", methods=["GET"])
@require_auth(allowed_roles=["admin", "lead", "analyst", "viewer"])
def finding_report(finding_id: str):
    """Draft (never sent) takedown/abuse report for registrar, hosting, platform, app store or internal use."""
    finding, user_info = _owned_finding(finding_id, allow_sample=True)
    from backend.app.services.report_service import build_report
    data = finding.to_dict(include_relations=True)
    brand_name = finding.brand.name if finding.brand else "the brand"
    report = build_report(data, brand_name, request.args.get("audience", "registrar"), analyst=user_info.get("email") or user_info.get("uid"))
    return jsonify({"success": True, "data": report}), 200


@findings_bp.route("/findings/<string:finding_id>/takedown", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst", "viewer"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_DISCOVER", "3 per minute"))
def finding_takedown(finding_id: str):
    """Draft a takedown notice (registrar/host/trademark/platform/app_store). Body: {notice, format: json|eml|pdf|txt, abuse_email, analyst}. Never sends."""
    import base64
    from flask import Response
    from backend.app.services import report_service as rs
    finding, user_info = _owned_finding(finding_id, allow_sample=True)
    body = request.get_json(silent=True) or {} if request.method == "POST" else {}

    default_notice = (
        "registrar" if finding.asset_type == "domain"
        else "platform" if finding.asset_type == "social"
        else "app_store" if finding.asset_type in ("mobile_app", "app")
        else "trademark"
    )
    notice = body.get("notice") or request.args.get("notice") or default_notice
    analyst = body.get("analyst") or request.args.get("analyst") or user_info.get("email") or user_info.get("uid")
    abuse_email = body.get("abuse_email") or request.args.get("abuse_email")
    fmt = body.get("format") or request.args.get("format") or "json"

    n = rs.generate_takedown(finding_id, notice, analyst=analyst, abuse_email=abuse_email)

    if not finding.is_sample:
        threat_repo.apply_enrichment(finding_id, [{"evidence_type": "takedown_drafted", "description": f"notice={n['notice']}; to={n['to']}; manifest={n['manifest_sha256'][:16]}", "source_reference": "takedown_endpoint"}], [], (), ())

    if fmt == "eml":
        return Response(rs.to_eml(n), mimetype="message/rfc822", headers={"Content-Disposition": "attachment; filename=takedown-" + finding_id + ".eml"})
    if fmt == "pdf":
        return Response(rs.to_pdf(n["text"]), mimetype="application/pdf", headers={"Content-Disposition": "attachment; filename=takedown-" + finding_id + ".pdf"})
    if fmt == "txt":
        return Response(n["text"], mimetype="text/plain", headers={"Content-Disposition": "attachment; filename=takedown-" + finding_id + ".txt"})

    n["eml_base64"] = base64.b64encode(rs.to_eml(n)).decode()
    n["pdf_base64"] = base64.b64encode(rs.to_pdf(n["text"])).decode()
    return jsonify({"success": True, "data": n}), 200

