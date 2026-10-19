"""
Evaluate the rule-based domain detector on backend/app/ml/data/eval_set.json and print precision, recall and the
confusion matrix. A name counts as "flagged" when severity is MEDIUM or higher.

If eval_set.json is missing, a deterministic SYNTHETIC stub is built (100 suspicious / 100 legitimate, Indian brands,
including mixed-script lookalikes). Synthetic suspicious names come from the same kinds of tricks the detector
targets, so results on the stub are a regression check, NOT an estimate of real-world accuracy. Replace the stub with
reviewed real-world names to get a meaningful number.

    python -m backend.scripts.eval_detection
"""
import json
import os
import random
import sys

from backend.app.detection.domain_detector import DomainDetector
from backend.app.intel import permutations

EVAL_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "ml", "data", "eval_set.json")
BRANDS = [
    {"name": "State Bank of India", "domain": "sbi.co.in"}, {"name": "HDFC Bank", "domain": "hdfcbank.com"},
    {"name": "ICICI Bank", "domain": "icicibank.com"}, {"name": "Paytm", "domain": "paytm.com"},
    {"name": "PhonePe", "domain": "phonepe.com"}, {"name": "IRCTC", "domain": "irctc.co.in"},
]
UNRELATED = ["wikipedia.org", "python.org", "openstreetmap.org", "mozilla.org", "gnu.org", "archive.org", "kernel.org", "nature.com", "bbc.co.uk", "nasa.gov",
              "ted.com", "ubuntu.com", "debian.org", "apache.org", "rust-lang.org", "golang.org", "nginx.org", "postgresql.org", "sqlite.org", "wordpress.org"]
MIXED_SCRIPT = ["sbi।co.in", "hdfcbअnk.com", "іcicibank.com", "pаytm.com", "phonepe०.com", "irctc.co.in", "ѕbi.co.in", "hdfсbank.com"]


def build_stub(seed: int = 11) -> dict:
    rnd = random.Random(seed)
    suspicious, legit = [], []
    for b in BRANDS:
        cands = permutations.generate(b["domain"], [b["domain"]], limit=400)
        rnd.shuffle(cands)
        for c in cands[:17]:
            suspicious.append({"name": c.domain, "brand": b["name"], "brand_domain": b["domain"], "label": 1, "technique": c.technique})
    for i, d in enumerate(MIXED_SCRIPT):
        b = BRANDS[i % len(BRANDS)]
        suspicious.append({"name": d, "brand": b["name"], "brand_domain": b["domain"], "label": 1, "technique": "mixed-script"})
    suspicious = suspicious[:100]
    for i in range(100):
        b = BRANDS[i % len(BRANDS)]
        if i % 5 == 0:
            name = f"{rnd.choice(['mail', 'secure', 'help', 'careers'])}.{b['domain']}"  # the brand's own subdomain
        else:
            name = UNRELATED[i % len(UNRELATED)] if i < 60 else f"{rnd.choice(['garden', 'travel', 'books', 'cafe', 'yoga'])}{rnd.randint(10, 99)}.{rnd.choice(['com', 'in', 'org'])}"
        legit.append({"name": name, "brand": b["name"], "brand_domain": b["domain"], "label": 0, "technique": "legitimate"})
    return {"synthetic_stub": True, "note": "Synthetic. Regression check only; not a real-world accuracy estimate.", "items": suspicious + legit}


def brand_dict(item):
    return {"id": "eval", "name": item["brand"], "domains": [{"domain": item["brand_domain"], "is_primary": True}],
            "social_handles": [], "app_identifiers": [], "keywords": []}


def main() -> int:
    if not os.path.isfile(EVAL_PATH):
        os.makedirs(os.path.dirname(EVAL_PATH), exist_ok=True)
        json.dump(build_stub(), open(EVAL_PATH, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print("eval_set.json was missing: wrote a synthetic stub.")
    data = json.load(open(EVAL_PATH, encoding="utf8"))
    det = DomainDetector()
    tp = fp = tn = fn = 0
    misses = {}
    for it in data["items"]:
        out = det.evaluate_full({"asset_type": "domain", "candidate_name": it["name"], "source_url": "https://" + it["name"]}, brand_dict(it))
        score = 0.0 if out.is_official else float(out.risk_evaluation.total_score)
        flagged = score >= 25
        if it["label"] == 1:
            tp += flagged; fn += (not flagged)
            if not flagged:
                misses.setdefault(it["technique"], []).append(it["name"])
        else:
            fp += flagged; tn += (not flagged)
    p = tp / max(1, tp + fp); r = tp / max(1, tp + fn)
    print(f"synthetic_stub={data.get('synthetic_stub', False)}  n={len(data['items'])}")
    print(f"            pred+  pred-\nactual+   {tp:6d} {fn:6d}\nactual-   {fp:6d} {tn:6d}")
    print(f"precision={p:.3f} recall={r:.3f} f1={2 * p * r / max(1e-9, p + r):.3f}")
    for t, names in sorted(misses.items(), key=lambda kv: -len(kv[1])):
        print(f"  missed {t}: {len(names)} e.g. {names[:2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
