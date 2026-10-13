from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timezone

class JobStatus(str, Enum):
    IDLE = "IDLE"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"

class BaseScheduler(ABC):
    """Abstract interface for background monitoring job orchestration."""

    @abstractmethod
    def schedule_collection(self, brand_id: str, connector_id: str, interval_minutes: int) -> str:
        """Register a recurrent or one-time collection job."""
        pass

    @abstractmethod
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Return execution state, retry count, and last run timestamp."""
        pass

    @abstractmethod
    def cancel_job(self, job_id: str) -> bool:
        """Cancel an existing collection schedule."""
        pass
