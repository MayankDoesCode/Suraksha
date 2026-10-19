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
        "followers_count": 3,
        "following_count": 2400,
        "media_count": 0,
        "has_profile_pic": False,
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
    # Generic fake-account probability is reported, never blended into brand risk.
    assert result["ml_fused_into_score"] is False
    assert result["final_risk_score"] == result["rule_based_score"]

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


def test_specialized_url_pipeline_routing(test_brand):
    """Domain candidate routes strictly to specialized URL phishing ML pipeline."""
    detection_service = DetectionService()
    domain_candidate = {
        "asset_type": "domain",
        "candidate_name": "acmefinance-login-portal.xyz",
        "source_url": "https://acmefinance-login-portal.xyz",
    }
    result = detection_service.evaluate_candidate(test_brand.id, domain_candidate, persist=False)
    assert result["asset_type"] == "domain"
    assert result["is_official"] is False
    assert result["ml_model_version"] is not None
    assert result["ml_model_version"].startswith("url_phishing_v")
    assert result["ml_predicted_class"] in ("SUSPICIOUS", "LEGITIMATE")
    # Verify evidence records URL classification provenance
    ev_types = [e["evidence_type"] for e in result["evidence"]]
    assert "url_phishing_ml_classification" in ev_types


def test_mobile_app_explicit_heuristic_evaluation(test_brand):
    """Mobile app candidates must be explicitly marked heuristic without fabricated ML predictions."""
    detection_service = DetectionService()
    app_candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Fake Banking",
        "package_id": "com.fraudulent.acme.bank",
        "publisher_name": "Unknown Hacker Ltd",
        "platform": "android_play_store",
    }
    result = detection_service.evaluate_candidate(test_brand.id, app_candidate, persist=False)
    assert result["asset_type"] == "mobile_app"
    assert result["is_official"] is False
    assert result["ml_fallback_used"] is True
    assert result["ml_predicted_class"] == "HEURISTIC_EVALUATION"
    assert result["ml_risk_score"] is None
    # Risk score comes purely from deterministic rules
    assert result["final_risk_score"] == result["rule_based_score"]
    ev_types = [e["evidence_type"] for e in result["evidence"]]
    assert "heuristic_risk_evaluation" in ev_types



def test_social_without_metadata_skips_fake_model(test_brand):
    """Missing follower/following/post counts must not be imputed as zeros (which reads as 'bot')."""
    detection_service = DetectionService()
    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_support",
        "display_name": "Acme Customer Care Desk",
        "description": "Urgent account verification helpdesk.",
    }
    result = detection_service.evaluate_candidate(test_brand.id, candidate, persist=False)
    assert result["ml_fallback_used"] is True
    assert result["ml_risk_score"] is None
    assert result["ml_fused_into_score"] is False
    assert result["final_risk_score"] == result["rule_based_score"]
    assert "missing_data" in [e["evidence_type"] for e in result["evidence"]]


def test_url_ml_reported_as_evidence_not_fused(test_brand):
    """URL lexical ML is evidence only: final score equals the deterministic rule score."""
    detection_service = DetectionService()
    candidate = {
        "asset_type": "domain",
        "candidate_name": "acmefinance-login-portal.xyz",
        "source_url": "https://acmefinance-login-portal.xyz/verify/account",
    }
    result = detection_service.evaluate_candidate(test_brand.id, candidate, persist=False)
    assert result["ml_fallback_used"] is False
    assert result["ml_risk_score"] is not None
    assert result["ml_fused_into_score"] is False
    assert result["final_risk_score"] == result["rule_based_score"]
    url_ev = [e for e in result["evidence"] if e["evidence_type"] == "url_phishing_ml_classification"]
    assert url_ev and "not included in the risk score" in url_ev[0]["description"]


