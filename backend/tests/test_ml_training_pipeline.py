import os
import json
import pytest
from pathlib import Path

from backend.app.ai.feature_extractor import ThreatFeatureExtractor, NUMERIC_FEATURE_NAMES
from backend.scripts.train_risk_model import load_dataset, train_and_evaluate


def test_dataset_format_and_balance():
    """Ensure bootstrap dataset conforms to schema and has balanced class distribution."""
    dataset_path = Path(__file__).resolve().parent.parent / "app" / "ai" / "data" / "threat_bootstrap_dataset.json"
    assert dataset_path.exists(), "Bootstrap dataset file must exist"

    data = load_dataset(dataset_path)
    assert len(data) >= 50, "Bootstrap dataset should contain at least 50 examples"

    labels = [d.get("label") for d in data]
    assert "LEGITIMATE" in labels
    assert "SUSPICIOUS" in labels

    legit_count = labels.count("LEGITIMATE")
    susp_count = labels.count("SUSPICIOUS")
    # Dataset should be balanced
    assert legit_count > 0 and susp_count > 0
    ratio = min(legit_count, susp_count) / max(legit_count, susp_count)
    assert ratio >= 0.70, f"Dataset should be roughly balanced (ratio={ratio:.2f})"

    for item in data:
        assert "id" in item
        assert "asset_type" in item
        assert "candidate_name" in item
        assert "label" in item
        assert item["label"] in ("LEGITIMATE", "SUSPICIOUS")


def test_feature_extractor_supported_asset_types():
    """Verify feature extractor handles mobile_app, social, and domain assets safely."""
    brand = {"name": "Acme FinTech", "publishers": [{"publisher_name": "Acme Ltd"}], "domains": [{"domain": "acmefinance.com"}]}

    # 1. Social
    social_cand = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_support",
        "display_name": "Acme FinTech Helpdesk",
        "website_url": "https://phish-kyc.xyz",
        "description": "24x7 customer support desk",
    }
    extracted_social = ThreatFeatureExtractor.extract_record_features(social_cand, brand)
    assert len(extracted_social["dense_features"]) == len(NUMERIC_FEATURE_NAMES)
    assert extracted_social["feature_dict"]["is_social"] == 1.0
    assert extracted_social["feature_dict"]["is_mobile_app"] == 0.0
    assert extracted_social["feature_dict"]["has_suspicious_keyword"] == 1.0
    assert extracted_social["feature_dict"]["has_suspicious_tld"] == 1.0

    # 2. Mobile App
    app_cand = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme Mobile Quick Loan",
        "package_id": "com.acme.quickloan.apk",
        "publisher_name": "Unknown Studio",
        "description": "Instant loan without credit checks",
    }
    extracted_app = ThreatFeatureExtractor.extract_record_features(app_cand, brand)
    assert extracted_app["feature_dict"]["is_mobile_app"] == 1.0
    assert extracted_app["feature_dict"]["is_social"] == 0.0
    assert extracted_app["feature_dict"]["publisher_match"] == -1.0  # Known mismatch

    # 3. Domain
    domain_cand = {
        "asset_type": "domain",
        "candidate_name": "acmefinance-login.xyz",
        "source_url": "https://acmefinance-login.xyz",
    }
    extracted_domain = ThreatFeatureExtractor.extract_record_features(domain_cand, brand)
    assert extracted_domain["feature_dict"]["is_domain"] == 1.0
    assert extracted_domain["feature_dict"]["has_suspicious_tld"] == 1.0


def test_feature_extractor_missing_and_malformed_inputs():
    """Verify feature extraction never throws exceptions on empty or malformed dictionaries."""
    # Completely empty
    res_empty = ThreatFeatureExtractor.extract_record_features({}, {})
    assert len(res_empty["dense_features"]) == len(NUMERIC_FEATURE_NAMES)
    assert all(isinstance(v, (int, float)) for v in res_empty["dense_features"])

    # None values inside candidate
    malformed = {
        "asset_type": None,
        "candidate_name": None,
        "source_url": None,
        "publisher_name": None,
        "description": None,
    }
    res_malformed = ThreatFeatureExtractor.extract_record_features(malformed, None)
    assert len(res_malformed["dense_features"]) == len(NUMERIC_FEATURE_NAMES)
    assert res_malformed["feature_dict"]["candidate_name_length"] == 0.0


def test_train_pipeline_execution_in_tmp_dir(tmp_path):
    """Test full execution of training and artifact serialization in an isolated directory."""
    dataset_path = Path(__file__).resolve().parent.parent / "app" / "ai" / "data" / "threat_bootstrap_dataset.json"
    output_dir = tmp_path / "test_models"

    metadata = train_and_evaluate(dataset_path, output_dir, random_state=42, test_size=0.25)

    assert (output_dir / "risk_classifier_v1.joblib").exists()
    assert (output_dir / "model_metadata_v1.json").exists()
    assert (output_dir / "evaluation_report.json").exists()

    metrics = metadata["evaluation_metrics"]
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert 0.0 <= metrics["precision"] <= 1.0
    assert 0.0 <= metrics["recall"] <= 1.0
    assert 0.0 <= metrics["f1_score"] <= 1.0
    assert "confusion_matrix" in metrics
    assert "classes_order" in metrics
    assert metadata["model_version"] == "1.0.0"
