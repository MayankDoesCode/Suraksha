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
