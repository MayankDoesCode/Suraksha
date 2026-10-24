"""
Collect public Bluesky / Mastodon accounts that might impersonate a protected brand, as an UNLABELLED review queue.

Nothing here assigns a label. Every row is written with an empty `label`, `reviewer_id` and `evidence_summary`; a human
reviewer fills them in following docs/LABELING_PROTOCOL.md, then the existing tooling validates and evaluates:

    python -m backend.app.ml.impersonation_eval --kind social --annotations <queue.csv> --registry <registry.csv>

Inputs
  --registry   brand registry CSV (template: backend/app/ml/data/annotations/templates/brand_registry_template.csv).
               Official handles come from here, so registry rows must themselves be verified from the brand's own site.
Outputs (all under data/, which is git-ignored because profiles are personal data)
  data/raw/social_candidates/<run_id>/<platform>_<n>.json   untouched API responses (immutable)
  data/manifests/social_candidates_<run_id>.json            queries, timestamps, HTTP status, sha256 of every raw file
  data/processed/social_review_queue.csv                    one row per account in the annotation schema (appended,
                                                            de-duplicated by platform + handle; existing rows untouched)

Access: only the platforms' public, unauthenticated search endpoints already used by the live monitor
(Bluesky AppView `app.bsky.actor.searchActors`, Mastodon `GET /api/v2/search?type=accounts`). Requests are throttled.
Profiles are public but still personal data: keep the outputs private and delete them when the study ends.

    python -m backend.scripts.collect_social_candidates --registry path/to/registry.csv [--per-query 25] [--mastodon-instance mastodon.social]
"""
import argparse
import csv
import hashlib
import json
import os
import time
from datetime import datetime, timezone

import pandas as pd

from backend.app.intel.social_sources import UA, TIMEOUT
from backend.app.ml.annotations import _EMAIL_RE, SOCIAL_COLUMNS, identity_key, parse_registry

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")
QUEUE = os.path.join(DATA, "processed", "social_review_queue.csv")
QUERY_SUFFIXES = ["", " support", " help", " official", " care"]
PAUSE_S = 1.0

ENDPOINTS = {
    "bluesky": lambda inst: ("https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors", "q", {"limit": None}),
    "mastodon": lambda inst: (f"https://{inst}/api/v2/search", "q", {"type": "accounts", "limit": None}),
}
PERMISSION = {
    "bluesky": "Bluesky public AppView API (app.bsky.actor.searchActors), unauthenticated, throttled; public profile data",
    "mastodon": "Mastodon instance public search API (/api/v2/search type=accounts), unauthenticated, throttled; public profile data",
}


def normalize(platform, account, instance):
    if platform == "bluesky":
        handle = account.get("handle", "")
        return {"username": handle, "display_name": account.get("displayName", ""), "bio_text": account.get("description", ""),
                "profile_url": f"https://bsky.app/profile/{handle}",
                "meta": {"did": account.get("did"), "created_at": account.get("createdAt"), "avatar_url": account.get("avatar"),
                         "labels": account.get("labels")}}
    return {"username": account.get("acct", ""), "display_name": account.get("display_name", ""), "bio_text": account.get("note", ""),
            "profile_url": account.get("url", ""),
            "meta": {"id": account.get("id"), "created_at": account.get("created_at"), "followers_count": account.get("followers_count"),
                     "following_count": account.get("following_count"), "statuses_count": account.get("statuses_count"),
                     "bot": account.get("bot"), "avatar_url": account.get("avatar"), "instance": instance}}


