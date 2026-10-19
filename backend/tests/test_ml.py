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


def test_social_pipeline_feature_extraction():
    from backend.app.ml.social_pipeline import extract_social_features, FEATURE_COLUMNS
    profile = {
        "userFollowerCount": 500,
        "userFollowingCount": 100,
        "userBiographyLength": 85,
        "userMediaCount": 42,
        "userHasProfilPic": 1,
        "userIsPrivate": 0,
        "usernameDigitCount": 2,
        "usernameLength": 12,
    }
    feats = extract_social_features(profile)
    assert len(feats.columns) == len(FEATURE_COLUMNS)
    assert feats["userFollowerCount"].iloc[0] == 500.0
    assert feats["userFollowingCount"].iloc[0] == 100.0

    # Test alias 'followers_count' (frontend key)
    feats_frontend = extract_social_features({
        "username": "@testuser",
        "followers_count": 148500,
        "following_count": 10,
    })
    assert feats_frontend["userFollowerCount"].iloc[0] == 148500.0
    assert feats_frontend["follower_following_ratio"].iloc[0] == 148500.0 / 11.0

    # Test alias 'followers_count' as numeric string
    feats_str = extract_social_features({
        "username": "@testuser",
        "followers_count": "2500",
    })
    assert feats_str["userFollowerCount"].iloc[0] == 2500.0

    # Test alias 'follower_count' (singular)
    feats_singular = extract_social_features({
        "username": "@testuser",
        "follower_count": 42000,
    })
    assert feats_singular["userFollowerCount"].iloc[0] == 42000.0


def test_social_pipeline_missing_data_blocker(tmp_path):
    from backend.app.ml.social_pipeline import train_and_evaluate_social_model
    output_dir = str(tmp_path / "social_models")
    manifest = train_and_evaluate_social_model(data_dir=str(tmp_path / "nonexistent"), output_dir=output_dir)
    assert manifest["trained"] is False
    assert manifest["status"] in ["missing_dataset", "missing_labelled_data"]
    assert manifest["metrics"] is None


def test_mobile_pipeline_feature_extraction_and_allowlist():
    from backend.app.ml.mobile_pipeline import (
        build_mobile_feature_text,
        extract_mobile_entity_signals,
        record_app_for_analyst_review,
    )
    brand_profile = {
        "name": "Acme Bank",
        "official_publishers": ["Acme Financial Group Ltd"],
        "official_packages": ["com.acmebank.mobile"],
    }
    # Official app matching allowlist
    official_app = {
        "name": "Acme Bank Mobile",
        "developer": "Acme Financial Group Ltd",
        "package_id": "com.acmebank.mobile",
    }
    signals_off = extract_mobile_entity_signals(official_app, brand_profile)
    assert signals_off["publisher_verified"] is True
    assert signals_off["package_verified"] is True
    assert signals_off["developer_mismatch"] is False

    # Impersonator app
    fake_app = {
        "name": "Acme Bank Quick Loan & KYC Update",
        "developer": "Instant Cash Dev 2026",
        "package_id": "org.freefunds.acmeupdate",
        "description": "Log in with your corporate credentials to unlock immediate credit.",
    }
    signals_fake = extract_mobile_entity_signals(fake_app, brand_profile)
    assert signals_fake["publisher_verified"] is False
    assert signals_fake["developer_mismatch"] is True
    assert signals_fake["brand_mentioned"] is True
    assert signals_fake["lure_count"] >= 1

    feature_text = build_mobile_feature_text(fake_app, "Acme Bank")
    assert "brand:acme bank" in feature_text
    assert "dev:instant cash dev" in feature_text


def test_api_predict_social_endpoint():
    app = create_app("testing")
    client = app.test_client()

    # 1. Valid request with bot-like signals and brand target
    res = client.post("/api/v1/ml/predict-social", json={
        "username": "official_acme_support_helpdesk_992",
        "target_brand": "Acme Bank",
        "display_name": "Acme Bank Verified Customer Care",
        "followers_count": 2,
        "following_count": 2400,
        "posts_count": 0,
        "has_profile_pic": 0,
        "biography": "Official 24/7 recovery desk for Acme Bank accounts. DM credentials to unlock.",
    })
    assert res.status_code == 200
    body = res.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["task"] == "social_profile_threat_detection"
    assert "risk_score" in data
    assert data["requires_analyst_review"] is True
    assert data["auto_confirmed"] is False
    assert "generic_fake_account_ml" in data
    assert "brand_impersonation_assessment" in data

    # 2. Missing username & display_name
    res_err = client.post("/api/v1/ml/predict-social", json={"target_brand": "Acme"})
    assert res_err.status_code == 422


def test_predict_social_frontend_payload_with_target_brand_and_followers_count():
    app = create_app("testing")
    client = app.test_client()

    # Exact payload structure sent by frontend SocialMonitoringView.tsx
    res = client.post("/api/v1/ml/predict-social", json={
        "username": "@apexpay_official",
        "display_name": "ApexPay Official",
        "biography": "The official handle for ApexPay Global. Fast, secure enterprise payment infrastructure.",
        "followers_count": 148500,
        "following_count": 120,
        "posts_count": 860,
        "target_brand": "ApexPay",
    })
    assert res.status_code == 200
    body = res.get_json()
    assert body["success"] is True
    data = body["data"]

    # FIX 3 verification: target_brand was correctly interpreted
    brand_assessment = data.get("brand_impersonation_assessment", {})
    assert brand_assessment.get("brand_target") == "apexpay"
    assert brand_assessment.get("brand_matched") is True

    # FIX 2 verification: followers_count reached the feature extractor
    fake_ml = data.get("generic_fake_account_ml", {})
    assert fake_ml.get("status") == "operational"
    # When followers=148500 is supplied, model scores benign (not ~48% uninitialized)
    assert fake_ml.get("fake_probability") is not None
    assert fake_ml.get("fake_probability") < 0.10


