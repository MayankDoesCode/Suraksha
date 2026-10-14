import pytest
from backend.app.database import get_db
from backend.app.models.brand import Brand, BrandDomain
from backend.app.models.threat import Finding
from backend.app.utils.auth import create_dev_token

def test_new_authenticated_user_sees_empty_real_workspace(app):
    """
    Acceptance Test 1 & 7:
    A new authenticated user with no registered brands sees:
    - Exactly 0 brands in /api/v1/brands
    - Exactly 0 findings in /api/v1/findings
    - Authentic zero metrics in /api/v1/metrics (not fabricated or seed numbers)
    """
    with app.app_context():
        new_user_token = create_dev_token(uid="new-user-12345", email="newuser@example.com", role="analyst")

    client = app.test_client()
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {new_user_token}"

    # 1. Brands endpoint returns empty array
    res_brands = client.get("/api/v1/brands")
    assert res_brands.status_code == 200
    json_brands = res_brands.get_json()
    assert json_brands["success"] is True
    assert json_brands["data"] == []
    assert json_brands["pagination"]["total"] == 0

    # 2. Findings endpoint returns empty array
    res_findings = client.get("/api/v1/findings")
    assert res_findings.status_code == 200
    json_findings = res_findings.get_json()
    assert json_findings["success"] is True
    assert json_findings["data"] == []
    assert json_findings["pagination"]["total"] == 0

    # 3. Metrics endpoint returns authentic zeros across all dimensions
    res_metrics = client.get("/api/v1/metrics")
    assert res_metrics.status_code == 200
    json_metrics = res_metrics.get_json()
    assert json_metrics["success"] is True
    data = json_metrics["data"]
    assert data["total_brands"] == 0
    assert data["total_findings"] == 0
    assert data["critical_findings"] == 0
    assert data["high_findings"] == 0
    assert data["under_investigation"] == 0
    assert data["confirmed_threats"] == 0
    assert data["by_asset_type"] == {"social": 0, "mobile_app": 0, "domain": 0}
    assert data["by_severity"] == {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}


def test_demo_data_absent_from_real_workspace_api_responses(app):
    """
    Acceptance Test 2:
    Sample/demo brands and findings (is_sample=True) must NEVER appear in a real user's
    workspace queries, even when demo records exist in the database.
    """
    with app.app_context():
        db = get_db()
        # Seed a demo brand and demo finding
        demo_brand = Brand(name="Acme FinTech Demo", owner_id=None, is_sample=True)
        db.add(demo_brand)
        db.commit()
        db.refresh(demo_brand)

        demo_finding = Finding(
            brand_id=demo_brand.id,
            asset_type="domain",
            candidate_name="acme-phish.xyz",
            risk_score=95.0,
            severity="CRITICAL",
            is_sample=True
        )
        db.add(demo_finding)
        db.commit()

        user_token = create_dev_token(uid="user-clean-001", email="clean@company.com", role="analyst")

    client = app.test_client()
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {user_token}"

    # Real workspace query: must NOT return the demo brand
    res_brands = client.get("/api/v1/brands")
    assert res_brands.status_code == 200
    brand_names = [b["name"] for b in res_brands.get_json()["data"]]
    assert "Acme FinTech Demo" not in brand_names
    assert len(brand_names) == 0

    # Real workspace query: must NOT return the demo finding
    res_findings = client.get("/api/v1/findings")
    assert res_findings.status_code == 200
    finding_names = [f["candidate_name"] for f in res_findings.get_json()["data"]]
    assert "acme-phish.xyz" not in finding_names
    assert len(finding_names) == 0

    # Real metrics: must NOT count the demo brand or demo finding
    res_metrics = client.get("/api/v1/metrics")
    assert res_metrics.status_code == 200
    metrics = res_metrics.get_json()["data"]
    assert metrics["total_brands"] == 0
    assert metrics["total_findings"] == 0
    assert metrics["critical_findings"] == 0


def test_user_a_cannot_access_user_b_records(app):
    """
    Acceptance Test 3:
    Multi-tenant isolation: User A cannot read, update, or delete User B's brands or findings.
    """
    with app.app_context():
        db = get_db()
        # User B registers Brand B with a threat finding
        brand_b = Brand(name="Enterprise B", owner_id="user-b-uid", is_sample=False)
        db.add(brand_b)
        db.commit()
        db.refresh(brand_b)

        finding_b = Finding(
            brand_id=brand_b.id,
            asset_type="social",
            candidate_name="@enterprise_b_fake",
            risk_score=85.0,
            severity="HIGH",
            is_sample=False
        )
        db.add(finding_b)
        db.commit()
        db.refresh(finding_b)
        bid = brand_b.id
        fid = finding_b.id

        token_a = create_dev_token(uid="user-a-uid", email="usera@corp.com", role="analyst")

    client_a = app.test_client()
    client_a.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token_a}"

    # User A listing brands: User B's brand is absent
    res_list = client_a.get("/api/v1/brands")
    assert res_list.status_code == 200
    assert not any(b["id"] == bid for b in res_list.get_json()["data"])

    # User A attempting direct GET on User B's brand -> 403 Forbidden
    res_get_b = client_a.get(f"/api/v1/brands/{bid}")
    assert res_get_b.status_code == 403
    assert res_get_b.get_json()["error"]["code"] == "FORBIDDEN"

    # User A attempting PUT on User B's brand -> 403 Forbidden
    res_put_b = client_a.put(f"/api/v1/brands/{bid}", json={"name": "Hijacked Name"})
    assert res_put_b.status_code == 403

    # User A attempting DELETE on User B's brand -> 403 Forbidden
    res_del_b = client_a.delete(f"/api/v1/brands/{bid}")
    assert res_del_b.status_code == 403

    # User A listing findings: User B's finding is absent
    res_findings = client_a.get("/api/v1/findings")
    assert res_findings.status_code == 200
    assert not any(f["id"] == fid for f in res_findings.get_json()["data"])

    # User A attempting direct GET on User B's finding -> 403 Forbidden
    res_get_f = client_a.get(f"/api/v1/findings/{fid}")
    assert res_get_f.status_code == 403


