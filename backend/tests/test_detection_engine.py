import pytest
from backend.app.database import get_db
from backend.app.models import Brand, BrandDomain, BrandSocialHandle, BrandAppIdentifier, BrandPublisher, Finding
from backend.app.detection.base import DetectionSignal, RiskScoreEngine
from backend.app.detection.similarity import NameSimilarityService
from backend.app.services.detection_service import DetectionService

@pytest.fixture
def brand_with_assets(app):
    """Seed a test brand with verified official assets."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="Acme Bank", description="Acme Financial Services")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        # Verified Domain
        domain = BrandDomain(brand_id=brand.id, domain="acmebank.com", is_primary=True)
        db.add(domain)

        # Verified Social Handle
        handle = BrandSocialHandle(
            brand_id=brand.id,
            platform="twitter",
            handle="acmebank",
            url="https://twitter.com/acmebank"
        )
        db.add(handle)

        # Verified Mobile App Identifier
        app_id = BrandAppIdentifier(
            brand_id=brand.id,
            platform="android_play_store",
            identifier="com.acmebank.mobile",
            app_name="Acme Mobile Banking"
        )
        db.add(app_id)

        # Verified Publisher
        pub = BrandPublisher(
            brand_id=brand.id,
            publisher_name="Acme Financial Corp",
            platform="android_play_store"
        )
        db.add(pub)

        db.commit()
        return brand.id

def test_exact_official_social_account_exclusion(app, brand_with_assets):
    """An exact registered official social account must be excluded from suspicious findings."""
    service = DetectionService()

    # Candidate with exact official handle
    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmebank",
        "platform": "twitter",
        "source_url": "https://twitter.com/acmebank",
    }

    result = service.evaluate_candidate(brand_with_assets, candidate, persist=True)

    assert result["is_official"] is True
    assert result["excluded"] is True
    assert "acmebank" in result["exclusion_reason"]
    assert result["risk_score"] == 0.0
    assert result["severity"] == "LOW"
    assert result["signals"] == []

    # Verify no threat finding was persisted in the database
    with app.app_context():
        db = get_db()
        findings = db.query(Finding).filter_by(brand_id=brand_with_assets).all()
        assert len(findings) == 0

def test_exact_official_app_identifier_exclusion(app, brand_with_assets):
    """An exact registered official app identifier must be excluded from suspicious findings."""
    service = DetectionService()

    # Candidate with exact official package ID
    candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Mobile Banking",
        "package_id": "com.acmebank.mobile",
        "platform": "android_play_store",
        "publisher_name": "Acme Financial Corp",
    }

    result = service.evaluate_candidate(brand_with_assets, candidate, persist=True)

    assert result["is_official"] is True
    assert result["excluded"] is True
    assert "com.acmebank.mobile" in result["exclusion_reason"]
    assert result["risk_score"] == 0.0
    assert result["severity"] == "LOW"

    # Verify no threat finding was persisted
    with app.app_context():
        db = get_db()
        findings = db.query(Finding).filter_by(brand_id=brand_with_assets).all()
        assert len(findings) == 0

def test_close_lookalike_social_impersonation(app, brand_with_assets):
    """Flag lookalike social accounts with trust keywords and mismatched external domains."""
    service = DetectionService()

    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmebank_support",
        "display_name": "Acme Bank Official Customer Care",
        "platform": "twitter",
        "source_url": "https://twitter.com/acmebank_support",
        "website_url": "https://acmebank-verify-login.xyz",
    }

    result = service.evaluate_candidate(brand_with_assets, candidate, persist=True)

    assert result["is_official"] is False
    assert result["excluded"] is False
    assert result["risk_score"] >= 80.0
    assert result["severity"] == "CRITICAL"

    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "NAME_SIMILARITY" in signal_types
    assert "IMPERSONATION_KEYWORDS" in signal_types
    assert "DOMAIN_MISMATCH" in signal_types

    # Verify finding was persisted with signals and evidence
    with app.app_context():
        db = get_db()
        finding = db.query(Finding).filter_by(brand_id=brand_with_assets).first()
        assert finding is not None
        assert finding.candidate_name == "@acmebank_support"
        assert finding.severity == "CRITICAL"
        assert len(finding.signals) == 3
        assert len(finding.evidence) >= 2

def test_unrelated_names_not_flagged(app, brand_with_assets):
    """Unrelated candidate accounts must not trigger false positive threat signals."""
    service = DetectionService()

    candidate = {
        "asset_type": "social",
        "candidate_name": "@green_gardening_tips",
        "display_name": "Green Gardening Tips",
        "platform": "twitter",
        "source_url": "https://twitter.com/green_gardening_tips",
    }

    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)

    assert result["is_official"] is False
    assert result["risk_score"] == 0.0
    assert result["severity"] == "LOW"
    assert len(result["signals"]) == 0

def test_publisher_mismatch_with_missing_data(app):
    """Missing publisher data must NOT be treated as a confirmed publisher mismatch."""
    with app.app_context():
        db = get_db()
        # Brand with no registered publishers
        brand = Brand(name="Solo Tech")
        db.add(brand)
        db.commit()
        db.refresh(brand)
        brand_id = brand.id

    service = DetectionService()

    # Candidate with publisher, but brand has no registered publishers
    candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "Solo Tech Notes",
        "publisher_name": "Indie Developer",
    }

    result = service.evaluate_candidate(brand_id, candidate, persist=False)
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "PUBLISHER_MISMATCH" not in signal_types

def test_publisher_mismatch_with_verified_publishers(app, brand_with_assets):
    """When both candidate and brand have publishers, unauthorized publishers are flagged."""
    service = DetectionService()

    candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Bank Quick Pay",
        "package_id": "com.acmebank.roguepay",
        "publisher_name": "Shady Loans LLC",
        "platform": "android_play_store",
    }

    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)
    signal_types = [s["signal_type"] for s in result["signals"]]

    assert "APP_TITLE_SIMILARITY" in signal_types
    assert "PACKAGE_ID_MISMATCH" in signal_types
    assert "PUBLISHER_MISMATCH" in signal_types
    assert result["severity"] in ("HIGH", "CRITICAL")

def test_score_bounds_and_severity_mapping():
    """Verify mathematical risk scoring limits (0-100) and severity threshold mapping."""
    # 1. Zero signals
    res0 = RiskScoreEngine.calculate_risk([])
    assert res0.total_score == 0.0
    assert res0.severity == "LOW"

    # 2. Low score (< 25)
    sig_low = [DetectionSignal("TEST_LOW", severity_score=20.0, confidence=1.0, explanation="low")]
    res_low = RiskScoreEngine.calculate_risk(sig_low)
    assert res_low.total_score == 20.0
    assert res_low.severity == "LOW"

    # 3. Medium score (25 - 49.9)
    sig_med = [DetectionSignal("TEST_MED", severity_score=35.0, confidence=1.0, explanation="med")]
    res_med = RiskScoreEngine.calculate_risk(sig_med)
    assert res_med.total_score == 35.0
    assert res_med.severity == "MEDIUM"

    # 4. High score (50 - 79.9)
    sig_high = [DetectionSignal("TEST_HIGH", severity_score=60.0, confidence=1.0, explanation="high")]
    res_high = RiskScoreEngine.calculate_risk(sig_high)
    assert res_high.total_score == 60.0
    assert res_high.severity == "HIGH"

    # 5. Critical score (>= 80) and capping at 100
    sig_crit = [
        DetectionSignal("TEST_1", severity_score=60.0, confidence=1.0, explanation="1"),
        DetectionSignal("TEST_2", severity_score=60.0, confidence=1.0, explanation="2"),
    ]
    res_crit = RiskScoreEngine.calculate_risk(sig_crit)
    assert res_crit.total_score == 100.0  # Capped at 100
    assert res_crit.severity == "CRITICAL"

def test_repeated_scans_and_duplicate_prevention(app, brand_with_assets):
    """Repeated scans of the same candidate must update the existing finding rather than duplicate."""
    service = DetectionService()

    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmebank_claims",
        "platform": "twitter",
        "source_url": "https://twitter.com/acmebank_claims",
    }

    # First scan
    res1 = service.evaluate_candidate(brand_with_assets, candidate, persist=True)
    finding_id1 = res1["finding"]["id"]

    # Second scan with updated display name
    candidate["display_name"] = "Acme Bank Official Insurance"
    res2 = service.evaluate_candidate(brand_with_assets, candidate, persist=True)
    finding_id2 = res2["finding"]["id"]

    # Must be the exact same finding ID
    assert finding_id1 == finding_id2

    # Database count must remain 1
    with app.app_context():
        db = get_db()
        findings = db.query(Finding).filter_by(brand_id=brand_with_assets).all()
        assert len(findings) == 1

def test_scan_api_endpoint(client, brand_with_assets):
    """Verify POST /api/v1/brands/<id>/scan REST endpoint returns structured response."""
    payload = {
        "asset_type": "social",
        "candidate_name": "@acmebank_alerts",
        "source_url": "https://twitter.com/acmebank_alerts",
    }
    response = client.post(f"/api/v1/brands/{brand_with_assets}/scan", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["candidate_name"] == "@acmebank_alerts"
    assert data["data"]["risk_score"] > 0
    assert "signals" in data["data"]


def test_subdomain_brand_abuse(app, brand_with_assets):
    """Subdomain prefix brand hijacking (e.g. acmebank.claims-portal.com) must be flagged with high/critical severity."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "acmebank.claims-portal.com",
        "source_url": "https://acmebank.claims-portal.com",
    }
    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)
    assert result["is_official"] is False
    assert result["risk_score"] >= 70.0
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "SUBDOMAIN_BRAND_ABUSE" in signal_types


