"""
SSRF guard for every outbound lookup SURAKSHA performs on analyst-supplied names.

Rules:
  * Only registrable-looking public hostnames are accepted (no IP literals, no single labels,
    no .local / .internal style suffixes, no userinfo, ports or paths).
  * A hostname is only contacted after it resolves, and only to globally routable addresses.
    If ANY resolved address is non-public the whole name is refused (defends against DNS
    answers that mix public and internal records).
"""

import ipaddress
import re
import socket
from typing import Callable, List
from urllib.parse import urlparse

import idna


class UnsafeTarget(ValueError):
    """The requested target must not be contacted."""


_LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
_HOST_RE = re.compile(rf"^(?:{_LABEL}\.)+[a-z][a-z0-9-]{{1,62}}$")
_BLOCKED_SUFFIXES = (".local", ".localhost", ".internal", ".lan", ".home.arpa", ".intranet", ".corp", ".private")
_CGNAT = ipaddress.ip_network("100.64.0.0/10")
MAX_HOSTNAME = 253


def normalize_hostname(value: str) -> str:
    """
    Return the lowercase ASCII (punycode) hostname for `value`, or raise UnsafeTarget.
    Accepts a bare host or a URL; extracts the host and discards scheme, userinfo, port, path and query.
    """
    raw = (value or "").strip()
    if not raw or len(raw) > 2048:
        raise UnsafeTarget("empty or oversized input")
    if "://" not in raw:
        raw = "//" + raw
    try:
        parsed = urlparse(raw)
        host = (parsed.hostname or "").strip().rstrip(".").lower()
    except ValueError as exc:
        raise UnsafeTarget("unparseable host") from exc
    if not host:
        raise UnsafeTarget("no host")
    try:
        ipaddress.ip_address(host)
        raise UnsafeTarget("IP literals are not accepted")
    except ValueError as exc:
        if isinstance(exc, UnsafeTarget):
            raise
    try:
        ascii_host = idna.encode(host, uts46=True).decode("ascii") if any(ord(c) > 127 for c in host) or "xn--" in host else host
    except idna.IDNAError as exc:
        raise UnsafeTarget("invalid internationalised name") from exc
    ascii_host = ascii_host.lower()
    if len(ascii_host) > MAX_HOSTNAME or not _HOST_RE.match(ascii_host):
        raise UnsafeTarget("not a valid public hostname")
    if ascii_host == "localhost" or ascii_host.endswith(_BLOCKED_SUFFIXES):
        raise UnsafeTarget("non-public suffix")
    return ascii_host


def is_public_ip(address: str) -> bool:
    """True only for globally routable unicast addresses."""
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    if ip in _CGNAT:
        return False
    return bool(
        ip.is_global
        and not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified)
    )


Resolver = Callable[..., list]


def resolve_public(host: str, resolver: Resolver = socket.getaddrinfo) -> List[str]:
    """
    Resolve `host` (A and AAAA) and return its addresses, refusing the lookup entirely if any
    address is non-public. Returns an empty list when the name does not resolve.
    """
    name = normalize_hostname(host)
    try:
        infos = resolver(name, None, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError):
        return []
    addresses: List[str] = []
    for info in infos:
        addr = info[4][0]
        if addr not in addresses:
            addresses.append(addr)
    for addr in addresses:
        if not is_public_ip(addr):
            raise UnsafeTarget(f"{name} resolves to a non-public address ({addr})")
    return addresses
