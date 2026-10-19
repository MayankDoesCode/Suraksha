"""Normalize InstaFake raw JSON without using the upstream helper's known field mix-up.

The upstream helper currently maps media_comments_are_disabled from the comment
count field; this extractor reads the explicit raw key instead and records it.
Outputs remain in a research_only directory because of CC BY-NC 4.0.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import pandas as pd
from common import ensure_root, sha256_file, utc_now, write_json


def read_records(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    raise ValueError(f"Expected list of account objects in {path}")


def first_value(d: dict, *keys, default=None):
    for key in keys:
        if key in d:
            return d[key]
    return default


def numeric(value):
    if value is None or isinstance(value, (list, dict)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def load_collection(base: Path, filename: str) -> list[dict]:
    matches = list(base.rglob(filename))
    if not matches:
        return []
    if len(matches) > 1:
        # Prefer the repository's documented version path deterministically.
        matches = sorted(matches, key=lambda p: ("data" not in p.parts, str(p)))
    return read_records(matches[0])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    parser.add_argument("--confirm-noncommercial", action="store_true")
    args = parser.parse_args()
    if not args.confirm_noncommercial:
        parser.error("InstaFake is CC BY-NC 4.0; specify --confirm-noncommercial for permitted research-only preparation.")
    root = ensure_root(args.output_root)
    base = root / "raw" / "instafake" / "source"
    if not base.exists():
        raise SystemExit(f"Missing {base}. Run scripts/02_download_instafake_noncommercial.py first.")

    fake_rows, real_rows = [], []
    for raw, label in ((load_collection(base, "fakeAccountData.json"), 1), (load_collection(base, "realAccountData.json"), 0)):
        for r in raw:
            followers = numeric(first_value(r, "userFollowerCount", "user_follower_count", default=0)) or 0.0
            following = numeric(first_value(r, "userFollowingCount", "user_following_count", default=0)) or 0.0
            fake_rows.append({
                "user_media_count": numeric(first_value(r, "userMediaCount", "user_media_count")),
                "user_follower_count": followers,
                "user_following_count": following,
                "user_has_profile_pic": numeric(first_value(r, "userHasProfilPic", "user_has_profil_pic", "user_has_profile_pic")),
                "user_is_private": numeric(first_value(r, "userIsPrivate", "user_is_private")),
                "user_biography_length": numeric(first_value(r, "userBiographyLength", "user_biography_length")),
                "username_length": numeric(first_value(r, "usernameLength", "username_length")),
                "username_digit_count": numeric(first_value(r, "usernameDigitCount", "username_digit_count")),
                "follower_following_ratio": followers / max(following, 1.0),
                "label_is_fake": label,
                "source_dataset": "InstaFake fake-v1.0",
            })

    automated_rows = []
    for raw, label in ((load_collection(base, "automatedAccountData.json"), 1), (load_collection(base, "nonautomatedAccountData.json"), 0)):
        for r in raw:
            followers = numeric(first_value(r, "userFollowerCount", "user_follower_count", default=0)) or 0.0
            following = numeric(first_value(r, "userFollowingCount", "user_following_count", default=0)) or 0.0
            upload_times = first_value(r, "mediaUploadTimes", "media_upload_times")
            # Preserve a simple count only; raw timestamps are not emitted as a personal timeline.
            upload_count = len(upload_times) if isinstance(upload_times, list) else numeric(upload_times)
            automated_rows.append({
                "user_media_count": numeric(first_value(r, "userMediaCount", "user_media_count")),
                "user_follower_count": followers,
                "user_following_count": following,
                "user_has_highlight_reels": numeric(first_value(r, "userHasHighlighReels", "userHasHighlightReels", "user_has_highlight_reels")),
                "user_has_external_url": numeric(first_value(r, "userHasExternalUrl", "user_has_url", "user_has_external_url")),
                "user_tags_count": numeric(first_value(r, "userTagsCount", "user_tags_count")),
                "follower_following_ratio": followers / max(following, 1.0),
                "user_biography_length": numeric(first_value(r, "userBiographyLength", "user_biography_length")),
                "username_length": numeric(first_value(r, "usernameLength", "username_length")),
                "username_digit_count": numeric(first_value(r, "usernameDigitCount", "username_digit_count")),
                "media_comment_numbers": numeric(first_value(r, "mediaCommentNumbers", "media_comment_numbers")),
                "media_comments_are_disabled": numeric(first_value(r, "mediaCommentsAreDisabled", "media_comments_are_disabled")),
                "media_has_location_info": numeric(first_value(r, "mediaHasLocationInfo", "media_has_location_info")),
                "media_hashtag_numbers": numeric(first_value(r, "mediaHashtagNumbers", "media_hashtag_numbers")),
                "media_like_numbers": numeric(first_value(r, "mediaLikeNumbers", "media_like_numbers")),
                "media_upload_time_count": numeric(upload_count),
                "label_is_automated": label,
                "source_dataset": "InstaFake automated-v1.0",
            })

    research_dir = root / "processed" / "research_only"
    research_dir.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for name, rows in (("instafake_fake_accounts.csv", fake_rows), ("instafake_automated_accounts.csv", automated_rows)):
        if not rows:
            raise SystemExit(f"No rows found for {name}. Check the downloaded source archive structure.")
        frame = pd.DataFrame(rows)
        path = research_dir / name
        frame.to_csv(path, index=False)
        outputs[name] = {"rows": int(len(frame)), "sha256": sha256_file(path), "label_counts": {str(k): int(v) for k, v in frame.iloc[:, -2].value_counts(dropna=False).to_dict().items()}}
        print(f"{path}: {len(frame):,} rows")

    write_json(root / "manifests" / "instafake_processed_manifest.json", {
        "dataset": "InstaFake Dataset",
        "license": "CC BY-NC 4.0",
        "research_only": True,
        "retrieved_at_utc": utc_now(),
        "upstream_source": "https://github.com/fcakyon/instafake-dataset",
        "processing_notes": [
            "Feature-only account records are anonymized according to upstream metadata; no account handles are introduced by this extractor.",
            "Generic fake/automated-account labels are not brand-impersonation labels.",
            "Rows have no stable account IDs for entity-grouped splitting; deduplicate exact feature rows and disclose this limitation in evaluation.",
            "The upstream helper appears to map media_comments_are_disabled from mediaCommentNumbers; this extractor reads mediaCommentsAreDisabled separately.",
        ],
        "outputs": outputs,
    })

if __name__ == "__main__":
    main()
