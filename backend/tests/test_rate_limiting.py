import pytest
from backend.app.utils.auth import create_dev_token
from backend.app.utils.limiter import limiter

def test_health_check_exempt_from_rate_limits(client):
    """Health check endpoint is exempt and should not return 429 under multiple requests."""
    for _ in range(25):
        res = client.get("/api/v1/health")
        assert res.status_code == 200


def test_rate_limit_enforcement_and_429_format(app):
    """Verify that exceeding rate limit returns 429 with standard SURAKSHA JSON envelope."""
    # Create test app with a strict limit for testing
    app.config["RATELIMIT_ML"] = "3 per minute"
    test_client = app.test_client()

    payload = {"url": "https://suspicious-target.xyz"}

    # First 3 requests should succeed
    for _ in range(3):
        res = test_client.post("/api/v1/ml/predict-url", json=payload)
        assert res.status_code == 200

    # 4th request must trigger rate limit
    res_blocked = test_client.post("/api/v1/ml/predict-url", json=payload)
    assert res_blocked.status_code == 429
    data = res_blocked.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Too many requests" in data["error"]["message"]


def test_rate_limiting_isolated_by_authenticated_user(app):
    """Verify separate authenticated users have isolated rate limit quotas."""
    app.config["RATELIMIT_ML"] = "2 per minute"
    test_client = app.test_client()

    token_user_a = create_dev_token(uid="user-alpha", role="analyst")
    token_user_b = create_dev_token(uid="user-beta", role="analyst")

    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    payload = {"url": "https://test-example.com"}

    # User A exhausts their quota (2 requests)
    r1 = test_client.post("/api/v1/ml/predict-url", json=payload, headers=headers_a)
    assert r1.status_code == 200
    r2 = test_client.post("/api/v1/ml/predict-url", json=payload, headers=headers_a)
    assert r2.status_code == 200

    # User A 3rd request is blocked
    r3 = test_client.post("/api/v1/ml/predict-url", json=payload, headers=headers_a)
    assert r3.status_code == 429

    # User B must NOT be blocked because rate limit is tied to user identity
    r_user_b = test_client.post("/api/v1/ml/predict-url", json=payload, headers=headers_b)
    assert r_user_b.status_code == 200
