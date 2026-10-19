import pytest
from backend.app.database import get_db
from backend.app.models import Brand, BrandDomain
from backend.app.detection.domain_detector import DomainDetector, extract_domain_components
from backend.app.services.detection_service import DetectionService


@pytest.fixture
def brand_with_domain(app):
    """Seed a test brand with a verified official domain asset."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="Acme Bank", description="Official Acme Bank")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        domain = BrandDomain(brand_id=brand.id, domain="acmebank.com", is_primary=True)
        db.add(domain)
        db.commit()
        return brand.id


def test_extract_domain_components():
    """Verify robust extraction of hostname, SLD, and TLD from varied URLs and host strings."""
    c1 = extract_domain_components("https://secure.acmebank.com/login?ref=1")
    assert c1["hostname"] == "secure.acmebank.com"
    assert c1["sld"] == "acmebank"
    assert c1["tld"] == "com"

    c2 = extract_domain_components("acmebank-login.xyz")
    assert c2["hostname"] == "acmebank-login.xyz"
    assert c2["sld"] == "acmebank-login"
    assert c2["tld"] == "xyz"

    c3 = extract_domain_components("http://acmebank.org:8080/portal")
    assert c3["hostname"] == "acmebank.org"
    assert c3["sld"] == "acmebank"
    assert c3["tld"] == "org"


def test_official_domain_exact_exclusion(app, brand_with_domain):
    """Exact match against registered domain must return is_official=True and 0 risk score."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "acmebank.com",
        "source_url": "https://acmebank.com",
    }
    outcome = service.evaluate_candidate(brand_with_domain, candidate, persist=False)
    assert outcome["is_official"] is True
    assert "Exact match against verified official domain" in outcome["exclusion_reason"]
    assert outcome["final_risk_score"] == 0.0
    assert len(outcome["signals"]) == 0


def test_official_subdomain_exclusion(app, brand_with_domain):
    """Authorized subdomain of official domain must be excluded from suspicious findings."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "portal.acmebank.com",
        "source_url": "https://portal.acmebank.com/auth",
    }
    outcome = service.evaluate_candidate(brand_with_domain, candidate, persist=False)
    assert outcome["is_official"] is True
    assert "Authorized subdomain" in outcome["exclusion_reason"]
    assert outcome["final_risk_score"] == 0.0


def test_tld_swap_impersonation(app, brand_with_domain):
    """Exact brand name registered under an unverified high-risk TLD triggers TLD_SWAP_IMPERSONATION."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "acmebank.xyz",
        "source_url": "https://acmebank.xyz",
    }
    outcome = service.evaluate_candidate(brand_with_domain, candidate, persist=False)
    assert outcome["is_official"] is False
    assert outcome["final_risk_score"] > 30.0

    sig_types = [s["signal_type"] for s in outcome["signals"]]
    assert "TLD_SWAP_IMPERSONATION" in sig_types


