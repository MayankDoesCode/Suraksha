"""App-store sources for live monitoring. Apple's iTunes Search API is public (no key). Google Play has no
public search API, so Android listings arrive via analyst import. Sources fail gracefully, never raise."""
import csv, io, json
from typing import Any, Dict, List, Tuple

import requests

TIMEOUT = 8
UA = {"User-Agent": "Suraksha-brand-monitor/1.0"}


def search_app_store(query: str, limit: int = 20, country: str = "in") -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    try:
        r = requests.get("https://itunes.apple.com/search",
                         params={"term": query, "entity": "software", "limit": limit, "country": country},
                         headers=UA, timeout=TIMEOUT)
        r.raise_for_status()
        out = [{
            "platform": "ios", "store": "App Store", "candidate_name": a.get("trackName", ""),
            "package_id": a.get("bundleId", ""), "publisher_name": a.get("sellerName") or a.get("artistName", ""),
            "description": (a.get("description") or "")[:1500], "icon_url": a.get("artworkUrl512") or a.get("artworkUrl100", ""),
            "source_url": a.get("trackViewUrl", ""), "released": a.get("releaseDate", ""),
            "rating": a.get("averageUserRating"), "rating_count": a.get("userRatingCount"),
        } for a in r.json().get("results", [])]
        return out, {"source": "app_store", "ok": True, "count": len(out)}
    except Exception as e:
        return [], {"source": "app_store", "ok": False, "reason": f"unavailable: {type(e).__name__}"}


SOURCES = {"app_store": search_app_store}


def parse_import(text: str, fmt: str = "json") -> List[Dict[str, Any]]:
    """Analyst-supplied listings (e.g. Google Play, APK mirrors). JSON list or CSV."""
    rows = json.loads(text) if fmt == "json" else list(csv.DictReader(io.StringIO(text)))
    out = []
    for r in rows[:500]:
        name = str(r.get("candidate_name") or r.get("app_title") or r.get("name") or "").strip()
        if name:
            out.append({
                "platform": str(r.get("platform") or "android"), "store": str(r.get("store") or r.get("store_name") or "imported"),
                "candidate_name": name, "package_id": str(r.get("package_id") or r.get("package_or_bundle_id") or ""),
                "publisher_name": str(r.get("publisher_name") or r.get("publisher_or_seller") or r.get("developer") or ""),
                "description": str(r.get("description") or r.get("app_description") or ""),
                "icon_url": str(r.get("icon_url") or ""), "source_url": str(r.get("source_url") or r.get("listing_url") or ""),
            })
    return out
