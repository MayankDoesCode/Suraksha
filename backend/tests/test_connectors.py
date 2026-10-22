import pytest
from unittest.mock import patch, MagicMock
import requests

from backend.app.connectors.itunes_connector import ITunesAppStoreConnector
from backend.app.connectors.twitter_connector import TwitterV2Connector
from backend.app.connectors.registry import ConnectorRegistry
from backend.app.connectors.base import (
    ConnectorError,
    RateLimitError,
    AuthenticationError,
    NetworkTimeoutError,
)

# ---------------------------------------------------------------------------
# Apple App Store (iTunes Search API) Tests
# ---------------------------------------------------------------------------

SAMPLE_ITUNES_RESPONSE = {
    "resultCount": 2,
    "results": [
        {
            "trackId": 988315268,
            "trackName": "Acme Mobile Banking",
            "bundleId": "com.acmebank.mobile",
            "artistName": "Acme Financial Corp",
            "trackViewUrl": "https://apps.apple.com/us/app/acme-mobile-banking/id988315268",
            "description": "Official mobile banking application for Acme Bank account holders.",
            "version": "4.2.0",
            "price": 0.0,
            "artworkUrl512": "https://is1-ssl.mzstatic.com/image/thumb/app512.png",
        },
        {
            "trackId": 999111222,
            "trackName": "Acme Bank Instant Fast Loan",
            "bundleId": "com.fake.acmefastloan",
            "artistName": "Rogue Quick Loans Ltd",
            "trackViewUrl": "https://apps.apple.com/us/app/acme-fast-loan/id999111222",
            "description": "Get fast quick credit loans in your Acme account.",
            "version": "1.0.1",
            "price": 0.0,
            "artworkUrl512": "https://is1-ssl.mzstatic.com/image/thumb/rogue512.png",
        }
    ]
}

def test_itunes_connector_successful_retrieval():
    """Verify Apple iTunes API retrieves and normalizes software listings."""
    connector = ITunesAppStoreConnector()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = SAMPLE_ITUNES_RESPONSE

    with patch("requests.get", return_value=mock_resp) as mock_get:
        candidates = connector.collect_candidates({"name": "Acme Bank"}, limit=10)

        assert mock_get.called
        assert len(candidates) == 2

        # Normalize first record
        normalized = connector.normalize_record(candidates[0])
        assert normalized["external_id"] == "itunes_988315268"
        assert normalized["candidate_name"] == "Acme Mobile Banking"
        assert normalized["package_id"] == "com.acmebank.mobile"
        assert normalized["publisher_name"] == "Acme Financial Corp"
        assert normalized["platform"] == "ios_app_store"
        assert normalized["asset_type"] == "mobile_app"
        assert normalized["detection_source"] == "itunes_app_store"
        assert normalized["is_sample"] is False  # Must be real data, not sample!
        assert "apps.apple.com" in normalized["source_url"]

def test_itunes_connector_network_timeout():
    """Verify NetworkTimeoutError is raised on requests timeout."""
    connector = ITunesAppStoreConnector()

    with patch("requests.get", side_effect=requests.exceptions.Timeout("Read timeout")):
        with pytest.raises(NetworkTimeoutError) as exc_info:
            connector.collect_candidates({"name": "Acme Bank"})
        assert "timed out" in str(exc_info.value).lower()

def test_itunes_connector_rate_limit_429():
    """Verify RateLimitError is raised with Retry-After header on HTTP 429."""
    connector = ITunesAppStoreConnector()

    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.headers = {"Retry-After": "45"}

    with patch("requests.get", return_value=mock_resp):
        with pytest.raises(RateLimitError) as exc_info:
            connector.collect_candidates({"name": "Acme Bank"})
        assert exc_info.value.retry_after_seconds == 45

def test_itunes_connector_malformed_json():
    """Verify ConnectorError is raised when response is malformed."""
    connector = ITunesAppStoreConnector()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.side_effect = ValueError("Invalid JSON string")

    with patch("requests.get", return_value=mock_resp):
        with pytest.raises(ConnectorError) as exc_info:
            connector.collect_candidates({"name": "Acme Bank"})
        assert "failed to parse json" in str(exc_info.value).lower()

def test_itunes_connector_check_connection():
    """Verify check_connection returns diagnostic dictionary."""
    connector = ITunesAppStoreConnector()

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("requests.get", return_value=mock_resp):
        diag = connector.check_connection()
        assert diag["connected"] is True
        assert diag["status"] == "operational"
        assert "latency_ms" in diag


# ---------------------------------------------------------------------------
# Twitter / X API v2 Connector Tests
# ---------------------------------------------------------------------------

