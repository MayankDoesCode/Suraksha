import pytest
from backend.app.services.brand_service import BrandService


def test_health_endpoint_includes_ml_diagnostics(client):
    """Ensure GET /api/v1/health exposes ML service status and version."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True

    # Database
    assert "database" in data
    assert data["database"]["connected"] is True

    # Machine Learning
    assert "ml_service" in data
    ml_info = data["ml_service"]
    assert ml_info["available"] is True
    assert ml_info["loaded"] is True
    assert ml_info["model_version"] == "1.0.0"
    assert ml_info["status"] == "operational"


def test_scan_candidate_api_returns_ml_fields(client, app):
    """Ensure POST /api/v1/brands/<id>/scan returns hybrid scores and ML metadata."""
    brand_service = BrandService()
    brand = brand_service.create_brand({
        "name": "Acme FinTech",
        "description": "Test brand",
        "domains": [{"domain": "acmefinance.com", "is_primary": True}],
        "social_handles": [{"platform": "twitter", "handle": "acmefinance"}],
    })

    payload = {
        "asset_type": "social",
        "candidate_name": "@acmefinance_fraud_desk",
        "display_name": "Acme Fraud Desk",
        "description": "Urgent account verification portal",
        "website_url": "https://acme-phish.xyz",
        "followers_count": 3,
        "following_count": 2400,
        "media_count": 0,
        "has_profile_pic": False,
    }

    resp = client.post(f"/api/v1/brands/{brand['id']}/scan", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True

    result = data["data"]
    assert "final_risk_score" in result
    assert "rule_based_score" in result
    assert "ml_risk_score" in result
    assert "ml_predicted_class" in result
    assert "ml_fallback_used" in result
    assert result["ml_predicted_class"] == "SUSPICIOUS"
    assert result["ml_fallback_used"] is False

    finding = result["finding"]
    assert finding is not None
    assert finding["ml_predicted_class"] == "SUSPICIOUS"
    assert finding["final_risk_score"] == result["final_risk_score"]


def test_list_findings_api_serializes_ml_columns(client, app):
    """Ensure GET /api/v1/findings serializes new ML columns backward-compatibly."""
    brand_service = BrandService()
    brand = brand_service.create_brand({
        "name": "Acme FinTech",
        "app_identifiers": [{"platform": "android_play_store", "identifier": "com.acmefintech.official", "app_name": "Acme FinTech Official"}]
    })

    # Evaluate candidate
    payload = {
        "asset_type": "mobile_app",
        "candidate_name": "Acme FinTech Quick Loans",
        "package_id": "com.acmefintech.quickloan.fake",
        "publisher_name": "Rogue Dev",
        "description": "Enter your PIN to verify bank account.",
    }
    scan_resp = client.post(f"/api/v1/brands/{brand['id']}/scan", json=payload)
    assert scan_resp.status_code == 200

    findings_resp = client.get("/api/v1/findings")
    assert findings_resp.status_code == 200
    data = findings_resp.get_json()
    assert data["success"] is True
    assert len(data["data"]) >= 1

    item = data["data"][0]
    assert "risk_score" in item
    assert "final_risk_score" in item
    assert "rule_based_score" in item
    assert "ml_risk_score" in item
    assert "ml_predicted_class" in item
    assert "ml_fallback_used" in item
