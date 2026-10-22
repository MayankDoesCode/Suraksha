import pytest
from backend.app.intel.google_safe_browsing import GoogleSafeBrowsingService
from backend.app.detection.brand_extractor import BrandExtractor


def test_google_safe_browsing_heuristic_detection():
    service = GoogleSafeBrowsingService()
    # Phishing domain on deceptive TLD
    res_phish = service.check_url("https://paypal-security-login.xyz")
    assert res_phish["is_flagged_by_google"] is True
    assert res_phish["verdict"] in ("MALICIOUS", "SUSPICIOUS")
    assert "safe_to_visit" in res_phish
    assert res_phish["safe_to_visit"] is False

    # Normal official site
    res_clean = service.check_url("https://example.com")
    assert res_clean["is_flagged_by_google"] is False
    assert res_clean["safe_to_visit"] is True


def test_brand_extractor_auto_detection():
    # Detects PayPal
    b1 = BrandExtractor.detect_target_brand("https://paypal-account-verify.xyz")
    assert b1["brand_name"] == "PayPal"

    # Detects Apple
    b2 = BrandExtractor.detect_target_brand("https://apple-id-recovery.net")
    assert b2["brand_name"] == "Apple"

    # Detects Netflix
    b3 = BrandExtractor.detect_target_brand("https://netflix-subscription-renewal.com")
    assert b3["brand_name"] == "Netflix"


def test_copilot_verify_url_api(client):
    res = client.post("/api/v1/copilot/verify-url", json={"url": "https://paypal-security-login.xyz"})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_threat"] is True
    assert data["severity"] in ("CRITICAL", "HIGH")
    assert data["detected_brand"]["brand_name"] == "PayPal"
    assert data["google_safe_browsing"]["is_flagged_by_google"] is True


def test_copilot_chat_api(client):
    res = client.post("/api/v1/copilot/chat", json={"message": "Analyze https://chase-security-verify.top"})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["inspection"] is not None
    assert data["inspection"]["target_brand"] == "Chase Bank"
    assert "CRITICAL THREAT" in data["response"] or "Threat Score" in data["response"]


def test_threat_feed_recent_api(client):
    res = client.get("/api/v1/copilot/threat-feed/recent?limit=10")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["threats"]) > 0
    assert "url" in data["threats"][0]
    assert "target_brand" in data["threats"][0]


def test_threat_feed_search_api(client):
    res = client.post("/api/v1/copilot/threat-feed/search", json={"query": "paypal", "limit": 5})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["results"]) > 0
    assert any("paypal" in r["target_brand"].lower() or "paypal" in r["url"].lower() for r in data["results"])


def test_generate_permutations_api(client):
    res = client.post("/api/v1/copilot/generate-permutations", json={"domain": "paypal.com", "limit": 15})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["target_brand"] == "Paypal"
    assert len(data["permutations"]) > 0
    first = data["permutations"][0]
    assert "domain" in first
    assert "technique" in first
    assert "risk_score" in first


def test_mobile_trojan_permissions_matrix():
    from backend.app.detection.app_detector import AppDetector
    detector = AppDetector()
    brand_profile = {
        "name": "Acme Bank",
        "official_apps": [{"identifier": "com.acme.bank.official"}],
        "publishers": [{"publisher_name": "Acme Financial Inc"}]
    }

    # Rogue app with SMS interception and accessibility overlay hijack
    rogue_app = {
        "candidate_name": "Acme Bank Easy Loan",
        "package_id": "com.rogue.acmebank.loan.trojan",
        "publisher_name": "Unknown Hacker Team",
        "permissions": ["READ_SMS", "RECEIVE_SMS", "BIND_ACCESSIBILITY_SERVICE", "REQUEST_INSTALL_PACKAGES"]
    }
    outcome = detector.evaluate_full(rogue_app, brand_profile)
    signal_types = [s.signal_type for s in outcome.risk_evaluation.signals]
    assert "TROJAN_SMS_INTERCEPTION" in signal_types
    assert "TROJAN_OVERLAY_HIJACK" in signal_types
    assert "TROJAN_DROPPER_CAPABILITY" in signal_types
    assert outcome.risk_evaluation.total_score >= 80.0


def test_copilot_intents_and_suggested_actions(client):
    # 1. Takedown intent
    res_td = client.post("/api/v1/copilot/chat", json={"message": "Draft registrar abuse notice for paypal-fake.com"})
    assert res_td.status_code == 200
    data_td = res_td.get_json()["data"]
    assert "RFC-Compliant Abuse Takedown Notice" in data_td["response"]
    assert "Dear Abuse & Trust & Safety Team" in data_td["response"]

    # 2. Combosquatting educational intent
    res_combo = client.post("/api/v1/copilot/chat", json={"message": "Explain combosquatting attacks"})
    assert res_combo.status_code == 200
    data_combo = res_combo.get_json()["data"]
    assert "Combosquatting: Adversarial Anatomy & Detection" in data_combo["response"]
    assert "Common Combosquatting Patterns" in data_combo["response"]

    # 3. Homoglyph educational intent
    res_homo = client.post("/api/v1/copilot/chat", json={"message": "What is a homoglyph or punycode attack?"})
    assert res_homo.status_code == 200
    data_homo = res_homo.get_json()["data"]
    assert "Homoglyphs & IDN Homograph Attacks" in data_homo["response"]
    assert "Punycode" in data_homo["response"]

    # 4. Suggested actions are present
    assert "suggested_actions" in data_homo
    assert len(data_homo["suggested_actions"]) > 0


