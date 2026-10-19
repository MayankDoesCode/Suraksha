"""
Server-side relationship graph built ONLY from recorded evidence.

Two findings are linked when they share an observed indicator: the same IP address, TLS certificate fingerprint,
name server, hosting network (ASN) or registrar. Each edge states which indicator, how strong that kind of overlap
is, when it was observed and which evidence records support it. Nothing is inferred or invented; a link exists only
if two findings carry the same recorded value.
"""

import hashlib
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
from typing import Any, Dict, List, Optional, Tuple

from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.services.enrichment_service import parse_kv

# Large shared platforms: sharing their addresses or network says little about common control.
SHARED_PLATFORM_ASNS = {"13335": "Cloudflare", "54113": "Fastly", "20940": "Akamai", "16509": "Amazon", "14618": "Amazon", "15169": "Google", "8075": "Microsoft"}
SHARED_NS_SUFFIXES = ("cloudflare.com", "awsdns", "googledomains.com", "domaincontrol.com", "registrar-servers.com", "azure-dns")
COMMON_ISSUERS = ("let's encrypt", "google trust", "digicert", "sectigo", "cloudflare", "amazon", "zerossl", "globalsign", "godaddy")
WEAKNESS = {"ip": "strong", "cert": "strong", "ns": "medium", "asn": "weak", "registrar": "weak", "issuer": "weak"}
KIND = {"ip": "SHARED_IP", "cert": "SHARED_CERTIFICATE", "ns": "SHARED_NAMESERVER", "asn": "SHARED_ASN", "registrar": "SHARED_REGISTRAR", "issuer": "SHARED_CERT_ISSUER"}
RANK = {"strong": 3, "medium": 2, "weak": 1}


def indicators_for(finding: Dict[str, Any]) -> List[Tuple[str, str, str, Optional[int], Optional[str]]]:
    """(kind, value, note, evidence_id, captured_at) for every shareable indicator recorded on a finding."""
    out: List[Tuple[str, str, str, Optional[int], Optional[str]]] = []
    for e in finding.get("evidence", []):
        kv = parse_kv(e.get("description", ""))
        eid, when = e.get("id"), e.get("captured_at")
        t = e.get("evidence_type")
        if t == "dns_records":
            asn_by_ip = {}
            for bit in (kv.get("asn") or "").split(","):
                ip, _, rest = bit.partition(":AS")
                if ip and rest:
                    asn_by_ip[ip] = rest.split("/")[0]
            for ip in (kv.get("a") or "").split(","):
                if ip:
                    asn = asn_by_ip.get(ip)
                    note = f"shared platform address ({SHARED_PLATFORM_ASNS[asn]})" if asn in SHARED_PLATFORM_ASNS else ""
                    out.append(("ip", ip, note, eid, when))
            for asn in sorted(set(asn_by_ip.values())):
                out.append(("asn", f"AS{asn}", SHARED_PLATFORM_ASNS.get(asn, ""), eid, when))
            for ns in (kv.get("ns") or "").split(","):
                if ns:
                    note = "common DNS provider" if any(ns.endswith(s) or s in ns for s in SHARED_NS_SUFFIXES) else ""
                    out.append(("ns", ns, note, eid, when))
        elif t == "tls_certificate" and (kv.get("sha256") or kv.get("issuer")):
            if kv.get("sha256"):
                out.append(("cert", kv["sha256"], "", eid, when))
            if kv.get("issuer"):
                common = any(c in kv["issuer"].lower() for c in COMMON_ISSUERS)
                out.append(("issuer", kv["issuer"], "widely used certificate authority" if common else "", eid, when))
        elif t == "whois_registration" and kv.get("registrar"):
            out.append(("registrar", kv["registrar"], "", eid, when))
    return out


