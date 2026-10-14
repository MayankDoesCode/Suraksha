import pytest
import time
import jwt
from backend.app import create_app
from backend.app.config import validate_production_config, ProductionConfig
from backend.app.utils.auth import create_dev_token

def test_public_endpoints_accessible_without_token(unauth_client):
    """Verify health check and public read-only endpoints remain accessible without tokens."""
    # Health check
    res = unauth_client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "healthy"

    # Read-only brands
    res = unauth_client.get("/api/v1/brands")
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Read-only findings
    res = unauth_client.get("/api/v1/findings")
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Integration diagnostics
    res = unauth_client.get("/api/v1/integrations/status")
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # ML metadata
    res = unauth_client.get("/api/v1/ml/status")
    assert res.status_code == 200
    assert res.get_json()["success"] is True


def test_unauthenticated_mutations_rejected(unauth_client):
    """Verify all state-changing endpoints reject requests missing an Authorization header with 401."""
    # Create brand
    res = unauth_client.post("/api/v1/brands", json={"name": "Attacker Inc"})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Update brand
    res = unauth_client.put("/api/v1/brands/some-brand-id", json={"name": "Hacked Brand"})
    assert res.status_code == 401

    # Delete brand
    res = unauth_client.delete("/api/v1/brands/some-brand-id")
    assert res.status_code == 401

    # Trigger scan
    res = unauth_client.post("/api/v1/brands/some-brand-id/scan", json={"candidate_name": "test"})
    assert res.status_code == 401

    # Update finding triage status
    res = unauth_client.patch("/api/v1/findings/some-finding-id/status", json={"review_status": "CONFIRMED_THREAT"})
    assert res.status_code == 401

    # Test integration connector
    res = unauth_client.post("/api/v1/integrations/itunes_app_store/test")
    assert res.status_code == 401

    # Register monitoring job
    res = unauth_client.post("/api/v1/monitoring/jobs", json={"brand_id": "test"})
    assert res.status_code == 401


def test_invalid_and_malformed_tokens_rejected(app, unauth_client):
    """Verify invalid, malformed, and non-bearer tokens are rejected with 401."""
    # Basic auth instead of Bearer
    res = unauth_client.post(
        "/api/v1/brands",
        json={"name": "Test Brand"},
        headers={"Authorization": "Basic dXNlcjpwYXNz"}
    )
    assert res.status_code == 401

    # Empty token
    res = unauth_client.post(
        "/api/v1/brands",
        json={"name": "Test Brand"},
        headers={"Authorization": "Bearer "}
    )
    assert res.status_code == 401

    # Random malformed string
    res = unauth_client.post(
        "/api/v1/brands",
        json={"name": "Test Brand"},
        headers={"Authorization": "Bearer this-is-not-a-valid-token"}
    )
    assert res.status_code == 401

    # Expired token
    with app.app_context():
        expired_token = create_dev_token(uid="analyst-1", role="admin", expires_in_sec=-60)
    res = unauth_client.post(
        "/api/v1/brands",
        json={"name": "Test Brand"},
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res.status_code == 401


def test_authorization_role_boundaries(app, unauth_client):
    """Test RBAC boundaries between viewer, analyst, and admin roles."""
    with app.app_context():
        viewer_token = create_dev_token(uid="user-viewer", role="viewer")
        analyst_token = create_dev_token(uid="user-analyst", role="analyst")
        admin_token = create_dev_token(uid="user-admin", role="admin")

    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Viewer cannot create brand (403 Forbidden)
    res = unauth_client.post("/api/v1/brands", json={"name": "Viewer Brand"}, headers=viewer_headers)
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "FORBIDDEN"

    # 2. Analyst can create brand (201 Created)
    create_res = unauth_client.post("/api/v1/brands", json={"name": "Analyst Brand"}, headers=analyst_headers)
    assert create_res.status_code == 201
    brand_id = create_res.get_json()["data"]["id"]

    # 3. Analyst CANNOT delete brand (403 Forbidden - requires lead or admin)
    del_res = unauth_client.delete(f"/api/v1/brands/{brand_id}", headers=analyst_headers)
    assert del_res.status_code == 403
    assert del_res.get_json()["error"]["code"] == "FORBIDDEN"

    # 4. Admin CAN delete brand (200 OK)
    del_admin_res = unauth_client.delete(f"/api/v1/brands/{brand_id}", headers=admin_headers)
    assert del_admin_res.status_code == 200
    assert del_admin_res.get_json()["success"] is True


def test_cors_origin_policy(client):
    """Test CORS origin validation against allowed vs disallowed origins."""
    # Allowed origin: http://localhost:5173
    res_allowed = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:5173"}
    )
    assert res_allowed.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    assert res_allowed.headers.get("Access-Control-Allow-Credentials") == "true"

    # Disallowed origin: http://evil-spoofing-site.com
    res_disallowed = client.get(
        "/api/v1/health",
        headers={"Origin": "http://evil-spoofing-site.com"}
    )
    assert res_disallowed.headers.get("Access-Control-Allow-Origin") is None


def test_production_fails_safe_on_insecure_secrets():
    """Verify production startup fails safe if SECRET_KEY is missing, default, or too short."""
    class InsecureDefaultConfig(ProductionConfig):
        SECRET_KEY = "sentinelshield-dev-secret-key-change-in-prod"

    class ShortSecretConfig(ProductionConfig):
        SECRET_KEY = "short-secret"

    class WildcardCorsConfig(ProductionConfig):
        SECRET_KEY = "a-very-strong-production-secret-key-of-32-chars-plus"
        CORS_ORIGINS = ["*"]

    # Insecure default rejected
    with pytest.raises(ValueError, match="SECRET_KEY must be explicitly defined"):
        validate_production_config(InsecureDefaultConfig)

    # Short secret rejected
    with pytest.raises(ValueError, match="SECRET_KEY must be explicitly defined"):
        validate_production_config(ShortSecretConfig)

    # Wildcard CORS with credentials rejected
    with pytest.raises(ValueError, match="CORS_ORIGINS must not use wildcard"):
        validate_production_config(WildcardCorsConfig)


def test_auth_config_endpoint_returns_public_parameters_without_leaking_secrets(unauth_client):
    """
    Verify /api/v1/auth/config provides public Firebase configuration to the SPA
    without exposing any private secrets, tokens, or credentials.
    """
    res = unauth_client.get("/api/v1/auth/config")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "is_configured" in data
    config = data["config"]
    assert "projectId" in config
    assert "apiKey" in config
    assert "authDomain" in config
    assert "appId" in config

    # Security check: ensure no private keys or service account fields are leaked
    for private_key_name in ["private_key", "client_secret", "SECRET_KEY", "GROQ_API_KEY", "LANGSMITH_API_KEY"]:
        assert private_key_name not in config
