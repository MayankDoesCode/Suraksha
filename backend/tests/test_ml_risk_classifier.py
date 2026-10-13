import os
import json
import pytest
from pathlib import Path

from backend.app.ai.risk_classifier import RiskClassifier, risk_classifier


def test_singleton_risk_classifier_loaded():
    """Verify default singleton classifier is operational."""
    assert risk_classifier.is_available() is True
    status = risk_classifier.get_status()
    assert status["available"] is True
    assert status["loaded"] is True
    assert status["model_version"] == "1.0.0"
    assert status["status"] == "operational"
    assert status["error"] is None


def test_classify_suspicious_example():
    """Verify inference flags a clear customer support impersonator."""
    brand = {"name": "Acme FinTech", "domains": [{"domain": "acmefinance.com"}]}
    candidate = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_support",
        "display_name": "Acme Customer Care Desk",
        "description": "Urgent account KYC verify login required. Click link in bio.",
        "website_url": "https://acme-phish.xyz",
    }

    result = risk_classifier.classify(candidate, brand)
    assert result["ml_enabled"] is True
    assert result["fallback_used"] is False
    assert result["predicted_class"] == "SUSPICIOUS"
    assert result["ml_risk_score"] >= 50.0
    assert 0.0 <= result["confidence"] <= 1.0
    assert "SUSPICIOUS" in result["probabilities"]
    assert "LEGITIMATE" in result["probabilities"]
    # Probabilities must sum approximately to 1.0
    total_prob = sum(result["probabilities"].values())
    assert pytest.approx(total_prob, 0.01) == 1.0


def test_classify_legitimate_example():
    """Verify inference scores a legitimate official asset low."""
    brand = {
        "name": "Acme FinTech",
        "domains": [{"domain": "acmefinance.com"}],
        "publishers": [{"publisher_name": "Acme Financial Services Ltd"}],
    }
    candidate = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Mobile Banking",
        "publisher_name": "Acme Financial Services Ltd",
        "package_id": "com.acmefinance.app",
        "website_url": "https://acmefinance.com",
        "description": "Official mobile banking app for Acme customers.",
    }

    result = risk_classifier.classify(candidate, brand)
    assert result["ml_enabled"] is True
    assert result["fallback_used"] is False
    assert result["predicted_class"] == "LEGITIMATE"
    assert result["ml_risk_score"] <= 50.0


def test_missing_artifact_fallback_behavior(tmp_path):
    """Verify graceful fallback when model artifact does not exist."""
    non_existent = tmp_path / "does_not_exist.joblib"
    clf = RiskClassifier(model_path=non_existent)

    assert clf.is_available() is False
    status = clf.get_status()
    assert status["available"] is False
    assert status["status"] == "fallback_mode"
    assert status["error"] is not None

    # Predict must not crash and must flag fallback_used
    res = clf.classify({"candidate_name": "Test App"})
    assert res["fallback_used"] is True
    assert res["ml_enabled"] is False
    assert res["predicted_class"] == "UNKNOWN"
    assert res["ml_risk_score"] == 0.0


def test_corrupted_artifact_fallback_behavior(tmp_path):
    """Verify graceful fallback when model file is corrupted."""
    corrupted_file = tmp_path / "corrupted_model.joblib"
    corrupted_file.write_text("CORRUPTED_NON_BINARY_DATA_GARBAGE")

    clf = RiskClassifier(model_path=corrupted_file)
    assert clf.is_available() is False

    res = clf.classify({"candidate_name": "Test App"})
    assert res["fallback_used"] is True
    assert res["ml_enabled"] is False
    assert res["error"] is not None


def test_score_bounds_and_probability_limits():
    """Ensure risk score remains strictly bounded between 0.0 and 100.0."""
    candidates = [
        {"candidate_name": "A", "asset_type": "social"},
        {"candidate_name": "B" * 500, "description": "Long " * 100},
        {"candidate_name": "Normal Banking App"},
    ]
    for cand in candidates:
        res = risk_classifier.classify(cand)
        assert 0.0 <= res["ml_risk_score"] <= 100.0
        assert 0.0 <= res["confidence"] <= 1.0
