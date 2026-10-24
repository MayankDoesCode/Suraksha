"""
Phase 1 regression tests: brand ownership must be enforced on findings and brands.

Root cause being guarded: the ownership checks were written as `if owner_id and owner_id != caller and not admin: deny`.
A real brand whose owner_id is NULL/empty (or a finding whose brand is missing) skipped the check entirely, so any
authenticated user, and for brands even an unauthenticated caller, could read or change it.

Required behaviour: a real (non-sample) record with no resolvable owner is admin-only. Sample records keep their
public demo behaviour. Owners and admins keep full access.
"""
import pytest

from backend.app.database import get_db
from backend.app.models.brand import Brand
from backend.app.models.threat import Finding
from backend.app.utils.auth import create_dev_token

UNOWNED = [None, "", "   "]  # NULL, empty and whitespace-only owners all mean "no owner"


def _client(app, uid, role="analyst"):
    with app.app_context():
        token = create_dev_token(uid=uid, email=f"{uid}@example.test", role=role)
    c = app.test_client()
    c.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return c


@pytest.fixture(autouse=True)
def _relax_limits(app):
    """Raise the AI/discover rate limits for these tests only, and always put the originals back (even if a test fails)."""
    keys = ("RATELIMIT_AI", "RATELIMIT_DISCOVER")
    missing = object()
    saved = {k: app.config.get(k, missing) for k in keys}
    for k in keys:
        app.config[k] = "1000 per minute"
    try:
        yield
    finally:
        for k, v in saved.items():
            if v is missing:
                app.config.pop(k, None)
            else:
                app.config[k] = v



def _make(app, owner, *, is_sample=False, name="Ownerless Corp", dangling_brand=False, asset_type="social"):
    """Create a brand and one finding. `dangling_brand` points the finding at a brand id that does not exist."""
    with app.app_context():
        db = get_db()
        brand = Brand(name=name, owner_id=owner, is_sample=is_sample)
        db.add(brand)
        db.commit()
        db.refresh(brand)
        finding = Finding(
            brand_id="no-such-brand" if dangling_brand else brand.id,
            asset_type=asset_type,
            candidate_name="@fake_handle" if asset_type == "social" else "fake-login.com",
            risk_score=80.0,
            severity="HIGH",
            is_sample=is_sample,
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)
        return brand.id, finding.id


# ---------------------------------------------------------------- findings: unowned real brands ----------------

@pytest.mark.parametrize("owner", UNOWNED)
def test_non_owner_cannot_read_unowned_finding(app, owner):
    _, fid = _make(app, owner)
    c = _client(app, "intruder")
    assert c.get(f"/api/v1/findings/{fid}").status_code == 403


@pytest.mark.parametrize("owner", UNOWNED)
def test_non_owner_cannot_mutate_unowned_finding(app, owner):
    _, fid = _make(app, owner)
    c = _client(app, "intruder")
    r = c.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "CONFIRMED_THREAT"})
    assert r.status_code == 403
    with app.app_context():
        assert get_db().get(Finding, fid).review_status != "CONFIRMED_THREAT"


@pytest.mark.parametrize("owner", UNOWNED)
@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/findings/{id}/explain"),
    ("post", "/api/v1/findings/{id}/ai-investigate"),
    ("post", "/api/v1/findings/{id}/enrich"),
    ("get", "/api/v1/findings/{id}/report?audience=internal"),
    ("get", "/api/v1/findings/{id}/takedown"),
    ("post", "/api/v1/findings/{id}/takedown"),
])
def test_non_owner_denied_on_finding_routes_for_unowned_brand(app, owner, method, path):
    _, fid = _make(app, owner)
    c = _client(app, "intruder")
    assert getattr(c, method)(path.format(id=fid)).status_code == 403


@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/findings/{id}"),
    ("get", "/api/v1/findings/{id}/explain"),
    ("post", "/api/v1/findings/{id}/ai-investigate"),
])
@pytest.mark.parametrize("owner", UNOWNED)
def test_unauthenticated_cannot_reach_unowned_finding(app, unauth_client, owner, method, path):
    _, fid = _make(app, owner)
    assert getattr(unauth_client, method)(path.format(id=fid)).status_code == 401


