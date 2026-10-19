"""
Annotation schema, validation and frozen splits for brand-impersonation labels.

Applies docs/LABELING_PROTOCOL.md to the two reviewer-annotated tasks:
  * social_brand_impersonation  (kind="social")
  * app_brand_impersonation     (kind="app")

Generic fake/bot labels and malware labels are different targets and are never
accepted here. The validator checks completeness, consistency and provenance; it
cannot check that a label is factually right. That still needs independent review.
"""

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pandas as pd

ALLOWED_LABELS = {"confirmed_impersonator", "official_verified", "benign_unrelated", "suspicious_unverified", "unknown"}
POSITIVE_LABEL = "confirmed_impersonator"
NEGATIVE_LABELS = ("official_verified", "benign_unrelated")
TRAINABLE_LABELS = {POSITIVE_LABEL, *NEGATIVE_LABELS}

SOCIAL_COLUMNS = [
    "candidate_id", "platform", "brand_name", "profile_url", "username", "display_name", "bio_text", "external_urls",
    "profile_metadata_json", "profile_image_sha256", "observed_at_utc", "source_type", "source_url", "label",
    "label_confidence", "reviewer_id", "reviewed_at_utc", "evidence_summary", "official_profile_source_url",
    "permission_basis", "split_group",
]
APP_COLUMNS = [
    "candidate_id", "brand_name", "store_name", "listing_url", "package_or_bundle_id", "app_title", "publisher_or_seller",
    "app_description", "icon_sha256", "official_identifier_match", "observed_at_utc", "source_type", "source_url", "label",
    "label_confidence", "reviewer_id", "reviewed_at_utc", "evidence_summary", "official_app_source_url",
    "takedown_or_security_report_url", "permission_basis", "split_group",
]
REGISTRY_COLUMNS = [
    "brand_name", "official_domains", "official_social_handles", "official_android_package_ids",
    "official_ios_bundle_ids", "official_profile_source_url", "official_app_source_url", "verified_by",
    "verified_at_utc", "notes",
]

KIND_SPEC = {
    "social": {"columns": SOCIAL_COLUMNS, "url_cols": ["source_url", "profile_url", "official_profile_source_url"],
               "official_source_col": "official_profile_source_url"},
    "app": {"columns": APP_COLUMNS, "url_cols": ["source_url", "listing_url", "official_app_source_url", "takedown_or_security_report_url"],
            "official_source_col": "official_app_source_url"},
}
# Fields every adjudicated (trainable) row must carry.
TRAINABLE_REQUIRED = ["source_url", "evidence_summary", "reviewer_id", "reviewed_at_utc", "observed_at_utc",
                      "permission_basis", "split_group"]
MIN_EVIDENCE_CHARS = 20
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


@dataclass
class Issue:
    row: str
    field: str
    message: str
    severity: str = "error"


@dataclass
class ValidationReport:
    kind: str
    rows: int = 0
    issues: List[Issue] = field(default_factory=list)
    label_counts: Dict[str, int] = field(default_factory=dict)
    trainable_rows: int = 0
    split_counts: Dict[str, int] = field(default_factory=dict)

    @property
    def errors(self) -> List[Issue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> List[Issue]:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def ok(self) -> bool:
        return not self.errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "kind": self.kind, "ok": self.ok, "rows": self.rows, "label_counts": self.label_counts,
            "trainable_rows": self.trainable_rows, "split_counts": self.split_counts,
            "error_count": len(self.errors), "warning_count": len(self.warnings),
            "issues": [i.__dict__ for i in self.issues],
            "note": "Checks completeness, consistency and provenance only; label correctness needs independent review.",
        }


# --------------------------------------------------------------------------- registry
@dataclass
class BrandRegistryEntry:
    brand_name: str
    domains: List[str]
    social_handles: List[Dict[str, str]]  # {"platform": "...", "handle": "..."}
    app_ids: List[Dict[str, str]]         # {"platform": "...", "identifier": "..."}
    verified_by: str = ""
    verified_at_utc: str = ""

    def to_brand_profile(self) -> Dict[str, Any]:
        """Shape expected by the SURAKSHA detectors."""
        return {
            "name": self.brand_name,
            "domains": [{"domain": d, "is_primary": i == 0} for i, d in enumerate(self.domains)],
            "social_handles": [dict(h) for h in self.social_handles],
            "app_identifiers": [dict(a, app_name=self.brand_name) for a in self.app_ids],
        }


def _split_list(value: str) -> List[str]:
    return [p.strip() for p in re.split(r"[;|]", value or "") if p.strip()]