def test_demo_mode_isolation_and_labeling(app):
    """
    Acceptance Test 4 & 5:
    Querying with is_sample=true or demo=true returns ONLY sample records,
    clearly separated from genuine workspace data.
    """
    with app.app_context():
        db = get_db()
        # Create genuine real user brand and demo brand
        real_brand = Brand(name="Real Fintech Ltd", owner_id="user-c-uid", is_sample=False)
        demo_brand = Brand(name="Demo FinTech Sandbox", owner_id=None, is_sample=True)
        db.add_all([real_brand, demo_brand])
        db.commit()

        token_c = create_dev_token(uid="user-c-uid", email="userc@fintech.com", role="analyst")

    client = app.test_client()
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token_c}"

    # Demo query returns only demo brand
    res_demo = client.get("/api/v1/brands?is_sample=true")
    assert res_demo.status_code == 200
    demo_items = res_demo.get_json()["data"]
    assert len(demo_items) == 1
    assert demo_items[0]["name"] == "Demo FinTech Sandbox"
    assert demo_items[0]["is_sample"] is True

    # Real query returns only real brand
    res_real = client.get("/api/v1/brands")
    assert res_real.status_code == 200
    real_items = res_real.get_json()["data"]
    assert len(real_items) == 1
    assert real_items[0]["name"] == "Real Fintech Ltd"
    assert real_items[0]["is_sample"] is False


def test_existing_legitimate_user_records_remain_accessible(app):
    """
    Acceptance Test 6:
    Existing genuine user-owned records remain completely accessible to their authorized owners.
    """
    with app.app_context():
        db = get_db()
        owner_uid = "authorized-owner-99"
        brand = Brand(name="Legitimate Shield Corp", owner_id=owner_uid, is_sample=False)
        db.add(brand)
        db.commit()
        db.refresh(brand)

        finding = Finding(
            brand_id=brand.id,
            asset_type="domain",
            candidate_name="legitshield-fake.com",
            risk_score=78.0,
            severity="HIGH",
            is_sample=False
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)
        bid = brand.id
        fid = finding.id

        owner_token = create_dev_token(uid=owner_uid, email="owner@shieldcorp.com", role="analyst")

    client = app.test_client()
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {owner_token}"

    # Authorized owner can list brand
    res_brands = client.get("/api/v1/brands")
    assert res_brands.status_code == 200
    assert any(b["id"] == bid for b in res_brands.get_json()["data"])

    # Authorized owner can read brand detail
    res_b = client.get(f"/api/v1/brands/{bid}")
    assert res_b.status_code == 200
    assert res_b.get_json()["data"]["name"] == "Legitimate Shield Corp"

    # Authorized owner can list findings
    res_f = client.get(f"/api/v1/findings?brand_id={bid}")
    assert res_f.status_code == 200
    assert any(f["id"] == fid for f in res_f.get_json()["data"])

    # Authorized owner can view metrics reflecting genuine records
    res_m = client.get("/api/v1/metrics")
    assert res_m.status_code == 200
    m_data = res_m.get_json()["data"]
    assert m_data["total_brands"] == 1
    assert m_data["total_findings"] == 1
    assert m_data["high_findings"] == 1


def test_unauthenticated_request_cannot_access_real_brand(app):
    """
    Acceptance Test 7:
    Unauthenticated caller attempting to access, edit, or delete a real user's brand
    is rejected with 401 Unauthorized, never bypassing the ownership check.
    """
    with app.app_context():
        db = get_db()
        real_brand = Brand(name="Private Secured Corp", owner_id="secret-user-uid", is_sample=False)
        db.add(real_brand)
        db.commit()
        db.refresh(real_brand)
        bid = real_brand.id

    client = app.test_client()
    # No Authorization header provided

    res_get = client.get(f"/api/v1/brands/{bid}")
    assert res_get.status_code == 401
    assert res_get.get_json()["error"]["code"] == "UNAUTHORIZED"

    res_put = client.put(f"/api/v1/brands/{bid}", json={"name": "Attacker Hijack"})
    assert res_put.status_code == 401

    res_del = client.delete(f"/api/v1/brands/{bid}")
    assert res_del.status_code == 401