@pytest.mark.parametrize("owner", UNOWNED)
@pytest.mark.parametrize("method,path", [
    ("patch", "/api/v1/findings/{id}/status"),
    ("post", "/api/v1/findings/{id}/enrich"),
    ("get", "/api/v1/findings/{id}/report?audience=internal"),
    ("get", "/api/v1/findings/{id}/takedown"),
])
def test_unauthenticated_mutation_and_report_routes_rejected(app, unauth_client, owner, method, path):
    _, fid = _make(app, owner)
    assert getattr(unauth_client, method)(path.format(id=fid), json={"review_status": "FALSE_POSITIVE"}).status_code == 401


# ---------------------------------------------------------------- findings: missing brand relationship ---------

def test_finding_with_missing_brand_is_admin_only(app):
    _, fid = _make(app, "someone", dangling_brand=True)
    intruder = _client(app, "intruder")
    assert intruder.get(f"/api/v1/findings/{fid}").status_code == 403
    assert intruder.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "FALSE_POSITIVE"}).status_code == 403
    assert intruder.get(f"/api/v1/findings/{fid}/report?audience=internal").status_code == 403
    admin = _client(app, "root-admin", role="admin")
    assert admin.get(f"/api/v1/findings/{fid}").status_code == 200


# ---------------------------------------------------------------- findings: cross-tenant and legitimate access --

def test_cross_tenant_findings_denied(app):
    _, fid = _make(app, "tenant-b")
    a = _client(app, "tenant-a")
    assert a.get(f"/api/v1/findings/{fid}").status_code == 403
    assert a.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "FALSE_POSITIVE"}).status_code == 403
    assert a.get(f"/api/v1/findings/{fid}/report?audience=internal").status_code == 403
    assert a.get(f"/api/v1/findings/{fid}/explain").status_code == 403


def test_owner_keeps_full_access(app):
    _, fid = _make(app, "owner-1")
    c = _client(app, "owner-1")
    assert c.get(f"/api/v1/findings/{fid}").status_code == 200
    assert c.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "FALSE_POSITIVE"}).status_code == 200
    assert c.get(f"/api/v1/findings/{fid}/report?audience=internal").status_code == 200
    assert c.get(f"/api/v1/findings/{fid}/explain").status_code == 200


@pytest.mark.parametrize("owner", UNOWNED)
def test_admin_keeps_access_to_unowned_finding(app, owner):
    _, fid = _make(app, owner)
    admin = _client(app, "root-admin", role="admin")
    assert admin.get(f"/api/v1/findings/{fid}").status_code == 200
    assert admin.patch(f"/api/v1/findings/{fid}/status", json={"review_status": "FALSE_POSITIVE"}).status_code == 200
    assert admin.get(f"/api/v1/findings/{fid}/report?audience=internal").status_code == 200


def test_sample_findings_remain_publicly_readable_and_draftable(app, unauth_client):
    _, fid = _make(app, None, is_sample=True, name="Acme Demo")
    assert unauth_client.get(f"/api/v1/findings/{fid}").status_code == 200
    assert _client(app, "viewer-1", role="viewer").get(f"/api/v1/findings/{fid}/report?audience=internal").status_code == 200


# ---------------------------------------------------------------- findings: brand-scoped candidate routes ------

@pytest.mark.parametrize("owner", UNOWNED)
def test_candidate_routes_deny_non_owner_on_unowned_brand(app, owner):
    bid, _ = _make(app, owner)
    c = _client(app, "intruder")
    body = {"brand_id": bid, "candidate_name": "@fake", "asset_type": "social"}
    assert c.post("/api/v1/findings/ai-investigate-candidate", json=body).status_code == 403
    assert c.post("/api/v1/findings/explain", json=body).status_code == 403


def test_candidate_explain_denies_cross_tenant(app):
    bid, _ = _make(app, "tenant-b")
    body = {"brand_id": bid, "candidate_name": "@fake", "asset_type": "social"}
    assert _client(app, "tenant-a").post("/api/v1/findings/explain", json=body).status_code == 403


# ---------------------------------------------------------------- brands --------------------------------------

@pytest.mark.parametrize("owner", UNOWNED)
def test_unowned_real_brand_not_readable_by_non_owner_or_anonymous(app, unauth_client, owner):
    bid, _ = _make(app, owner)
    assert unauth_client.get(f"/api/v1/brands/{bid}").status_code == 401
    assert _client(app, "intruder").get(f"/api/v1/brands/{bid}").status_code == 403


