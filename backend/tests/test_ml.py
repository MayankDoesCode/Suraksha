import os
import json
import pytest
import pandas as pd
from unittest.mock import patch

from backend.app.ml.pipeline import (
    build_feature_text,
    create_model_pipeline,
    train_and_evaluate,
    MANIFEST_FILENAME,
    MODEL_FILENAME,
)
from backend.app.ml.service import MLService
from backend.app import create_app


def test_build_feature_text():
    item = {
        "target_brand": "Microsoft",
        "candidate_name": "Office 365 Cloud Login",
        "publisher_name": "Rogue Dev",
        "candidate_type": "app",
        "description": "Quick login portal for corporate accounts",
    }
    feature_text = build_feature_text(item)
    assert "brand:microsoft" in feature_text
    assert "name:Office 365 Cloud Login" in feature_text
    assert "publisher:Rogue Dev" in feature_text
    assert "type:app" in feature_text
    assert "desc:Quick login" in feature_text


def test_pipeline_missing_data_blocker(tmp_path):
    output_dir = str(tmp_path / "models")
    manifest = train_and_evaluate(data_path=None, output_dir=output_dir)

    assert manifest["trained"] is False
    assert manifest["status"] == "missing_labelled_data"
    assert manifest["metrics"] is None
    assert manifest["model_version"] is None
    assert "No labelled training dataset found" in manifest["reason"]

    manifest_file = os.path.join(output_dir, MANIFEST_FILENAME)
    assert os.path.exists(manifest_file)


def test_pipeline_nonexistent_file_blocker(tmp_path):
    output_dir = str(tmp_path / "models")
    manifest = train_and_evaluate(
        data_path=str(tmp_path / "nonexistent.csv"),
        output_dir=output_dir,
    )
    assert manifest["trained"] is False
    assert manifest["status"] == "missing_labelled_data"


def test_pipeline_rejects_single_class_data(tmp_path):
    output_dir = str(tmp_path / "models")
    data_file = str(tmp_path / "single_class.csv")

    df = pd.DataFrame({
        "candidate_name": [f"App {i}" for i in range(25)],
        "target_brand": ["Acme"] * 25,
        "label": [1] * 25,  # only 1 class
    })
    df.to_csv(data_file, index=False)

    manifest = train_and_evaluate(data_path=data_file, output_dir=output_dir)
    assert manifest["trained"] is False
    assert manifest["status"] == "insufficient_classes"
    assert manifest["metrics"] is None


def test_pipeline_trains_and_evaluates_with_valid_benchmark_data(tmp_path):
    output_dir = str(tmp_path / "models")
    data_file = str(tmp_path / "benchmark.csv")

    # Construct balanced synthetic validation dataset
    records = []
    # 30 benign candidates
    for i in range(30):
        records.append({
            "target_brand": "Microsoft",
            "candidate_name": f"Microsoft Productivity Tool {i}",
            "publisher_name": "Microsoft Corporation",
            "candidate_type": "app",
            "label": 0,
        })
    # 30 suspicious impersonators
    for i in range(30):
        records.append({
            "target_brand": "Microsoft",
            "candidate_name": f"Free MicroSoft Office Pro Activation {i}",
            "publisher_name": f"Shady Publisher {i}",
            "candidate_type": "app",
            "label": 1,
        })

    df = pd.DataFrame(records)
    df.to_csv(data_file, index=False)

    manifest = train_and_evaluate(
        data_path=data_file,
        output_dir=output_dir,
        test_size=0.20,
        val_size=0.15,
        random_state=42,
        min_samples_per_class=10,
    )

    assert manifest["trained"] is True
    assert manifest["status"] == "operational"
    assert manifest["model_version"] == "1.0.0"
    assert manifest["metrics"] is not None
    assert "accuracy" in manifest["metrics"]
    assert "precision" in manifest["metrics"]
    assert "recall" in manifest["metrics"]
    assert "f1" in manifest["metrics"]
    assert manifest["dataset"]["total_samples"] == 60

    model_path = os.path.join(output_dir, MODEL_FILENAME)
    assert os.path.exists(model_path)


def test_ml_service_with_missing_model(tmp_path):
    empty_dir = str(tmp_path / "empty")
    os.makedirs(empty_dir, exist_ok=True)
    service = MLService(model_dir=empty_dir)

    assert service.is_available() is False
    metadata = service.get_metadata()
    assert metadata["available"] is False
    assert metadata["status"] == "not_loaded"
    assert metadata["metrics"] is None
    assert metadata["auto_confirmation"] is False

    pred = service.predict_candidate({"candidate_name": "Test App"})
    assert pred["available"] is False


