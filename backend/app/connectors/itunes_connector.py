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
    NetworkTimeoutError,
)

logger = logging.getLogger(__name__)

class ITunesAppStoreConnector(BaseConnector):
    """
    Apple App Store Connector using Apple's official, public iTunes Search API.
    Retrieves genuine iOS / macOS application listing metadata matching brand identities.
    Authorized access via Apple's documented public search endpoints.
    """

    SEARCH_URL = "https://itunes.apple.com/search"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        cfg.setdefault("source_id", "itunes_app_store")
        cfg.setdefault("source_name", "Apple App Store (iTunes API)")
        super().__init__(cfg)

        self.country = os.getenv("ITUNES_STORE_COUNTRY", "US")
        self.timeout = float(os.getenv("ITUNES_API_TIMEOUT", "10.0"))
        self.user_agent = "SURAKSHA-BrandProtection/1.0 (+https://github.com/MayankDoesCode/Suraksha)"

    def check_connection(self) -> Dict[str, Any]:
        """
        Verify reachability and latency of Apple's public iTunes Search API.
        """
        start = time.time()
        try:
            params = {
                "term": "apple",
                "entity": "software",
                "limit": 1,
                "country": self.country,
            }
            headers = {"User-Agent": self.user_agent}
            resp = requests.get(self.SEARCH_URL, params=params, headers=headers, timeout=self.timeout)
            latency_ms = round((time.time() - start) * 1000, 1)

            if resp.status_code == 200:
                return {
                    "connected": True,
                    "configured": True,
                    "status": "operational",
                    "latency_ms": latency_ms,
                    "message": "Connected to Apple iTunes Search API",
                }
            elif resp.status_code in (403, 429):
                return {
                    "connected": False,
                    "configured": True,
                    "status": "rate_limited",
                    "latency_ms": latency_ms,
                    "message": f"Apple iTunes Search API rate limit encountered (HTTP {resp.status_code})",
                }
            else:
                return {
                    "connected": False,
                    "configured": True,
                    "status": "degraded",
                    "latency_ms": latency_ms,
                    "message": f"Apple iTunes Search API returned HTTP {resp.status_code}",
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
                "message": f"Network error connecting to Apple iTunes API: {str(e)}",
            }

    def collect_candidates(self, brand_context: Dict[str, Any], limit: int = 25) -> List[Dict[str, Any]]:
        """
        Retrieve live iOS mobile application candidates matching the brand name.
        """
        brand_name = brand_context.get("name") or brand_context.get("brand_name") or ""
        if not brand_name.strip():
            raise ConnectorError("Brand name is required to query iTunes App Store candidates.")

        params = {
            "term": brand_name.strip(),
            "entity": "software",
            "limit": min(max(1, limit), 50),
            "country": self.country,
        }
        headers = {"User-Agent": self.user_agent}

        try:
            resp = requests.get(self.SEARCH_URL, params=params, headers=headers, timeout=self.timeout)
        except requests.exceptions.Timeout:
            raise NetworkTimeoutError(f"iTunes API request timed out after {self.timeout} seconds.")
        except requests.exceptions.RequestException as e:
            raise ConnectorError(f"Network error querying iTunes API: {str(e)}")

        if resp.status_code in (403, 429):
            retry_after = resp.headers.get("Retry-After")
            retry_seconds = int(retry_after) if retry_after and retry_after.isdigit() else 60
            raise RateLimitError(
                f"Apple iTunes API rate limit reached (HTTP {resp.status_code}).",
                retry_after_seconds=retry_seconds
            )

        if resp.status_code != 200:
            raise ConnectorError(f"iTunes Search API returned unexpected HTTP status {resp.status_code}")

        try:
            data = resp.json()
        except Exception as e:
            raise ConnectorError(f"Failed to parse JSON response from iTunes API: {str(e)}")

        results = data.get("results")
        if not isinstance(results, list):
            raise ConnectorError("Malformed response payload: 'results' key missing or invalid.")

        return results

    def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Apple iTunes software metadata into unified candidate schema.
        """
        track_id = raw_record.get("trackId") or raw_record.get("id") or "unknown"
        candidate_name = (raw_record.get("trackName") or raw_record.get("title") or "").strip()
        bundle_id = (raw_record.get("bundleId") or raw_record.get("package_id") or "").strip()
        publisher_name = (raw_record.get("artistName") or raw_record.get("sellerName") or "").strip()
        source_url = raw_record.get("trackViewUrl") or f"https://apps.apple.com/app/id{track_id}"
        description = raw_record.get("description") or ""

        return {
            "external_id": f"itunes_{track_id}",
            "source": self.source_id,
            "detection_source": self.source_id,
            "asset_type": "mobile_app",
            "platform": "ios_app_store",
            "candidate_name": candidate_name,
            "package_id": bundle_id,
            "identifier": bundle_id,
            "publisher_name": publisher_name,
            "developer": publisher_name,
            "source_url": source_url,
            "description": description,
            "version": raw_record.get("version"),
            "price": raw_record.get("price", 0.0),
            "artwork_url": raw_record.get("artworkUrl512") or raw_record.get("artworkUrl100"),
            "is_sample": False,  # Live external provider data is NEVER marked as sample!
            "observed_at": datetime.now(timezone.utc).isoformat(),
            "raw_payload": raw_record,
        }

    def get_source_metadata(self) -> Dict[str, Any]:
        """Return rate limit allowances, supported capabilities, and source metadata."""
        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "asset_type": "mobile_app",
            "auth_type": "public_authorized_api",
            "configured": True,
            "status": "operational",
            "rate_limit_guidance": "Recommended maximum ~20 calls/minute by Apple",
            "required_env_vars": [],
            "optional_env_vars": ["ITUNES_STORE_COUNTRY", "ITUNES_API_TIMEOUT"],
            "capabilities": [
                "search_apps_by_brand",
                "bundle_identifier_extraction",
                "publisher_metadata_retrieval",
                "store_listing_url",
            ],
            "live_testable": True,
        }
