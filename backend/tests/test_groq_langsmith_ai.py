import json
from unittest.mock import MagicMock, patch
import pytest

from backend.app.ai.groq_service import (
    GroqAIService,
    AIServiceError,
    AITimeoutError,
    AIOutputValidationError,
)
from backend.app.ai.langsmith_client import LangSmithObservability, redact_sensitive_data
from backend.app.ai.evaluations import run_ai_grounding_evaluations
from backend.app.models.brand import Brand
from backend.app.models.threat import Finding, DetectionSignalRecord
from backend.app.database import get_db
from backend.app.utils.auth import create_dev_token


def test_missing_groq_configuration_fallback():
    """When GROQ_API_KEY is not set, service gracefully produces deterministic epistemic analysis."""
    service = GroqAIService(api_key=None)
    assert not service.is_available()

    brand_profile = {"id": "b1", "name": "Paytm", "official_domains": ["paytm.com"]}
    finding = {
        "id": "f1",
        "candidate_name": "paytmm.com",
        "asset_type": "domain",
        "source_url": "https://paytmm.com",
        "risk_score": 80.0,
        "detection_source": "Lookalike Scanner",
    }
    signals = [
        {"signal_type": "TYPO", "severity": "high", "explanation": "Extra 'm' character detected."}
    ]

    result = service.generate_investigation_brief(
        brand_profile=brand_profile,
        finding=finding,
        signals=signals,
        evidence=[],
    )

    assert result["is_ai_generated"] is False
    assert result["provider"] == "deterministic_rules"
    assert result["detector_risk_score"] == 80.0
    assert result["auto_confirmed"] is False

    analysis = result["structured_analysis"]
    assert "paytmm.com" in " ".join(analysis["observed_facts"])
    assert len(analysis["observed_facts"]) > 0
    assert len(analysis["model_inferences"]) > 0
    assert len(analysis["unverified_claims"]) > 0
    assert len(analysis["recommended_actions"]) > 0
    assert "confidence_limitations" in analysis


def test_groq_successful_investigation_mocked():
    """Mocked Groq client successfully parses structured JSON analysis."""
    service = GroqAIService(api_key="gsk_mock_valid_key_for_unit_tests")
    mock_client = MagicMock()

    mock_content = json.dumps({
        "summary": "Candidate 'paytmm.com' is a lookalike domain targeting Paytm with high risk.",
        "observed_facts": [
            "Candidate identifier: 'paytmm.com' (domain).",
            "Target brand under surveillance: 'Paytm'.",
        ],
        "model_inferences": [
            "Lexical similarity algorithm detected single character repetition.",
        ],
        "unverified_claims": [
            "Hosting infrastructure operator identity remains unverified.",
        ],
        "recommended_actions": [
            "Query WHOIS database to check registrant proxy.",
            "Inspect URL in sandbox browser.",
        ],
        "confidence_limitations": "Advisory only; lacks live HTTP payload analysis.",
    })

    mock_choice = MagicMock()
    mock_choice.message.content = mock_content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    service._client = mock_client

    brand_profile = {"id": "b1", "name": "Paytm", "official_domains": ["paytm.com"]}
    finding = {
        "id": "f1",
        "candidate_name": "paytmm.com",
        "asset_type": "domain",
        "risk_score": 85.0,
    }

    result = service.generate_investigation_brief(
        brand_profile=brand_profile,
        finding=finding,
        signals=[{"signal_type": "TYPO", "severity": "high", "explanation": "Extra 'm'"}],
    )

    assert result["is_ai_generated"] is True
    assert result["provider"] == "groq"
    assert result["detector_risk_score"] == 85.0
    assert result["auto_confirmed"] is False
    assert result["structured_analysis"]["summary"].startswith("Candidate 'paytmm.com'")
    assert len(result["structured_analysis"]["observed_facts"]) == 2


def test_groq_provider_timeout_fallback():
    """Provider timeout gracefully falls back to deterministic analysis without crashing."""
    service = GroqAIService(api_key="gsk_mock_key", max_retries=1)
    mock_client = MagicMock()

    # Raise exception on completions.create
    mock_client.chat.completions.create.side_effect = TimeoutError("Connection timed out after 15.0s")
    service._client = mock_client

    brand_profile = {"id": "b1", "name": "Paytm"}
    finding = {"id": "f1", "candidate_name": "paytmm.com", "risk_score": 75.0}

    result = service.generate_investigation_brief(
        brand_profile=brand_profile,
        finding=finding,
        signals=[],
    )

    assert result["is_ai_generated"] is False
    assert result["error_fallback"] is True
    assert result["detector_risk_score"] == 75.0
    assert "time" in result["error_message"].lower()
    assert "paytmm.com" in result["structured_analysis"]["summary"]


def test_groq_malformed_json_fallback():
    """Malformed model output gracefully recovers with deterministic brief."""
    service = GroqAIService(api_key="gsk_mock_key", max_retries=1)
    mock_client = MagicMock()

    mock_choice = MagicMock()
    mock_choice.message.content = '{"summary": "Incomplete JSON missing required fields...'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    service._client = mock_client

    brand_profile = {"id": "b1", "name": "Paytm"}
    finding = {"id": "f1", "candidate_name": "paytmm.com", "risk_score": 70.0}

    result = service.generate_investigation_brief(
        brand_profile=brand_profile,
        finding=finding,
        signals=[],
    )

    assert result["is_ai_generated"] is False
    assert result["error_fallback"] is True
    assert "paytmm.com" in result["structured_analysis"]["summary"]