def parse_registry(frame: pd.DataFrame) -> Dict[str, BrandRegistryEntry]:
    """
    Official-asset registry. List cells are separated by ';'. Social handles are
    `platform:handle` (platform optional); app ids are plain package / bundle ids.
    """
    out: Dict[str, BrandRegistryEntry] = {}
    for _, r in frame.fillna("").astype(str).iterrows():
        name = r.get("brand_name", "").strip()
        if not name:
            continue
        handles = []
        for item in _split_list(r.get("official_social_handles", "")):
            platform, _, handle = item.rpartition(":")
            handles.append({"platform": platform.strip().lower(), "handle": handle.strip().lstrip("@")})
        apps = [{"platform": "android", "identifier": p.lower()} for p in _split_list(r.get("official_android_package_ids", ""))]
        apps += [{"platform": "ios", "identifier": p.lower()} for p in _split_list(r.get("official_ios_bundle_ids", ""))]
        out[name.lower()] = BrandRegistryEntry(
            brand_name=name, domains=[d.lower() for d in _split_list(r.get("official_domains", ""))],
            social_handles=handles, app_ids=apps, verified_by=r.get("verified_by", ""),
            verified_at_utc=r.get("verified_at_utc", ""),
        )
    return out


# --------------------------------------------------------------------------- helpers
def _is_http_url(value: str) -> bool:
    return bool(re.match(r"^https?://[^\s/$.?#][^\s]*$", value.strip(), re.I))


def _ts(value: str) -> Optional[pd.Timestamp]:
    if not value:
        return None
    ts = pd.to_datetime(value, utc=True, errors="coerce")
    return None if pd.isna(ts) else ts


def identity_key(kind: str, row: Dict[str, str]) -> str:
    """Stable identity of the annotated asset, used for duplicate / conflict / split-leakage checks."""
    if kind == "social":
        handle = (row.get("username") or "").strip().lower().lstrip("@")
        if not handle:
            handle = (row.get("profile_url") or "").strip().lower().rstrip("/")
        return f"{(row.get('platform') or '').strip().lower()}:{handle}"
    return f"{(row.get('store_name') or '').strip().lower()}:{(row.get('package_or_bundle_id') or '').strip().lower()}"


def assign_split(split_group: str, test_fraction: float = 0.3, salt: str = "suraksha-annotation-v1") -> str:
    """
    Deterministic, order-independent train/test assignment by split_group. A group's
    assignment never changes when rows are added, so a published test set stays frozen.
    """
    bucket = int(hashlib.sha256(f"{salt}:{split_group}".encode("utf-8")).hexdigest()[:8], 16) % 10_000
    return "test" if bucket < int(test_fraction * 10_000) else "train"


def _registry_membership(kind: str, row: Dict[str, str], entry: BrandRegistryEntry) -> bool:
    if kind == "social":
        user = (row.get("username") or "").strip().lower().lstrip("@")
        platform = (row.get("platform") or "").strip().lower()
        return any(h["handle"].lower() == user and (not h["platform"] or not platform or h["platform"] == platform)
                   for h in entry.social_handles if user)
    pkg = (row.get("package_or_bundle_id") or "").strip().lower()
    return bool(pkg) and any(a["identifier"] == pkg for a in entry.app_ids)


# --------------------------------------------------------------------------- validation
def load_annotations(path: str) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False).fillna("")


