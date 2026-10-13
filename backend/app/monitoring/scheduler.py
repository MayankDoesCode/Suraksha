import uuid
import threading
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta

from backend.app.monitoring.base import BaseScheduler, JobStatus
from backend.app.services.scan_service import ScanService

logger = logging.getLogger(__name__)

class MonitoringScheduler(BaseScheduler):
    """
    Background monitoring scheduler managing external provider collection cycles.
    Prevents duplicate execution through brand-level execution locks.
    Clearly distinguishes periodic batch executions from non-existent continuous streaming.
    """

    def __init__(self, scan_service: Optional[ScanService] = None):
        self.scan_service = scan_service or ScanService()
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._active_scans: Dict[str, threading.Lock] = {}
        self._lock = threading.Lock()

    def _get_brand_lock(self, brand_id: str) -> threading.Lock:
        with self._lock:
            if brand_id not in self._active_scans:
                self._active_scans[brand_id] = threading.Lock()
            return self._active_scans[brand_id]

    def schedule_collection(self, brand_id: str, connector_id: str, interval_minutes: int = 60) -> str:
        """
        Register a scheduled collection job for a brand and external connector.
        """
        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        job_record = {
            "id": job_id,
            "brand_id": brand_id,
            "connector_id": connector_id,
            "interval_minutes": max(5, interval_minutes),
            "status": JobStatus.IDLE,
            "created_at": now.isoformat(),
            "last_run_at": None,
            "next_run_at": (now + timedelta(minutes=interval_minutes)).isoformat(),
            "run_count": 0,
            "last_result": None,
            "last_error": None,
            "mode": "on_demand_and_scheduled_interval",
            "clarification": "Batch query executed on scheduled intervals; not continuous streaming.",
        }

        with self._lock:
            self._jobs[job_id] = job_record

        logger.info(
            "Registered monitoring job %s for brand %s with connector %s (every %d min)",
            job_id, brand_id, connector_id, interval_minutes
        )
        return job_id

    def execute_job(self, job_id: str) -> Dict[str, Any]:
        """
        Safely execute a collection job, acquiring a per-brand lock to prevent duplicate runs.
        """
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise ValueError(f"Job with ID '{job_id}' not found.")

        brand_id = job["brand_id"]
        connector_id = job["connector_id"]
        brand_lock = self._get_brand_lock(brand_id)

        # Acquire lock without blocking indefinitely
        acquired = brand_lock.acquire(blocking=False)
        if not acquired:
            logger.warning("Duplicate execution prevented: scan for brand %s is already running.", brand_id)
            return {
                "success": False,
                "status": JobStatus.RUNNING,
                "message": "A scan for this brand is already actively executing.",
            }

        try:
            job["status"] = JobStatus.RUNNING
            job["last_run_at"] = datetime.now(timezone.utc).isoformat()

            result = self.scan_service.run_provider_scan(brand_id, provider_id=connector_id)

            job["status"] = JobStatus.COMPLETED
            job["run_count"] += 1
            job["last_result"] = {
                "total_retrieved": result.get("total_retrieved", 0),
                "excluded_official": result.get("excluded_official_count", 0),
                "persisted_findings": result.get("persisted_findings_count", 0),
            }
            job["last_error"] = None
            job["next_run_at"] = (datetime.now(timezone.utc) + timedelta(minutes=job["interval_minutes"])).isoformat()
            return result
        except Exception as e:
            logger.error("Job %s execution failed: %s", job_id, str(e))
            job["status"] = JobStatus.FAILED
            job["last_error"] = str(e)
            raise
        finally:
            brand_lock.release()

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Return execution state, retry count, and last run timestamp."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise ValueError(f"Job with ID '{job_id}' not found.")
            return dict(job)

    def list_jobs(self, brand_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all registered monitoring jobs."""
        with self._lock:
            jobs = list(self._jobs.values())
            if brand_id:
                jobs = [j for j in jobs if j["brand_id"] == brand_id]
            return jobs

    def cancel_job(self, job_id: str) -> bool:
        """Cancel an existing collection schedule."""
        with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                logger.info("Cancelled monitoring job %s", job_id)
                return True
            return False

# Global scheduler singleton
scheduler = MonitoringScheduler()
