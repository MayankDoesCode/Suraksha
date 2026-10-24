"""The separate URL service must load the slim model and return exactly what local scoring returns."""
import importlib
import json
import os
import shutil
import sys

import pytest

MODELS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "ml", "models")
URLS = ["http://paypal-secure-login.xyz/verify", "https://www.google.com", "http://sbi-kyc-update.in/login", "github.com",
        "HTTPS://WWW.Example.COM:8443/a?b#c", "user:pw@login-acme.top/x", "amazon.in.", "  bit.ly/abc  ", "xn--pple-43d.com", "192.168.0.1/login"]


@pytest.fixture(scope="module")
def service(tmp_path_factory):
    d = tmp_path_factory.mktemp("url_models")
    shutil.copy(os.path.join(MODELS, "url_phishing_pipeline_slim.joblib"), d / "url_phishing_pipeline.joblib")
    shutil.copy(os.path.join(MODELS, "url_phishing_slim_manifest.json"), d / "url_phishing_manifest.json")
    os.environ["URL_MODEL_DIR"] = str(d)
    sys.modules.pop("deploy.url_service.app", None)
    mod = importlib.import_module("deploy.url_service.app")
    yield mod
    os.environ.pop("URL_MODEL_DIR", None)


def test_slim_manifest_records_identical_verification():
    m = json.load(open(os.path.join(MODELS, "url_phishing_slim_manifest.json")))
    v = m["identical_predictions_verified"]
    assert v["max_abs_diff"] == 0.0 and v["inputs"] > 1000
    assert m["derived_from"]["artifact"] == "url_phishing_pipeline.joblib"


def test_service_health_and_identical_scores(service):
    c = service.app.test_client()
    h = c.get("/health")
    assert h.status_code == 200 and h.get_json()["url_model"] is True
    from backend.app.ml.service import MLService
    local = MLService(model_dir=MODELS)
    for u in URLS:
        remote = c.post("/predict/url", json={"url": u}).get_json()
        assert remote == local.predict_url_risk(u), u  # whole response identical to in-app scoring


def test_service_requires_token_when_set(service, monkeypatch):
    monkeypatch.setenv("SERVICE_API_TOKEN", "s3cret")
    c = service.app.test_client()
    assert c.post("/predict/url", json={"url": "a.com"}).status_code == 401
    assert c.post("/predict/url", json={"url": "a.com"}, headers={"Authorization": "Bearer s3cret"}).status_code == 200
    assert c.post("/predict/url", json={}, headers={"Authorization": "Bearer s3cret"}).status_code == 422
