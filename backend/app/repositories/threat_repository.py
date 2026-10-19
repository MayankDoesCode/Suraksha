import json
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload, Session

from backend.app.database import get_db
from backend.app.models.threat import (
    Finding,
    DetectionSignalRecord,
    EvidenceRecord,
)

class ThreatRepository:
    """Repository handling database operations for Findings, Signals, and Evidence."""

    def __init__(self, db_session: Optional[Session] = None):
        self._session = db_session

    @property
    def session(self) -> Session:
        return self._session if self._session is not None else get_db()

    def get_by_id(self, finding_id: str) -> Optional[Finding]:
        """Retrieve finding with all signals and evidence."""
        return (
            self.session.query(Finding)
            .options(
                selectinload(Finding.signals),
                selectinload(Finding.evidence),
                selectinload(Finding.brand),
            )
            .filter(Finding.id == finding_id)
            .first()
        )

    def find_existing(
        self,
        brand_id: str,
        candidate_name: str,
        asset_type: str,
        source_url: Optional[str] = None
    ) -> Optional[Finding]:
        """
        Identify whether this candidate has already been scanned for the given brand,
        preventing duplicate records on repeated scans.
        """
        query = (
            self.session.query(Finding)
            .options(
                selectinload(Finding.signals),
                selectinload(Finding.evidence),
            )
            .filter(
                Finding.brand_id == brand_id,
                Finding.asset_type == asset_type,
            )
        )

        cand_norm = candidate_name.strip().lower()
        if source_url and source_url.strip():
            url_norm = source_url.strip().lower()
            query = query.filter(
                or_(
                    func.lower(Finding.candidate_name) == cand_norm,
                    func.lower(Finding.source_url) == url_norm,
                )
            )
        else:
            query = query.filter(func.lower(Finding.candidate_name) == cand_norm)

        return query.first()

    def list_findings(
        self,
        brand_id: Optional[str] = None,
        brand_ids: Optional[List[str]] = None,
        asset_type: Optional[str] = None,
        severity: Optional[str] = None,
        review_status: Optional[str] = None,
        search: Optional[str] = None,
        is_sample: Optional[bool] = None,
        detection_source: Optional[str] = None,
        sort_by: str = "risk_score",
        sort_order: str = "desc",
        offset: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Finding], int]:
        """Query findings with comprehensive filtering, tenant isolation, search, and pagination."""
        if brand_ids is not None and len(brand_ids) == 0:
            return [], 0

        query = (
            self.session.query(Finding)
            .options(
                selectinload(Finding.signals),
                selectinload(Finding.evidence),
            )
        )

        if brand_ids is not None:
            query = query.filter(Finding.brand_id.in_(brand_ids))
        if brand_id:
            query = query.filter(Finding.brand_id == brand_id)
        if asset_type:
            query = query.filter(Finding.asset_type == asset_type)
        if severity:
            query = query.filter(Finding.severity == severity.upper())
        if review_status:
            query = query.filter(Finding.review_status == review_status.upper())
        if is_sample is not None:
            query = query.filter(Finding.is_sample == is_sample)
        if detection_source:
            query = query.filter(Finding.detection_source == detection_source)
        if search:
            s_term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Finding.candidate_name).like(s_term),
                    func.lower(Finding.source_url).like(s_term),
                )
            )

        total_count = query.count()

        # Dynamic Sorting
        sort_col = Finding.risk_score
        if sort_by == "created_at":
            sort_col = Finding.created_at
        elif sort_by == "observed_at":
            sort_col = Finding.observed_at
        elif sort_by == "candidate_name":
            sort_col = Finding.candidate_name

        if sort_order.lower() == "asc":
            query = query.order_by(sort_col.asc(), Finding.observed_at.asc())
        else:
            query = query.order_by(sort_col.desc(), Finding.observed_at.desc())

        items = query.offset(offset).limit(limit).all()
        return items, total_count


    def save_or_update(
        self,
        brand_id: str,
        asset_type: str,
        candidate_name: str,
        source_url: Optional[str],
        risk_score: float,
        severity: str,
        detection_source: str,
        is_sample: bool,
        signals: List[Any],
        evidence_records: List[Dict[str, Any]],
        existing_finding: Optional[Finding] = None,
        rule_based_score: Optional[float] = None,
        ml_risk_score: Optional[float] = None,
        ml_predicted_class: Optional[str] = None,
        ml_confidence: Optional[float] = None,
        ml_model_version: Optional[str] = None,
        ml_fallback_used: bool = False,
    ) -> Finding:
        """
        Persist finding and its relational signals and evidence.
        Updates existing record in place if one already exists.
        """
        now = datetime.now(timezone.utc)

        if existing_finding:
            finding = existing_finding
            finding.risk_score = risk_score
            finding.final_risk_score = risk_score
            finding.rule_based_score = rule_based_score if rule_based_score is not None else risk_score
            finding.ml_risk_score = ml_risk_score
            finding.ml_predicted_class = ml_predicted_class
            finding.ml_confidence = ml_confidence
            finding.ml_model_version = ml_model_version
            finding.ml_fallback_used = ml_fallback_used
            finding.severity = severity
            finding.source_url = source_url or finding.source_url
            finding.detection_source = detection_source
            finding.is_sample = is_sample
            finding.observed_at = now
            finding.updated_at = now

            # Refresh signals (delete old, attach fresh)
            finding.signals.clear()
            finding.evidence.clear()
        else:
            finding = Finding(
                brand_id=brand_id,
                asset_type=asset_type,
                candidate_name=candidate_name,
                source_url=source_url,
                risk_score=risk_score,
                final_risk_score=risk_score,
                rule_based_score=rule_based_score if rule_based_score is not None else risk_score,
                ml_risk_score=ml_risk_score,
                ml_predicted_class=ml_predicted_class,
                ml_confidence=ml_confidence,
                ml_model_version=ml_model_version,
                ml_fallback_used=ml_fallback_used,
                severity=severity,
                review_status="NEW",
                detection_source=detection_source,
                is_sample=is_sample,
                observed_at=now,
                created_at=now,
                updated_at=now,
            )
            self.session.add(finding)

        try:
            # Flush to establish finding.id if new
            self.session.flush()

            # Add child signals
            for sig in signals:
                signal_model = DetectionSignalRecord(
                    finding_id=finding.id,
                    signal_type=sig.signal_type,
                    score=sig.severity_score,
                    confidence=sig.confidence,
                    explanation=sig.explanation,
                    metadata_json=json.dumps({"evidence_fields": sig.evidence_fields}),
                    created_at=now,
                )
                finding.signals.append(signal_model)

            # Add child evidence
            for ev in evidence_records:
                evidence_model = EvidenceRecord(
                    finding_id=finding.id,
                    evidence_type=ev.get("evidence_type", "artifact"),
                    description=ev.get("description", ""),
                    source_reference=ev.get("source_reference"),
                    captured_at=now,
                    created_at=now,
                )
                finding.evidence.append(evidence_model)

            self.session.commit()
            self.session.refresh(finding)
            return finding
        except Exception:
            self.session.rollback()
            raise

    def update_status(
        self,
        finding_id: str,
        new_status: str,
        analyst: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Optional[Finding]:
        """Update review status of a finding with an audit log trail."""
        finding = self.get_by_id(finding_id)
        if not finding:
            return None

        try:
            old_status = finding.review_status
            now = datetime.now(timezone.utc)
            finding.review_status = new_status.upper()
            finding.updated_at = now

            # Record immutable audit trail in evidence records
            analyst_label = analyst or "SecOps Analyst"
            audit_desc = f"Status transitioned from {old_status} to {new_status.upper()} by {analyst_label}."
            if note:
                audit_desc += f" Note: {note.strip()}"

            audit_evidence = EvidenceRecord(
                finding_id=finding.id,
                evidence_type="analyst_triage_audit",
                description=audit_desc,
                source_reference=analyst_label,
                captured_at=now,
                created_at=now,
            )
            finding.evidence.append(audit_evidence)

            self.session.commit()
            self.session.refresh(finding)
            return finding
        except Exception:
            self.session.rollback()
            raise


    def get_metrics(
        self,
        brand_ids: Optional[List[str]] = None,
        is_sample: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Aggregate platform metrics directly from active database records with tenant scoping."""
        from backend.app.models.brand import Brand

        # If user has zero brands, immediately return authentic zero metrics
        if brand_ids is not None and len(brand_ids) == 0:
            return {
                "total_brands": 0,
                "total_findings": 0,
                "critical_findings": 0,
                "high_findings": 0,
                "under_investigation": 0,
                "confirmed_threats": 0,
                "false_positives": 0,
                "resolved_findings": 0,
                "new_findings": 0,
                "by_asset_type": {"social": 0, "mobile_app": 0, "domain": 0},
                "by_severity": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
                "by_status": {
                    "NEW": 0,
                    "UNDER_INVESTIGATION": 0,
                    "CONFIRMED_THREAT": 0,
                    "FALSE_POSITIVE": 0,
                    "RESOLVED": 0,
                }
            }

        brand_query = self.session.query(Brand)
        finding_query = self.session.query(Finding)

        if brand_ids is not None:
            brand_query = brand_query.filter(Brand.id.in_(brand_ids))
            finding_query = finding_query.filter(Finding.brand_id.in_(brand_ids))

        if is_sample is not None:
            brand_query = brand_query.filter(Brand.is_sample == is_sample)
            finding_query = finding_query.filter(Finding.is_sample == is_sample)

        total_brands = brand_query.count()
        total_findings = finding_query.count()
        critical_count = finding_query.filter(Finding.severity == "CRITICAL").count()
        high_count = finding_query.filter(Finding.severity == "HIGH").count()
        under_inv = finding_query.filter(Finding.review_status == "UNDER_INVESTIGATION").count()
        confirmed = finding_query.filter(Finding.review_status == "CONFIRMED_THREAT").count()
        false_pos = finding_query.filter(Finding.review_status == "FALSE_POSITIVE").count()
        resolved = finding_query.filter(Finding.review_status == "RESOLVED").count()
        new_count = finding_query.filter(Finding.review_status == "NEW").count()

        social_count = finding_query.filter(Finding.asset_type == "social").count()
        app_count = finding_query.filter(Finding.asset_type == "mobile_app").count()
        domain_count = finding_query.filter(Finding.asset_type == "domain").count()

        return {
            "total_brands": total_brands,
            "total_findings": total_findings,
            "critical_findings": critical_count,
            "high_findings": high_count,
            "under_investigation": under_inv,
            "confirmed_threats": confirmed,
            "false_positives": false_pos,
            "resolved_findings": resolved,
            "new_findings": new_count,
            "by_asset_type": {
                "social": social_count,
                "mobile_app": app_count,
                "domain": domain_count,
            },
            "by_severity": {
                "CRITICAL": critical_count,
                "HIGH": high_count,
                "MEDIUM": finding_query.filter(Finding.severity == "MEDIUM").count(),
                "LOW": finding_query.filter(Finding.severity == "LOW").count(),
            },
            "by_status": {
                "NEW": new_count,
                "UNDER_INVESTIGATION": under_inv,
                "CONFIRMED_THREAT": confirmed,
                "FALSE_POSITIVE": false_pos,
                "RESOLVED": resolved,
            }
        }
