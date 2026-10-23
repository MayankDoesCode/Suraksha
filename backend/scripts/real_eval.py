"""Real-data evaluation: collect live look-alike candidates, label them by hand, score the models.

  1) collect:  python -m backend.scripts.real_eval collect --base http://localhost:5000 --out real_candidates.csv
  2) open the CSV, fill the `label` column with: impersonator | official | unrelated
  3) evaluate: python -m backend.scripts.real_eval evaluate --labels real_candidates.csv

Candidates come from the live /social/monitor scan (already scored > 0), so recall is measured among
surfaced candidates only. Labels are the evaluator's own; report the label count and say so.
"""
import argparse, csv, json, os, sys, urllib.request
from datetime import datetime, timezone

BRANDS = ["Paytm", "HDFC Bank", "Zomato", "Swiggy", "PhonePe", "Flipkart", "Airtel", "Jio", "Zerodha",
          "PayPal", "Binance", "Amazon", "Netflix", "Instagram", "Coinbase"]
FIELDS = ["brand", "platform", "handle", "display_name", "profile_url", "score", "severity", "label"]


def collect(a):
    rows = []
    for b in (a.brands or BRANDS):
        req = urllib.request.Request(a.base.rstrip("/") + "/api/v1/social/monitor", method="POST",
                                     data=json.dumps({"brand_profile": {"name": b}}).encode(),
                                     headers={"Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))["data"]
        except Exception as e:
            print(f"  {b}: failed ({e})"); continue
        got = d["flagged"][: a.per_brand]
        print(f"  {b}: scanned {d['scanned']}, kept {len(got)}")
        rows += [{"brand": b, **{k: r.get(k, "") for k in FIELDS[1:7]}, "label": ""} for r in got]
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, FIELDS); w.writeheader(); w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {a.out}. Fill the `label` column, then run evaluate.")


def core(handle):
    """Strip platform suffixes so models score the name, not '.bsky.social' / '@instance'."""
    h = handle.split("@")[0] if "@" in handle[1:] else handle
    for suf in (".bsky.social", ".bandcamp.com", ".com", ".org", ".invalid"):
        if h.lower().endswith(suf):
            h = h[: -len(suf)]
    return h


def prf(y, p):
    tp = sum(1 for a, b in zip(y, p) if a and b); fp = sum(1 for a, b in zip(y, p) if not a and b)
    fn = sum(1 for a, b in zip(y, p) if a and not b)
    pr = tp / (tp + fp) if tp + fp else 0.0; rc = tp / (tp + fn) if tp + fn else 0.0
    return {"precision": round(pr, 3), "recall": round(rc, 3), "f1": round(2 * pr * rc / (pr + rc), 3) if pr + rc else 0.0,
            "tp": tp, "fp": fp, "fn": fn}


def evaluate(a):
    from backend.app.ml.lookalike_service import predict_lookalike
    from backend.scripts.train_lookalike_model import features, rule_baseline
    import numpy as np
    rows = [r for r in csv.DictReader(open(a.labels, encoding="utf-8")) if (r["label"] or "").strip().lower() in ("impersonator", "official", "unrelated")]
    # Official accounts are excluded by the brand allowlist in the real product, so they are not scored here.
    n_official = sum(r["label"].strip().lower() == "official" for r in rows)
    rows = [r for r in rows if r["label"].strip().lower() != "official"]
    if len(rows) < 20:
        sys.exit(f"Only {len(rows)} labelled rows; label at least 20 (aim for 150).")
    y = [r["label"].strip().lower() == "impersonator" for r in rows]
    if a.rescore:  # re-run the current detector offline on handle + display name (reflects code changes)
        from backend.app.detection.social_detector import SocialDetector
        det = SocialDetector()
        for r in rows:
            o = det.evaluate_full({"candidate_name": r["handle"], "display_name": r["display_name"],
                                   "platform": r["platform"], "source_url": r["profile_url"], "asset_type": "social"}, {"name": r["brand"]})
            r["score"] = o.risk_evaluation.total_score
    app = [float(r["score"]) >= a.threshold for r in rows]
    ml_p = []
    for r in rows:
        out = predict_lookalike(core(r["handle"]), r["brand"], [r["brand"]])
        ml_p.append(float(out.get("probability", 0.0)))
    ml = [p >= 0.5 for p in ml_p]
    rule = [bool(v) for v in rule_baseline(np.array([features(core(r["handle"]), r["brand"]) for r in rows]))]
    res = {"evaluated_at": datetime.now(timezone.utc).isoformat(), "n_labelled": len(rows), "n_impersonator": sum(y), "official_excluded": n_official,
           "app_score_threshold": a.threshold, "suraksha_detector": prf(y, app), "lookalike_model": prf(y, ml),
           "string_rule_baseline": prf(y, rule),
           "note": "Real handles from live scans, hand-labelled by the evaluator; candidates are those the scan surfaced (score>0)."}
    errs = [(r, "false positive" if not t else "missed") for r, t, p in zip(rows, y, app) if t != p]
    json.dump(res, open(a.out_json, "w"), indent=2)
    with open(a.out_md, "w", encoding="utf-8") as f:
        f.write(f"# Real-data evaluation\n\n{len(rows)} hand-labelled live handles ({sum(y)} impersonators).\n\n"
                "| Method | Precision | Recall | F1 | TP | FP | FN |\n|---|---|---|---|---|---|---|\n")
        for k, n in (("suraksha_detector", f"Suraksha detector (score >= {a.threshold:g})"), ("lookalike_model", "Look-alike ML model"), ("string_rule_baseline", "String-similarity rule")):
            m = res[k]; f.write(f"| {n} | {m['precision']} | {m['recall']} | {m['f1']} | {m['tp']} | {m['fp']} | {m['fn']} |\n")
        f.write("\n## Errors of the Suraksha detector\n\n| Brand | Handle | Score | Label | Error |\n|---|---|---|---|---|\n")
        for r, kind in errs[:40]:
            f.write(f"| {r['brand']} | {r['handle']} | {r['score']} | {r['label']} | {kind} |\n")
        f.write("\nLimits: labels by one evaluator; candidates limited to what the live scan surfaced.\n")
    print(json.dumps({k: res[k] for k in ("n_labelled", "suraksha_detector", "lookalike_model", "string_rule_baseline")}, indent=2))
    print(f"Wrote {a.out_md} and {a.out_json}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect"); c.add_argument("--base", default="http://localhost:5000"); c.add_argument("--out", default="real_candidates.csv")
    c.add_argument("--brands", nargs="*"); c.add_argument("--per-brand", type=int, default=12, dest="per_brand"); c.set_defaults(fn=collect)
    e = sub.add_parser("evaluate"); e.add_argument("--labels", default="real_candidates.csv"); e.add_argument("--threshold", type=float, default=40.0); e.add_argument("--rescore", action="store_true")
    e.add_argument("--out-md", default="docs/REAL_EVAL.md", dest="out_md"); e.add_argument("--out-json", default="docs/real_eval.json", dest="out_json"); e.set_defaults(fn=evaluate)
    a = ap.parse_args(); a.fn(a)
