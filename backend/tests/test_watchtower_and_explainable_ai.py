import pytest
from backend.app.services.watchtower_service import WatchtowerService
from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository


@pytest.fixture
def watchtower_setup(app):
    """Set up test brand with registered official assets for watchtower testing."""
    with app.app_context():
        from backend.app.services.brand_service import BrandService
        brand_service = BrandService()
        brand_repo = BrandRepository()
        threat_repo = ThreatRepository()
        watchtower = WatchtowerService(brand_repo=brand_repo, threat_repo=threat_repo)

        brand_dict = brand_service.create_brand({
            "name": "ApexPay",
            "description": "Enterprise digital payments provider",
            "domains": [
                {"domain": "apexpay.com", "is_primary": True},
                {"domain": "apexpay.io", "is_primary": False},
            ],
            "social_handles": [
                {"platform": "Twitter / X", "handle": "apexpay_official", "url": "https://x.com/apexpay_official"},
                {"platform": "Instagram", "handle": "apexpay.fintech", "url": "https://instagram.com/apexpay.fintech"},
            ],
            "app_identifiers": [
                {"platform": "google_play", "identifier": "com.apexpay.wallet", "app_name": "ApexPay Wallet"},
            ],
            "publishers": [
                {"platform": "google_play", "publisher_name": "ApexPay Technologies Inc."},
            ],
        })

        brand = brand_repo.get_by_id(brand_dict["id"])

        return {
            "brand": brand,
            "watchtower": watchtower,
            "brand_repo": brand_repo,
            "threat_repo": threat_repo,
        }


def test_watchtower_official_asset_exclusion(watchtower_setup):
    """Official registered domain must be excluded with 0 risk score."""
    brand = watchtower_setup["brand"]
    watchtower = watchtower_setup["watchtower"]

    result = watchtower.evaluate_watchtower(
        brand_id=brand.id,
        candidate_data={"candidate_name": "apexpay.com", "asset_type": "domain"},
        scan_mode="scan_on_demand",
    )

    assert result["success"] is True
    assert result["is_official"] is True
    assert result["risk_score"] == 0.0
    assert result["verification_status"] == "Allowlisted Official Asset"
    assert "exclusion_reason" in result
    assert result["auto_confirmed"] is False


def test_watchtower_domain_impersonation_detection(watchtower_setup):
    """Lookalike domain with keywords must be flagged with explainable similarity signals."""
    brand = watchtower_setup["brand"]
    watchtower = watchtower_setup["watchtower"]

    result = watchtower.evaluate_watchtower(
        brand_id=brand.id,
        candidate_data={
            "candidate_name": "apexpay-claims-support.xyz",
            "asset_type": "domain",
            "source_url": "https://apexpay-claims-support.xyz/login",
        },
        scan_mode="scan_on_demand",
    )

    assert result["success"] is True
    assert result["is_official"] is False
    assert result["risk_score"] > 40.0
    assert result["verification_status"] == "Candidate Threat (Pending Verification)"
    assert result["scan_mode"] == "scan_on_demand"
    assert "Scan on Demand" in result["scan_mode_clarification"]

    # Verify comparison breakdown against registered assets
    comp = result["comparison"]
    assert comp["target_brand_name"] == "ApexPay"
    assert comp["brand_token_contained"] is True
    assert "support" in comp["detected_keywords"] or "claims" in comp["detected_keywords"]
    assert comp["domain_tld"] == "xyz"
    assert comp["is_tld_high_risk"] is True


def test_watchtower_homoglyph_detection(watchtower_setup):
    """Cyrillic homoglyph mimicking Latin character must be detected."""
    brand = watchtower_setup["brand"]
    watchtower = watchtower_setup["watchtower"]

    # Contains Cyrillic small 'а' (U+0430)
    result = watchtower.evaluate_watchtower(
        brand_id=brand.id,
        candidate_data={"candidate_name": "аpexpay.com", "asset_type": "domain"},
    )

    assert result["comparison"]["homoglyph_detected"] is True
    assert len(result["comparison"]["homoglyph_characters"]) > 0