def test_combosquatting_domain(app, brand_with_assets):
    """Combosquatting in domain root (e.g. fake-acmebank.com) must be flagged with combosquatting signal."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "fake-acmebank.com",
        "source_url": "https://fake-acmebank.com",
    }
    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)
    assert result["is_official"] is False
    assert result["risk_score"] >= 50.0
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "DOMAIN_COMBOSQUATTING" in signal_types or "LOOKALIKE_DOMAIN" in signal_types


def test_generic_credential_lure_not_legitimate(app, brand_with_assets):
    """Generic credential phishing lures with high risk TLD must not be classified as LEGITIMATE."""
    service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "auth-login-verify-account.top",
        "source_url": "https://auth-login-verify-account.top",
    }
    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)
    assert result["is_official"] is False
    assert result["risk_score"] > 0.0
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "CREDENTIAL_LURE_SUSPICION" in signal_types


def test_long_social_handle_brand_containment(app, brand_with_assets):
    """Long social handles embedding the brand mark alongside lure keywords must not drop below detection thresholds."""
    service = DetectionService()
    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmebank_official_support_helpdesk",
        "platform": "twitter",
    }
    result = service.evaluate_candidate(brand_with_assets, candidate, persist=False)
    assert result["is_official"] is False
    assert result["risk_score"] >= 50.0
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "IMPERSONATION_KEYWORDS" in signal_types


def test_unauthorized_package_id_without_official_apps(app):
    """An unverified app package embedding the brand mark must be flagged even when no official apps exist."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="ApexCredit")
        db.add(brand)
        db.commit()
        brand_id = brand.id

    service = DetectionService()
    candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "ApexCredit Instant Cash",
        "package_id": "com.apexcredit.wallet",
    }
    result = service.evaluate_candidate(brand_id, candidate, persist=False)
    assert result["is_official"] is False
    assert result["risk_score"] >= 35.0
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "UNAUTHORIZED_PACKAGE_BRAND_EMBEDDING" in signal_types or "PACKAGE_ID_MISMATCH" in signal_types

