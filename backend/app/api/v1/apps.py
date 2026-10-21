import json

from flask import Blueprint, jsonify, request, current_app

from backend.app.detection.app_detector import AppDetector
from concurrent.futures import ThreadPoolExecutor

from backend.app.intel import app_sources
from backend.app.intel.name_variants import variants
from backend.app.utils.limiter import limiter

apps_bp = Blueprint("apps_monitor", __name__, url_prefix="/apps")


@apps_bp.route("/monitor", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_ML", "30 per minute"))
def monitor_apps():
    """Search app stores (and/or analyst-imported listings) for rogue look-alikes of a brand's apps.
    Official apps and verified publisher families are excluded before scoring."""
    p = request.get_json(silent=True) or {}
    brand = p.get("brand_profile") or {}
    if isinstance(brand, str):
        brand = {"name": brand}
    name = str(brand.get("name") or p.get("brand_name") or "").strip()
    if not name:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "brand_profile.name is required."}}), 422
    brand = {**brand, "name": name}

    queries = variants(name, [f"{name} pay", f"{name} loan", f"{name} wallet", *[str(q) for q in (p.get("queries") or [])]], limit=6)
    wanted = [x for x in (p["sources"] if isinstance(p.get("sources"), list) else list(app_sources.SOURCES)) if x in app_sources.SOURCES]
    country = str(p.get("country") or "in")
    jobs = [(src, q) for src in wanted for q in queries]
    candidates, statuses = [], []
    if jobs:
        with ThreadPoolExecutor(max_workers=min(8, len(jobs))) as ex:
            for (src, q), (found, st) in zip(jobs, ex.map(lambda j: app_sources.SOURCES[j[0]](j[1], country=country), jobs)):
                candidates += found
                statuses.append({**st, "query": q})
    if p.get("listings"):
        try:
            raw = p["listings"] if isinstance(p["listings"], str) else json.dumps(p["listings"])
            imported = app_sources.parse_import(raw, p.get("format", "json"))
            candidates += imported
            statuses.append({"source": "import", "ok": True, "count": len(imported)})
        except Exception:
            statuses.append({"source": "import", "ok": False, "reason": "could not parse import"})

    detector, seen, results = AppDetector(), set(), []
    for c in candidates:
        key = (c["platform"], (c.get("package_id") or c["candidate_name"]).lower())
        if key in seen:
            continue
        seen.add(key)
        o = detector.evaluate_full({**c, "asset_type": "mobile_app"}, brand)
        ev = o.risk_evaluation
        results.append({
            "platform": c["platform"], "store": c.get("store", ""), "title": c["candidate_name"],
            "package_id": c.get("package_id", ""), "publisher": c.get("publisher_name", ""),
            "listing_url": c.get("source_url", ""), "is_official": bool(o.is_official),
            "score": round(float(ev.total_score), 1), "severity": ev.severity,
            "signals": [s.signal_type for s in ev.signals],
        })
    flagged = sorted((r for r in results if not r["is_official"] and r["score"] > 0), key=lambda r: -r["score"])
    return jsonify({"success": True, "data": {
        "brand": name, "scanned": len(results), "official_excluded": sum(r["is_official"] for r in results),
        "flagged": flagged[:50], "sources": statuses,
        "notes": ["Google Play has no public search API: add Android listings through the 'listings' import.",
                  "Public search results only; absence of a result is not proof of safety."],
    }}), 200