def test_ml_service_with_trained_model(tmp_path):
    output_dir = str(tmp_path / "trained")
    data_file = str(tmp_path / "data.csv")

    records = []
    for i in range(25):
        records.append({"candidate_name": f"Official {i}", "target_brand": "Acme", "label": 0})
    for i in range(25):
        records.append({"candidate_name": f"Acme Hack {i}", "target_brand": "Acme", "label": 1})
    pd.DataFrame(records).to_csv(data_file, index=False)

    train_and_evaluate(data_path=data_file, output_dir=output_dir, min_samples_per_class=10)

    service = MLService(model_dir=output_dir)
    assert service.is_available() is True
    metadata = service.get_metadata()
    assert metadata["available"] is True
    assert metadata["model_version"] == "1.0.0"
    assert metadata["metrics"] is not None

    pred = service.predict_candidate({
        "target_brand": "Acme",
        "candidate_name": "Acme Hack Wallet",
        "candidate_type": "app",
    })
    assert pred["available"] is True
    assert 0.0 <= pred["ml_score"] <= 100.0
    assert pred["requires_analyst_review"] is True
    assert pred["auto_confirmed"] is False


def test_ml_api_endpoints():
    app = create_app("testing")
    client = app.test_client()

    # GET /api/v1/ml/status
    res = client.get("/api/v1/ml/status")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert "available" in data
    assert "auto_confirmation" in data
    assert data["auto_confirmation"] is False

    # POST /api/v1/ml/predict
    res_pred = client.post("/api/v1/ml/predict", json={
        "target_brand": "Microsoft",
        "candidate_name": "Outlook Assistant",
    })
    assert res_pred.status_code == 200
    data_pred = res_pred.get_json()["data"]
    assert "auto_confirmed" in data_pred
    assert data_pred.get("auto_confirmed", False) is False

    # POST /api/v1/ml/predict-url with valid URL
    res_url = client.post("/api/v1/ml/predict-url", json={
        "url": "http://micros0ft-security-update.ddns.net/login"
    })
    assert res_url.status_code == 200
    data_url = res_url.get_json()["data"]
    assert data_url["available"] is True
    assert data_url["task"] == "url_phishing_detection"
    assert data_url["auto_confirmed"] is False
    assert data_url["requires_analyst_review"] is True
    assert 0.0 <= data_url["risk_score"] <= 100.0

    # POST /api/v1/ml/predict-url missing payload
    res_err = client.post("/api/v1/ml/predict-url", json={})
    assert res_err.status_code == 422


def test_extract_root_domain():
    from backend.app.ml.url_pipeline import extract_root_domain
    assert extract_root_domain("http://dropboxstorage.tripod.com/login") == "tripod.com"
    assert extract_root_domain("https://sub.portal.acmefinance.co.uk") == "co.uk"
    assert extract_root_domain("elcomercio.pe") == "elcomercio.pe"
    assert extract_root_domain("rogers-ca.com") == "rogers-ca.com"


def test_url_pipeline_domain_leakage_prevention(tmp_path):
    from backend.app.ml.url_pipeline import train_and_evaluate_url_model, URL_MODEL_FILENAME, URL_MANIFEST_FILENAME

    output_dir = str(tmp_path / "url_models")
    data_file = str(tmp_path / "url_data.parquet")

    # Create dummy dataset where domains have multiple subdomains
    records = []
    # 20 distinct domains for benign
    for d_idx in range(20):
        domain = f"benign-corp-{d_idx}.com"
        for sub in ["www", "portal", "api"]:
            records.append({
                "indicator": f"https://{sub}.{domain}/home",
                "label": 0,
            })
    # 20 distinct domains for phishing
    for d_idx in range(20):
        domain = f"fake-phish-{d_idx}.net"
        for sub in ["login", "secure", "auth"]:
            records.append({
                "indicator": f"http://{sub}.{domain}/verify",
                "label": 1,
            })

    df = pd.DataFrame(records)
    df.to_parquet(data_file)

    manifest = train_and_evaluate_url_model(
        data_path=data_file,
        output_dir=output_dir,
        test_size=0.25,
        random_state=42,
    )

    assert manifest["trained"] is True
    assert manifest["status"] == "operational"
    assert manifest["dataset_metadata"]["domain_overlap"] == 0
    assert os.path.exists(os.path.join(output_dir, URL_MODEL_FILENAME))
    assert os.path.exists(os.path.join(output_dir, URL_MANIFEST_FILENAME))
    assert manifest["metrics"]["accuracy"] >= 0.0
