"""
Annotation validation + impersonation evaluation harness.

All data below is SYNTHETIC plumbing fixtures. Nothing here measures real-world
detection quality and no number from these tests may be quoted as a result.
"""

import json
from pathlib import Path

import pandas as pd
import pytest

from backend.app.ml.annotations import (
    APP_COLUMNS,
    REGISTRY_COLUMNS,
    SOCIAL_COLUMNS,
    assign_split,
    parse_registry,
    validate_annotations,
)
from backend.app.ml.impersonation_eval import DEFAULT_THRESHOLD, evaluate, run

REPO = Path(__file__).resolve().parents[2]
TEMPLATES = REPO / "backend" / "app" / "ml" / "data" / "annotations" / "templates"
N_OFFICIAL = 25


def registry_frame():
    handles = ";".join(f"instagram:acmefinance_off{i}" for i in range(N_OFFICIAL))
    pkgs = ";".join(f"com.acmefinance.app{i}" for i in range(N_OFFICIAL))
    return pd.DataFrame([{
        "brand_name": "Acme Finance", "official_domains": "acmefinance.com", "official_social_handles": handles,
        "official_android_package_ids": pkgs, "official_ios_bundle_ids": "", "official_profile_source_url": "https://acmefinance.com/social",
        "official_app_source_url": "https://acmefinance.com/apps", "verified_by": "rev1", "verified_at_utc": "2026-08-01T00:00:00Z", "notes": "SYNTHETIC",
    }])


REGISTRY = parse_registry(registry_frame())
BASE = {"observed_at_utc": "2026-09-01T10:00:00Z", "reviewed_at_utc": "2026-09-02T10:00:00Z", "source_type": "analyst_submission",
        "source_url": "https://example.org/evidence", "label_confidence": "0.9", "reviewer_id": "rev1",
        "evidence_summary": "SYNTHETIC: reviewer confirmed cross-link evidence", "permission_basis": "synthetic test fixture"}


def social_row(i, label, **over):
    row = {c: "" for c in SOCIAL_COLUMNS}
    row.update(BASE, candidate_id=f"s{i}", platform="instagram", brand_name="Acme Finance", label=label, split_group=f"g{i}")
    if label == "confirmed_impersonator":
        row.update(username=f"acmefinance_support{i}", display_name="Acme Finance Support", bio_text="Official helpdesk. Verify your account",
                   external_urls="https://acme-kyc-verify.xyz", profile_url=f"https://instagram.com/acmefinance_support{i}",
                   official_profile_source_url="https://acmefinance.com/social")
    elif label == "official_verified":
        row.update(username=f"acmefinance_off{i % N_OFFICIAL}", official_profile_source_url="https://acmefinance.com/social")
    else:
        row.update(username=f"tulipgarden{i}", display_name="Tulip Garden", bio_text="Flowers and bulbs")
    row.update(over)
    return row


def app_row(i, label, **over):
    row = {c: "" for c in APP_COLUMNS}
    row.update(BASE, candidate_id=f"a{i}", brand_name="Acme Finance", store_name="Google Play", label=label, split_group=f"g{i}")
    if label == "confirmed_impersonator":
        row.update(app_title="Acme Finance Secure Login", package_or_bundle_id=f"com.fraud.acmefinance{i}",
                   publisher_or_seller="Unknown Dev", app_description="Official Acme Finance banking login",
                   official_app_source_url="https://acmefinance.com/apps")
    elif label == "official_verified":
        row.update(app_title="Acme Finance", package_or_bundle_id=f"com.acmefinance.app{i % N_OFFICIAL}",
                   official_app_source_url="https://acmefinance.com/apps")
    else:
        row.update(app_title=f"Tulip Planner {i}", package_or_bundle_id=f"com.tulip.planner{i}", publisher_or_seller="Tulip Ltd")
    row.update(over)
    return row


def balanced_social(n=N_OFFICIAL):
    return pd.DataFrame([social_row(i, "confirmed_impersonator") for i in range(n)]
                        + [social_row(100 + i, "official_verified") for i in range(n)]
                        + [social_row(200 + i, "benign_unrelated") for i in range(n)])


def issues_for(frame, kind="social", registry=REGISTRY):
    rep = validate_annotations(frame, kind, registry=registry)
    return rep, {(i.field, i.severity) for i in rep.issues}


# ------------------------------------------------------------------ templates & registry
def test_repo_templates_match_schema():
    social = pd.read_csv(TEMPLATES / "social_annotations_template.csv", dtype=str)
    app = pd.read_csv(TEMPLATES / "app_annotations_template.csv", dtype=str)
    reg = pd.read_csv(TEMPLATES / "brand_registry_template.csv", dtype=str)
    assert list(social.columns) == SOCIAL_COLUMNS
    assert list(app.columns) == APP_COLUMNS
    assert list(reg.columns) == REGISTRY_COLUMNS
    assert validate_annotations(social, "social").ok and validate_annotations(app, "app").ok  # empty templates are valid


