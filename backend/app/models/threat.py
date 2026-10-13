import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Finding(Base):
    """
    Threat finding entity representing a suspicious candidate asset detected by SURAKSHA.
    Covers social media impersonations, lookalike domains, and unauthorized mobile applications.
    """
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Asset type: 'social', 'mobile_app', 'domain'
    asset_type = Column(String(64), nullable=False, index=True)
    
    # Candidate name or identifier (e.g. "@brand_support", "com.fake.brand", "brand-login.com")
    candidate_name = Column(String(255), nullable=False)
    
    # Target URL or store listing
    source_url = Column(String(1024), nullable=True)
    
    # Risk score: 0.0 to 100.0 (composite/final risk score)
    risk_score = Column(Float, nullable=False, default=0.0)
    
    # Hybrid ML and Heuristic Component Scores
    rule_based_score = Column(Float, nullable=True)
    ml_risk_score = Column(Float, nullable=True)
    ml_predicted_class = Column(String(32), nullable=True)
    ml_confidence = Column(Float, nullable=True)
    ml_model_version = Column(String(64), nullable=True)
    final_risk_score = Column(Float, nullable=True)
    ml_fallback_used = Column(Boolean, nullable=False, default=False)
    
    # Severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    severity = Column(String(32), nullable=False, default="LOW", index=True)
    
    # Review status: 'NEW', 'UNDER_INVESTIGATION', 'CONFIRMED_THREAT', 'FALSE_POSITIVE', 'RESOLVED'
    review_status = Column(String(32), nullable=False, default="NEW", index=True)
    
    # Detection source: e.g. 'similarity_engine', 'sample_feed', 'app_store_monitor'
    detection_source = Column(String(128), nullable=False, default="similarity_engine")
    
    # Sample/live data designation
    is_sample = Column(Boolean, nullable=False, default=True)
    
    # Timestamps
    observed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    brand = relationship("Brand", back_populates="findings")
    signals = relationship(
        "DetectionSignalRecord",
        back_populates="finding",
        cascade="all, delete-orphan",
        order_by="DetectionSignalRecord.id.asc()"
    )
    evidence = relationship(
        "EvidenceRecord",
        back_populates="finding",
        cascade="all, delete-orphan",
        order_by="EvidenceRecord.id.asc()"
    )

    def to_dict(self, include_relations: bool = True) -> dict:
        composite_score = round(float(self.final_risk_score if self.final_risk_score is not None else self.risk_score), 1) if (self.risk_score is not None or self.final_risk_score is not None) else 0.0
        data = {
            "id": self.id,
            "brand_id": self.brand_id,
            "asset_type": self.asset_type,
            "candidate_name": self.candidate_name,
            "source_url": self.source_url,
            "risk_score": composite_score,
            "final_risk_score": composite_score,
            "rule_based_score": round(float(self.rule_based_score), 1) if self.rule_based_score is not None else composite_score,
            "ml_risk_score": round(float(self.ml_risk_score), 1) if self.ml_risk_score is not None else None,
            "ml_predicted_class": self.ml_predicted_class,
            "ml_confidence": round(float(self.ml_confidence), 2) if self.ml_confidence is not None else None,
            "confidence_score": round(
                (sum(s.confidence for s in self.signals) / len(self.signals)) if self.signals
                else (float(self.ml_confidence) if self.ml_confidence is not None else (0.85 if composite_score > 0 else 0.0)),
                2
            ),
            "ml_model_version": self.ml_model_version,
            "ml_fallback_used": bool(self.ml_fallback_used) if self.ml_fallback_used is not None else False,
            "severity": self.severity,

            "review_status": self.review_status,
            "detection_source": self.detection_source,
            "is_sample": bool(self.is_sample),
            "observed_at": self.observed_at.isoformat() if self.observed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_relations:
            data.update({
                "signals": [s.to_dict() for s in self.signals],
                "evidence": [e.to_dict() for e in self.evidence],
            })
        return data

    def __repr__(self):
        return f"<Finding id={self.id} candidate={self.candidate_name!r} severity={self.severity} score={self.risk_score}>"


class DetectionSignalRecord(Base):
    """
    Individual explainable detection signal contributing to the threat risk evaluation.
    """
    __tablename__ = "detection_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    signal_type = Column(String(64), nullable=False, index=True)
    score = Column(Float, nullable=False, default=0.0)
    confidence = Column(Float, nullable=False, default=1.0)
    explanation = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    finding = relationship("Finding", back_populates="signals")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "signal_type": self.signal_type,
            "score": round(float(self.score), 1) if self.score is not None else 0.0,
            "confidence": round(float(self.confidence), 2) if self.confidence is not None else 1.0,
            "explanation": self.explanation,
            "metadata_json": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<DetectionSignalRecord id={self.id} type={self.signal_type!r} score={self.score}>"


class EvidenceRecord(Base):
    """
    Evidentiary record or snapshot associated with a threat finding.
    """
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    source_reference = Column(String(1024), nullable=True)
    captured_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    finding = relationship("Finding", back_populates="evidence")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "evidence_type": self.evidence_type,
            "description": self.description,
            "source_reference": self.source_reference,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<EvidenceRecord id={self.id} type={self.evidence_type!r}>"
