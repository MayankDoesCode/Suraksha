import pytest
from unittest.mock import patch, MagicMock

from backend.app.database import get_db
from backend.app.models import Brand, BrandAppIdentifier, BrandPublisher, Finding
from backend.app.services.scan_service import ScanService
from backend.app.monitoring.scheduler import MonitoringScheduler

SAMPLE_PROVIDER_RESULTS = [
    # 1. Exact official app - must be excluded!
    {
        "trackId": 1001,
        "trackName": "Acme Mobile Banking",
        "bundleId": "com.acmebank.mobile",
        "artistName": "Acme Financial Corp",
        "trackViewUrl": "https://apps.apple.com/app/id1001",
        "description": "Official mobile banking app.",
        "version": "5.0.0",
        "price": 0.0,
    },
    # 2. Rogue copycat loan app - must be flagged and persisted!
    {
        "trackId": 2002,
        "trackName": "Acme Bank Fast Instant Loan",
        "bundleId": "com.rogueloan.acmepay",
        "artistName": "Shady Fintech LLC",
        "trackViewUrl": "https://apps.apple.com/app/id2002",
        "description": "Get instant personal loans in your Acme Bank account.",
        "version": "1.0.0",
        "price": 0.0,
    },
    # 3. Completely unrelated game - must be filtered out as benign
    {
        "trackId": 3003,
        "trackName": "Galaxy Asteroid Defense 3D",
        "bundleId": "com.spacegames.asteroid",
        "artistName": "Indie Space Studios",
        "trackViewUrl": "https://apps.apple.com/app/id3003",
        "description": "Shoot flying rocks in outer space arcade game.",
        "version": "2.1.0",
        "price": 0.0,
    }
]

@pytest.fixture
def brand_for_scan(app):
    """Seed a brand profile with verified mobile package ID and publisher."""
    with app.app_context():
        db = get_db()
        brand = Brand(name="Acme Bank", description="Official Acme Bank")
        db.add(brand)
        db.commit()
        db.refresh(brand)

        app_id = BrandAppIdentifier(
            brand_id=brand.id,
            platform="ios_app_store",
            identifier="com.acmebank.mobile",
            app_name="Acme Mobile Banking",
        )
        db.add(app_id)

        pub = BrandPublisher(
            brand_id=brand.id,
            publisher_name="Acme Financial Corp",
            platform="ios_app_store",
        )
        db.add(pub)
        db.commit()

        return brand.id

def test_scan_service_official_asset_exclusion_and_persistence(app, brand_for_scan):
    """
    Workflow validation:
    1. Retrieve candidates from external provider (mocked iTunes API)
    2. Exclude verified official app from findings
    3. Persist rogue copycat finding with explainable signals and is_sample=False
    4. Benign unrelated app is not saved as finding
    """
    scan_service = ScanService()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "resultCount": len(SAMPLE_PROVIDER_RESULTS),
        "results": SAMPLE_PROVIDER_RESULTS,
    }

    with patch("requests.get", return_value=mock_resp):
        res = scan_service.run_provider_scan(brand_for_scan, provider_id="itunes_app_store")

        assert res["success"] is True
        assert res["total_retrieved"] == 3
        assert res["excluded_official_count"] == 1
        assert res["persisted_findings_count"] == 1
        assert res["benign_unrelated_count"] == 1

        # Check official exclusion details
        excluded = res["excluded_official"][0]
        assert excluded["candidate_name"] == "Acme Mobile Banking"
        assert excluded["package_id"] == "com.acmebank.mobile"
        assert excluded["is_official"] is True
        assert "com.acmebank.mobile" in excluded["exclusion_reason"]

        # Check suspicious finding
        findings = res["findings"]
        assert len(findings) == 1
        suspicious = findings[0]
        assert suspicious["candidate_name"] == "Acme Bank Fast Instant Loan"
        assert suspicious["is_sample"] is False  # Must be designated as real provider data
        assert suspicious["detection_source"] == "itunes_app_store"
        assert suspicious["risk_score"] > 50.0

        # Verify DB contents
        with app.app_context():
            db = get_db()
            db_findings = db.query(Finding).filter_by(brand_id=brand_for_scan).all()
            # Only the 1 suspicious finding is saved; official and benign are NOT
            assert len(db_findings) == 1
            assert db_findings[0].candidate_name == "Acme Bank Fast Instant Loan"
            assert db_findings[0].is_sample is False
            assert db_findings[0].detection_source == "itunes_app_store"

def test_scan_service_repeated_scans_deduplication(app, brand_for_scan):
    """
    Repeated scans of the same brand with identical provider candidates must
    NOT create duplicate database rows. It must update the existing record.
    """
    scan_service = ScanService()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "resultCount": len(SAMPLE_PROVIDER_RESULTS),
        "results": SAMPLE_PROVIDER_RESULTS,
    }

    with patch("requests.get", return_value=mock_resp):
        # Scan #1
        res1 = scan_service.run_provider_scan(brand_for_scan, provider_id="itunes_app_store")
        finding_id_1 = res1["findings"][0]["id"]

        # Scan #2 (repeat scan)
        res2 = scan_service.run_provider_scan(brand_for_scan, provider_id="itunes_app_store")
        finding_id_2 = res2["findings"][0]["id"]

        # Must have the exact same finding ID
        assert finding_id_1 == finding_id_2

        # Verify total database records remain 1
        with app.app_context():
            db = get_db()
            db_findings = db.query(Finding).filter_by(brand_id=brand_for_scan).all()
            assert len(db_findings) == 1

def test_api_scan_provider_endpoint(client, brand_for_scan):
    """Verify POST /api/v1/brands/<id>/scan-provider REST endpoint."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "resultCount": len(SAMPLE_PROVIDER_RESULTS),
        "results": SAMPLE_PROVIDER_RESULTS,
    }

    with patch("requests.get", return_value=mock_resp):
        payload = {"provider_id": "itunes_app_store", "limit": 10}
        response = client.post(f"/api/v1/brands/{brand_for_scan}/scan-provider", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["excluded_official_count"] == 1
        assert data["data"]["persisted_findings_count"] == 1

def test_api_integrations_status_endpoint(client):
    """Verify GET /api/v1/integrations/status endpoint returns provider health without secrets."""
    response = client.get("/api/v1/integrations/status")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "itunes_app_store" in data["providers"]
    assert "twitter_v2" in data["providers"]

    itunes = data["providers"]["itunes_app_store"]
    assert itunes["configured"] is True
    assert itunes["auth_type"] == "public_authorized_api"

    twitter = data["providers"]["twitter_v2"]
    assert "missing_credentials" in twitter
    assert "bearer_token" not in twitter  # zero secrets!

def test_monitoring_scheduler_lifecycle(app, brand_for_scan):
    """Verify scheduler registers jobs, prevents duplicate runs, and tracks status."""
    scheduler = MonitoringScheduler()

    job_id = scheduler.schedule_collection(
        brand_id=brand_for_scan,
        connector_id="itunes_app_store",
        interval_minutes=30
    )
    assert job_id is not None

    status = scheduler.get_job_status(job_id)
    assert status["id"] == job_id
    assert status["brand_id"] == brand_for_scan
    assert status["interval_minutes"] == 30
    assert status["status"] == "IDLE"

    # Cancel job
    cancelled = scheduler.cancel_job(job_id)
    assert cancelled is True

    with pytest.raises(ValueError):
        scheduler.get_job_status(job_id)
