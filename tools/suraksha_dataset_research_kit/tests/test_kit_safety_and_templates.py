from __future__ import annotations
import csv
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from common import safe_extract_zip


class KitSafetyAndTemplateTests(unittest.TestCase):
    def test_templates_have_required_label_provenance_fields(self):
        social = ROOT / "templates" / "social_brand_impersonation_annotations.csv"
        app = ROOT / "templates" / "app_brand_impersonation_annotations.csv"
        for path in (social, app):
            with path.open(newline="", encoding="utf-8") as handle:
                header = next(csv.reader(handle))
            for field in ("candidate_id", "brand_name", "label", "source_url", "evidence_summary", "reviewer_id", "reviewed_at_utc"):
                self.assertIn(field, header, f"{path.name} missing {field}")

    def test_source_registry_warns_about_restricted_sources(self):
        path = ROOT / "templates" / "source_registry.csv"
        with path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        by_name = {row["source_name"]: row for row in rows}
        self.assertIn("CC BY-NC", by_name["InstaFake"]["license_or_terms"])
        self.assertIn("brand impersonation", by_name["InstaFake"]["do_not_use_for"].lower())
        self.assertIn("not instagram", by_name["TwiBot-22"]["do_not_use_for"].lower())

    def test_zip_extraction_blocks_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            archive_path = base / "bad.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("../escaped.txt", "bad")
            with self.assertRaises(ValueError):
                safe_extract_zip(archive_path, base / "extract")
            self.assertFalse((base / "escaped.txt").exists())

    def test_all_scripts_parse(self):
        for path in (ROOT / "scripts").glob("*.py"):
            compile(path.read_text(encoding="utf-8"), str(path), "exec")


if __name__ == "__main__":
    unittest.main()
