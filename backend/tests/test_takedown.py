import pytest

from backend.app.services import report_service as rs
from backend.app.services.enrichment_service import kv
from backend.app.utils.errors import ValidationError

F = {"id": "f1", "asset_type": "domain", "candidate_name": "acmefinanc.com", "severity": "HIGH", "final_risk_score": 71,
     "signals": [{"explanation": "Name is one edit from the official domain"}],
     "evidence": [{"evidence_type": "dns_records", "description": kv(a=["1.2.3.4"], ns=["ns1.x.test"]), "captured_at": "t"}]}


@pytest.mark.parametrize("notice", ["registrar", "host", "trademark"])
def test_templates_render_and_state_draft(notice):
    n = rs.render_takedown(F, "Acme", notice, "abuse@reg.test", "me")
    assert "acmefinanc.com" in n["text"] and "NOT been sent" in n["text"] and "1.2.3.4" in n["text"] and n["sent"] is False
    assert n["to"] == "abuse@reg.test" and n["abuse_contact_source"] == "rdap"


def test_missing_abuse_contact_is_stated_not_invented():
    n = rs.render_takedown(F, "Acme", "registrar", None)
    assert n["abuse_contact_source"] == "not found" and "@" not in n["to"]
    assert b"undisclosed-recipients" in rs.to_eml(n)


def test_rejects_unknown_notice_and_non_domain():
    with pytest.raises(ValidationError):
        rs.render_takedown(F, "Acme", "nope", None)
    with pytest.raises(ValidationError):
        rs.render_takedown({**F, "asset_type": "social"}, "Acme", "registrar", None)


def test_pdf_is_wellformed_and_multipage():
    pdf = rs.to_pdf("line (with) parens \\ back\n" * 120)
    assert pdf.startswith(b"%PDF-1.4") and pdf.rstrip().endswith(b"%%EOF") and b"/Count 3" in pdf


def test_takedown_endpoint(client, monkeypatch):
    from backend.app.intel import rdap as rdap_mod
    from backend.app.intel.rdap import RdapRecord
    monkeypatch.setattr(rdap_mod, "fetch_rdap", lambda d: RdapRecord(domain=d, found=True, observed_at=0, abuse_email="abuse@reg.test"))
    bid = client.post("/api/v1/brands", json={"name": "Acme", "domains": [{"domain": "acmefinance.com", "is_primary": True}]}).get_json()["data"]["id"]
    res = client.post(f"/api/v1/brands/{bid}/scan", json={"asset_type": "domain", "candidate_name": "acmefinanc.com", "source_url": "https://acmefinanc.com"}).get_json()["data"]
    fid = res["finding"]["id"]
    j = client.post(f"/api/v1/findings/{fid}/takedown", json={"notice": "registrar"}).get_json()["data"]
    assert j["to"] == "abuse@reg.test" and j["eml_base64"] and j["pdf_base64"]
    assert client.post(f"/api/v1/findings/{fid}/takedown", json={"format": "pdf"}).data.startswith(b"%PDF")
    assert client.post(f"/api/v1/findings/{fid}/takedown", json={"notice": "zzz"}).status_code == 422


def test_metrics_count_takedowns_and_report_none_when_no_certs(client, monkeypatch):
    client.application.config["RATELIMIT_DISCOVER"] = "1000 per minute"  # the shared limiter would otherwise throttle repeated test calls
    from backend.app.intel import rdap as rdap_mod
    from backend.app.intel.rdap import RdapRecord
    monkeypatch.setattr(rdap_mod, "fetch_rdap", lambda d: RdapRecord(domain=d, found=False, observed_at=0))
    bid = client.post("/api/v1/brands", json={"name": "Acme", "domains": [{"domain": "acmefinance.com", "is_primary": True}]}).get_json()["data"]["id"]
    fid = client.post(f"/api/v1/brands/{bid}/scan", json={"asset_type": "domain", "candidate_name": "acmefinanc.com", "source_url": "https://acmefinanc.com"}).get_json()["data"]["finding"]["id"]
    tk = client.post(f"/api/v1/findings/{fid}/takedown", json={"notice": "registrar"}); assert tk.status_code == 200, tk.get_json()
    m = client.get("/api/v1/metrics").get_json()["data"]
    assert m["takedowns_drafted"] == 1 and m["median_hours_cert_to_detection"] is None and m["flagged_last_24h"] >= 1


def test_social_and_app_store_takedowns():
    social_finding = {
        "id": "s1", "asset_type": "social", "candidate_name": "@acme_support",
        "severity": "CRITICAL", "final_risk_score": 90,
        "signals": [{"explanation": "Fake support account asking for credentials"}],
        "evidence": []
    }
    app_finding = {
        "id": "a1", "asset_type": "mobile_app", "candidate_name": "Acme Mobile Bank Pro",
        "severity": "HIGH", "final_risk_score": 82,
        "signals": [{"explanation": "Unofficial APK mirroring protected brand"}],
        "evidence": []
    }
    sn = rs.render_takedown(social_finding, "Acme", "platform", None, "analyst@sec.test")
    assert "@acme_support" in sn["text"] and "impersonating our brand" in sn["text"]
    assert sn["notice"] == "platform"

    an = rs.render_takedown(app_finding, "Acme", "app_store", None, "analyst@sec.test")
    assert "Acme Mobile Bank Pro" in an["text"] and "infringing application listing" in an["text"]
    assert an["notice"] == "app_store"

