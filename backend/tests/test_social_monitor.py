from unittest.mock import patch

from backend.app import create_app

BRAND = {"name": "Acme", "social_handles": [{"handle": "acme.bsky.social"}]}
FAKE = [
    {"platform": "bluesky", "candidate_name": "acme.bsky.social", "display_name": "Acme", "description": "", "source_url": "u"},
    {"platform": "bluesky", "candidate_name": "acme-support-help.bsky.social", "display_name": "Acme Support",
     "description": "DM us your OTP for wallet recovery", "source_url": "u"},
    {"platform": "bluesky", "candidate_name": "gardenlover.bsky.social", "display_name": "Garden", "description": "plants", "source_url": "u"},
]


def _client():
    return create_app("testing").test_client()


def test_monitor_flags_fake_and_excludes_official():
    with patch.dict("backend.app.intel.social_sources.SOURCES",
                    {"bluesky": lambda q, limit=20: (FAKE, {"source": "bluesky", "ok": True, "count": 3})}, clear=True):
        r = _client().post("/api/v1/social/monitor", json={"brand_profile": BRAND})
    d = r.get_json()["data"]
    handles = [f["handle"] for f in d["flagged"]]
    assert "acme.bsky.social" not in handles
    assert "acme-support-help.bsky.social" in handles
    assert "gardenlover.bsky.social" not in handles
    assert d["official_excluded"] == 1


def test_source_down_is_reported_not_fatal():
    with patch.dict("backend.app.intel.social_sources.SOURCES",
                    {"bluesky": lambda q, limit=20: ([], {"source": "bluesky", "ok": False, "reason": "unavailable: Timeout"})}, clear=True):
        r = _client().post("/api/v1/social/monitor", json={"brand_profile": BRAND})
    assert r.status_code == 200
    assert r.get_json()["data"]["sources"][0]["ok"] is False


def test_requires_brand_name():
    assert _client().post("/api/v1/social/monitor", json={}).status_code == 422


def test_import_accounts_scored():
    r = _client().post("/api/v1/social/monitor", json={
        "brand_profile": BRAND, "sources": [],
        "accounts": [{"username": "acme_support_team", "bio": "send OTP to claim reward", "platform": "x"}]})
    d = r.get_json()["data"]
    assert d["scanned"] == 1 and d["flagged"][0]["platform"] == "x"