def test_watchtower_route_to_investigation(watchtower_setup):
    """Routing to investigation must persist finding and return finding_id."""
    brand = watchtower_setup["brand"]
    watchtower = watchtower_setup["watchtower"]

    result = watchtower.evaluate_watchtower(
        brand_id=brand.id,
        candidate_data={
            "candidate_name": "apexpay-fake-auth.xyz",
            "asset_type": "domain",
            "source_url": "https://apexpay-fake-auth.xyz",
        },
        persist_to_investigation=True,
    )

    assert result["routed_to_investigation"] is True
    assert result["finding_id"] is not None

    # Verify persisted in database
    finding = watchtower_setup["threat_repo"].get_by_id(result["finding_id"])
    assert finding is not None
    assert finding.candidate_name == "apexpay-fake-auth.xyz"
    assert finding.brand_id == brand.id


def test_explainable_ai_three_tier_epistemic_breakdown(watchtower_setup):
    """Explainable AI Assistant must separate observed facts, model inferences, and unverified claims."""
    brand = watchtower_setup["brand"]
    watchtower = watchtower_setup["watchtower"]

    # Route a finding
    route_res = watchtower.evaluate_watchtower(
        brand_id=brand.id,
        candidate_data={
            "candidate_name": "@apexpay_support_fraud",
            "asset_type": "social",
            "source_url": "https://t.me/apexpay_support_fraud",
        },
        persist_to_investigation=True,
    )
    finding_id = route_res["finding_id"]

    # Call explainability
    explanation = watchtower.explain_finding_by_id(finding_id)

    assert explanation["success"] is True
    assert explanation["finding_id"] == finding_id

    # Verify 3-tier epistemic separation
    epistemic = explanation["epistemic_breakdown"]
    assert "observed_facts" in epistemic
    assert "model_inferences" in epistemic
    assert "unverified_claims" in epistemic

    assert len(epistemic["observed_facts"]) >= 2
    assert len(epistemic["unverified_claims"]) >= 2

    # Verify confidence documentation
    assert "confidence" in explanation
    assert "documented_meaning" in explanation["confidence"]
    assert explanation["auto_confirmed"] is False
    assert explanation["analyst_action_required"] is True

    # Verify recommended steps
    assert len(explanation["recommended_steps"]) >= 2


def test_api_watchtower_and_explain_routes(client, auth_headers):
    """Test REST API endpoints for Watchtower and Explainable AI."""
    # 1. Create a test brand
    create_res = client.post("/api/v1/brands", json={
        "name": "NovaShield",
        "description": "Cyber security provider",
        "domains": [{"domain": "novashield.io", "is_primary": True}],
        "social_handles": [{"platform": "Twitter", "handle": "novashield_io"}],
    }, headers=auth_headers)
    assert create_res.status_code == 201
    brand_id = create_res.get_json()["data"]["id"]

    # 2. Watchtower evaluate endpoint
    eval_res = client.post(f"/api/v1/brands/{brand_id}/watchtower/evaluate", json={
        "candidate_name": "novashield-portal.xyz",
        "asset_type": "domain",
        "scan_mode": "scan_on_demand",
        "persist_to_investigation": True,
    }, headers=auth_headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.get_json()["data"]
    assert eval_data["success"] is True
    assert eval_data["routed_to_investigation"] is True
    finding_id = eval_data["finding_id"]

    # 3. Watchtower summary endpoint
    sum_res = client.get(f"/api/v1/brands/{brand_id}/watchtower/summary")
    assert sum_res.status_code == 200
    sum_data = sum_res.get_json()["data"]
    assert sum_data["brand_id"] == brand_id
    assert sum_data["monitored_domains_count"] == 1
    assert sum_data["total_screened_findings"] >= 1

    # 4. Explain finding endpoint
    exp_res = client.get(f"/api/v1/findings/{finding_id}/explain")
    assert exp_res.status_code == 200
    exp_data = exp_res.get_json()["data"]
    assert exp_data["success"] is True
    assert "epistemic_breakdown" in exp_data
    assert exp_data["auto_confirmed"] is False

    # 5. On-the-fly candidate explain endpoint
    otf_res = client.post("/api/v1/findings/explain", json={
        "brand_id": brand_id,
        "candidate_name": "novashield.io",
        "asset_type": "domain",
    })
    assert otf_res.status_code == 200
    otf_data = otf_res.get_json()["data"]
    assert otf_data["is_official"] is True
