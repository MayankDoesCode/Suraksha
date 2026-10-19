"""Fetch F-Droid's published catalog index as a package-metadata reference.

IMPORTANT: catalog membership is NOT a cryptographic guarantee of benignness and
must not be used as an unreviewed malicious/benign training label.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import requests
import pandas as pd
from common import ensure_root, sha256_file, utc_now, write_json

URL = "https://f-droid.org/repo/index-v2.json"


def localized(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("en-US", "en", "en-GB"):
            if isinstance(value.get(key), str):
                return value[key]
        for v in value.values():
            if isinstance(v, str):
                return v
    return ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    args = parser.parse_args()
    root = ensure_root(args.output_root)
    raw_dir = root / "raw" / "fdroid"
    raw_dir.mkdir(parents=True, exist_ok=True)
    response = requests.get(URL, timeout=90, headers={"User-Agent": "SURAKSHA-Research-Dataset-Collector/1.0"})
    response.raise_for_status()
    raw_path = raw_dir / "index-v2.json"
    raw_path.write_bytes(response.content)
    doc = response.json()
    packages = doc.get("packages") or doc.get("repo", {}).get("packages", {})
    rows = []
    for package_id, entry in packages.items():
        if not isinstance(entry, dict):
            continue
        meta = entry.get("metadata", {}) or {}
        versions = entry.get("versions", {}) or {}
        version_rows = list(versions.values()) if isinstance(versions, dict) else []
        latest = version_rows[-1] if version_rows else {}
        manifest = latest.get("manifest", {}) if isinstance(latest, dict) else {}
        rows.append({
            "package_id": package_id,
            "app_name": localized(meta.get("name")),
            "summary": localized(meta.get("summary")),
            "description": localized(meta.get("description")),
            "license": localized(meta.get("license")),
            "author_name": localized(meta.get("authorName")),
            "web_site": meta.get("webSite", ""),
            "source_code": meta.get("sourceCode", ""),
            "issue_tracker": meta.get("issueTracker", ""),
            "categories": ";".join(meta.get("categories", [])) if isinstance(meta.get("categories"), list) else str(meta.get("categories", "")),
            "version_name": manifest.get("versionName", "") if isinstance(manifest, dict) else "",
            "version_code": manifest.get("versionCode", "") if isinstance(manifest, dict) else "",
            "catalog_url": f"https://f-droid.org/packages/{package_id}/",
            "source_dataset": "F-Droid repository index v2",
            "reference_status": "catalog_reference_not_security_verdict",
            "ground_truth_label": "unknown",
            "retrieved_at_utc": utc_now(),
        })
    out_path = root / "processed" / "fdroid_catalog_reference.csv"
    pd.DataFrame(rows).to_csv(out_path, index=False)
    write_json(root / "manifests" / "fdroid_manifest.json", {
        "dataset": "F-Droid repository index v2 metadata reference",
        "source_url": URL,
        "rows_exported": len(rows),
        "raw_index_sha256": sha256_file(raw_path),
        "retrieved_at_utc": utc_now(),
        "label_policy": "All records remain unknown/reference-only; catalog membership is not a malware or brand-impersonation label.",
        "terms_note": "Review F-Droid terms and individual app licenses before redistributing metadata/assets. No APK binaries or icons are copied by this script.",
    })
    print(f"Saved {len(rows):,} catalog references to {out_path}")

if __name__ == "__main__":
    main()