def test_parse_registry_builds_detector_profile():
    entry = REGISTRY["acme finance"]
    profile = entry.to_brand_profile()
    assert profile["name"] == "Acme Finance"
    assert profile["domains"][0]["domain"] == "acmefinance.com"
    assert {"platform": "instagram", "handle": "acmefinance_off0"} in profile["social_handles"]
    assert any(a["identifier"] == "com.acmefinance.app0" and a["platform"] == "android" for a in profile["app_identifiers"])


# ------------------------------------------------------------------ validation
def test_clean_fixture_passes_validation():
    rep = validate_annotations(balanced_social(), "social", registry=REGISTRY)
    assert rep.ok, [i.__dict__ for i in rep.errors]
    assert rep.trainable_rows == 3 * N_OFFICIAL
    assert set(rep.split_counts) <= {"train", "test"}


def test_missing_columns_reported():
    rep = validate_annotations(balanced_social().drop(columns=["split_group"]), "social")
    assert not rep.ok and "split_group" in rep.errors[0].message


@pytest.mark.parametrize("override,field", [
    ({"label": "fake"}, "label"),                                  # generic fake labels are not accepted
    ({"source_url": "javascript:alert(1)"}, "source_url"),
    ({"label_confidence": "1.7"}, "label_confidence"),
    ({"observed_at_utc": "not a date"}, "observed_at_utc"),
    ({"reviewed_at_utc": "2999-01-01T00:00:00Z"}, "reviewed_at_utc"),
    ({"reviewed_at_utc": "2026-08-01T00:00:00Z"}, "reviewed_at_utc"),   # reviewed before observed
    ({"evidence_summary": "looks fake"}, "evidence_summary"),
    ({"reviewer_id": ""}, "reviewer_id"),
    ({"permission_basis": ""}, "permission_basis"),
    ({"split_group": ""}, "split_group"),
    ({"official_profile_source_url": ""}, "official_profile_source_url"),
    ({"brand_name": "Unknown Brand"}, "brand_name"),
    ({"profile_metadata_json": "{oops"}, "profile_metadata_json"),
])
def test_invalid_positive_row_is_rejected(override, field):
    row = social_row(1, "confirmed_impersonator")
    row.update(override)
    rep, found = issues_for(pd.DataFrame([row]))
    assert (field, "error") in found, [i.__dict__ for i in rep.issues]
    assert not rep.ok


def test_duplicate_candidate_id():
    frame = pd.DataFrame([social_row(1, "confirmed_impersonator"), social_row(2, "benign_unrelated", candidate_id="s1")])
    _, found = issues_for(frame)
    assert ("candidate_id", "error") in found


def test_official_label_must_match_registry_and_impersonator_must_not():
    not_official = pd.DataFrame([social_row(1, "official_verified", username="someone_else")])
    assert ("label", "error") in issues_for(not_official)[1]
    really_official = pd.DataFrame([social_row(1, "confirmed_impersonator", username="acmefinance_off3")])
    rep, found = issues_for(really_official)
    assert ("label", "error") in found and "IS in the brand's official registry" in rep.errors[0].message


def test_conflicting_labels_and_split_leakage_for_same_account():
    frame = pd.DataFrame([
        social_row(1, "confirmed_impersonator", username="same_account", split_group="gA"),
        social_row(2, "benign_unrelated", username="same_account", split_group="gB"),
    ])
    rep, found = issues_for(frame)
    messages = " ".join(i.message for i in rep.errors)
    assert "Conflicting labels" in messages and "leakage" in messages


def test_triage_labels_are_warnings_and_not_trainable():
    frame = pd.DataFrame([social_row(1, "suspicious_unverified", evidence_summary="", split_group=""),
                          social_row(2, "unknown", evidence_summary="", split_group="")])
    rep = validate_annotations(frame, "social", registry=REGISTRY)
    assert rep.ok and rep.trainable_rows == 0
    assert len(rep.warnings) >= 2


def test_email_in_bio_warns_for_data_minimisation():
    frame = pd.DataFrame([social_row(1, "benign_unrelated", bio_text="contact me jane@example.com")])
    assert ("bio_text", "warning") in issues_for(frame)[1]


def test_split_assignment_is_deterministic_and_order_independent():
    groups = [f"group{i}" for i in range(2000)]
    first = {g: assign_split(g) for g in groups}
    assert first == {g: assign_split(g) for g in reversed(groups)}
    test_share = sum(v == "test" for v in first.values()) / len(first)
    assert 0.25 < test_share < 0.35
    assert assign_split("x", salt="a") in {"train", "test"}


def test_app_validation_requires_package_id():
    frame = pd.DataFrame([app_row(1, "confirmed_impersonator", package_or_bundle_id="")])
    rep, found = issues_for(frame, "app")
    assert ("package_or_bundle_id", "error") in found