def test_url_ml_score_cannot_change_final_score(test_brand):
    """Swapping in a URL model with an extreme score must not move final_risk_score."""

    class StubML:
        def __init__(self, score):
            self.score = score

        def is_url_model_available(self):
            return True

        def predict_url_risk(self, indicator):
            return {"available": True, "risk_score": self.score, "risk_probability": self.score / 100,
                    "is_phishing_risk": self.score >= 50, "model_version": "stub"}

    candidate = {"asset_type": "domain", "candidate_name": "acmefinance-secure-login.top"}
    low = DetectionService(ml_service=StubML(0.0)).evaluate_candidate(test_brand.id, candidate, persist=False)
    high = DetectionService(ml_service=StubML(100.0)).evaluate_candidate(test_brand.id, candidate, persist=False)
    assert low["final_risk_score"] == high["final_risk_score"] == low["rule_based_score"]
    assert low["severity"] == high["severity"]
    assert low["detection_confidence"] == high["detection_confidence"]



def test_generic_classifier_never_affects_scores(test_brand):
    """
    The n=60 generic RandomForest must not influence any finding. Unknown asset
    types are routed to the social detector, so the generic classifier is never
    consulted; this guards against it being silently re-wired into scoring.
    """

    class SpyClassifier:
        def __init__(self, score):
            self.score = score
            self.calls = 0

        def is_available(self):
            return True

        def get_version(self):
            return "stub"

        def classify(self, candidate_data, brand_profile=None):
            self.calls += 1
            return {"fallback_used": False, "ml_risk_score": self.score, "confidence": 0.99,
                    "predicted_class": "SUSPICIOUS", "model_version": "stub"}

    candidates = [
        {"candidate_name": "@acmefinance_support",
         "display_name": "Acme Customer Care", "description": "Urgent verification helpdesk"},
        {"asset_type": "domain", "candidate_name": "acmefinance-login-portal.xyz"},
        {"asset_type": "social", "candidate_name": "@acmefinance_care", "display_name": "Acme Care"},
    ]
    for cand in candidates:
        low_spy, high_spy = SpyClassifier(0.0), SpyClassifier(100.0)
        low = DetectionService(risk_classifier=low_spy).evaluate_candidate(test_brand.id, cand, persist=False)
        high = DetectionService(risk_classifier=high_spy).evaluate_candidate(test_brand.id, cand, persist=False)
        assert low_spy.calls == high_spy.calls == 0, cand["asset_type"]
        assert low["final_risk_score"] == high["final_risk_score"] == low["rule_based_score"]
        assert low["severity"] == high["severity"]


def test_unknown_asset_type_is_rejected(test_brand):
    """Unknown asset types must not be silently scored by the social detector."""
    from backend.app.utils.errors import ValidationError
    with pytest.raises(ValidationError) as exc:
        DetectionService().evaluate_candidate(
            test_brand.id, {"asset_type": "marketplace_listing", "candidate_name": "Acme Store"}, persist=False)
    assert "marketplace_listing" in str(exc.value.message)
    assert exc.value.details[0]["field"] == "asset_type"


def test_missing_asset_type_is_labelled_as_assumption(test_brand):
    result = DetectionService().evaluate_candidate(
        test_brand.id, {"candidate_name": "@acmefinance_care", "display_name": "Acme Care"}, persist=False)
    assert result["asset_type"] == "social"
    assert result["asset_type_defaulted"] is True
    assert "assumption" in [e["evidence_type"] for e in result["evidence"]]


def test_platform_aliases_route_to_expected_detector(test_brand):
    svc = DetectionService()
    assert svc.evaluate_candidate(test_brand.id, {"asset_type": "Instagram", "candidate_name": "@acme_care"}, persist=False)["asset_type"] == "social"
    assert svc.evaluate_candidate(test_brand.id, {"asset_type": "url", "candidate_name": "acmefinance-login.xyz"}, persist=False)["asset_type"] == "domain"
    explicit = svc.evaluate_candidate(test_brand.id, {"asset_type": "social", "candidate_name": "@acme_care"}, persist=False)
    assert explicit["asset_type_defaulted"] is False


def test_scan_api_returns_422_for_unknown_asset_type(client, test_brand):
    resp = client.post(f"/api/v1/brands/{test_brand.id}/scan",
                       json={"asset_type": "quantum_device", "candidate_name": "Acme"})
    assert resp.status_code == 422
    body = resp.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
