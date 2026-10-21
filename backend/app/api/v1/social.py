from flask import Blueprint, jsonify, request, current_app

from backend.app.detection.social_detector import SocialDetector
from concurrent.futures import ThreadPoolExecutor

from backend.app.intel import social_sources
from backend.app.intel.name_variants import variants
from backend.app.utils.limiter import limiter

social_bp = Blueprint("social", __name__, url_prefix="/social")


@social_bp.route("/monitor", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_ML", "30 per minute"))
def monitor():
    """Search public social platforms (and/or analyst-imported accounts) for look-alikes of a brand.
    Official handles are excluded before scoring. Unavailable sources are reported, never guessed."""
    p = request.get_json(silent=True) or {}
    brand = p.get("brand_profile") or {}
    if isinstance(brand, str):
        brand = {"name": brand}
    name = str(brand.get("name") or p.get("brand_name") or "").strip()
    if not name:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "brand_profile.name is required."}}), 422
    brand = {**brand, "name": name}

    wanted = [x for x in (p["sources"] if isinstance(p.get("sources"), list) else list(social_sources.SOURCES)) if x in social_sources.SOURCES]
    qs = variants(name, p.get("queries") or [])
    jobs = [(src, q) for src in wanted for q in qs[: social_sources.MAX_QUERIES.get(src, 4)]]
    candidates, statuses = [], []
    if jobs:
        with ThreadPoolExecutor(max_workers=min(8, len(jobs))) as ex:
            for (src, q), (found, st) in zip(jobs, ex.map(lambda j: social_sources.SOURCES[j[0]](j[1]), jobs)):
                candidates += found
                statuses.append({**st, "query": q})
    if p.get("accounts"):
        try:
            imported = social_sources.parse_import(
                p["accounts"] if isinstance(p["accounts"], str) else __import__("json").dumps(p["accounts"]),
                p.get("format", "json"))
            candidates += imported
            statuses.append({"source": "import", "ok": True, "count": len(imported)})
        except Exception:
            statuses.append({"source": "import", "ok": False, "reason": "could not parse import"})

    detector, seen, results = SocialDetector(), set(), []
    for c in candidates:
        key = (c["platform"], c["candidate_name"].lower())
        if key in seen:
            continue
        seen.add(key)
        o = detector.evaluate_full({**c, "asset_type": "social"}, brand)
        ev = o.risk_evaluation
        results.append({
            "platform": c["platform"], "handle": c["candidate_name"], "display_name": c.get("display_name", ""),
            "profile_url": c.get("source_url", ""), "is_official": bool(o.is_official),
            "score": round(float(ev.total_score), 1), "severity": ev.severity,
            "signals": [s.signal_type for s in ev.signals],
        })
    flagged = sorted((r for r in results if not r["is_official"] and r["score"] > 0), key=lambda r: -r["score"])
    return jsonify({"success": True, "data": {
        "brand": name, "scanned": len(results), "official_excluded": sum(r["is_official"] for r in results),
        "flagged": flagged[:50], "sources": statuses,
        "notes": ["Public search results only; absence of a result is not proof of safety."],
    }}), 200
