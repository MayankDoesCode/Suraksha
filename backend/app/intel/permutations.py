"""
Deterministic lookalike-domain generator.

Produces the registrations an attacker would plausibly use against a brand domain: typos, adjacent-key
slips, character swaps, hyphenation, ASCII and internationalised homoglyphs, single-bit flips, TLD swaps and
credential-lure combinations. Nothing here touches the network; `dns_probe` checks which candidates exist.

A generated name is a *hypothesis*. It becomes evidence only when it is observed to resolve.
"""

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Set

import idna

from backend.app.intel.netsafe import UnsafeTarget, normalize_hostname

TWO_LEVEL_SUFFIXES = {
    "co.uk", "org.uk", "ac.uk", "com.au", "net.au", "co.in", "net.in", "org.in", "com.br", "co.jp", "co.nz",
    "co.za", "com.sg", "com.hk", "com.mx", "com.tr", "com.ng", "com.pk", "com.bd", "co.id", "com.my", "com.ph",
}
COMMON_TLDS = ["com", "net", "org", "co", "io", "in", "xyz", "top", "online", "site", "info", "biz", "shop", "app", "club", "vip", "cc"]
LURE_WORDS = ["login", "secure", "support", "verify", "account", "help", "official", "pay", "wallet", "kyc", "refund", "app", "care"]

_KEYBOARD: Dict[str, str] = {
    "q": "wa", "w": "qesa", "e": "wrsd", "r": "etdf", "t": "ryfg", "y": "tugh", "u": "yihj", "i": "uojk", "o": "ipkl", "p": "ol",
    "a": "qwsz", "s": "awedxz", "d": "serfcx", "f": "drtgvc", "g": "ftyhbv", "h": "gyujnb", "j": "huikmn", "k": "jiolm", "l": "kop",
    "z": "asx", "x": "zsdc", "c": "xdfv", "v": "cfgb", "b": "vghn", "n": "bhjm", "m": "njk",
}
_ASCII_HOMOGLYPHS: Dict[str, List[str]] = {
    "o": ["0"], "l": ["1", "i"], "i": ["1", "l"], "e": ["3"], "m": ["rn"], "w": ["vv"], "d": ["cl"], "a": ["4"], "s": ["5"], "b": ["6"], "g": ["9"],
}
# Cyrillic / Greek look-alikes, emitted as punycode so they are valid DNS names.
_IDN_HOMOGLYPHS: Dict[str, List[str]] = {
    "a": ["а"], "e": ["е"], "o": ["о", "ο"], "p": ["р"], "c": ["с"], "x": ["х"], "y": ["у"], "i": ["і"], "s": ["ѕ"], "j": ["ј"],
}
_VOWELS = "aeiou"
_VALID = set("abcdefghijklmnopqrstuvwxyz0123456789-")

# Order = priority when the candidate list has to be cut to the requested limit.
TECHNIQUE_ORDER = [
    "homoglyph", "homoglyph-idn", "omission", "transposition", "hyphenation", "tld-swap", "repetition", "replacement",
    "insertion", "bitsquat", "vowel-swap", "combo",
]


@dataclass(frozen=True)
class Candidate:
    domain: str
    technique: str


def split_domain(domain: str) -> tuple:
    """Return (sld, suffix) using a small list of two-level suffixes; everything else is a one-label TLD."""
    labels = domain.lower().split(".")
    if len(labels) >= 3 and ".".join(labels[-2:]) in TWO_LEVEL_SUFFIXES:
        return labels[-3], ".".join(labels[-2:])
    return labels[-2], labels[-1]


def _valid_label(label: str) -> bool:
    return 1 < len(label) <= 63 and not label.startswith("-") and not label.endswith("-") and all(c in _VALID for c in label)


def _variants(sld: str) -> Dict[str, Set[str]]:
    out: Dict[str, Set[str]] = {t: set() for t in TECHNIQUE_ORDER}
    n = len(sld)
    for i in range(n):
        if n >= 4:
            out["omission"].add(sld[:i] + sld[i + 1:])
        out["repetition"].add(sld[:i] + sld[i] + sld[i:])
        for k in _KEYBOARD.get(sld[i], ""):
            out["replacement"].add(sld[:i] + k + sld[i + 1:])
            out["insertion"].add(sld[:i] + k + sld[i:])
            out["insertion"].add(sld[:i + 1] + k + sld[i + 1:])
        for g in _ASCII_HOMOGLYPHS.get(sld[i], []):
            out["homoglyph"].add(sld[:i] + g + sld[i + 1:])
        for g in _IDN_HOMOGLYPHS.get(sld[i], []):
            out["homoglyph-idn"].add(sld[:i] + g + sld[i + 1:])
        if sld[i] in _VOWELS:
            for v in _VOWELS:
                if v != sld[i]:
                    out["vowel-swap"].add(sld[:i] + v + sld[i + 1:])
        if 0 < i < n:
            out["hyphenation"].add(sld[:i] + "-" + sld[i:])
        if i + 1 < n and sld[i] != sld[i + 1]:
            out["transposition"].add(sld[:i] + sld[i + 1] + sld[i] + sld[i + 2:])
        for bit in range(8):
            flipped = chr(ord(sld[i]) ^ (1 << bit))
            if flipped in _VALID and flipped != sld[i] and flipped.lower() == flipped:
                out["bitsquat"].add(sld[:i] + flipped + sld[i + 1:])
    for word in LURE_WORDS:
        out["combo"].add(f"{sld}-{word}")
        out["combo"].add(f"{word}-{sld}")
        out["combo"].add(f"{sld}{word}")
    return out


def generate(
    domain: str,
    official_domains: Iterable[str] = (),
    limit: int = 300,
    techniques: Optional[Sequence[str]] = None,
) -> List[Candidate]:
    """
    Candidate lookalikes for `domain`, deduplicated, never including an official domain, capped at `limit`
    in technique-priority order. Raises UnsafeTarget if `domain` itself is not a valid public name.
    """
    base = normalize_hostname(domain)
    sld, suffix = split_domain(base)
    official = {normalize_hostname(d) for d in official_domains if d} | {base}
    wanted = [t for t in TECHNIQUE_ORDER if not techniques or t in techniques]

    found: List[Candidate] = []
    seen: Set[str] = set()

    def add(name: str, technique: str) -> None:
        try:
            host = normalize_hostname(name)
        except UnsafeTarget:
            return
        if host in official or host in seen:
            return
        seen.add(host)
        found.append(Candidate(host, technique))

    variants = _variants(sld)
    for technique in wanted:
        if technique == "tld-swap":
            for tld in COMMON_TLDS:
                if tld != suffix:
                    add(f"{sld}.{tld}", "tld-swap")
            continue
        for label in sorted(variants.get(technique, ())):
            if technique == "homoglyph-idn":
                try:
                    puny = idna.encode(label, uts46=False).decode("ascii")
                except idna.IDNAError:
                    continue
                add(f"{puny}.{suffix}", technique)
            elif _valid_label(label):
                add(f"{label}.{suffix}", technique)
                if technique == "combo":
                    add(f"{label}.com", technique)
    return found[: max(0, limit)]
