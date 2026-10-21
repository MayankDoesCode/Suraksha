"""Search-term variants for a brand name: the attack patterns look-alike accounts and apps actually use."""
from typing import Iterable, List

SUFFIXES = ("support", "official", "help", "care", "app", "wallet", "pay", "rewards")


def variants(brand: str, extra: Iterable[str] = (), limit: int = 8) -> List[str]:
    b = brand.strip()
    squashed = b.replace(" ", "")
    low = squashed.lower()
    out = [b, squashed, f"{b} official", f"{b} support"]
    if len(low) > 3:
        out.append(low[1] + low[0] + low[2:])            # adjacent swap at the start
        out.append(low[:-1])                              # dropped last letter
        out.append(low.replace("o", "0", 1) if "o" in low else low.replace("l", "1", 1))  # digit swap
    out += [f"{squashed}{x}" for x in SUFFIXES[:3]]
    out += [str(e) for e in extra]
    seen, res = set(), []
    for q in out:
        if q and q.lower() not in seen:
            seen.add(q.lower()); res.append(q)
    return res[:limit]
