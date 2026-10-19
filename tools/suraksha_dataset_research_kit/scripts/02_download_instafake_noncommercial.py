"""Download the InstaFake Instagram fake/automated-account research dataset.

The dataset is published under CC BY-NC 4.0. This downloader requires an
explicit --confirm-noncommercial opt-in and is NOT for production/commercial
training or bundling in SURAKSHA releases without separate permission.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import requests
from common import ensure_root, safe_extract_zip, sha256_file, utc_now, write_json

URL = "https://github.com/fcakyon/instafake-dataset/archive/refs/heads/master.zip"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    parser.add_argument("--confirm-noncommercial", action="store_true", help="Confirm this run is limited to permitted non-commercial use.")
    args = parser.parse_args()
    if not args.confirm_noncommercial:
        parser.error("InstaFake is CC BY-NC 4.0. Re-run only for non-commercial research with --confirm-noncommercial; do not ship these data/model artifacts commercially without permission.")

    root = ensure_root(args.output_root)
    raw_dir = root / "raw" / "instafake"
    raw_dir.mkdir(parents=True, exist_ok=True)
    zip_path = raw_dir / "instafake-dataset-master.zip"
    with requests.get(URL, timeout=90, stream=True, headers={"User-Agent": "SURAKSHA-Research-Dataset-Collector/1.0"}) as response:
        response.raise_for_status()
        with zip_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    extract_dir = raw_dir / "source"
    extract_dir.mkdir(parents=True, exist_ok=True)
    safe_extract_zip(zip_path, extract_dir)
    manifest = {
        "dataset": "InstaFake Dataset: Instagram fake and automated account detection",
        "source_url": "https://github.com/fcakyon/instafake-dataset",
        "download_url": URL,
        "license": "CC BY-NC 4.0 (Attribution-NonCommercial)",
        "collection_period_reported_by_authors": "second half of 2018",
        "purpose": "Research-only benchmark for generic fake-account and automated-account classification; NOT a brand-impersonation-labelled dataset.",
        "commercial_use": "Not permitted by the stated license without separate permission. Do not include the raw dataset or a model trained on it in a commercial product release without legal review/permission.",
        "archive_sha256": sha256_file(zip_path),
        "retrieved_at_utc": utc_now(),
        "explicit_noncommercial_confirmation": True,
    }
    write_json(root / "manifests" / "instafake_manifest.json", manifest)
    print(f"Downloaded and extracted research-only dataset under {raw_dir}")
    print("Next: run scripts/03_prepare_instafake.py --confirm-noncommercial")

if __name__ == "__main__":
    main()
