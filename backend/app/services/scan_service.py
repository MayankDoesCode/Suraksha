import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.services.detection_service import DetectionService
from backend.app.connectors.registry import connector_registry, ConnectorRegistry
from backend.app.connectors.base import ConnectorError, RateLimitError, AuthenticationError, NetworkTimeoutError
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

class ScanService:
    """
    Orchestrates the complete external data retrieval and threat detection pipeline:
    1. Retrieve brand profile and registered official assets
    2. Query configured external provider (e.g. Apple App Store or Twitter v2)
    3. Normalize candidate records into standard schema (with source_url, timestamp, is_sample=False)
    4. Screen candidates against verified official brand assets (exclusions)
    5. Evaluate remaining candidates with the detection engine
    6. Persist suspicious findings with deterministic deduplication across repeated scans
    """

    def __init__(
        self,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None,
        detection_service: Optional[DetectionService] = None,
        registry: Optional[ConnectorRegistry] = None,
    ):
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()
        self.detection_service = detection_service or DetectionService(
            brand_repo=self.brand_repo,
            threat_repo=self.threat_repo
        )
        self.connector_registry = registry or connector_registry
        try:
            from backend.app.ml import get_ml_service
            self.ml_service = get_ml_service()
        except Exception:
            self.ml_service = None

    def run_provider_scan(
        self,
        brand_id: str,
        provider_id: str = "itunes_app_store",
        limit: int = 25,
        persist_unrelated: bool = False
    ) -> Dict[str, Any]:
        """
        Execute external data retrieval and detection pipeline for a specific brand.
        """
        brand = self.brand_repo.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand with ID '{brand_id}' not found.")

        connector = self.connector_registry.get(provider_id)
        if not connector:
            available = list(self.connector_registry.list_connectors().keys())
            raise ValidationError(
                f"External provider '{provider_id}' is not recognized. Available providers: {', '.join(available)}"
            )

        # Check configuration
        metadata = connector.get_source_metadata()
        if not metadata.get("configured", True):
            missing = metadata.get("missing_credentials", [])
            raise ValidationError(
                f"Provider '{provider_id}' is not configured. Missing credentials: {', '.join(missing)}."
            )

        brand_dict = brand.to_dict(include_relations=True)
        scan_timestamp = datetime.now(timezone.utc).isoformat()

        logger.info(
            "Starting external scan for brand '%s' (%s) using provider '%s' (limit=%d)",
            brand.name, brand_id, provider_id, limit
        )

        # 1. Retrieve candidates from external provider
        try:
            raw_candidates = connector.collect_candidates(brand_dict, limit=limit)
        except (RateLimitError, AuthenticationError, NetworkTimeoutError, ConnectorError) as e:
            logger.warning("Provider '%s' error during scan for brand '%s': %s", provider_id, brand.name, str(e))
            raise

        total_retrieved = len(raw_candidates)
        excluded_official: List[Dict[str, Any]] = []
        suspicious_findings: List[Dict[str, Any]] = []
        benign_unrelated: List[Dict[str, Any]] = []

        # 2. Normalize and Evaluate Candidates
        for raw in raw_candidates:
            normalized = connector.normalize_record(raw)
            # Ensure provenance metadata is preserved
            normalized["is_sample"] = False
            normalized["detection_source"] = provider_id

            # Evaluate against official brand assets
            eval_result = self.detection_service.evaluate_candidate(
                brand_id=brand_id,
                candidate_data=normalized,
                persist=False,
            )

            # 3. Handle Official Asset Exclusions
            if eval_result.get("is_official") or eval_result.get("excluded"):
                excluded_official.append({
                    "candidate_name": eval_result.get("candidate_name"),
                    "package_id": normalized.get("package_id"),
                    "asset_type": eval_result.get("asset_type"),
                    "source_url": normalized.get("source_url"),
                    "exclusion_reason": eval_result.get("exclusion_reason"),
                    "is_official": True,
                })
                continue

            # 4. Filter and Persist Suspicious Findings
            risk_score = eval_result.get("risk_score", 0.0)
            signals = eval_result.get("signals", [])

            # Only persist if it presents risk / signals or if caller explicitly requested all
            if risk_score > 0.0 or len(signals) > 0 or persist_unrelated:
                # Re-evaluate with persist=True for deduplication & saving
                persisted_eval = self.detection_service.evaluate_candidate(
                    brand_id=brand_id,
                    candidate_data=normalized,
                    persist=True,
                )
                finding_dict = {
                    "finding": persisted_eval.get("finding"),
                    "risk_score": persisted_eval.get("risk_score"),
                    "final_risk_score": persisted_eval.get("final_risk_score"),
                    "rule_based_score": persisted_eval.get("rule_based_score"),
                    "ml_risk_score": persisted_eval.get("ml_risk_score"),
                    "ml_predicted_class": persisted_eval.get("ml_predicted_class"),
                    "ml_confidence": persisted_eval.get("ml_confidence"),
                    "ml_model_version": persisted_eval.get("ml_model_version"),
                    "ml_fallback_used": persisted_eval.get("ml_fallback_used"),
                    "severity": persisted_eval.get("severity"),
                    "candidate_name": persisted_eval.get("candidate_name"),
                    "source_url": normalized.get("source_url"),
                    "signals": persisted_eval.get("signals"),
                }
                if self.ml_service and self.ml_service.is_available():
                    finding_dict["ml_assist"] = self.ml_service.predict_candidate(normalized)
                suspicious_findings.append(finding_dict)
            else:
                benign_unrelated.append({
                    "candidate_name": normalized.get("candidate_name"),
                    "package_id": normalized.get("package_id"),
                    "risk_score": 0.0,
                    "severity": "LOW",
                })

        logger.info(
            "Scan complete for '%s': retrieved=%d, excluded_official=%d, suspicious_persisted=%d, benign=%d",
            brand.name, total_retrieved, len(excluded_official), len(suspicious_findings), len(benign_unrelated)
        )

        return {
            "success": True,
            "brand_id": brand_id,
            "brand_name": brand.name,
            "provider_id": provider_id,
            "provider_name": connector.source_name,
            "scan_timestamp": scan_timestamp,
            "total_retrieved": total_retrieved,
            "excluded_official_count": len(excluded_official),
            "persisted_findings_count": len(suspicious_findings),
            "benign_unrelated_count": len(benign_unrelated),
            "excluded_official": excluded_official,
            "findings": [f["finding"] for f in suspicious_findings if f.get("finding")],
            "status": "COMPLETED",
        }
