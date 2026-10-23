def test_api_responses_carry_security_headers(client):
    r = client.get("/api/v1/health")
    h = r.headers
    assert h["X-Content-Type-Options"] == "nosniff"
    assert h["X-Frame-Options"] == "DENY"
    assert h["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in h["Permissions-Policy"]
    assert h["Cache-Control"] == "no-store"


def test_hsts_only_over_https(client):
    assert "Strict-Transport-Security" not in client.get("/api/v1/health").headers
    r = client.get("/api/v1/health", headers={"X-Forwarded-Proto": "https"})
    assert "max-age=31536000" in r.headers["Strict-Transport-Security"]


def test_job_error_does_not_leak_internals(client, monkeypatch):
    from backend.app.api.v1 import integrations
    def boom(_id): raise RuntimeError("secret /internal/path password=hunter2")
    monkeypatch.setattr(integrations.scheduler, "execute_job", boom)
    r = client.post("/api/v1/monitoring/jobs/x/run", headers={"Authorization": "Bearer demo-analyst-token"})
    assert r.status_code == 500
    assert "hunter2" not in r.get_data(as_text=True)
