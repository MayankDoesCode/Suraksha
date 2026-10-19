from unittest.mock import patch
import pytest
from sqlalchemy.exc import SQLAlchemyError
from backend.app.database import get_db
from backend.app.models.brand import Brand, BrandDomain
from backend.app.models.threat import Finding
from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository

def test_brand_repository_rollback_on_commit_failure(app):
    """Verify BrandRepository rolls back session when commit fails."""
    with app.app_context():
        session = get_db()
        repo = BrandRepository(session)
        brand = Brand(
            name="Rollback Test Brand",
            description="Testing rollback resilience",
            owner_id="tester"
        )
        brand.domains.append(BrandDomain(domain="rollback.example.com", is_primary=True))
        
        with patch.object(session, "commit", side_effect=SQLAlchemyError("Simulated write error")):
            with pytest.raises(SQLAlchemyError):
                repo.create(brand)

        # Verify session is clean and rollback occurred - brand not persisted
        session.expire_all()
        persisted = session.query(Brand).filter_by(name="Rollback Test Brand").first()
        assert persisted is None

        # Verify session is still usable for valid operations
        clean_brand = Brand(
            name="Recovered Brand",
            description="Operational after rollback",
            owner_id="tester"
        )
        saved = repo.create(clean_brand)
        assert saved.id is not None
        assert repo.get_by_id(saved.id) is not None

def test_threat_repository_rollback_on_commit_failure(app):
    """Verify ThreatRepository rolls back session when commit fails."""
    with app.app_context():
        session = get_db()
        # Create a valid brand first
        brand_repo = BrandRepository(session)
        brand = brand_repo.create(Brand(
            name="Threat Brand",
            description="Target brand",
            owner_id="tester"
        ))

        threat_repo = ThreatRepository(session)

        kwargs = {
            "brand_id": brand.id,
            "asset_type": "domain",
            "candidate_name": "phishing-threatbrand.com",
            "source_url": "http://phishing-threatbrand.com",
            "risk_score": 85.0,
            "severity": "CRITICAL",
            "detection_source": "domain_similarity",
            "is_sample": False,
            "signals": [],
            "evidence_records": []
        }

        with patch.object(session, "commit", side_effect=SQLAlchemyError("Simulated DB lock")):
            with pytest.raises(SQLAlchemyError):
                threat_repo.save_or_update(**kwargs)

        # Verify finding was rolled back and not persisted
        session.expire_all()
        persisted = threat_repo.find_existing(brand.id, "phishing-threatbrand.com", "domain")
        assert persisted is None

        # Verify session is still fully functional
        saved = threat_repo.save_or_update(**kwargs)
        assert saved.id is not None
        assert threat_repo.find_existing(brand.id, "phishing-threatbrand.com", "domain") is not None
