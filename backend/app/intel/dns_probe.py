"""
DNS observation of a domain: does it exist, where does it point, who runs its name servers and what network
(ASN) hosts its addresses. Uses only DNS queries (and the public Team Cymru IP-to-ASN DNS service). It never
opens a connection to the candidate.
"""

import logging
import socket
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from typing import Callable, Dict, Iterable, List, Optional

from backend.app.intel.netsafe import UnsafeTarget, is_public_ip, normalize_hostname

logger = logging.getLogger(__name__)

try:  # dnspython gives NS/MX/TXT; without it only A/AAAA via the OS resolver is available.
    import dns.exception
    import dns.resolver
    import dns.reversename  # noqa: F401
    HAVE_DNSPYTHON = True
except ImportError:  # pragma: no cover - exercised only when the dependency is missing
    HAVE_DNSPYTHON = False


@dataclass
class DnsObservation:
    domain: str
    observed_at: float
    resolves: bool = False
    nxdomain: bool = False
    a: List[str] = field(default_factory=list)
    aaaa: List[str] = field(default_factory=list)
    ns: List[str] = field(default_factory=list)
    mx: List[str] = field(default_factory=list)
    asns: Dict[str, Dict[str, str]] = field(default_factory=dict)  # ip -> {asn, prefix, country, registry}
    non_public_addresses: List[str] = field(default_factory=list)
    error: Optional[str] = None
    source: str = "dns"

    def to_dict(self) -> dict:
        return asdict(self)


class DnsProbe:
    """`query(name, rdtype)` is injectable so tests (and other backends) never need real DNS."""

    def __init__(self, query: Optional[Callable[[str, str], List[str]]] = None, timeout: float = 2.0, with_asn: bool = True):
        self.timeout = timeout
        self.with_asn = with_asn
        self._query = query or self._default_query
        self._resolver = None
        if query is None and HAVE_DNSPYTHON:
            self._resolver = dns.resolver.Resolver()
            self._resolver.lifetime = timeout
            self._resolver.timeout = timeout

    # -- raw queries -----------------------------------------------------------------------------------
    def _default_query(self, name: str, rdtype: str) -> List[str]:
        """Return answers as strings. Raises LookupError('NXDOMAIN') for a non-existent name."""
        if self._resolver is not None:
            try:
                answer = self._resolver.resolve(name, rdtype, raise_on_no_answer=False)
            except dns.resolver.NXDOMAIN as exc:
                raise LookupError("NXDOMAIN") from exc
            except (dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
                return []
            return [r.to_text().strip('"') for r in (answer or [])]
        if rdtype in ("A", "AAAA"):  # fallback: OS resolver
            family = socket.AF_INET if rdtype == "A" else socket.AF_INET6
            try:
                return sorted({i[4][0] for i in socket.getaddrinfo(name, None, family, socket.SOCK_STREAM)})
            except socket.gaierror as exc:
                raise LookupError("NXDOMAIN") from exc
        return []

    def _safe(self, name: str, rdtype: str) -> List[str]:
        try:
            return self._query(name, rdtype)
        except LookupError:
            raise
        except Exception as exc:  # timeouts, SERVFAIL ...
            logger.debug("dns %s %s failed: %s", rdtype, name, exc)
            return []

    # -- public API ------------------------------------------------------------------------------------
    def probe(self, domain: str) -> DnsObservation:
        try:
            name = normalize_hostname(domain)
        except UnsafeTarget as exc:
            return DnsObservation(domain=str(domain)[:253], observed_at=time.time(), error=f"refused: {exc}")
        obs = DnsObservation(domain=name, observed_at=time.time())
        try:
            obs.a = sorted(set(self._safe(name, "A")))
            obs.aaaa = sorted(set(self._safe(name, "AAAA")))
        except LookupError:
            obs.nxdomain = True
            return obs
        obs.ns = sorted({n.rstrip(".").lower() for n in self._safe_nx(name, "NS")})
        obs.mx = sorted({m.split()[-1].rstrip(".").lower() for m in self._safe_nx(name, "MX")})
        addresses = obs.a + obs.aaaa
        obs.non_public_addresses = [ip for ip in addresses if not is_public_ip(ip)]
        obs.resolves = bool(addresses or obs.ns)
        if self.with_asn:
            for ip in obs.a:
                if is_public_ip(ip):
                    info = self._asn_for(ip)
                    if info:
                        obs.asns[ip] = info
        return obs

    def _safe_nx(self, name: str, rdtype: str) -> List[str]:
        try:
            return self._safe(name, rdtype)
        except LookupError:
            return []

    def _asn_for(self, ip: str) -> Optional[Dict[str, str]]:
        """Team Cymru IP-to-ASN mapping over DNS TXT: '13335 | 1.1.1.0/24 | AU | apnic | 2011-08-11'."""
        octets = ip.split(".")
        if len(octets) != 4:
            return None
        try:
            txt = self._safe(".".join(reversed(octets)) + ".origin.asn.cymru.com", "TXT")
        except LookupError:
            return None
        if not txt:
            return None
        parts = [p.strip() for p in txt[0].split("|")]
        if len(parts) < 4 or not parts[0].split()[0].isdigit():
            return None
        return {"asn": parts[0].split()[0], "prefix": parts[1], "country": parts[2], "registry": parts[3]}

    def probe_many(self, domains: Iterable[str], workers: int = 16, deadline_seconds: float = 25.0) -> List[DnsObservation]:
        """Probe in parallel. Names not finished before the deadline are reported with error='timeout'."""
        names = list(domains)
        results: Dict[str, DnsObservation] = {}
        start = time.time()
        with ThreadPoolExecutor(max_workers=max(1, min(workers, 32))) as pool:
            futures = {pool.submit(self.probe, d): d for d in names}
            try:
                for fut in as_completed(futures, timeout=deadline_seconds):
                    results[futures[fut]] = fut.result()
            except Exception:  # as_completed timeout
                for fut in futures:
                    fut.cancel()
        out = []
        for d in names:
            out.append(results.get(d) or DnsObservation(domain=d, observed_at=time.time(), error=f"timeout after {round(time.time() - start, 1)}s"))
        return out