@pytest.mark.parametrize("owner", UNOWNED)
def test_unowned_real_brand_cannot_be_updated_or_deleted_by_non_owner(app, owner):
    bid, _ = _make(app, owner)
    analyst = _client(app, "intruder")
    lead = _client(app, "intruder-lead", role="lead")
    assert analyst.put(f"/api/v1/brands/{bid}", json={"name": "Hijacked"}).status_code == 403
    assert lead.put(f"/api/v1/brands/{bid}", json={"name": "Hijacked"}).status_code == 403
    assert lead.delete(f"/api/v1/brands/{bid}").status_code == 403
    with app.app_context():
        brand = get_db().get(Brand, bid)
        assert brand is not None and brand.name == "Ownerless Corp"


@pytest.mark.parametrize("owner", UNOWNED)
def test_unowned_real_brand_cannot_be_scanned_by_non_owner(app, owner):
    bid, _ = _make(app, owner)
    r = _client(app, "intruder").post(f"/api/v1/brands/{bid}/scan", json={"asset_type": "domain", "candidate_name": "fake-login.com", "source_url": "https://fake-login.com"})
    assert r.status_code == 403


@pytest.mark.parametrize("owner", UNOWNED)
def test_admin_can_manage_unowned_real_brand(app, owner):
    bid, _ = _make(app, owner)
    admin = _client(app, "root-admin", role="admin")
    assert admin.get(f"/api/v1/brands/{bid}").status_code == 200
    assert admin.put(f"/api/v1/brands/{bid}", json={"name": "Renamed By Admin"}).status_code == 200
    assert admin.delete(f"/api/v1/brands/{bid}").status_code in (200, 204)


def test_owner_can_manage_own_brand(app):
    bid, _ = _make(app, "owner-1")
    c = _client(app, "owner-1", role="lead")
    assert c.get(f"/api/v1/brands/{bid}").status_code == 200
    assert c.put(f"/api/v1/brands/{bid}", json={"name": "Renamed By Owner"}).status_code == 200
    assert c.delete(f"/api/v1/brands/{bid}").status_code in (200, 204)


def test_sample_brand_behaviour_preserved(app, unauth_client):
    bid, _ = _make(app, None, is_sample=True, name="Acme Demo")
    assert unauth_client.get(f"/api/v1/brands/{bid}").status_code == 200
    assert _client(app, "anyone").get(f"/api/v1/brands/{bid}").status_code == 200


# ---------------------------------------------------------------- /findings/explain -----------------------------

def test_explain_candidate_anonymous_on_real_brand_is_401(app, unauth_client):
    bid, _ = _make(app, "tenant-b", name="Tenant B Private Corp")
    r = unauth_client.post("/api/v1/findings/explain", json={"brand_id": bid, "candidate_name": "@fake", "asset_type": "social"})
    assert r.status_code == 401
    assert "Tenant B Private Corp" not in r.get_data(as_text=True)


def test_explain_candidate_cross_tenant_403_and_leaks_nothing(app):
    bid, _ = _make(app, "tenant-b", name="Tenant B Private Corp")
    r = _client(app, "tenant-a").post("/api/v1/findings/explain", json={"brand_id": bid, "candidate_name": "@fake", "asset_type": "social"})
    assert r.status_code == 403
    assert "Tenant B Private Corp" not in r.get_data(as_text=True)


def test_explain_candidate_missing_brand_is_404(app, unauth_client):
    body = {"brand_id": "does-not-exist", "candidate_name": "@fake", "asset_type": "social"}
    assert _client(app, "anyone").post("/api/v1/findings/explain", json=body).status_code == 404
    assert unauth_client.post("/api/v1/findings/explain", json=body).status_code == 404


def test_explain_candidate_sample_brand_stays_public(app, unauth_client):
    bid, _ = _make(app, None, is_sample=True, name="Acme Demo")
    r = unauth_client.post("/api/v1/findings/explain", json={"brand_id": bid, "candidate_name": "@acme_demo_fake", "asset_type": "social"})
    assert r.status_code == 200
    assert r.get_json()["success"] is True
