import pytest
from backend.app.services.webhook_service import WebhookService, _is_public_url


@pytest.mark.parametrize("url", [
    "http://localhost/x", "http://127.0.0.1/x", "http://10.0.0.5/x",
    "http://169.254.169.254/latest/meta-data", "http://192.168.1.1/x", "http://[::1]/x",
])
def test_private_targets_blocked(url):
    assert _is_public_url(url) is False


def test_dispatch_rejects_private_url():
    with pytest.raises(ValueError):
        WebhookService().dispatch("http://127.0.0.1:8000/hook", {"brand_name": "x"})


def test_dispatch_rejects_non_http():
    with pytest.raises(ValueError):
        WebhookService().dispatch("file:///etc/passwd", {})
