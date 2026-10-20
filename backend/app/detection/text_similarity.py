"""Light, dependency-free text resemblance used for app-description checks."""
import math
import re
from collections import Counter

_STOP = {
    "the", "and", "for", "with", "your", "you", "our", "are", "app", "apps", "this",
    "that", "from", "all", "can", "get", "use", "new", "more", "now", "has", "have",
    "will", "not", "its", "any", "per", "via", "also", "into", "out", "one",
}
_TOKEN = re.compile(r"[a-z0-9]{3,}")


def _tokens(text):
    return [t for t in _TOKEN.findall((text or "").lower()) if t not in _STOP]


def cosine_similarity(a, b):
    """Bag-of-words cosine similarity in [0, 1]; 0.0 when either side is empty."""
    ca, cb = Counter(_tokens(a)), Counter(_tokens(b))
    if not ca or not cb:
        return 0.0
    dot = sum(ca[t] * cb[t] for t in ca.keys() & cb.keys())
    na = math.sqrt(sum(v * v for v in ca.values()))
    nb = math.sqrt(sum(v * v for v in cb.values()))
    return round(dot / (na * nb), 4) if na and nb else 0.0
