import os
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import requests

from backend.app.connectors.base import (
    BaseConnector,
    ConnectorError,
    RateLimitError,
    AuthenticationError,
    NetworkTimeoutError,
)

logger = logging.getLogger(__name__)

class TwitterV2Connector(BaseConnector):
    """
    Twitter / X API v2 Connector.
    Official, authorized access via Twitter API v2 Bearer Token.
    Queries official endpoints to detect profile impersonations and rogue accounts.
    Never scrapes HTML pages or bypasses rate limits.
    """

    BASE_URL = "https://api.twitter.com/2"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        cfg.setdefault("source_id", "twitter_v2")
        cfg.setdefault("source_name", "Twitter / X API v2")
        super().__init__(cfg)

        self.bearer_token = os.getenv("X_BEARER_TOKEN") or os.getenv("TWITTER_BEARER_TOKEN")
        self.timeout = float(os.getenv("X_API_TIMEOUT", "10.0"))

    @property
    def is_configured(self) -> bool:
        return bool(self.bearer_token and self.bearer_token.strip())

    def check_connection(self) -> Dict[str, Any]:
        """
        Verify connection and authentication status with Twitter / X API v2.
        Does not expose secrets.
        """
        if not self.is_configured:
            return {
                "connected": False,
                "configured": False,
                "status": "not_configured",
                "missing_credentials": ["X_BEARER_TOKEN"],
                "message": (
                    "Twitter / X v2 integration is not configured. Missing X_BEARER_TOKEN environment variable. "
                    "Requires an authorized Twitter Developer Portal Project with v2 read access."
                ),
            }

        start = time.time()
        try:
            # Check authentication with lightweight user lookup endpoint
            url = f"{self.BASE_URL}/users/by/username/twitter"
            headers = {
                "Authorization": f"Bearer {self.bearer_token}",
                "User-Agent": "SURAKSHA-BrandProtection/1.0",
            }
            resp = requests.get(url, headers=headers, timeout=self.timeout)
            latency_ms = round((time.time() - start) * 1000, 1)

            if resp.status_code == 200:
                return {
                    "connected": True,
                    "configured": True,
                    "status": "operational",
                    "latency_ms": latency_ms,
                    "message": "Authenticated with Twitter / X API v2",
                }
            elif resp.status_code in (401, 403):
                return {
                    "connected": False,
                    "configured": True,
                    "status": "authentication_failed",
                    "latency_ms": latency_ms,
                    "message": f"Authentication failed with Twitter API v2 (HTTP {resp.status_code}). Token may be invalid or expired.",
                }
            elif resp.status_code == 429:
                return {
                    "connected": False,
                    "configured": True,
                    "status": "rate_limited",
                    "latency_ms": latency_ms,
                    "message": "Twitter API v2 rate limit encountered (HTTP 429).",
                }
            else:
                return {
                    "connected": False,
                    "configured": True,
                    "status": "degraded",
                    "latency_ms": latency_ms,
                    "message": f"Twitter API v2 returned HTTP {resp.status_code}",
                }
        except requests.exceptions.Timeout:
            return {
                "connected": False,
                "configured": True,
                "status": "timeout",
                "latency_ms": round((time.time() - start) * 1000, 1),
                "message": f"Connection timed out after {self.timeout}s",
            }
        except Exception as e:
            return {
                "connected": False,
                "configured": True,
                "status": "error",
                "latency_ms": round((time.time() - start) * 1000, 1),
                "message": f"Network error connecting to Twitter API v2: {str(e)}",
            }

    def collect_candidates(self, brand_context: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve potential candidate profiles matching brand keywords using Twitter API v2.
        Requires active Bearer Token.
        """
        if not self.is_configured:
            raise AuthenticationError(
                "Twitter / X v2 integration is not configured. Missing X_BEARER_TOKEN environment variable. "
                "To enable live social monitoring: Register at developer.x.com, create a Project & App, "
                "generate an OAuth 2.0 App-Only Bearer Token, and set X_BEARER_TOKEN in .env."
            )

        brand_name = brand_context.get("name") or brand_context.get("brand_name") or ""
        if not brand_name.strip():
            raise ConnectorError("Brand name is required to query Twitter / X profiles.")

        # In Twitter v2, search queries can use /2/tweets/search/recent or users search
        url = f"{self.BASE_URL}/tweets/search/recent"
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": "SURAKSHA-BrandProtection/1.0",
        }
        params = {
            "query": f'"{brand_name.strip()}" -is:retweet',
            "max_results": min(max(10, limit), 50),
            "expansions": "author_id",
            "user.fields": "id,name,username,description,url,verified,created_at,public_metrics",
        }

        try:
            resp = requests.get(url, headers=headers, params=params, timeout=self.timeout)
        except requests.exceptions.Timeout:
            raise NetworkTimeoutError(f"Twitter API v2 request timed out after {self.timeout}s.")
        except requests.exceptions.RequestException as e:
            raise ConnectorError(f"Network error communicating with Twitter API v2: {str(e)}")

        if resp.status_code in (401, 403):
            raise AuthenticationError(f"Twitter API v2 credentials rejected (HTTP {resp.status_code}).")
        elif resp.status_code == 429:
            reset_time = resp.headers.get("x-rate-limit-reset")
            retry_after = 60
            if reset_time and reset_time.isdigit():
                retry_after = max(1, int(reset_time) - int(time.time()))
            raise RateLimitError(
                "Twitter API v2 rate limit reached.",
                retry_after_seconds=retry_after
            )
        elif resp.status_code != 200:
            raise ConnectorError(f"Twitter API v2 returned unexpected status HTTP {resp.status_code}")

        try:
            data = resp.json()
        except Exception as e:
            raise ConnectorError(f"Failed to parse JSON response from Twitter API: {str(e)}")

        users = data.get("includes", {}).get("users", [])
        return users

    def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Twitter v2 user object into unified candidate schema.
        """
        user_id = raw_record.get("id") or "unknown"
        username = raw_record.get("username") or ""
        name = raw_record.get("name") or ""
        description = raw_record.get("description") or ""
        url = raw_record.get("url") or f"https://twitter.com/{username}"

        return {
            "external_id": f"x_{user_id}",
            "source": self.source_id,
            "detection_source": self.source_id,
            "asset_type": "social",
            "platform": "twitter",
            "candidate_name": f"@{username}" if not username.startswith("@") else username,
            "handle": username,
            "display_name": name,
            "source_url": f"https://twitter.com/{username}",
            "profile_url": f"https://twitter.com/{username}",
            "website_url": url,
            "description": description,
            "is_sample": False,
            "observed_at": datetime.now(timezone.utc).isoformat(),
            "raw_payload": raw_record,
        }

    def get_source_metadata(self) -> Dict[str, Any]:
        """Return provider configuration requirements, status, and metadata."""
        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "asset_type": "social",
            "auth_type": "bearer_token",
            "configured": self.is_configured,
            "status": "operational" if self.is_configured else "not_configured",
            "missing_credentials": [] if self.is_configured else ["X_BEARER_TOKEN"],
            "setup_requirements": {
                "step_1": "Register for developer account at https://developer.x.com",
                "step_2": "Create a Project and App in the Developer Portal",
                "step_3": "Generate an OAuth 2.0 App-Only Bearer Token with v2 read permissions",
                "step_4": "Configure X_BEARER_TOKEN in backend .env file",
            },
            "rate_limit_guidance": "Standard v2 tier allows 10-50 requests per 15-minute window",
            "required_env_vars": ["X_BEARER_TOKEN"],
            "optional_env_vars": ["X_API_TIMEOUT"],
            "capabilities": ["user_lookup", "recent_tweet_author_search", "bio_analysis"],
            "live_testable": self.is_configured,
        }
