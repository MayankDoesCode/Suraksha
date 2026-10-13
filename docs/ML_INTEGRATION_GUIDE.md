# SURAKSHA — Machine Learning Risk Classification Architecture & Operations Guide

## 1. Architectural Overview

SURAKSHA operates as a **hybrid cyber-threat intelligence platform**. Rather than relying exclusively on brittle hardcoded rules or black-box predictions, SURAKSHA fuses:
1. **Deterministic Ground-Truth Checks**: Verifies official brand assets (registered package IDs, authorized developer accounts, official handles, registered primary domains) and strictly excludes verified assets from threat persistence with zero false positives.
2. **Deterministic Heuristic Detectors**: Computes explainable signals including Levenshtein edit distance, character leetspeak homoglyphs, brand keyword compounding, publisher mismatch, and external domain diversion.
3. **Fitted Machine Learning Classifier**: A scikit-learn pipeline utilizing a `FeatureUnion` of sublinear TF-IDF n-gram vectorization and standardized multimodal digital-risk features with a balanced `RandomForestClassifier`.
4. **Hybrid Risk Calibration**: Synthesizes the deterministic signal score and the continuous probability output of the ML model into an explainable composite risk score (`0.0 – 100.0`) mapped to industry standard severity tiers (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

```
                    Candidate Digital Asset
                             │
                             ▼
               ┌───────────────────────────┐
               │ Official Asset Exclusion  │──(Matches Official Asset)──► Excluded (0.0 Risk)
               └───────────────────────────┘
                             │ (Not Official)
                             ▼
              ┌─────────────────────────────┐
              │  Feature Extraction Engine  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────────┐      ┌─────────────────────────┐
   │ Deterministic Signal │      │ ML Risk Classifier      │
   │ Detectors (App/Soc)  │      │ (RandomForest Pipeline) │
   └──────────┬───────────┘      └────────────┬────────────┘
              │                               │
              ▼ (rule_score)                  ▼ (ml_risk_score, class, conf)
              └──────────────┬────────────────┘
                             ▼
               ┌───────────────────────────┐
               │   Hybrid Fusion Engine    │
               │ (60% Rule + 40% ML Blend) │
               └─────────────┬─────────────┘
                             ▼
               ┌───────────────────────────┐
               │ Deduplicated Persistence  │
               │ Findings, Signals, Evidence│
               └───────────────────────────┘
```

---

## 2. Dataset Specification & Limitations

### Dataset Location
- Versioned Bootstrap File: `backend/app/ai/data/threat_bootstrap_dataset.json`
- Dataset Version: `bootstrap-v1.0`

### Category Breakdown
The bootstrap dataset consists of **60 balanced, documented records** representing core digital-risk threat categories:
- **`legitimate_official`**: Official banking portals, verified developer apps, authenticated investor and customer relations channels.
- **`legitimate_third_party`**: Benign independent utilities, financial calculators, portfolio trackers, open-source tools with zero infringement intent.
- **`social_impersonation`**: High-risk customer support mimicry (`@acmefinance_support`, `@surakshabank_care_247`) appending authority tokens and linking to phishing destinations.
- **`unauthorized_app_publisher`**: Apps incorporating brand trademarks published by unauthorized third-party developers (`com.acmefinance.quickloan.apk`).
- **`lookalike_typo`**: Leetspeak character substitutions (`acm3finance.com`), repeated character typos, and hyphenated login portals.
- **`credential_phishing`**: Fake portals requesting netbanking MPIN, OTP, or crypto wallet seed phrases.

### Honest Disclosure of Data Origin & Limitations
> **IMPORTANT NOTICE:**  
> The development dataset is a version-controlled, synthetic bootstrap dataset curated to reflect realistic cybersecurity attack vectors.  
> It was NOT mined from unauthorized third-party victim feeds or production user data.  
> While structurally representative and split with stratified cross-validation, synthetic bootstrap data does not constitute proof of production-grade accuracy across all real-world edge cases. Ongoing retraining with verified analyst-reviewed findings is mandatory for long-term production use.

---

## 3. Feature Extraction Schema

The feature extraction module (`backend/app/ai/feature_extractor.py`) extracts a standardized 20-dimensional numeric vector alongside a synthetic text corpus:

| Feature Name | Type | Description |
|---|---|---|
| `name_similarity` | Float `[0.0, 1.0]` | Levenshtein edit similarity between candidate and brand |
| `exact_name_match` | Binary `{0.0, 1.0}` | Exact normalized match indicator |
| `contains_brand_name` | Binary `{0.0, 1.0}` | Substring containment of brand token in candidate string |
| `is_leet_match` | Binary `{0.0, 1.0}` | Leetspeak character homoglyph substitution match |
| `candidate_name_length`| Float | Character count of candidate identifier |
| `length_diff` | Float | Absolute character length difference from brand name |
| `suspicious_keyword_count` | Float | Count of high-risk authority tokens (`support`, `care`, `login`, `kyc`, `claims`, `verify`) |
| `has_suspicious_keyword` | Binary `{0.0, 1.0}` | Indicator of at least one detected trust keyword |
| `has_publisher` | Binary `{0.0, 1.0}` | Developer/Publisher metadata availability |
| `publisher_match` | Float `{-1.0, 0.0, 1.0}` | `1.0` if matches official publisher, `-1.0` if known mismatch, `0.0` if unknown |
| `publisher_similarity` | Float `[0.0, 1.0]` | Partial string similarity to official publisher identities |
| `has_url` | Binary `{0.0, 1.0}` | URL or destination link availability |
| `url_length` | Float | Character length of destination URL |
| `has_suspicious_tld` | Binary `{0.0, 1.0}` | Presence of high-abuse TLDs (`.xyz`, `.top`, `.tk`, `.buzz`, `.cc`, `.online`) |
| `domain_matches_official` | Float `{-1.0, 0.0, 1.0}` | `1.0` if matches verified domain, `-1.0` if external unverified, `0.0` if absent |
| `is_social` | Binary `{0.0, 1.0}` | Asset type categorical flag for social media profile |
| `is_mobile_app` | Binary `{0.0, 1.0}` | Asset type categorical flag for mobile app |
| `is_domain` | Binary `{0.0, 1.0}` | Asset type categorical flag for web domain |
| `has_description` | Binary `{0.0, 1.0}` | Description / profile bio metadata availability |
| `description_length` | Float | Character count of description / bio text |

---

## 4. How to Train the Model Locally

### Prerequisites
Ensure dependencies are installed:
```powershell
pip install -r backend/requirements.txt
```

### Run Training Script
From the repository root:
```powershell
python backend/scripts/train_risk_model.py
```

### Outputs Generated
- **Fitted Pipeline Artifact**: `backend/app/ai/models/risk_classifier_v1.joblib`
- **Model Metadata**: `backend/app/ai/models/model_metadata_v1.json`
- **Evaluation Report**: `backend/app/ai/models/evaluation_report.json`

### Model Evaluation Results (Test Split)
- **Model Algorithm**: `RandomForestClassifier(n_estimators=100, max_depth=6, class_weight='balanced', random_state=42)`
- **Feature Pipeline**: `FeatureUnion(TfidfVectorizer(max_features=80), StandardScaler())`
- **Test Accuracy**: `80.0%`
- **Test Precision (SUSPICIOUS)**: `100.0%`
- **Test Recall (SUSPICIOUS)**: `57.1%`
- **Test F1 Score**: `72.7%`
- **Baseline Classifier**: `46.7% Accuracy / 63.6% F1`

---

## 5. Hybrid Scoring Formula & Severity Mapping

### Mathematical Formula
When a non-official candidate asset is evaluated:
1. Deterministic signals produce `rule_score` (`0.0 – 100.0`).
2. If `rule_score == 0.0` and 0 signals fired (benign candidate with no trademark infringement), `final_risk_score = 0.0` and severity is `LOW`.
3. If rule signals fired, the ML pipeline produces `ml_risk_score` (`0.0 – 100.0`) based on `P(SUSPICIOUS) * 100`.
4. The composite score is computed using configurable weights:
   $$\text{final\_risk\_score} = \min\left(100.0, \; 0.60 \times \text{rule\_score} + 0.40 \times \text{ml\_risk\_score}\right)$$
5. Severity is assigned as:
   - **`CRITICAL`**: `final_risk_score >= 80.0`
   - **`HIGH`**: `50.0 <= final_risk_score < 80.0`
   - **`MEDIUM`**: `25.0 <= final_risk_score < 50.0`
   - **`LOW`**: `final_risk_score < 25.0`

### Deterministic Fallback Mode
If `risk_classifier_v1.joblib` is missing, damaged, or fails during inference:
- `ml_fallback_used` is set to `True`.
- `final_risk_score = rule_score`.
- `ml_predicted_class = "UNKNOWN"`.
- `ml_risk_score = None`.
- The system continues operating without downtime or silent fabrication.

---

## 6. How to Update the Dataset with Real Analyst Findings

To incrementally improve the model over time:
1. Export triaged findings with review statuses `CONFIRMED_THREAT` (labelled as `SUSPICIOUS`) and `FALSE_POSITIVE` (labelled as `LEGITIMATE`).
2. Append the records to `backend/app/ai/data/threat_bootstrap_dataset.json` ensuring fields match the schema.
3. Increment `DATASET_VERSION` (e.g. `v1.1-curated`) in `backend/scripts/train_risk_model.py`.
4. Re-run `python backend/scripts/train_risk_model.py`.
5. Run the test suite: `python -m pytest`.
