from unittest.mock import patch

from backend.app import create_app

BRAND = {"name": "Acme", "app_identifiers": [{"identifier": "com.acme.wallet"}],
         "publishers": [{"publisher_name": "Acme Corp"}]}
FAKE = [
    {"platform": "ios", "store": "App Store", "candidate_name": "Acme Wallet", "package_id": "com.acme.wallet", "publisher_name": "Acme Corp"},
    {"platform": "ios", "store": "App Store", "candidate_name": "Acme Wallet Rewards", "package_id": "com.randomdev.acmewallet",
     "publisher_name": "Random Dev", "description": "claim your acme reward"},
    {"platform": "ios", "store": "App Store", "candidate_name": "Garden Planner", "package_id": "com.garden.plan", "publisher_name": "Leaf Ltd"},
]


def _post(body, sources=None):
    client = create_app("testing").test_client()
    if sources is None:
        return client.post("/api/v1/apps/monitor", json=body)
    with patch.dict("backend.app.intel.app_sources.SOURCES", sources, clear=True):
        return client.post("/api/v1/apps/monitor", json=body)


def test_flags_rogue_and_excludes_official():
    ok = lambda q, **k: (FAKE, {"source": "app_store", "ok": True, "count": 3})
    d = _post({"brand_profile": BRAND}, {"app_store": ok}).get_json()["data"]
    titles = [f["title"] for f in d["flagged"]]
    assert "Acme Wallet Rewards" in titles
    assert "Garden Planner" not in titles
    assert d["official_excluded"] == 1


def test_source_down_reported():
    down = lambda q, **k: ([], {"source": "app_store", "ok": False, "reason": "unavailable: Timeout"})
    r = _post({"brand_profile": BRAND}, {"app_store": down})
    assert r.status_code == 200 and r.get_json()["data"]["sources"][0]["ok"] is False


def test_import_android_listing():
    r = _post({"brand_profile": BRAND, "sources": [],
               "listings": [{"app_title": "Acme Wallet Pro", "package_id": "net.fake.acme", "developer": "Unknown", "store": "Google Play"}]},
              {})
    d = r.get_json()["data"]
    assert d["scanned"] == 1 and d["flagged"][0]["platform"] == "android"


def test_requires_name():
    assert _post({}).status_code == 422
