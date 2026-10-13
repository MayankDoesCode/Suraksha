from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class DetectionSignal:
    """Individual explainable detection signal contributing to overall threat risk."""
    signal_type: str        # e.g., 'NAME_SIMILARITY', 'LOOKALIKE_DOMAIN', 'ASSET_CLONE'
    severity_score: float   # 0.0 to 100.0 score impact
    confidence: float       # 0.0 to 1.0 confidence in the signal
    explanation: str        # Human-readable explanation of why this fired
    evidence_fields: List[str] = field(default_factory=list)

@dataclass
class RiskEvaluation:
    """Consolidated explainable threat score result."""
    total_score: float             # Aggregate 0 to 100 score
    severity: str                  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    signals: List[DetectionSignal]
    algorithm_version: str = "v1.0-deterministic"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_score": round(self.total_score, 1),
            "severity": self.severity,
            "algorithm_version": self.algorithm_version,
            "signals": [
                {
                    "signal_type": s.signal_type,
                    "severity_score": s.severity_score,
                    "confidence": s.confidence,
                    "explanation": s.explanation,
                    "evidence_fields": s.evidence_fields,
                }
                for s in self.signals
            ]
        }

class BaseDetector(ABC):
    """Abstract signal detector interface."""

    @abstractmethod
    def evaluate(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> List[DetectionSignal]:
        """Evaluate candidate data against brand verified assets and return observed signals."""
        pass

class RiskScoreEngine:
    """
    Explainable risk scoring aggregator.
    Combines weighted signals mathematically without black-box hallucination.
    """

    @staticmethod
    def calculate_risk(signals: List[DetectionSignal]) -> RiskEvaluation:
        if not signals:
            return RiskEvaluation(total_score=0.0, severity="LOW", signals=[])

        # Weighted composite score capped at 100
        weighted_sum = sum(s.severity_score * s.confidence for s in signals)
        total_score = min(100.0, weighted_sum)

        if total_score >= 80.0:
            severity = "CRITICAL"
        elif total_score >= 50.0:
            severity = "HIGH"
        elif total_score >= 25.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        return RiskEvaluation(
            total_score=total_score,
            severity=severity,
            signals=signals
        )
