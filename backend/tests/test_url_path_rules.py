"""Rule-based URL path/structure signals: deterministic, explainable, brand-gated."""

from backend.app.detection.domain_detector import DomainDetector
from backend.app.detection.url_path_analysis import analyze_url_path, pick_url_with_path

BRAND = {"name": "Acme Finance", "domains": [{"domain": "acmefinance.com", "is_primary": True}]}


def signals(candidate):
    out = DomainDetector().evaluate_full(candidate, BRAND)
    return out, {s.signal_type: s for s in out.risk_evaluation.signals}


# ---- analyzer unit tests
def test_lure_tokens_are_whole_token_matches():
    a = analyze_url_path("https://x.example/accountants/blogin-news", ["acmefinance"])
    assert a.lure_tokens == []
    b = analyze_url_path("https://x.example/Secure/Sign-In/verify.php", ["acmefinance"])
    assert set(b.lure_tokens) >= {"secure", "signin", "verify"}


def test_brand_in_path_and_userinfo():
    a = analyze_url_path("http://acmefinance.com@evil.example/login", ["acmefinance"])
    assert a.hostname == "evil.example"
    assert a.brand_tokens_in_userinfo == ["acmefinance"]
    assert any(f.rule_id == "USERINFO_DECEPTION" for f in a.structure_findings)


def test_structure_rules():
    def rules(u):
        return {f.rule_id for f in analyze_url_path(u, ["acmefinance"]).structure_findings}

    assert "IP_LITERAL_HOST" in rules("http://203.0.113.9/acmefinance/app")
    assert "PAYLOAD_FILE_EXTENSION" in rules("https://x.example/acmefinance.apk")
    assert "EMBEDDED_REDIRECT" in rules("https://x.example/go?redirect=https://evil.example")
    assert "SENSITIVE_QUERY_PARAMETER" in rules("https://x.example/a?otp=123456")
    assert rules("https://x.example/docs/readme.html?page=2") == set()


def test_analyzer_is_safe_on_bad_input():
    assert not analyze_url_path(None, ["acmefinance"]).has_signals
    assert not analyze_url_path("x" * 5000, ["acmefinance"]).has_signals
    assert not analyze_url_path("http://[::1", ["acmefinance"]).has_signals  # malformed, must not raise


def test_pick_url_with_path():
    assert pick_url_with_path("acme.xyz", "https://acme.xyz/login") == "https://acme.xyz/login"
    assert pick_url_with_path("acme.xyz", None) is None


# ---- detector integration
def test_lure_path_on_brand_lookalike_host_fires():
    out, sig = signals({"candidate_name": "acmefinance-secure.xyz",
                        "source_url": "https://acmefinance-secure.xyz/account/verify/login.php"})
    s = sig["URL_PATH_CREDENTIAL_LURE"]
    assert s.severity_score >= 30.0 and s.confidence == 0.80
    assert "verify" in s.explanation and "/account/verify/login.php" in s.explanation
    assert any(e["evidence_type"] == "url_path_lure" for e in out.evidence_records)


def test_path_signals_do_not_fire_on_unrelated_sites():
    """/login on an unrelated site is normal; it must not create a finding."""
    out, sig = signals({"candidate_name": "unrelated-bakery.com", "source_url": "https://unrelated-bakery.com/login/verify"})
    assert "URL_PATH_CREDENTIAL_LURE" not in sig and "URL_DECEPTIVE_STRUCTURE" not in sig
    assert out.risk_evaluation.total_score == 0.0


def test_brand_in_path_on_foreign_host_is_low_confidence():
    _, sig = signals({"candidate_name": "sites.example.net",
                      "source_url": "https://sites.example.net/view/acmefinance-login"})
    s = sig["URL_PATH_CREDENTIAL_LURE"]
    assert s.confidence == 0.60 and s.severity_score == 20.0
    assert "legitimate third-party" in s.explanation


def test_userinfo_trick_flagged_with_real_host():
    _, sig = signals({"candidate_name": "http://acmefinance.com@evil-host.example/portal"})
    assert "evil-host.example" in sig["URL_DECEPTIVE_STRUCTURE"].explanation


def test_official_domain_paths_are_never_flagged():
    out, sig = signals({"candidate_name": "acmefinance.com", "source_url": "https://acmefinance.com/login/verify"})
    assert out.is_official is True and not sig


def test_multiple_structure_flags_raise_score_but_cap():
    _, sig = signals({"candidate_name": "203.0.113.9",
                      "source_url": "http://203.0.113.9/acmefinance/app.apk?redirect=https://evil.example&otp=1"})
    assert 30.0 < sig["URL_DECEPTIVE_STRUCTURE"].severity_score <= 45.0


def test_hostname_only_candidates_unchanged():
    """Candidates with no path keep the previous behaviour."""
    _, sig = signals({"candidate_name": "acmefinance-login.xyz"})
    assert "URL_PATH_CREDENTIAL_LURE" not in sig and "URL_DECEPTIVE_STRUCTURE" not in sig
