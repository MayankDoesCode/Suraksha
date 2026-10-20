"""Social data sources for live monitoring. Each source fails gracefully: it returns
(accounts, status) and never raises, so one outage never breaks a scan."""
import csv, io, json
from typing import Any, Dict, List, Tuple

import requests

TIMEOUT = 8
UA = {"User-Agent": "Suraksha-brand-monitor/1.0"}


def _get(url: str, params: Dict[str, Any]):
    return requests.get(url, params=params, headers=UA, timeout=TIMEOUT)


def search_bluesky(query: str, limit: int = 20) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    try:
        r = _get("https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors", {"q": query, "limit": limit})
        r.raise_for_status()
        out = [{
            "platform": "bluesky", "candidate_name": a.get("handle", ""),
            "display_name": a.get("displayName", ""), "description": a.get("description", ""),
            "avatar_url": a.get("avatar", ""), "created_at": a.get("createdAt", ""),
            "source_url": f"https://bsky.app/profile/{a.get('handle', '')}",
        } for a in r.json().get("actors", [])]
        return out, {"source": "bluesky", "ok": True, "count": len(out)}
    except Exception as e:  # network, rate-limit, bad JSON
        return [], {"source": "bluesky", "ok": False, "reason": f"unavailable: {type(e).__name__}"}


def search_mastodon(query: str, limit: int = 20, instance: str = "mastodon.social"):
    try:
        r = _get(f"https://{instance}/api/v2/search", {"q": query, "type": "accounts", "limit": limit})
        r.raise_for_status()
        out = [{
            "platform": "mastodon", "candidate_name": a.get("acct", ""),
            "display_name": a.get("display_name", ""), "description": a.get("note", ""),
            "avatar_url": a.get("avatar", ""), "created_at": a.get("created_at", ""),
            "source_url": a.get("url", ""),
        } for a in r.json().get("accounts", [])]
        return out, {"source": "mastodon", "ok": True, "count": len(out)}
    except Exception as e:
        return [], {"source": "mastodon", "ok": False, "reason": f"unavailable: {type(e).__name__}"}


SOURCES = {"bluesky": search_bluesky, "mastodon": search_mastodon}


def parse_import(text: str, fmt: str = "json") -> List[Dict[str, Any]]:
    """Analyst-supplied accounts (any platform). JSON list or CSV with username/display_name/bio/platform columns."""
    rows = json.loads(text) if fmt == "json" else list(csv.DictReader(io.StringIO(text)))
    out = []
    for r in rows[:500]:
        name = str(r.get("candidate_name") or r.get("username") or r.get("handle") or "").strip()
        if name:
            out.append({
                "platform": str(r.get("platform") or "imported"), "candidate_name": name,
                "display_name": str(r.get("display_name") or r.get("name") or ""),
                "description": str(r.get("description") or r.get("bio") or r.get("bio_text") or ""),
                "avatar_url": str(r.get("avatar_url") or ""), "source_url": str(r.get("source_url") or r.get("profile_url") or ""),
            })
    return out
