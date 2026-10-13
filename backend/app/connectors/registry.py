import logging
from typing import Dict, Any, Optional, Type

from backend.app.connectors.base import BaseConnector
from backend.app.connectors.itunes_connector import ITunesAppStoreConnector
from backend.app.connectors.twitter_connector import TwitterV2Connector

logger = logging.getLogger(__name__)

class ConnectorRegistry:
    """
    Central registry for external data source connectors.
    Provides decoupled access, status reporting without leaking secrets, and safe execution.
    """

    def __init__(self):
        self._connectors: Dict[str, BaseConnector] = {}
        self._init_default_connectors()

    def _init_default_connectors(self):
        """Instantiate available connectors."""
        self._connectors["itunes_app_store"] = ITunesAppStoreConnector()
        self._connectors["twitter_v2"] = TwitterV2Connector()

    def get(self, connector_id: str) -> Optional[BaseConnector]:
        """Retrieve connector instance by identifier."""
        return self._connectors.get(connector_id)

    def list_connectors(self) -> Dict[str, BaseConnector]:
        """Return dictionary of all registered connectors."""
        return self._connectors

    def get_all_status(self) -> Dict[str, Any]:
        """
        Produce comprehensive health and status report across all integrations.
        Guarantees that no private API keys, bearer tokens, or secrets are exposed.
        """
        statuses = {}
        for cid, conn in self._connectors.items():
            meta = conn.get_source_metadata()
            conn_diag = conn.check_connection()

            statuses[cid] = {
                "id": cid,
                "name": conn.source_name,
                "asset_type": meta.get("asset_type"),
                "auth_type": meta.get("auth_type"),
                "configured": meta.get("configured", False),
                "status": conn_diag.get("status", "unknown"),
                "connected": conn_diag.get("connected", False),
                "latency_ms": conn_diag.get("latency_ms"),
                "message": conn_diag.get("message"),
                "missing_credentials": meta.get("missing_credentials", []),
                "setup_requirements": meta.get("setup_requirements"),
                "rate_limit_guidance": meta.get("rate_limit_guidance"),
                "required_env_vars": meta.get("required_env_vars", []),
                "optional_env_vars": meta.get("optional_env_vars", []),
                "capabilities": meta.get("capabilities", []),
                "live_testable": meta.get("live_testable", False),
            }
        return statuses

# Global singleton registry instance
connector_registry = ConnectorRegistry()
