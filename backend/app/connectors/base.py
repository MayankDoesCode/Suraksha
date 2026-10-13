from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime

class ConnectorError(Exception):
    """Base exception for all external data source connectors."""
    pass

class RateLimitError(ConnectorError):
    """Raised when an external source rate limit is hit."""
    def __init__(self, message: str, retry_after_seconds: Optional[int] = None):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds

class AuthenticationError(ConnectorError):
    """Raised when external credentials or tokens are rejected."""
    pass

class NetworkTimeoutError(ConnectorError):
    """Raised when external request exceeds allotted timeout."""
    pass

class BaseConnector(ABC):
    """
    Standard interface contract for all external data source connectors.
    Ensures source-specific integrations are decoupled, testable, and robust.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.source_id = config.get("source_id", "generic")
        self.source_name = config.get("source_name", "Generic Connector")

    @abstractmethod
    def check_connection(self) -> Dict[str, Any]:
        """
        Verify connection and authentication status with the external platform.
        Returns diagnostic dictionary: { 'connected': bool, 'latency_ms': float, 'message': str }
        """
        pass

    @abstractmethod
    def collect_candidates(self, brand_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Retrieve permitted candidate records matching brand query keywords/domains.
        Must respect source rate limits, timeouts, and pagination.
        """
        pass

    @abstractmethod
    def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert source-specific raw records into the unified SentinelShield candidate schema:
        {
            'external_id': str,
            'source': str,
            'target_url': str,
            'title': str,
            'extracted_identity': str,
            'observed_at': str,
            'raw_payload': dict
        }
        """
        pass

    @abstractmethod
    def get_source_metadata(self) -> Dict[str, Any]:
        """Return rate limit allowances, supported capabilities, and source version."""
        pass