def build_graph(findings: List[Dict[str, Any]], brand_name: str = "") -> Dict[str, Any]:
    nodes = [{"id": "brand", "kind": "brand", "label": brand_name or "Brand"}]
    holders: Dict[Tuple[str, str], List[Tuple[str, str, Optional[int], Optional[str]]]] = defaultdict(list)
    for f in findings:
        nodes.append({
            "id": f["id"], "kind": "finding", "label": f.get("candidate_name"), "severity": f.get("severity"),
            "asset_type": f.get("asset_type"), "review_status": f.get("review_status"),
        })
        for kind, value, note, eid, when in indicators_for(f):
            holders[(kind, value)].append((f["id"], note, eid, when))

    best: Dict[Tuple[str, str], Dict[str, Any]] = {}
    pair_kinds: Dict[Tuple[str, str], set] = defaultdict(set)
    for (kind, value), members in holders.items():
        ids = sorted({m[0] for m in members})
        if len(ids) < 2:
            continue
        note = next((m[1] for m in members if m[1]), "")
        strength = WEAKNESS[kind] if not note else "weak"
        for a, b in combinations(ids, 2):
            pair_kinds[(a, b)].add(kind)
            edge = {
                "id": f"{KIND[kind]}:{a}:{b}", "source": a, "target": b, "kind": KIND[kind], "basis": "observed", "strength": strength,
                "indicator": kind, "value": value, "note": note or None,
                "evidence_ids": sorted({m[2] for m in members if m[0] in (a, b) and m[2] is not None}),
                "observed_at": max((m[3] for m in members if m[0] in (a, b) and m[3]), default=None),
                "explanation": f"Both findings recorded the same {kind} ({value}).",
            }
            key = (a, b)
            if key not in best or RANK[strength] > RANK[best[key]["strength"]]:
                best[key] = edge  # keep the strongest shared indicator per pair
    for key, e in best.items():
        e["indicator_kinds"] = sorted(pair_kinds[key])
    edges = sorted(best.values(), key=lambda e: (-RANK[e["strength"]], e["id"]))
    return {
        "nodes": nodes, "edges": edges, "campaigns": cluster_campaigns(findings, edges),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": "Links come only from indicators recorded on both findings. Weak links (shared registrar, network or platform address) are common coincidences and are labelled as such.",
    }


def cluster_campaigns(findings: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group findings into likely campaigns.

    Two findings are joined only by a strong or medium shared indicator (same IP, certificate or name server), or by two or
    more DIFFERENT weak indicator kinds together. A single shared registrar, network or common CA never forms a campaign.
    """
    parent = {f["id"]: f["id"] for f in findings}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    used: List[Dict[str, Any]] = []
    for e in edges:
        if e["strength"] in ("strong", "medium") and not e.get("note") or len(e.get("indicator_kinds", [])) >= 2:
            parent[find(e["source"])] = find(e["target"])
            used.append(e)
    groups: Dict[str, List[str]] = defaultdict(list)
    for fid in parent:
        groups[find(fid)].append(fid)
    by_id = {f["id"]: f for f in findings}
    order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    out = []
    for members in groups.values():
        if len(members) < 2:
            continue
        ms = set(members)
        links = [e for e in used if e["source"] in ms]
        kinds = sorted({k for e in links for k in e.get("indicator_kinds", [e["indicator"]])})
        cid = hashlib.sha1("|".join(sorted(ms)).encode()).hexdigest()[:8]
        out.append({
            "id": f"campaign-{cid}", "label": f"Campaign {cid}: {len(ms)} findings sharing {', '.join(kinds)}",
            "members": sorted(ms), "shared_indicator_kinds": kinds,
            "targets": sorted({str(by_id[m].get("candidate_name")) for m in ms}),
            "max_severity": max((by_id[m].get("severity") or "LOW" for m in ms), key=lambda v: order.get(v, 0)),
            "basis": "observed", "evidence_ids": sorted({i for e in links for i in e.get("evidence_ids", [])}),
        })
    return sorted(out, key=lambda c: (-len(c["members"]), c["id"]))


class GraphService:
    def __init__(self, repo: Optional[ThreatRepository] = None):
        self.repo = repo or ThreatRepository()

    def for_brand(self, brand_id: str, brand_name: str = "", limit: int = 200) -> Dict[str, Any]:
        findings, _total = self.repo.list_findings(brand_id=brand_id, limit=limit)
        return build_graph([f.to_dict(include_relations=True) for f in findings], brand_name)
