def test_health_check_returns_healthy(client):
    """Verify health endpoint accurately reports database availability and status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert data["service"] == "SURAKSHA API"
    assert "version" in data
    assert "timestamp" in data
    assert data["database"]["connected"] is True
    assert "Database is operational" in data["database"]["status"]
