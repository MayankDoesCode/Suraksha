"""
Proactive lookalike discovery.

For a brand's verified domains, generate the registrations an attacker would plausibly use, ask DNS which of them
exist, and run every existing one through the normal DetectionService (official-asset exclusion, explainable rules,
dedup and persistence). Optionally enrich the most severe results with registration and certificate data.

A name that resolves is *registered*, not necessarily malicious. Severity comes from the rule engine, never from the
fact that DNS answered, and every finding still needs analyst review.
"""

import logging
import time
import uuid
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Callable

from backend.app.intel import dns_probe as dns_mod
from backend.app.intel import permutations
from backend.app.intel.netsafe import UnsafeTarget
from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.services.detection_service import DetectionService
from backend.app.services.enrichment_service import ENRICHMENT_EVIDENCE_TYPES, EnrichmentService
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

MIN_LIMIT, MAX_LIMIT, MAX_BASES = 10, 400, 3


class DiscoveryService:
    def __init__(
        self,
        detection: Optional[DetectionService] = None,
        enrichment: Optional[EnrichmentService] = None,
        probe: Optional[dns_mod.DnsProbe] = None,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None,
    ):
        self.probe = probe or dns_mod.DnsProbe()
        self.detection = detection or DetectionService()
        self.enrichment = enrichment or EnrichmentService(probe=self.probe)
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()

    def discover(
        self,
        brand_id: str,
        limit: int = 150,
        techniques: Optional[Sequence[str]] = None,
        enrich: bool = False,
        max_enrich: int = 8,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        started = time.time()
        if progress_callback:
            progress_callback(5, "validating_brand")

        brand = self.brand_repo.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand with ID '{brand_id}' not found.")
        domains = [d for d in brand.to_dict(include_relations=True).get("domains", []) if d.get("domain")]
        if not domains:
            raise ValidationError("Register at least one verified domain for this brand first.", details=[{"field": "domains", "message": "No verified domains."}])
        domains.sort(key=lambda d: not d.get("is_primary"))
        official = [d["domain"] for d in domains]
        bases = official[:MAX_BASES]
        limit = max(MIN_LIMIT, min(int(limit or 150), MAX_LIMIT))

        if progress_callback:
            progress_callback(15, "generating_permutations")

        candidates: List[permutations.Candidate] = []
        seen = set()
        for base in bases:
            try:
                for c in permutations.generate(base, official, limit=limit // len(bases), techniques=techniques):
                    if c.domain not in seen:
                        seen.add(c.domain)
                        candidates.append(c)
            except UnsafeTarget:
                logger.warning("Skipping unusable verified domain %r for discovery", base)
        technique_of = {c.domain: c.technique for c in candidates}

        if progress_callback:
            progress_callback(35, "dns_probing")

        observations = self.probe.probe_many([c.domain for c in candidates])
        resolved = [o for o in observations if o.resolves]
        errors = sum(1 for o in observations if o.error)

        if progress_callback:
            progress_callback(60, "evaluating_threats")

        rows: List[Dict[str, Any]] = []
        created = updated_existing = 0
        enriched = 0
        total_resolved = max(1, len(resolved))
        for idx, obs in enumerate(sorted(resolved, key=lambda o: o.domain)):
            if progress_callback and (idx % 5 == 0 or idx == total_resolved - 1):
                progress_callback(60 + int(30 * (idx + 1) / total_resolved), "evaluating_threats")

            row: Dict[str, Any] = {
                "domain": obs.domain, "technique": technique_of.get(obs.domain), "ips": obs.a[:5], "nameservers": obs.ns[:4],
                "finding_id": None, "severity": None, "risk_score": None,
            }
            try:
                result = self.detection.evaluate_candidate(
                    brand_id,
                    {"asset_type": "domain", "candidate_name": obs.domain, "source_url": f"https://{obs.domain}", "detection_source": "permutation_discovery"},
                    persist=True,
                )
            except Exception as exc:  # one bad candidate must not abort the scan
                logger.exception("Discovery evaluation failed for %s", obs.domain)
                row["error"] = type(exc).__name__
                rows.append(row)
                continue
            finding = result.get("finding")
            row.update(severity=result.get("severity"), risk_score=result.get("final_risk_score"), is_official=bool(result.get("is_official")))
            if finding:
                row["finding_id"] = finding["id"]
                existed = bool(finding.get("created_at") and finding.get("updated_at") and finding["created_at"] != finding["updated_at"])
                updated_existing += int(existed)
                created += int(not existed)
                evidence = [e for e in self.enrichment.evidence_records(self._intel_from_dns(obs)) if e["evidence_type"] == "dns_records"]
                self.threat_repo.apply_enrichment(finding["id"], evidence, [], ("dns_records",), ())
                if enrich and enriched < max_enrich and (result.get("severity") in ("HIGH", "CRITICAL", "MEDIUM")):
                    try:
                        out = self.enrichment.enrich_finding(finding["id"], observation=obs)
                        row["severity"] = out["finding"]["severity"]
                        row["risk_score"] = out["finding"]["final_risk_score"]
                        row["enriched"] = True
                        enriched += 1
                    except Exception as exc:
                        row["enrichment_error"] = type(exc).__name__
            rows.append(row)

        if progress_callback:
            progress_callback(100, "completed")

        return {
            "brand_id": brand_id,
            "bases": bases,
            "candidates_generated": len(candidates),
            "resolved": len(resolved),
            "unresolved": len(candidates) - len(resolved) - errors,
            "lookup_errors": errors,
            "findings_created": created,
            "findings_updated": updated_existing,
            "enriched": enriched,
            "duration_seconds": round(time.time() - started, 2),
            "results": rows[:200],
            "disclaimer": (
                "Generated names are hypotheses. A name that resolves is registered, not necessarily malicious. "
                "Severity comes from the rule engine and every finding needs analyst review. Names that did not resolve may still be registered later."
            ),
        }

    @staticmethod
    def _intel_from_dns(obs: dns_mod.DnsObservation):
        from backend.app.services.enrichment_service import DomainIntel
        return DomainIntel(domain=obs.domain, observed_at=datetime.now(timezone.utc).isoformat(), dns=obs.to_dict(), rdap={}, tls={})


class AsyncDiscoveryManager:
    """
    Thread-safe asynchronous background manager for large lookalike discovery jobs.
    Prevents HTTP timeout on reverse proxies while providing real-time progress percentage.
    """
    _jobs: Dict[str, Dict[str, Any]] = {}
    _lock = threading.Lock()

    @classmethod
    def submit_job(
        cls,
        brand_id: str,
        limit: int = 150,
        techniques: Optional[Sequence[str]] = None,
        enrich: bool = False
    ) -> str:
        job_id = f"job_disc_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        with cls._lock:
            cls._jobs[job_id] = {
                "job_id": job_id,
                "brand_id": brand_id,
                "status": "pending",
                "progress_percent": 0,
                "phase": "queued",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None,
                "result": None,
                "error": None,
            }

        def _worker():
            with cls._lock:
                if job_id in cls._jobs:
                    cls._jobs[job_id]["status"] = "running"
                    cls._jobs[job_id]["phase"] = "starting"

            def _progress(pct: int, phase: str):
                with cls._lock:
                    if job_id in cls._jobs:
                        cls._jobs[job_id]["progress_percent"] = pct
                        cls._jobs[job_id]["phase"] = phase

            try:
                service = DiscoveryService()
                res = service.discover(
                    brand_id=brand_id,
                    limit=limit,
                    techniques=techniques,
                    enrich=enrich,
                    progress_callback=_progress,
                )
                with cls._lock:
                    if job_id in cls._jobs:
                        cls._jobs[job_id]["status"] = "completed"
                        cls._jobs[job_id]["progress_percent"] = 100
                        cls._jobs[job_id]["phase"] = "completed"
                        cls._jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
                        cls._jobs[job_id]["result"] = res
            except Exception as e:
                logger.exception("Async discovery job %s failed: %s", job_id, e)
                with cls._lock:
                    if job_id in cls._jobs:
                        cls._jobs[job_id]["status"] = "failed"
                        cls._jobs[job_id]["phase"] = "error"
                        cls._jobs[job_id]["error"] = str(e)
                        cls._jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()
        return job_id

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        with cls._lock:
            return cls._jobs.get(job_id)