def test_twitter_connector_missing_credentials(monkeypatch):
    """When X_BEARER_TOKEN is unset, connector reports not_configured without secrets."""
    monkeypatch.delenv("X_BEARER_TOKEN", raising=False)
    monkeypatch.delenv("TWITTER_BEARER_TOKEN", raising=False)

    connector = TwitterV2Connector()
    assert connector.is_configured is False

    diag = connector.check_connection()
    assert diag["connected"] is False
    assert diag["configured"] is False
    assert diag["status"] == "not_configured"
    assert "X_BEARER_TOKEN" in diag["missing_credentials"]

    with pytest.raises(AuthenticationError) as exc_info:
        connector.collect_candidates({"name": "Acme Bank"})
    assert "missing x_bearer_token" in str(exc_info.value).lower()

def test_twitter_connector_configured_and_successful(monkeypatch):
    """When token is configured, queries official API v2 and normalizes users."""
    monkeypatch.setenv("X_BEARER_TOKEN", "mock_bearer_token_12345")
    connector = TwitterV2Connector()
    assert connector.is_configured is True

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [{"id": "111", "text": "tweet"}],
        "includes": {
            "users": [
                {
                    "id": "12345678",
                    "username": "acmebank_support",
                    "name": "Acme Bank Helpdesk",
                    "description": "Unofficial customer help for Acme accounts.",
                    "url": "https://acme-fake.com"
                }
            ]
        }
    }

    with patch("requests.get", return_value=mock_resp):
        candidates = connector.collect_candidates({"name": "Acme Bank"})
        assert len(candidates) == 1

        normalized = connector.normalize_record(candidates[0])
        assert normalized["external_id"] == "x_12345678"
        assert normalized["candidate_name"] == "@acmebank_support"
        assert normalized["platform"] == "twitter"
        assert normalized["asset_type"] == "social"
        assert normalized["is_sample"] is False
        assert normalized["detection_source"] == "twitter_v2"

def test_twitter_connector_rate_limit_429(monkeypatch):
    """Verify HTTP 429 triggers RateLimitError on Twitter v2."""
    monkeypatch.setenv("X_BEARER_TOKEN", "mock_bearer_token_12345")
    connector = TwitterV2Connector()

    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.headers = {"x-rate-limit-reset": "1730000060"}

    with patch("requests.get", return_value=mock_resp):
        with pytest.raises(RateLimitError):
            connector.collect_candidates({"name": "Acme Bank"})


# ---------------------------------------------------------------------------
# Google Play Store Connector Tests
# ---------------------------------------------------------------------------

from backend.app.connectors.google_play_connector import GooglePlayConnector

def test_google_play_connector_normalization():
    """Verify Google Play connector normalizes raw application entries."""
    connector = GooglePlayConnector()
    sample_raw = {
        "title": "Acme Mobile Bank Secure",
        "package_id": "com.rogue.acme.securebank",
        "developer": "Shady App Studios",
        "url": "https://play.google.com/store/apps/details?id=com.rogue.acme.securebank",
        "description": "Log into your Acme Bank account to claim instant prize cash.",
        "icon_url": "https://play-lh.googleusercontent.com/sample_icon.png",
        "permissions": ["android.permission.RECEIVE_SMS", "android.permission.SYSTEM_ALERT_WINDOW"],
        "price": 0.0,
        "is_sample": False,
    }

    norm = connector.normalize_record(sample_raw)
    assert norm["external_id"] == "play_com.rogue.acme.securebank"
    assert norm["candidate_name"] == "Acme Mobile Bank Secure"
    assert norm["package_id"] == "com.rogue.acme.securebank"
    assert norm["publisher_name"] == "Shady App Studios"
    assert norm["platform"] == "google_play"
    assert norm["asset_type"] == "mobile_app"
    assert norm["detection_source"] == "google_play_store"
    assert "android.permission.RECEIVE_SMS" in norm["metadata"]["permissions"]


def test_google_play_connector_fallback_corpus():
    """Verify Google Play connector returns deterministic threat corpus if external request fails."""
    connector = GooglePlayConnector()

    with patch("requests.get", side_effect=requests.exceptions.ConnectionError("Offline proxy")):
        candidates = connector.collect_candidates({"name": "Acme Bank"}, limit=5)
        assert len(candidates) > 0
        assert any("acme" in (c.get("id") or c.get("package_id", "")).lower() for c in candidates)


# ---------------------------------------------------------------------------
# Connector Registry Tests
# ---------------------------------------------------------------------------

def test_registry_status_no_secrets():
    """Verify registry status never leaks API keys or bearer tokens."""
    registry = ConnectorRegistry()
    statuses = registry.get_all_status()

    assert "itunes_app_store" in statuses
    assert "google_play_store" in statuses
    assert "twitter_v2" in statuses

    for cid, st in statuses.items():
        assert "id" in st
        assert "status" in st
        assert "configured" in st
        # Ensure raw secret keys are NEVER in response dict
        assert "bearer_token" not in st
        assert "api_key" not in st
        assert "token" not in st
        assert "password" not in st