# ------------------------------------------------------------------ evaluation harness
def test_invalid_annotations_produce_no_metrics():
    frame = balanced_social()
    frame.loc[0, "evidence_summary"] = ""
    rep = evaluate(frame, "social", REGISTRY, split="all")
    assert rep["status"] == "invalid_annotations" and rep["claims_allowed"] is False
    assert "overall" not in rep and rep["validation_errors"]


def test_no_adjudicated_data_is_reported_not_faked():
    frame = pd.DataFrame([social_row(1, "suspicious_unverified", evidence_summary="", split_group="")])
    rep = evaluate(frame, "social", REGISTRY, split="all")
    assert rep["status"] == "no_labelled_data" and rep["claims_allowed"] is False
    assert rep["not_scored"] == {"suspicious_unverified": 1}


def test_small_sample_is_flagged_insufficient():
    frame = pd.DataFrame([social_row(i, "confirmed_impersonator") for i in range(3)]
                         + [social_row(10 + i, "benign_unrelated") for i in range(3)])
    rep = evaluate(frame, "social", REGISTRY, split="all", n_boot=20)
    assert rep["status"] == "insufficient_data" and rep["claims_allowed"] is False
    assert rep["counts"]["positives"] == 3 and "debugging only" in rep["message"]


def test_rule_detectors_scored_with_separate_negative_subgroups():
    rep = evaluate(balanced_social(), "social", REGISTRY, split="all", n_boot=50)
    assert rep["status"] == "ok" and rep["claims_allowed"] is True
    assert rep["counts"] == {"positives": N_OFFICIAL, "official_verified": N_OFFICIAL, "benign_unrelated": N_OFFICIAL}
    official = rep["negative_subgroups"]["official_verified"]
    assert official["false_positives"] == 0 and official["excluded_by_official_match"] == N_OFFICIAL
    assert rep["negative_subgroups"]["benign_unrelated"]["false_positive_rate"] is not None
    assert rep["positives"]["recall"] > 0.9  # blatant synthetic impersonators: plumbing sanity only
    assert rep["overall"]["confusion_matrix"]["tp"] + rep["overall"]["confusion_matrix"]["fn"] == N_OFFICIAL
    assert rep["threshold"] == DEFAULT_THRESHOLD


def test_suspicious_and_unknown_rows_are_never_scored():
    frame = pd.concat([balanced_social(), pd.DataFrame([
        social_row(900, "suspicious_unverified", evidence_summary="", split_group=""),
        social_row(901, "unknown", evidence_summary="", split_group="")])], ignore_index=True)
    rep = evaluate(frame, "social", REGISTRY, split="all", n_boot=20)
    assert rep["not_scored"] == {"suspicious_unverified": 1, "unknown": 1}
    assert sum(rep["counts"].values()) == 3 * N_OFFICIAL


def test_default_split_is_the_frozen_test_split():
    rep = evaluate(balanced_social(), "social", REGISTRY, n_boot=20)
    assert rep["split"] == "test"
    assert sum(rep["counts"].values()) == rep["split_sizes"]["test"]
    assert rep["split_sizes"]["train"] + rep["split_sizes"]["test"] == 3 * N_OFFICIAL


def test_injected_predictor_is_used_and_official_match_is_respected():
    def always_flag(row, profile):
        return {"score": 99.0, "is_official": False, "signals": []}

    rep = evaluate(balanced_social(), "social", REGISTRY, predictor=always_flag, split="all", n_boot=20)
    assert rep["positives"]["recall"] == 1.0
    assert rep["negative_subgroups"]["benign_unrelated"]["false_positive_rate"] == 1.0
    assert rep["predictor"] == "always_flag"


def test_app_kind_end_to_end():
    frame = pd.DataFrame([app_row(i, "confirmed_impersonator") for i in range(N_OFFICIAL)]
                         + [app_row(100 + i, "official_verified") for i in range(N_OFFICIAL)]
                         + [app_row(200 + i, "benign_unrelated") for i in range(N_OFFICIAL)])
    rep = evaluate(frame, "app", REGISTRY, split="all", n_boot=50)
    assert rep["status"] == "ok"
    assert rep["negative_subgroups"]["official_verified"]["excluded_by_official_match"] == N_OFFICIAL
    assert rep["positives"]["detected"] > 0


def test_run_writes_report_file(tmp_path):
    ann, reg, out = tmp_path / "a.csv", tmp_path / "r.csv", tmp_path / "out" / "rep.json"
    balanced_social().to_csv(ann, index=False)
    registry_frame().to_csv(reg, index=False)
    rep = run("social", str(ann), str(reg), str(out), split="all", n_boot=20)
    assert out.exists() and json.loads(out.read_text())["status"] == rep["status"] == "ok"
