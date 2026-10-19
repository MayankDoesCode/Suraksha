"""Offline tests for the passive-intel stack (no real network)."""
import socket
from datetime import datetime, timezone

import pytest

from backend.app.intel import netsafe, permutations
from backend.app.intel.rdap import fetch_rdap, parse_rdap
from backend.app.services.enrichment_service import DomainIntel, EnrichmentService, kv, parse_kv
from backend.app.services.graph_service import build_graph
from backend.app.services.report_service import build_report, manifest_hash
from backend.app.utils.errors import ValidationError


def _resolver(*addrs):
    return lambda host, *a, **k: [(socket.AF_INET, 0, 0, "", (ip, 0)) for ip in addrs]


@pytest.mark.parametrize("bad", ["127.0.0.1", "http://10.0.0.5/x", "localhost", "intranet.corp", "[::1]", "nodots"])
def test_normalize_rejects_internal(bad):
    with pytest.raises(netsafe.UnsafeTarget):
        netsafe.normalize_hostname(bad)


def test_normalize_strips_url():
    assert netsafe.normalize_hostname("https://user@Example.COM:8443/a?b") == "example.com"


@pytest.mark.parametrize("ip,ok", [("8.8.8.8", True), ("10.1.1.1", False), ("169.254.169.254", False), ("100.64.0.1", False), ("::ffff:127.0.0.1", False)])
def test_is_public_ip(ip, ok):
    assert netsafe.is_public_ip(ip) is ok


def test_resolve_public_blocks_if_any_private():
    with pytest.raises(netsafe.UnsafeTarget):
        netsafe.resolve_public("evil.example", _resolver("8.8.8.8", "10.0.0.1"))
    assert netsafe.resolve_public("ok.example", _resolver("8.8.8.8"))


def test_permutations_exclude_official_and_dedupe():
    out = permutations.generate("razorpay.com", official_domains=["razorpay.com"], limit=300)
    names = [c.domain for c in out]
    assert "razorpay.com" not in names and len(names) == len(set(names)) and names
    assert any(c.technique == "omission" for c in out)


def test_rdap_parse_age_and_abuse():
    payload = {
        "events": [{"eventAction": "registration", "eventDate": "2026-10-10T00:00:00Z"}],
        "entities": [{"roles": ["registrar"], "vcardArray": ["vcard", [["fn", {}, "text", "Reg Inc"]]],
                      "entities": [{"roles": ["abuse"], "vcardArray": ["vcard", [["email", {}, "text", "abuse@reg.test"]]]}]}],
        "nameservers": [{"ldhName": "NS1.X.TEST."}],
    }
    r = parse_rdap("a.com", payload, now=datetime(2026, 10, 15, tzinfo=timezone.utc))
    assert r.age_days == 5 and r.registrar == "Reg Inc" and r.abuse_email == "abuse@reg.test" and r.nameservers == ["ns1.x.test"]


def test_rdap_refuses_redirect_to_internal_host():
    class Resp:
        status_code = 302
        headers = {"Location": "https://internal.corp/x"}
        content = b""
    rec = fetch_rdap("example.com", http_get=lambda *a, **k: Resp(), resolver=_resolver("8.8.8.8"))
    assert not rec.found and "refused" in rec.error


def _intel(age=3, self_signed=False, cert_age=None):
    return DomainIntel("x.com", "2026-10-19T00:00:00+00:00", {"resolves": True, "a": ["1.2.3.4"]},
                       {"found": True, "age_days": age}, {"presented": cert_age is not None or self_signed, "self_signed": self_signed, "age_days": cert_age})


def test_signals_scoring():
    s = {x.signal_type: x for x in EnrichmentService.risk_signals(_intel(age=3, cert_age=1))}
    assert s["NEWLY_REGISTERED_DOMAIN"].severity_score == 30 and "FRESH_CERTIFICATE" in s
    assert not EnrichmentService.risk_signals(_intel(age=400))
    assert [x.signal_type for x in EnrichmentService.risk_signals(_intel(age=400, self_signed=True))] == ["SELF_SIGNED_CERTIFICATE"]


def test_kv_roundtrip():
    assert parse_kv(kv(a=["1.1.1.1", "2.2.2.2"], b="x", c=None)) == {"a": "1.1.1.1,2.2.2.2", "b": "x"}


def _finding(fid, a="9.9.9.9", cert=None, registrar=None):
    ev = [{"id": 1, "evidence_type": "dns_records", "description": kv(a=[a], asn=[f"{a}:AS999/1.1.0.0/16/US"]), "captured_at": "t"}]
    if cert:
        ev.append({"id": 2, "evidence_type": "tls_certificate", "description": kv(sha256=cert), "captured_at": "t"})
    if registrar:
        ev.append({"id": 3, "evidence_type": "whois_registration", "description": kv(registrar=registrar), "captured_at": "t"})
    return {"id": fid, "candidate_name": fid + ".com", "asset_type": "domain", "severity": "HIGH", "evidence": ev, "signals": [{"explanation": "why"}], "final_risk_score": 70}


