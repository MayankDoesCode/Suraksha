import pytest
from backend.app.services.brand_service import BrandService
from backend.app.services.detection_service import DetectionService
from backend.app.repositories.brand_repository import BrandRepository
from backend.app.ai.risk_classifier import RiskClassifier


@pytest.fixture
def test_brand(app):
    """Create test brand with official assets using BrandService."""
    service = BrandService()
    brand_data = {
        "name": "Acme FinTech",
        "description": "Enterprise financial platform",
        "domains": [{"domain": "acmefinance.com", "is_primary": True}],
        "social_handles": [{"platform": "twitter", "handle": "acmefinance", "url": "https://twitter.com/acmefinance"}],
        "app_identifiers": [{"platform": "android_play_store", "identifier": "com.acmefinance.app", "app_name": "Acme Mobile Banking"}],
        "publishers": [{"publisher_name": "Acme Financial Services Ltd", "platform": "android_play_store"}],
    }
    created = service.create_brand(brand_data)
    repo = BrandRepository()
    return repo.get_by_id(created["id"])


def test_official_asset_exclusion_zero_risk(test_brand):
    """
    Non-negotiable requirement: Official verified assets MUST be excluded,
    receive 0.0 risk, and not be persisted as suspicious findings.
    """
    detection_service = DetectionService()

    # Exact official mobile app package
    official_app_cand = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Mobile Banking",
        "package_id": "com.acmefinance.app",
        "platform": "android_play_store",
    }
    result = detection_service.evaluate_candidate(test_brand.id, official_app_cand, persist=True)
    assert result["is_official"] is True
    assert result["excluded"] is True
    assert result["risk_score"] == 0.0
    assert result["final_risk_score"] == 0.0
    assert result["rule_based_score"] == 0.0
    assert result["persisted"] is False
    assert result["finding"] is None


def test_suspicious_candidate_hybrid_evaluation_and_persistence(test_brand):
    """
    Verify suspicious candidate receives rule-based signals and ML classification,
    producing a composite risk score and persisted finding.
    """
    detection_service = DetectionService()

    suspicious_cand = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_support",
        "display_name": "Acme Customer Care Desk",
        "source_url": "https://twitter.com/acmefinance_support",
        "website_url": "https://acme-kyc-verify.xyz",
        "description": "Urgent account verification helpdesk.",
    }

    result = detection_service.evaluate_candidate(test_brand.id, suspicious_cand, persist=True)
    assert result["is_official"] is False
    assert result["excluded"] is False
    assert result["risk_score"] > 50.0
    assert result["severity"] in ("HIGH", "CRITICAL")
    assert result["rule_based_score"] > 0.0
    assert result["ml_risk_score"] is not None
    assert result["ml_predicted_class"] == "SUSPICIOUS"
    assert result["ml_fallback_used"] is False

    # Check finding persistence
    finding = result["finding"]
    assert finding is not None
    assert finding["candidate_name"] == "@acmefinance_support"
    assert finding["final_risk_score"] == result["risk_score"]
    assert finding["rule_based_score"] == result["rule_based_score"]
    assert finding["ml_risk_score"] == result["ml_risk_score"]
    assert finding["ml_predicted_class"] == "SUSPICIOUS"
    assert finding["ml_fallback_used"] is False

    # Signals must contain deterministic signals
    signal_types = [s["signal_type"] for s in result["signals"]]
    assert "NAME_SIMILARITY" in signal_types or "IMPERSONATION_KEYWORDS" in signal_types


def test_deterministic_fallback_when_ml_missing(test_brand, tmp_path):
    """
    Verify that if the ML model is missing, the detection service falls back
    to deterministic rule scoring without error.
    """
    missing_model = tmp_path / "absent.joblib"
    fallback_clf = RiskClassifier(model_path=missing_model)
    detection_service = DetectionService(risk_classifier=fallback_clf)

    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_care",
        "display_name": "Acme Customer Care",
        "description": "Helpdesk support",
    }

    result = detection_service.evaluate_candidate(test_brand.id, candidate, persist=True)
    assert result["ml_fallback_used"] is True
    assert result["ml_risk_score"] is None
    assert result["ml_predicted_class"] == "UNKNOWN"
    assert result["final_risk_score"] == result["rule_based_score"]
    assert result["finding"]["ml_fallback_used"] is True
