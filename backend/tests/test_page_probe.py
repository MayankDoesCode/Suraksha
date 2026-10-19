from backend.app.intel import page_probe as pp
from backend.app.intel import netsafe


def _public(monkeypatch):
    monkeypatch.setattr(pp, "resolve_public", lambda h, *a, **k: ["8.8.8.8"])


def _page(**kw):
    return {"final_url": "https://x.example/", "title": "Sign in", "text": "Welcome to Acme", "has_password_field": True, "png": None, **kw}


def test_disabled_by_default_and_never_fetches(monkeypatch):
    monkeypatch.delenv("PAGE_PROBE_ENABLED", raising=False)
    calls = []
    r = pp.PageProbe(fetch=lambda *a: calls.append(a)).probe("x.example", "Acme")
    assert r["enabled"] is False and not calls


def test_login_plus_brand_text_signals(monkeypatch):
    _public(monkeypatch)
    r = pp.PageProbe(fetch=lambda h, t: _page(), refs_dir="nope").probe("x.example", "Acme", force=True)
    assert {s.signal_type for s in r["signals"]} == {"PAGE_LOGIN_FORM", "PAGE_BRAND_TEXT_WITH_LOGIN"}
    assert any("no reference screenshot" in s for s in r["skipped"])


def test_brand_text_alone_is_weak(monkeypatch):
    _public(monkeypatch)
    r = pp.PageProbe(fetch=lambda h, t: _page(has_password_field=False), refs_dir="nope").probe("x.example", "Acme", force=True)
    assert [s.signal_type for s in r["signals"]] == ["PAGE_BRAND_TEXT"] and r["signals"][0].severity_score <= 6


def test_internal_target_refused_without_fetch(monkeypatch):
    calls = []
    r = pp.PageProbe(fetch=lambda *a: calls.append(a)).probe("localhost", "Acme", force=True)
    assert not calls and r["skipped"][0].startswith("refused")


def test_dns_to_private_ip_refused(monkeypatch):
    def boom(host, *a, **k):
        raise netsafe.UnsafeTarget("private")
    monkeypatch.setattr(pp, "resolve_public", boom)
    calls = []
    r = pp.PageProbe(fetch=lambda *a: calls.append(a)).probe("evil.example", "Acme", force=True)
    assert not calls and r["signals"] == []


def test_visual_signal_uses_phash_distance(monkeypatch, tmp_path):
    _public(monkeypatch)
    (tmp_path / "acme.png").write_bytes(b"ref")
    monkeypatch.setattr(pp, "phash_distance", lambda a, b: 4)
    r = pp.PageProbe(fetch=lambda h, t: _page(png=b"shot", has_password_field=False, text="x", title="x"), refs_dir=str(tmp_path)).probe("x.example", "Acme", force=True)
    assert "PAGE_VISUAL_SIMILARITY" in {s.signal_type for s in r["signals"]} and r["visual_similarity"] == round(1 - 4 / 64, 3)
    monkeypatch.setattr(pp, "phash_distance", lambda a, b: 30)
    r = pp.PageProbe(fetch=lambda h, t: _page(png=b"shot", has_password_field=False, text="x", title="x"), refs_dir=str(tmp_path)).probe("x.example", "Acme", force=True)
    assert r["signals"] == []


def test_missing_playwright_is_reported(monkeypatch):
    _public(monkeypatch)
    def nope(h, t):
        raise ImportError("playwright")
    r = pp.PageProbe(fetch=nope).probe("x.example", "Acme", force=True)
    assert r["skipped"] == ["playwright is not installed"]