def test_phishing_keyword_in_domain(app, brand_with_domain):
    """Domain with phishing lure keywords and brand token triggers PHISHING_KEYWORD_IN_DOMAIN."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "acmebank-login-verify.com",
        "source_url": "https://acmebank-login-verify.com",
    }
    outcome = service.evaluate_candidate(brand_with_domain, candidate, persist=False)
    assert outcome["is_official"] is False
    assert outcome["final_risk_score"] >= 35.0

    sig_types = [s["signal_type"] for s in outcome["signals"]]
    assert "PHISHING_KEYWORD_IN_DOMAIN" in sig_types


def test_homoglyph_substitution_domain(app, brand_with_domain):
    """Domain with leetspeak/homoglyphs triggers HOMOGLYPH_SUBSTITUTION signal."""
    detector = DomainDetector()
    brand_profile = {
        "name": "Acme Bank",
        "domains": [{"domain": "acmebank.com"}],
    }
    candidate = {
        "candidate_name": "acm3bank.com",
        "source_url": "https://acm3bank.com",
    }
    outcome = detector.evaluate_full(candidate, brand_profile)
    assert outcome.is_official is False
    sig_types = [s.signal_type for s in outcome.risk_evaluation.signals]
    assert "HOMOGLYPH_SUBSTITUTION" in sig_types


def test_cyrillic_punycode_lookalike_detection(app, brand_with_domain):
    """Punycode or Unicode domain with Cyrillic look-alikes triggers UNICODE_HOMOGLYPH_IMPERSONATION."""
    detector = DomainDetector()
    brand_profile = {
        "name": "Acme Bank",
        "domains": [{"domain": "acmebank.com"}],
    }
    # \u0430 is Cyrillic Small Letter A, punycode: xn--cmebank-1fg.com
    candidate = {
        "candidate_name": "xn--cmebank-1fg.com",
        "source_url": "https://xn--cmebank-1fg.com/login",
    }
    outcome = detector.evaluate_full(candidate, brand_profile)
    assert outcome.is_official is False
    sig_types = [s.signal_type for s in outcome.risk_evaluation.signals]
    assert "UNICODE_HOMOGLYPH_IMPERSONATION" in sig_types
    # Verify original input preserved in evidence
    evidence_refs = [e["source_reference"] for e in outcome.evidence_records]
    assert "xn--cmebank-1fg.com" in evidence_refs or "https://xn--cmebank-1fg.com/login" in evidence_refs


def test_greek_lookalike_detection(app, brand_with_domain):
    """Domain with Greek lookalike characters (e.g. Greek alpha \u03b1 or omicron \u03bf) is flagged."""
    detector = DomainDetector()
    brand_profile = {
        "name": "Acme Bank",
        "domains": [{"domain": "acmebank.com"}],
    }
    # \u03b1 is Greek small letter alpha -> mimics Latin 'a' in 'acmebank'
    candidate = {
        "candidate_name": "\u03b1cmebank.com",
        "source_url": "https://\u03b1cmebank.com",
    }
    outcome = detector.evaluate_full(candidate, brand_profile)
    assert outcome.is_official is False
    sig_types = [s.signal_type for s in outcome.risk_evaluation.signals]
    assert "UNICODE_HOMOGLYPH_IMPERSONATION" in sig_types


def test_malformed_and_invalid_unicode_handling():
    """Malformed domains and invalid IDNA strings are handled safely without crashing."""
    c1 = extract_domain_components("xn--invalid%%--.com")
    assert c1["hostname"] == "xn--invalid%%--.com"
    assert c1["sld"] == "xn--invalid%%--"

    c2 = extract_domain_components("test\x00nullbyte.com")
    assert "\x00" not in c2["hostname"]

    c3 = extract_domain_components("")
    assert c3["hostname"] == ""
    assert c3["sld"] == ""

    # Should not raise exception
    detector = DomainDetector()
    res = detector.evaluate_full({"candidate_name": "xn--invalid%%--.com"}, {"name": "Test", "domains": []})
    assert res.is_official is False


def test_legitimate_non_ascii_not_falsely_flagged():
    """Legitimate non-Latin domain not mimicking the brand is not flagged as homoglyph impersonation."""
    detector = DomainDetector()
    brand_profile = {
        "name": "Acme Bank",
        "domains": [{"domain": "acmebank.com"}],
    }
    # Chinese IDN for China (xn--fiqs8s.cn / \u4e2d\u56fd.cn)
    candidate = {
        "candidate_name": "xn--fiqs8s.cn",
        "source_url": "https://xn--fiqs8s.cn",
    }
    outcome = detector.evaluate_full(candidate, brand_profile)
    sig_types = [s.signal_type for s in outcome.risk_evaluation.signals]
    assert "UNICODE_HOMOGLYPH_IMPERSONATION" not in sig_types


def test_international_official_domain_exclusion(app):
    """Internationalized official domain (e.g. b\u00e4cker.de) is excluded when matched in Punycode or Unicode."""
    detector = DomainDetector()
    brand_profile = {
        "name": "B\u00e4cker",
        "domains": [{"domain": "b\u00e4cker.de"}],
    }
    # Exact match in Punycode (xn--bcker-gra.de)
    res_puny = detector.evaluate_full({"candidate_name": "xn--bcker-gra.de"}, brand_profile)
    assert res_puny.is_official is True
    assert "Exact match against verified official domain" in res_puny.exclusion_reason

    # Subdomain in Unicode
    res_sub = detector.evaluate_full({"candidate_name": "auth.b\u00e4cker.de"}, brand_profile)
    assert res_sub.is_official is True
    assert "Authorized subdomain" in res_sub.exclusion_reason