def test_graph_links_only_shared_values_and_keeps_strongest():
    g = build_graph([_finding("a", cert="abc"), _finding("b", cert="abc"), _finding("c", a="8.8.4.4")])
    by_pair = {(e["source"], e["target"]): e for e in g["edges"]}
    assert by_pair[("a", "b")]["strength"] == "strong" and by_pair[("a", "b")]["basis"] == "observed"
    assert by_pair[("a", "c")]["strength"] == "weak"  # only the (fixture-shared) ASN, no IP or cert in common


def test_graph_marks_shared_platform_weak():
    f = lambda i: {**_finding(i, a="104.16.0.1"), "evidence": [{"id": 1, "evidence_type": "dns_records", "description": kv(a=["104.16.0.1"], asn=["104.16.0.1:AS13335/x/US"]), "captured_at": "t"}]}
    g = build_graph([f("a"), f("b")])
    assert g["edges"][0]["strength"] == "weak"


def test_report_draft_and_hash_stable():
    f = _finding("a", registrar="Reg Inc")
    r = build_report(f, "Acme", "registrar", analyst="me")
    assert r["sent"] is False and r["requires_analyst_verification"] and "Reg Inc" in r["body_markdown"]
    assert r["manifest_sha256"] == manifest_hash(f["evidence"])
    f2 = {**f, "evidence": list(reversed(f["evidence"]))}
    assert manifest_hash(f2["evidence"]) == r["manifest_sha256"]


def test_report_rejects_wrong_audience_for_asset():
    with pytest.raises(ValidationError):
        build_report(_finding("a"), "Acme", "app_store")
    with pytest.raises(ValidationError):
        build_report(_finding("a"), "Acme", "nope")


# ---- endpoint integration (no network: DNS/RDAP/TLS are faked) ----
def _brand(client):
    r = client.post("/api/v1/brands", json={"name": "Acme", "domains": [{"domain": "acme.com", "is_primary": True}]})
    assert r.status_code in (200, 201), r.get_json()
    return r.get_json()["data"]["id"]


def test_discover_graph_enrich_report_end_to_end(client, monkeypatch):
    from backend.app.intel import dns_probe
    from backend.app.services import enrichment_service as es
    from backend.app.intel.rdap import RdapRecord
    from backend.app.intel.tls_cert import CertObservation

    def fake_probe_many(self, domains, **kw):
        out = []
        for d in domains:
            o = dns_probe.DnsObservation(domain=d, observed_at=0.0, resolves=(d == "acmee.com"))
            if o.resolves:
                o.a = ["93.184.216.34"]
                o.ns = ["ns1.shady.test"]
            out.append(o)
        return out
    monkeypatch.setattr(dns_probe.DnsProbe, "probe_many", fake_probe_many)
    bid = _brand(client)

    r = client.post(f"/api/v1/brands/{bid}/discover", json={"limit": 50})
    assert r.status_code == 200, r.get_json()
    data = r.get_json()["data"]
    assert data["resolved"] == 1 and data["results"][0]["domain"] == "acmee.com"
    fid = data["results"][0]["finding_id"]

    monkeypatch.setattr(es.EnrichmentService, "collect", lambda self, d, observation=None: es.DomainIntel(
        d, "2026-10-19T00:00:00+00:00", {"resolves": True, "a": ["93.184.216.34"]},
        RdapRecord(domain=d, found=True, observed_at=0, age_days=2, registrar="Reg Inc").to_dict(),
        CertObservation(host=d, ip=None, observed_at=0.0, error="x").to_dict()))
    first = client.post(f"/api/v1/findings/{fid}/enrich").get_json()["data"]["finding"]
    second = client.post(f"/api/v1/findings/{fid}/enrich").get_json()["data"]["finding"]
    assert first["final_risk_score"] == second["final_risk_score"]  # idempotent
    assert sum(s["signal_type"] == "NEWLY_REGISTERED_DOMAIN" for s in second["signals"]) == 1

    rep = client.get(f"/api/v1/findings/{fid}/report?audience=registrar").get_json()["data"]
    assert rep["sent"] is False and "Reg Inc" in rep["body_markdown"]
    assert client.get(f"/api/v1/findings/{fid}/report?audience=app_store").status_code == 422
    assert client.get(f"/api/v1/brands/{bid}/graph").status_code == 200


def test_intel_endpoints_require_auth(unauth_client):
    assert unauth_client.post("/api/v1/brands/x/discover").status_code in (401, 403)
    assert unauth_client.post("/api/v1/findings/x/enrich").status_code in (401, 403)
