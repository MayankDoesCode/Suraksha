import pytest
from backend.app.database import get_db
from backend.app.models import Brand, Finding

def test_findings_list_and_filters(client, app):
    """Test GET /api/v1/findings filtering and pagination."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="FinCorp")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        f1 = Finding(
            brand_id=brand.id,
            asset_type="social",
            candidate_name="@fincorp_phish",
            risk_score=92.0,
            severity="CRITICAL",
            review_status="NEW",
        )
        f2 = Finding(
            brand_id=brand.id,
            asset_type="mobile_app",
            candidate_name="FinCorp Fake App",
            risk_score=60.0,
            severity="HIGH",
            review_status="UNDER_INVESTIGATION",
        )
        db.add(f1)
        db.add(f2)
        db.commit()

    # List all
    res = client.get("/api/v1/findings")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]) == 2

    # Filter by asset_type
    res_social = client.get("/api/v1/findings?asset_type=social")
    assert res_social.status_code == 200
    assert len(res_social.get_json()["data"]) == 1
    assert res_social.get_json()["data"][0]["candidate_name"] == "@fincorp_phish"

    # Filter by severity
    res_high = client.get("/api/v1/findings?severity=HIGH")
    assert res_high.status_code == 200
    assert len(res_high.get_json()["data"]) == 1

def test_finding_status_update(client, app):
    """Test PATCH /api/v1/findings/<id>/status updating review status."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="StatusCorp")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        finding = Finding(
            brand_id=brand.id,
            asset_type="social",
            candidate_name="@status_phish",
            risk_score=88.0,
            severity="CRITICAL",
            review_status="NEW",
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)
        fid = finding.id

    # 1. Update status to CONFIRMED_THREAT
    res = client.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "CONFIRMED_THREAT"})
    assert res.status_code == 200
    assert res.get_json()["data"]["review_status"] == "CONFIRMED_THREAT"

    # 2. Test invalid status returns 422
    res_inv = client.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "INVALID_STATE"})
    assert res_inv.status_code == 422

    # 3. Test non-existent finding returns 404
    res_404 = client.patch("/api/v1/findings/nonexistent-id/status", json={"review_status": "RESOLVED"})
    assert res_404.status_code == 404

def test_metrics_endpoint_calculates_real_records(client, app):
    """Test GET /api/v1/metrics accurately reflects database state."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="MetricsCorp")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        f1 = Finding(
            brand_id=brand.id,
            asset_type="social",
            candidate_name="@metric_threat",
            risk_score=95.0,
            severity="CRITICAL",
            review_status="CONFIRMED_THREAT",
        )
        f2 = Finding(
            brand_id=brand.id,
            asset_type="mobile_app",
            candidate_name="Metric App",
            risk_score=30.0,
            severity="MEDIUM",
            review_status="FALSE_POSITIVE",
        )
        db.add(f1)
        db.add(f2)
        db.commit()

    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["total_brands"] >= 1
    assert data["total_findings"] == 2
    assert data["critical_findings"] == 1
    assert data["confirmed_threats"] == 1
    assert data["false_positives"] == 1
    assert data["by_asset_type"]["social"] == 1
    assert data["by_asset_type"]["mobile_app"] == 1
