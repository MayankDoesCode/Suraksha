"""Fetch Apple App Store search candidates for manual official-app verification.

Search results are candidates, not ground-truth official labels. Verify bundle ID,
seller, and source against the brand's own official site/registry before accepting.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import requests
import pandas as pd
from common import ensure_root, utc_now, write_json

API = "https://itunes.apple.com/search"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    parser.add_argument("--country", default="us")
    parser.add_argument("--term", action="append", required=True, help="Repeat for each brand/app term")
    args = parser.parse_args()
    root = ensure_root(args.output_root)
    rows = []
    for term in args.term:
        response = requests.get(API, params={"term": term, "entity": "software", "country": args.country, "limit": 50}, timeout=45,
                                headers={"User-Agent": "SURAKSHA-AppReferenceResearch/1.0"})
        response.raise_for_status()
        payload = response.json()
        for item in payload.get("results", []):
            rows.append({
                "search_term": term,
                "country": args.country,
                "track_id": item.get("trackId", ""),
                "app_name": item.get("trackName", ""),
                "bundle_id": item.get("bundleId", ""),
                "seller_name": item.get("sellerName", ""),
                "seller_url": item.get("sellerUrl", ""),
                "app_store_url": item.get("trackViewUrl", ""),
                "artwork_url_reference_only": item.get("artworkUrl512", item.get("artworkUrl100", "")),
                "genre": item.get("primaryGenreName", ""),
                "version": item.get("version", ""),
                "source": "Apple iTunes Search API",
                "reference_status": "candidate_requires_official_verification",
                "ground_truth_label": "unknown",
                "retrieved_at_utc": utc_now(),
            })
    if not rows:
        raise SystemExit("No results returned; check network, term, and country.")
    frame = pd.DataFrame(rows).drop_duplicates(subset=["country", "track_id", "search_term"])
    out_path = root / "processed" / "itunes_app_candidates.csv"
    frame.to_csv(out_path, index=False)
    write_json(root / "manifests" / "itunes_candidates_manifest.json", {
        "dataset": "Apple App Store search candidates",
        "source_url": "https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/",
        "query_terms": args.term,
        "country": args.country,
        "rows_exported": int(len(frame)),
        "retrieved_at_utc": utc_now(),
        "label_policy": "Search results are not treated as confirmed official or benign. Manually cross-check seller and bundle ID with the brand's official source.",
        "terms_note": "Respect Apple's API terms. Artwork URLs are saved as references only; this script does not download artwork.",
    })
    print(f"Saved {len(frame):,} app candidates to {out_path}")

if __name__ == "__main__":
    main()