def validate_annotations(
    frame: pd.DataFrame,
    kind: str,
    registry: Optional[Dict[str, BrandRegistryEntry]] = None,
    now: Optional[datetime] = None,
    test_fraction: float = 0.3,
) -> ValidationReport:
    if kind not in KIND_SPEC:
        raise ValueError("kind must be 'social' or 'app'")
    spec = KIND_SPEC[kind]
    report = ValidationReport(kind=kind, rows=len(frame))
    now_ts = pd.Timestamp(now or datetime.now(timezone.utc))
    if now_ts.tzinfo is None:
        now_ts = now_ts.tz_localize("UTC")

    missing_cols = [c for c in spec["columns"] if c not in frame.columns]
    if missing_cols:
        report.issues.append(Issue("*", ",".join(missing_cols), f"Missing required columns: {missing_cols}"))
        return report

    frame = frame.fillna("").astype(str)
    report.label_counts = {str(k): int(v) for k, v in frame["label"].replace("", "(unlabelled)").value_counts().items()}
    seen_ids: Dict[str, int] = {}
    identities: Dict[str, List[Dict[str, str]]] = {}

    for idx, raw in frame.iterrows():
        row = {k: str(v).strip() for k, v in raw.items()}
        rid = row["candidate_id"] or f"row{idx + 2}"

        def err(fld: str, msg: str, sev: str = "error") -> None:
            report.issues.append(Issue(rid, fld, msg, sev))

        if not row["candidate_id"]:
            err("candidate_id", "candidate_id is empty")
        elif row["candidate_id"] in seen_ids:
            err("candidate_id", f"Duplicate candidate_id (first seen on row {seen_ids[row['candidate_id']] + 2})")
        else:
            seen_ids[row["candidate_id"]] = idx

        label = row["label"]
        if label and label not in ALLOWED_LABELS:
            err("label", f"Unknown label '{label}'. Allowed: {sorted(ALLOWED_LABELS)}")
        if not row["brand_name"]:
            err("brand_name", "brand_name is empty (every label is relative to one protected brand)")

        for col in spec["url_cols"]:
            if row.get(col) and not _is_http_url(row[col]):
                err(col, f"Not a valid http(s) URL: '{row[col][:60]}'")

        if row["label_confidence"]:
            try:
                if not 0.0 <= float(row["label_confidence"]) <= 1.0:
                    raise ValueError
            except ValueError:
                err("label_confidence", "Must be a number between 0 and 1")

        observed, reviewed = _ts(row["observed_at_utc"]), _ts(row["reviewed_at_utc"])
        for col, ts in (("observed_at_utc", observed), ("reviewed_at_utc", reviewed)):
            if row[col] and ts is None:
                err(col, f"Unparseable timestamp '{row[col]}'")
            elif ts is not None and ts > now_ts:
                err(col, "Timestamp is in the future")
        if observed is not None and reviewed is not None and reviewed < observed:
            err("reviewed_at_utc", "Reviewed before it was observed")

        if kind == "social":
            if not (row["username"] or row["profile_url"]):
                err("username", "Need a username or profile_url to identify the account")
            if _EMAIL_RE.search(row["bio_text"]):
                err("bio_text", "Contains an email address; remove personal data (data minimisation)", "warning")
            if row["profile_metadata_json"]:
                try:
                    import json
                    json.loads(row["profile_metadata_json"])
                except ValueError:
                    err("profile_metadata_json", "Not valid JSON")
        elif not row["package_or_bundle_id"] and label in TRAINABLE_LABELS:
            err("package_or_bundle_id", "Adjudicated app rows need a package / bundle id")

        if label in TRAINABLE_LABELS:
            report.trainable_rows += 1
            for col in TRAINABLE_REQUIRED:
                if not row[col]:
                    err(col, f"Required for adjudicated label '{label}'")
            if row["evidence_summary"] and len(row["evidence_summary"]) < MIN_EVIDENCE_CHARS:
                err("evidence_summary", f"Too short (<{MIN_EVIDENCE_CHARS} chars) to be reviewable evidence")
            if label in (POSITIVE_LABEL, "official_verified") and not row[spec["official_source_col"]]:
                err(spec["official_source_col"], f"'{label}' requires the official brand identity source URL")
            if not row["label_confidence"]:
                err("label_confidence", "Missing label_confidence", "warning")
            if row["split_group"]:
                report.split_counts[assign_split(row["split_group"], test_fraction)] = \
                    report.split_counts.get(assign_split(row["split_group"], test_fraction), 0) + 1

        if label in ("suspicious_unverified", "unknown"):
            err("label", f"'{label}' is a triage state: excluded from supervised training and evaluation", "warning")

        identities.setdefault(f"{row['brand_name'].lower()}|{identity_key(kind, row)}", []).append(row)

        if registry is not None and row["brand_name"]:
            entry = registry.get(row["brand_name"].lower())
            if entry is None:
                err("brand_name", f"Brand '{row['brand_name']}' is not in the official-asset registry")
            elif label == "official_verified" and not _registry_membership(kind, row, entry):
                err("label", "Labelled official_verified but the identifier is not in the brand's registry entry")
            elif label == POSITIVE_LABEL and _registry_membership(kind, row, entry):
                err("label", "Labelled confirmed_impersonator but the identifier IS in the brand's official registry")

    # Same asset annotated more than once: duplicates, label conflicts, split leakage.
    for key, rows in identities.items():
        if len(rows) < 2 or key.endswith("|:") or key.endswith(":"):
            continue
        ids = ", ".join(r["candidate_id"] for r in rows)
        labels = {r["label"] for r in rows if r["label"]}
        groups = {r["split_group"] for r in rows if r["split_group"]}
        if len(labels) > 1:
            report.issues.append(Issue(ids, "label", f"Conflicting labels {sorted(labels)} for the same asset '{key}'"))
        else:
            report.issues.append(Issue(ids, "candidate_id", f"Same asset annotated {len(rows)} times ('{key}')", "warning"))
        if len(groups) > 1:
            report.issues.append(Issue(ids, "split_group",
                                       f"Same asset appears in several split_groups {sorted(groups)}: train/test leakage risk"))
    return report