def test_api_predict_app_endpoint():
    app = create_app("testing")
    client = app.test_client()

    # 1. Official app - allowlist match
    res_off = client.post("/api/v1/ml/predict-app", json={
        "name": "Acme Bank Mobile",
        "developer": "Acme Bank Official Ltd",
        "package_id": "com.acmebank.app",
        "target_brand": "Acme Bank",
        "brand_profile": {
            "name": "Acme Bank",
            "official_publishers": ["Acme Bank Official Ltd"],
            "official_packages": ["com.acmebank.app"],
        },
    })
    assert res_off.status_code == 200
    data_off = res_off.get_json()["data"]
    assert data_off["is_official_asset"] is True
    assert data_off["risk_score"] == 0.0
    assert data_off["requires_analyst_review"] is False

    # 2. Impersonating app - transparently uses deterministic fallback engine (never fake ML)
    res_fake = client.post("/api/v1/ml/predict-app", json={
        "name": "Acme Bank Fast Login Portal",
        "developer": "Rogue Developer Inc",
        "package_id": "net.rogue.acmelogin",
        "target_brand": "Acme Bank",
        "brand_profile": {
            "name": "Acme Bank",
            "official_publishers": ["Acme Bank Official Ltd"],
        },
    })
    assert res_fake.status_code == 200
    data_fake = res_fake.get_json()["data"]
    assert data_fake["is_official_asset"] is False
    assert data_fake["is_ml_prediction"] is False  # Transparently NOT claimed as ML
    assert data_fake["ml_status"] == "pending_ground_truth_labels"
    assert "Deterministic Rule & Publisher Whitelist Engine" in data_fake["engine"]
    assert data_fake["risk_score"] > 50.0
    assert data_fake["requires_analyst_review"] is True
    assert data_fake["auto_confirmed"] is False

    # 3. Missing identifier validation
    res_err = client.post("/api/v1/ml/predict-app", json={"target_brand": "Acme"})
    assert res_err.status_code == 422


def test_api_status_reports_all_components():
    app = create_app("testing")
    client = app.test_client()

    res = client.get("/api/v1/ml/status")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert "components" in data
    comps = data["components"]

    # URL model is operational
    assert comps["url_phishing"]["available"] is True
    assert comps["url_phishing"]["status"] == "operational"
    assert "metrics" in comps["url_phishing"]

    # Social model is operational on InstaFake
    assert comps["social_fake_account"]["available"] is True
    assert comps["social_fake_account"]["status"] == "operational"
    assert "metrics" in comps["social_fake_account"]
    assert comps["social_fake_account"]["baseline_comparison"] is not None

    # Mobile model is transparently pending ground truth labels
    assert comps["mobile_app_brand_impersonation"]["available"] is False
    assert comps["mobile_app_brand_impersonation"]["status"] == "pending_ground_truth_labels"
    assert "fallback_engine" in comps["mobile_app_brand_impersonation"]
    assert "dataset_audit" in comps["mobile_app_brand_impersonation"]



def test_social_risk_missing_metadata_is_not_scored_as_fake():
    from backend.app.ml import get_ml_service
    service = get_ml_service()
    result = service.predict_social_risk({"username": "johnsmith"}, brand_profile={"name": "acme"})
    fake = result["generic_fake_account_ml"]
    assert fake["status"] == "insufficient_metadata"
    assert fake["fake_score"] is None
    assert set(fake["missing_metadata"]) == {"follower_count", "following_count", "media_count"}
    # Unrelated handle, no brand match: low brand risk regardless of the fake model.
    assert result["risk_score"] == 10.0


def test_social_brand_risk_independent_of_fake_score():
    """Brand-impersonation risk_score must not move when only generic bot-likeness changes."""
    from backend.app.ml import get_ml_service
    service = get_ml_service()
    base = {"username": "acme_support_help", "bio": "official support"}
    botlike = dict(base, followers_count=2, following_count=3000, media_count=0)
    healthy = dict(base, followers_count=50000, following_count=200, media_count=900)
    r1 = service.predict_social_risk(botlike, brand_profile={"name": "acme"})
    r2 = service.predict_social_risk(healthy, brand_profile={"name": "acme"})
    assert r1["risk_score"] == r2["risk_score"]
    assert r1["risk_score_basis"] == "brand_impersonation_heuristics_only"
    assert r1["generic_fake_account_ml"]["fused_into_risk_score"] is False


def test_url_risk_scores_canonical_host_not_full_url():
    """Scheme, www, path and query must not change the URL model's score (format-leakage guard)."""
    from backend.app.ml import get_ml_service
    service = get_ml_service()
    bare = service.predict_url_risk("docs.python.org")
    full = service.predict_url_risk("https://www.docs.python.org/3/library/index.html?x=1")
    assert full["scored_input"] == "docs.python.org"
    assert full["indicator"].startswith("https://")
    assert full["risk_score"] == bare["risk_score"]


def test_canonical_host_normalization():
    from backend.app.ml.url_eval import canonical_host
    assert canonical_host("HTTPS://WWW.Example.COM./a?b=1") == "example.com"
    assert canonical_host("user@login.example.com:8080") == "login.example.com"
    assert canonical_host("wwwexample.com") == "wwwexample.com"
