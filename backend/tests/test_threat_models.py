import pytest
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models import (
    Brand,
    Finding,
    DetectionSignalRecord,
    EvidenceRecord,
)
from backend.app.validation.threat_validator import FindingValidator

def test_create_finding_and_relationships(app):
    """Test creating a Brand with associated Finding, DetectionSignalRecord, and EvidenceRecord."""
    with app.app_context():
        db = get_db()
        
        # 1. Create Brand
        brand = Brand(name="Acme Corp", description="Acme Cybersecurity")
        db.add(brand)
        db.commit()
        db.refresh(brand)
        
        # 2. Create Finding
        finding = Finding(
            brand_id=brand.id,
            asset_type="social",
            candidate_name="@acme_official_support",
            source_url="https://twitter.com/acme_official_support",
            risk_score=85.5,
            severity="CRITICAL",
            review_status="NEW",
            detection_source="similarity_engine",
            is_sample=True,
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)
        
        # 3. Add Detection Signal
        signal = DetectionSignalRecord(
            finding_id=finding.id,
            signal_type="NAME_SIMILARITY",
            score=90.0,
            confidence=0.95,
            explanation="Candidate handle is 90% similar to verified Acme handle",
            metadata_json='{"levenshtein_distance": 2}'
        )
        db.add(signal)
        
        # 4. Add Evidence Record
        evidence = EvidenceRecord(
            finding_id=finding.id,
            evidence_type="profile_snapshot",
            description="Captured lookalike bio and avatar copying Acme logo",
            source_reference="https://storage.suraksha.io/evidence/snapshot_001.png"
        )
        db.add(evidence)
        db.commit()
        db.refresh(finding)

        # Assertions
        assert finding.id is not None
        assert finding.brand.name == "Acme Corp"
        assert len(finding.signals) == 1
        assert finding.signals[0].signal_type == "NAME_SIMILARITY"
        assert len(finding.evidence) == 1
        assert finding.evidence[0].evidence_type == "profile_snapshot"

        # Check to_dict serialization
        data = finding.to_dict()
        assert data["candidate_name"] == "@acme_official_support"
        assert data["risk_score"] == 85.5
        assert data["severity"] == "CRITICAL"
        assert len(data["signals"]) == 1
        assert len(data["evidence"]) == 1
        assert data["is_sample"] is True

def test_cascading_deletion_of_findings(app):
    """Test that deleting a Brand cascades to its Findings and child Signals/Evidence."""
    with app.app_context():
        db = get_db()

        brand = Brand(name="Cascade Target")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        finding = Finding(
            brand_id=brand.id,
            asset_type="mobile_app",
            candidate_name="Acme Fake App",
            risk_score=75.0,
            severity="HIGH",
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)

        signal = DetectionSignalRecord(
            finding_id=finding.id,
            signal_type="PACKAGE_MISMATCH",
            score=80.0,
            explanation="Package ID com.fake.acme mismatches verified developer signature"
        )
        db.add(signal)
        db.commit()

        finding_id = finding.id
        signal_id = signal.id

        # Delete Brand
        db.delete(brand)
        db.commit()

        # Verify cascades
        assert db.query(Finding).filter_by(id=finding_id).first() is None
        assert db.query(DetectionSignalRecord).filter_by(id=signal_id).first() is None

def test_finding_validator_valid_payload():
    """Verify FindingValidator accepts valid payloads and applies default values."""
    payload = {
        "candidate_name": "@fake_brand_care",
        "asset_type": "social",
        "risk_score": 65.0,
        "severity": "HIGH",
        "review_status": "NEW",
        "source_url": "https://instagram.com/fake_brand_care"
    }
    cleaned, errors = FindingValidator.validate(payload)
    assert len(errors) == 0
    assert cleaned["candidate_name"] == "@fake_brand_care"
    assert cleaned["asset_type"] == "social"
    assert cleaned["risk_score"] == 65.0
    assert cleaned["severity"] == "HIGH"
    assert cleaned["review_status"] == "NEW"

def test_finding_validator_invalid_values():
    """Verify FindingValidator catches invalid status, score, asset type, and unsafe URLs."""
    # Invalid score and invalid severity and invalid asset type
    payload = {
        "candidate_name": "",
        "asset_type": "quantum_device",
        "risk_score": 150.0,
        "severity": "APOCALYPTIC",
        "review_status": "PENDING_APPROVAL",
        "source_url": "javascript:alert(1)"
    }
    cleaned, errors = FindingValidator.validate(payload)
    error_fields = {e["field"] for e in errors}
    assert "candidate_name" in error_fields
    assert "asset_type" in error_fields
    assert "risk_score" in error_fields
    assert "severity" in error_fields
    assert "review_status" in error_fields
    assert "source_url" in error_fields