def official_handles(entry):
    return {(h["platform"], h["handle"].lower()) for h in entry.social_handles}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--registry", required=True)
    ap.add_argument("--per-query", type=int, default=25)
    ap.add_argument("--mastodon-instance", default="mastodon.social")
    ap.add_argument("--platforms", default="bluesky,mastodon")
    args = ap.parse_args()

    registry = parse_registry(pd.read_csv(args.registry, dtype=str).fillna(""))
    if not registry:
        raise SystemExit("Registry has no brands.")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_dir = os.path.join(DATA, "raw", "social_candidates", run_id)
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(os.path.dirname(QUEUE), exist_ok=True)
    os.makedirs(os.path.join(DATA, "manifests"), exist_ok=True)

    existing = set()
    if os.path.exists(QUEUE):
        with open(QUEUE, newline="", encoding="utf-8") as fh:
            existing = {identity_key("social", r) for r in csv.DictReader(fh)}

    manifest = {"run_id": run_id, "started_at": datetime.now(timezone.utc).isoformat(), "registry": os.path.abspath(args.registry),
                "requests": [], "rows_added": 0, "rows_skipped_duplicate": 0, "failures": []}
    new_rows, n = [], 0
    for entry in registry.values():
        officials = official_handles(entry)
        for platform in [p.strip() for p in args.platforms.split(",") if p.strip()]:
            url, qkey, extra = ENDPOINTS[platform](args.mastodon_instance)
            for suffix in QUERY_SUFFIXES:
                query = f"{entry.brand_name}{suffix}"
                params = {qkey: query, **{k: (args.per_query if v is None else v) for k, v in extra.items()}}
                observed = datetime.now(timezone.utc).isoformat()
                n += 1
                rec = {"platform": platform, "query": query, "url": url, "params": params, "observed_at_utc": observed}
                try:
                    r = requests.get(url, params=params, headers=UA, timeout=TIMEOUT)
                    rec["http_status"] = r.status_code
                    raw_path = os.path.join(raw_dir, f"{platform}_{n:04d}.json")
                    with open(raw_path, "wb") as fh:
                        fh.write(r.content)
                    rec["raw_file"] = os.path.relpath(raw_path, ROOT)
                    rec["sha256"] = hashlib.sha256(r.content).hexdigest()
                    r.raise_for_status()
                    body = r.json()
                    accounts = body.get("actors", []) if platform == "bluesky" else body.get("accounts", [])
                    rec["accounts_returned"] = len(accounts)
                except Exception as e:  # recorded, never silently dropped
                    rec["error"] = f"{type(e).__name__}: {str(e)[:200]}"
                    manifest["failures"].append(rec)
                    manifest["requests"].append(rec)
                    time.sleep(PAUSE_S)
                    continue
                manifest["requests"].append(rec)
                for acc in accounts:
                    norm = normalize(platform, acc, args.mastodon_instance)
                    row = {c: "" for c in SOCIAL_COLUMNS}
                    row.update({
                        "platform": platform, "brand_name": entry.brand_name, "profile_url": norm["profile_url"],
                        "username": norm["username"], "display_name": norm["display_name"], "bio_text": _EMAIL_RE.sub("[email removed]", norm["bio_text"] or ""),  # data minimisation; raw file keeps the original
                        "profile_metadata_json": json.dumps({**norm["meta"], "search_query": query, "raw_file": rec["raw_file"],
                                                             # a hint for the reviewer only; it is not a label
                                                             "in_official_registry": (platform, norm["username"].lower().lstrip("@")) in officials}),
                        "observed_at_utc": observed, "source_type": "public_api_search", "source_url": norm["profile_url"],
                        "permission_basis": PERMISSION[platform], "split_group": f"{platform}:{norm['username'].lower().lstrip('@')}",
                    })
                    row["candidate_id"] = "soc-" + hashlib.sha256(f"{entry.brand_name}|{row['split_group']}".encode()).hexdigest()[:16]
                    key = identity_key("social", row)
                    if key in existing:
                        manifest["rows_skipped_duplicate"] += 1
                        continue
                    existing.add(key)
                    new_rows.append(row)
                time.sleep(PAUSE_S)

    write_header = not os.path.exists(QUEUE)
    with open(QUEUE, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=SOCIAL_COLUMNS)
        if write_header:
            w.writeheader()
        w.writerows(new_rows)
    manifest["rows_added"] = len(new_rows)
    manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
    manifest["note"] = "Rows are unlabelled candidates. Name similarity in a search result is not evidence of impersonation."
    with open(os.path.join(DATA, "manifests", f"social_candidates_{run_id}.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(json.dumps({k: manifest[k] for k in ("run_id", "rows_added", "rows_skipped_duplicate")} | {"requests": len(manifest["requests"]), "failures": len(manifest["failures"]), "queue": QUEUE}, indent=1))


if __name__ == "__main__":
    main()