def test_langsmith_observability_redaction():
    """Sensitive keys, Bearer tokens, and secrets are cleanly redacted before logging."""
    raw_telemetry = {
        "candidate_url": "https://example.com/login?token=bearer%20eyJhbGciOiJIUzI1NiJ9.abc.def",
        "headers": {
            "Authorization": "Bearer ya29.a0ARrdaM-sensitive-access-token-12345",
            "X-API-KEY": "secret_api_key_value_here",
        },
        "user": {
            "password": "SuperSecretPassword123!",
            "email": "analyst@enterprise.com",
        },
        "groq_key": "gsk_1234567890abcdef1234567890abcdef",
    }

    sanitized = redact_sensitive_data(raw_telemetry)
    assert "[REDACTED]" in sanitized["headers"]["Authorization"]
    assert "[REDACTED]" in sanitized["headers"]["X-API-KEY"]
    assert "[REDACTED]" in sanitized["user"]["password"]
    assert "[REDACTED]" in str(sanitized["groq_key"])


def test_langsmith_disabled_tracing_no_overhead():
    """Tracing disabled has zero external network calls."""
    obs = LangSmithObservability(enabled=False, api_key=None)
    assert not obs.is_active

    with obs.trace_investigation("test_run", {"input": "test"}) as ctx:
        ctx.set_outputs({"output": "ok"}, validation_passed=True)

    assert ctx.run is None


def test_api_unauthorized_finding_investigation(app, unauth_client):
    """User A cannot invoke AI investigation on findings owned by User B."""
    db = get_db()
    # Create Brand owned by User B
    brand_b = Brand(
        name="Brand User B",
        owner_id="user_b_uid",
        is_sample=False,
    )
    db.add(brand_b)
    db.commit()

    finding_b = Finding(
        brand_id=brand_b.id,
        candidate_name="fake-brand-b.com",
        asset_type="domain",
        risk_score=90.0,
        severity="critical",
        detection_source="Test Scanner",
        is_sample=False,
    )
    db.add(finding_b)
    db.commit()
    finding_id = finding_b.id

    # 1. Unauthenticated request -> 401
    res_unauth = unauth_client.post(f"/api/v1/findings/{finding_id}/ai-investigate")
    assert res_unauth.status_code == 401

    # 2. Authenticated as User A (role="analyst", not admin) -> 403 Forbidden
    with app.app_context():
        token_a = create_dev_token(uid="user_a_uid", email="usera@example.com", role="analyst")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_forbidden = unauth_client.post(
        f"/api/v1/findings/{finding_id}/ai-investigate",
        headers=headers_a,
    )
    assert res_forbidden.status_code == 403
    data = res_forbidden.get_json()
    assert data["error"]["code"] == "FORBIDDEN"


def test_ai_never_alters_risk_score_or_status(app, unauth_client):
    """Authorized finding investigation preserves exact mathematical detector risk score."""
    db = get_db()
    brand_a = Brand(
        name="Brand User A",
        owner_id="user_a_uid",
        is_sample=False,
    )
    db.add(brand_a)
    db.commit()

    finding_a = Finding(
        brand_id=brand_a.id,
        candidate_name="lookalike-user-a.com",
        asset_type="domain",
        risk_score=87.5,
        severity="high",
        detection_source="ML Risk Classifier",
        is_sample=False,
    )
    db.add(finding_a)
    db.commit()
    finding_id = finding_a.id

    with app.app_context():
        token_a = create_dev_token(uid="user_a_uid", email="usera@example.com", role="analyst")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res = unauth_client.post(
        f"/api/v1/findings/{finding_id}/ai-investigate",
        headers=headers_a,
    )
    assert res.status_code == 200
    data = res.get_json()["data"]

    assert data["detector_risk_score"] == 87.5
    investigation = data["investigation"]
    assert investigation["detector_risk_score"] == 87.5
    assert investigation["auto_confirmed"] is False

    # Check database finding record was not modified
    f = db.query(Finding).filter_by(id=finding_id).first()
    assert float(f.risk_score) == 87.5
    assert f.review_status == "NEW"


def test_evaluation_dataset_grounding_and_safety():
    """Grounding evaluation suite passes 100% across all 5 threat scenarios."""
    eval_results = run_ai_grounding_evaluations()
    assert eval_results["total_scenarios"] == 5
    assert eval_results["passed_scenarios"] == 5
    assert eval_results["pass_rate_pct"] == 100.0


def test_groq_ungrounded_numbers_are_demoted_and_usage_reported():
    """Facts citing numbers absent from telemetry are moved to unverified claims; tokens/sec is reported."""
    service = GroqAIService(api_key="gsk_mock_key")
    mock_client = MagicMock()

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "summary": "Candidate 'paytmm.com' scored 85 and resembles Paytm.",
        "observed_facts": [
            "Detector risk score is 85.",
            "Domain was registered 37 days ago.",
        ],
        "model_inferences": ["TYPO signal suggests a repeated character."],
        "unverified_claims": [],
        "recommended_actions": ["Check WHOIS registration date."],
        "confidence_limitations": "Advisory only.",
    })
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage.prompt_tokens = 900
    mock_response.usage.completion_tokens = 300
    mock_response.usage.completion_time = 1.2
    mock_client.chat.completions.create.return_value = mock_response
    service._client = mock_client

    result = service.generate_investigation_brief(
        brand_profile={"id": "b1", "name": "Paytm", "official_domains": ["paytm.com"]},
        finding={"id": "f1", "candidate_name": "paytmm.com", "asset_type": "domain", "risk_score": 85.0},
        signals=[{"signal_type": "TYPO", "severity": "high", "explanation": "Extra 'm'"}],
    )

    analysis = result["structured_analysis"]
    assert analysis["observed_facts"] == ["Detector risk score is 85."]
    assert any("37 days" in c for c in analysis["unverified_claims"])
    assert analysis["grounding_warnings"]
    assert result["token_usage"]["tokens_per_second"] == 250.0
