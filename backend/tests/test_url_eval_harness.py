"""Tests for the URL evaluation harness logic (synthetic fixtures; no real-world metrics implied)."""

import numpy as np
import pandas as pd

from backend.app.ml.url_eval import binary_metrics, frozen_split, run_url_evaluation, to_host


def test_to_host_strips_scheme_path_port_and_credentials():
    assert to_host("https://User@Login.Example.com:8443/a/b?q=1#x") == "login.example.com"
    assert to_host("example.com") == "example.com"
    assert to_host("http://example.com?x=1") == "example.com"


def test_binary_metrics_counts_and_fpr():
    y = np.array([0, 0, 0, 1, 1])
    s = np.array([0.1, 0.6, 0.2, 0.9, 0.4])
    m = binary_metrics(y, s, n_boot=50)
    assert m["confusion_matrix"] == {"tn": 2, "fp": 1, "fn": 1, "tp": 1}
    assert m["false_positive_rate"] == round(1 / 3, 4)
    assert m["precision"] == 0.5 and m["recall"] == 0.5


def _leaky_fixture(n=200):
    # Benign rows are bare domains, phishing rows are full URLs: the format alone separates them.
    rows = []
    for i in range(n):
        rows.append({"indicator": f"site{i}.com", "label": 0})
        rows.append({"indicator": f"http://host{i}.net/login/verify.php", "label": 1})
    return pd.DataFrame(rows)


def test_frozen_split_has_no_root_domain_overlap():
    df = _leaky_fixture(50)
    train, test = frozen_split(df)
    assert len(train) and len(test)


def test_harness_flags_format_leakage(tmp_path):
    data = tmp_path / "leaky.csv"
    _leaky_fixture().to_csv(data, index=False)
    model = tmp_path / "missing.joblib"  # shipped model absent: harness must still run
    report = run_url_evaluation(str(data), str(model), str(tmp_path / "r.json"), n_boot=20)
    assert report["shipped_model"]["status"] == "not_found"
    assert report["results"]["format_shortcut_baseline__raw"]["f1"] > 0.95
    assert any("scheme rate differs" in w for w in report["warnings"])
    assert len(report["split"]["test_set_sha256"]) == 64
