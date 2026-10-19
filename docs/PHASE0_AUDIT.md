# SURAKSHA — Phase 0 Baseline Audit (2026-10-19)

Read-only audit of the working tree (including the uncommitted changes on `main`). No source code was changed. The only filesystem changes are this report and the dataset kit unpacked to `tools/suraksha_dataset_research_kit/`.

## 1. Architecture (verified)

- **Backend**: Flask app factory `backend/app/__init__.py`, served by `gunicorn backend.run:app --workers 2` (Procfile). SQLAlchemy + Alembic, repositories in `backend/app/repositories/`.
- **Detection flow**: `services/detection_service.py` runs the rule engine (`detection/`), then routes by asset type:
  - `domain` → URL phishing model (`ml/url_pipeline.py`)
  - `social` → InstaFake fake-account model (`ml/social_pipeline.py`)
  - `mobile_app` → heuristics only (no model)
  - anything else → generic RandomForest (`ai/risk_classifier.py`)
  - Final score = weighted average of the rule score and the ML score.
- **Frontend**: React/Vite/Tailwind. Firebase config is supplied as Vite build args (Dockerfile, render.yaml).

## 2. ML capabilities: what is actually true

| Model | Trained | Integrated | Reported metric reproduced? | Is the metric meaningful? |
|---|---|---|---|---|
| URL phishing (TF-IDF char + LR, 10k) | Yes | Yes (`domain` assets) | **Yes, exactly** (acc 0.9005, F1 0.9006, AUC 0.9563) | **No: mostly a format artifact** (see 2.1) |
| Social fake (LR, InstaFake 1,194) | Yes | Yes (`social` assets) | Not re-run yet | Generic fake/bot only, with a missing-data bias (see 2.2) |
| Generic RF risk classifier | Yes | Fallback for other types only | Metadata says acc 0.80 / F1 0.727 / recall 0.571 | 15 test samples: statistically meaningless |
| Mobile app impersonation | **No** (manifest: 0 verified impersonators) | Heuristics, honestly labelled | n/a | n/a |
| `ml/models/manifest.json` (candidate model) | No: stale "missing_labelled_data" | Used by `scan_service` `ml_assist` | n/a | n/a |

### 2.1 URL model: label leakage through input format (CONFIRMED)

The dataset `backend/app/ml/data/phishing_dataset.parquet` has 5,000 benign and 5,000 phishing records:
- **Benign rows**: 100% are bare Tranco domains (e.g. `kraken.com`). None has a scheme or a path. Mean length is 11.6 characters.
- **Phishing rows**: 48.6% are full URLs with a scheme and a path. Mean length is 40.4 characters.

Experiments on the same domain-grouped split (seed 42):
- **Shipped TF-IDF model**: F1 0.901, AUC 0.956.
- **4 format-only features** (length, has `/`, dot count, has `-`), no content at all: **F1 0.879, AUC 0.944**.
- **Same model retrained on hostname only**: F1 0.78, precision 0.89, recall 0.70, AUC 0.876. This is a more honest estimate for how the app actually calls the model, since it passes bare domains.

How the shipped model behaves on sample inputs:
- `https://docs.python.org/3/library/` → 0.93 phishing
- `https://www.github.com/...` → 0.86 phishing
- `https://paypal.com/signin` → 0.97 phishing
- `hdfc-netbanking-kyc.in` → 0.47 (below the phishing threshold)

**Conclusion:** the model has partly learned "a full URL looks like phishing". Its 90% metric should not be presented to judges.

### 2.2 Social model: two confirmed problems

1. **Missing metadata is treated as zero.** `extract_social_features` turns missing follower, following and media counts into 0. A bare username therefore looks like an empty fake account:
   - `johnsmith` (no metadata) → fake score 72.5
   - `hdfc_support_help` with healthy metadata → fake score 0
2. **Generic fake-ness is mixed into brand risk.** The fake score is fused 50/50 into the "brand impersonation" composite in `ml/service.py:predict_social_risk`, and then fused again in `detection_service`. This blends two different questions.

Licensing:
- InstaFake is **CC BY-NC 4.0**, yet its raw data is committed to Git (`backend/app/ml/data/instafake/`, 7.5 MB).
- A model trained on it is served from the public Render deployment.
- This is a licensing question for you to decide (non-commercial hackathon use is likely fine, but it should be documented).

## 3. Known issues: status

| Issue | Status |
|---|---|
| Transaction rollback | Addressed in uncommitted work (`test_repository_transactions.py`, passing). Not re-reviewed line by line yet. |
| API rate limiting | Addressed in uncommitted work (Flask-Limiter on scan and AI routes). **Caveat:** the default is `memory://` with 2 gunicorn workers, so limits are per worker (effectively doubled). It needs Redis or `RATELIMIT_STORAGE_URI` to be strict. |
| IDNA / Punycode / confusables | Present in `domain_detector.py` / `similarity.py` (`idna` decode/encode, confusable maps). Coverage not yet measured. |
| sklearn artifact compatibility | **Risk.** Local sklearn is 1.9.1, but requirements say `>=1.4.0` (unpinned). The joblib artifacts must be loaded with the same version they were pickled with. Pin the version. |
| Small / weak datasets | **Confirmed:** RF n=60; URL dataset has format leakage; no impersonation labels. |
| Calibration | **Confirmed missing.** Scores are raw `predict_proba × 100` and are shown as "confidence". |
| Specialized vs generic separation | Partly done. Separate pipelines exist, but the scores are blended by fixed weights. |
| Firebase / demo mode | Config is now delivered through build args. Not verified against production (out of scope). |

## 4. Tests

- Backend: **119 passed** (`pytest backend/tests`, 3.9 s). These are unit tests and mocked integration tests. No live external services are exercised.
- Dataset kit: 4/4 self-tests pass. No datasets have been downloaded yet.
- Frontend build: not run (no frontend changes made).

## 5. Dataset kit

The kit was unpacked from `Downloads/SURAKSHA_dataset_research_kit.zip` to `tools/suraksha_dataset_research_kit/`. It has its own `.gitignore` covering `data/`, `*.parquet` and `*.joblib`.
- **Sources:** PhiUSIIL (CC BY 4.0) is the main candidate for the URL model. InstaFake requires an explicit non-commercial opt-in. No mobile-impersonation dataset exists, so annotation templates are provided instead.
- **Caveat to verify after download:** PhiUSIIL is published as having its own format bias (legitimate URLs are predominantly `https://www.<top-site>`). The same format-only baseline test must be run on it before it is trusted.

## 6. Prioritized plan

| # | Work | Value | Effort | Risk |
|---|---|---|---|---|
| 1 | **URL eval harness:** format-normalized (host-only and full-URL) frozen test sets, a format-only "shortcut" baseline as a mandatory check, PR-AUC/FPR/bootstrap CIs | Very high | M | Low |
| 2 | **Fix social missing-data handling** (mark as missing and lower confidence instead of using 0) and split generic-fake from brand-impersonation in the output, with regression tests | High | S | Low |
| 3 | **Acquire PhiUSIIL** (needs your OK: about 50–60 MB download) and retrain a host-normalized URL model; compare against the current model on the same frozen set | High | M | Medium |
| 4 | Pin scikit-learn/joblib versions and record the sklearn version in manifests; refuse or flag on mismatch | Medium | S | Low |
| 5 | Stop presenting raw probabilities as "confidence"; label them "uncalibrated model score" until calibrated | Medium | S | Low |
| 6 | Annotation pipeline for social/app brand impersonation (kit templates + validator wired into the repo) | High (long term) | M | Low |
| 7 | Evidence-typed relationship graph (observed vs inferred) | High for demo | L | Medium |
| 8 | Rate-limit storage: document or require Redis for multi-worker | Low–Med | S | Low |

## 7. Open questions / blockers

- **PhiUSIIL download** (CC BY 4.0, via UCI): needs your approval.
- **InstaFake:** confirm you accept non-commercial research use, and decide whether raw data should stay committed.
- **Uncommitted work:** 42 files of uncommitted changes are yours. I will not touch unrelated hunks.

## 8. Phase 1 progress (items 1 and 2)

### URL evaluation harness
- Code: `backend/app/ml/url_eval.py`. Report: `backend/app/ml/reports/url_eval_report.json`.
- Frozen test set: 2,210 rows, sha256 `40926d8ab501…`. It uses the same grouped split the shipped model was trained on, so all of these rows are held out from training.

| Evaluation | Precision | Recall | F1 (95% CI) | FPR | PR-AUC |
|---|---|---|---|---|---|
| Format-only shortcut (no content) | 0.893 | 0.852 | 0.872 (0.858–0.886) | 0.119 | 0.959 |
| Shipped model, raw inputs (published number) | 0.974 | 0.838 | 0.901 (0.888–0.914) | 0.026 | 0.972 |
| **Shipped model, host-only** (how the app calls it) | 0.949 | **0.420** | 0.582 (0.554–0.608) | 0.026 | 0.879 |
| Same architecture retrained host-only | 0.891 | 0.696 | 0.781 (0.761–0.801) | 0.099 | 0.904 |

**Honest number for the current product path:** when the app scores bare domains, the shipped model catches about 42% of phishing hosts. Retraining on hostnames gives about 70% recall, at a higher false-positive rate.
**Next:** a better dataset (PhiUSIIL, pending approval) must pass the same shortcut check before it is trusted.

### Social scoring fix
- **Missing core metadata** (follower, following or post counts): the fake-account model is now skipped (`status: insufficient_metadata`) and a `missing_data` evidence record tells the analyst what to collect. Missing values are no longer imputed as 0.
- **Brand-risk score is now separate from the fake score:**
  - `/ml/predict-social` `risk_score` is based on brand-impersonation heuristics only (`risk_score_basis`).
  - The fake probability is reported separately with `fused_into_risk_score: false`.
  - In `DetectionService`, social findings use `final_risk_score = rule_based_score`.
  - A new response field, `ml_fused_into_score`, makes this visible.
- **Tests:** 3 existing tests asserted an ML "SUSPICIOUS" verdict for profiles with *no* metadata, so they encoded the bias. They now supply metadata explicitly.
- **Regression tests added for:** the missing-data path, independence of the brand score from the fake score, and the evaluation harness.
- **Backend suite:** 126 passed.

## 9. PhiUSIIL acquisition and URL model comparison (2026-10-19)

### Acquisition (approved)

- **Download:** UCI id 967 via `ucimlrepo`, using kit script `01_download_phiusiil.py`.
- **Storage:** `tools/suraksha_dataset_research_kit/data/suraksha_ml/`, which is git-ignored (checked with `git check-ignore`).
  - Raw file: 56 MB.
  - URL-only labels: 40 MB.
- **Rows:** 235,795 (134,850 legitimate / 100,945 phishing). This exactly matches UCI's published counts.
- **Integrity:** checksums are recorded in `manifests/phiusiil_manifest.json`. License is CC BY 4.0.
- **Format bias:** stronger than in the bundled dataset.
  - Legitimate rows: 100% are `https://www.<domain>` with no path.
  - Phishing rows: only 42% have `www.` and 60% have a path.
  - Consequence: raw-URL training is unusable. Only canonical hosts (scheme, path and leading `www.` removed) are used.
- **Cleaning:**
  - 219,094 unique canonical hosts.
  - 58 hosts with conflicting labels were quarantined.
  - 219,036 hosts were used.

### Comparison

- **Script:** `backend/scripts/compare_url_models.py`. Report: `backend/app/ml/reports/url_model_comparison.json`.
- **How it is scored:** both models see canonical hosts only. Threshold is 0.5 on uncalibrated scores.
- **PhiUSIIL split:** grouped by registrable domain (tldextract offline public-suffix list). 171,262 hosts train, 47,774 hosts test.
- **OTX test:** the same frozen split as before. 138 hosts that also appear in PhiUSIIL training were removed, leaving 2,072.

| Test set | Model | Precision | Recall | F1 (95% CI) | FPR | PR-AUC |
|---|---|---|---|---|---|---|
| PhiUSIIL | format-only shortcut | 0.847 | 0.549 | 0.666 (0.661–0.672) | 0.077 | 0.807 |
| PhiUSIIL | shipped (OTX-trained) | 0.898 | 0.245 | 0.386 (0.378–0.393) | 0.022 | 0.734 |
| PhiUSIIL | **candidate (PhiUSIIL host)** | 0.902 | 0.800 | **0.848** (0.844–0.851) | 0.068 | **0.932** |
| OTX/Tranco | format-only shortcut | 0.978 | 0.381 | 0.548 (0.518–0.576) | 0.011 | 0.881 |
| OTX/Tranco | shipped | 0.940 | 0.339 | 0.498 (0.469–0.524) | 0.027 | 0.862 |
| OTX/Tranco | candidate | 0.655 | 0.515 | 0.577 (0.553–0.600) | **0.341** | 0.696 |

### What this means

1. **The candidate learned real content signal on PhiUSIIL.** It beats the content-free shortcut by +0.18 F1 and +0.13 PR-AUC on unseen registrable domains.
2. **Neither model generalizes across datasets.**
   - The candidate flags 34% of benign Tranco domains, an unacceptable false-positive rate for a brand-protection product.
   - The shipped model misses about two-thirds of phishing hosts on both test sets when scoring canonical hosts.
   - The two datasets define "benign" very differently: PhiUSIIL uses small websites, Tranco uses popular domains.
3. **Decision:** do **not** replace the shipped artifact. The candidate is stored only in the git-ignored kit folder.
   - For bare-domain scoring, the deterministic lookalike engine should remain primary, with URL ML as clearly labelled supporting evidence.
4. **Suggested next experiment:** train on the *union* of both training splits, then evaluate on both frozen test sets. The tests are untouched, so this involves no test-set leakage. Add calibration only after that.

**Environment note:** `ucimlrepo` and `tldextract` were installed into `.venv` for these offline scripts. They are not runtime dependencies and are not added to `backend/requirements.txt`.

## 10. Union-trained candidate (2026-10-19)

### Setup

- **Training data:** PhiUSIIL train hosts (171,262) + bundled OTX/Tranco train split (7,790), all as canonical hosts.
- **Decontamination:**
  - 168 hosts that appear in either frozen test set were dropped.
  - 36 hosts with conflicting labels were dropped.
- **Final training set:** 177,822 hosts (111,346 benign / 66,476 phishing). OTX makes up only 4.4% of it.
- **Model settings:** same architecture and settings as before. Nothing was tuned on a test set.
- **Artifact:** `.../artifacts/url_candidate_phiusiil_host_union.joblib`, stored in the git-ignored kit folder and not installed in the app.

### Results

| Test set | Model | Precision | Recall | F1 (95% CI) | FPR | PR-AUC |
|---|---|---|---|---|---|---|
| PhiUSIIL | candidate (PhiUSIIL only) | 0.902 | 0.800 | 0.848 (0.844–0.851) | 0.068 | 0.932 |
| PhiUSIIL | **candidate (union)** | 0.902 | 0.798 | 0.847 (0.843–0.850) | 0.067 | 0.932 |
| OTX/Tranco | shipped | 0.940 | 0.339 | 0.498 (0.469–0.524) | 0.027 | 0.862 |
| OTX/Tranco | candidate (PhiUSIIL only) | 0.655 | 0.515 | 0.577 (0.553–0.600) | 0.341 | 0.696 |
| OTX/Tranco | **candidate (union)** | 0.735 | 0.564 | 0.638 (0.615–0.661) | **0.256** | 0.784 |

### What this means

- **Combining the data helps a little.** On OTX, false positives fall from 34% to 26%, F1 rises by 0.06, and there is no loss on PhiUSIIL.
- **It is still not deployable.** A model that flags about 1 in 4 popular legitimate domains would bury analysts in false alarms.
- **The shipped model** has a low false-positive rate but misses about two-thirds of phishing hosts.
- **Decision:**
  - No URL model is fit to be a primary bare-domain scorer.
  - The shipped artifact is unchanged.
  - Lexical URL ML should be shown as a supporting signal only, never fused at a fixed weight.

### Root cause and next options

The root cause is a definition mismatch over what "benign" means: PhiUSIIL uses small websites, while Tranco uses popular, often brand-like domains. Options, in order:

1. **Weight the OTX/Tranco rows more heavily.** The weight must be chosen on a *validation* split carved from the training data, never on the test sets.
2. **Add a known-legitimate allowlist signal** (Tranco top-N, the brand's verified assets) before ML scoring.
3. **Stop fusing URL ML into `final_risk_score`** (the same treatment social got), and report it as evidence only.

## 11. URL ML no longer fused into risk score (2026-10-19)

### What changed

- **Domain candidates:** in `DetectionService`, domain candidates now set `ml_fused_into_score = False`.
  - `final_risk_score`, `severity` and `detection_confidence` come from the deterministic rule/lookalike engine only.
  - The URL model's output is still reported in `ml_risk_score`, `ml_predicted_class` and an `url_phishing_ml_classification` evidence record.
  - That evidence record states that the score is uncalibrated, is not included in the risk score, and that a LEGITIMATE result is not reassurance.
- **Regression tests:** a real-model case, plus a stub test showing that URL ML scores of 0 and 100 yield an identical final score, severity and confidence.
- **Backend suite:** 128 passed.

### Fusion status by asset type

| Asset type | Fused into risk score? | Notes |
|---|---|---|
| Domain | No (evidence only) | Changed in this step |
| Social | No (evidence only) | Changed in §8 |
| Mobile app | No | Heuristics only |
| Other / custom | **Yes** | Still fused with the n=60 RandomForest; a candidate for the same treatment |

### Remaining caveat

The URL model still receives the full `source_url` when one is supplied. On full URLs it flags long legitimate URLs (for example, documentation paths) because of the format bias. Because the score is now evidence-only this does not change any risk score, but feeding it the canonical host would make the evidence more trustworthy.

## 12. URL model scores the canonical host (2026-10-19)

### What changed

- `MLService.predict_url_risk` now scores `canonical_host(input)`: lowercase, with no scheme, credentials, port, path, query, trailing dot or leading `www.`.
  - This applies both to `DetectionService` domain candidates and to `/api/v1/ml/predict-url`.
- The response keeps the original `indicator` and adds `scored_input`. No existing response fields were removed.
- `canonical_host` now lives in `backend/app/ml/url_eval.py`, so the app does not import from `backend/scripts/`. The comparison script imports it from there.

### Effect on false alarms (shipped model, before → after)

| Input | Before | After |
|---|---|---|
| `https://docs.python.org/3/library/` | 93 | 46 |
| `https://www.github.com/...` | 86 | 11 |
| `https://paypal.com/signin` | 97 | 20 |
| `http://micros0ft-security-update.ddns.net/login` | — | 97.5 (still flagged) |

### Tests

- Added: a full URL and its bare host must receive an identical score, plus a normalization unit test.
- Backend suite: 130 passed.

### Still open

- The trade-off is lower recall, as measured in §8: about 42% host-only for the shipped model. This is acceptable now that URL ML is evidence-only.
- Path-based phishing signals (for example `/login/verify.php`) are no longer seen by the ML. They should be covered by explicit, explainable rules instead.

## 13. Generic RandomForest: evidence-only, and a correction to §11 (2026-10-19)

### Correction

§11 stated that "other/custom" asset types were still fused with the n=60 RandomForest. That was wrong. In `DetectionService.evaluate_candidate`, every asset type that is not a domain or an app is normalized to `"social"`. As a result:

- The RandomForest `else` branch is **unreachable**.
- The generic model has never influenced a finding through `DetectionService`.
- Its only live use is the status report in `/health`.

### What changed

- **Defensive guard:** the unreachable branch now also sets `ml_fused_into_score = False` and uses honest evidence wording ("trained on 60, evaluated on 15"). If it is ever re-wired, it cannot silently move scores.
- **Regression test** `test_generic_classifier_never_affects_scores`:
  - Injects a spy classifier returning 0 or 100 for unknown, domain and social candidates.
  - Asserts that the classifier is never called.
  - Asserts that the final score and severity equal the rule-based result.
- **Backend suite:** 131 passed.

### Result

No ML model is now fused into `final_risk_score` for any asset type. All risk scores and severities come from the deterministic, explainable rule and lookalike engines. ML outputs are attached as labelled, uncalibrated supporting evidence.

### Follow-ups

- **Dead fusion code:** `rule_weight`/`ml_weight` and the fusion code are now dead. They can be removed in a separate cleanup.
- **Unknown asset types:** any unknown type (e.g. `marketplace_listing`) is silently scored by the *social* detector. It should be rejected or explicitly labelled.
- **`scan_service` `ml_assist`:** uses the "candidate" model, whose manifest says it is untrained, so it should report itself as unavailable. Verify this.

## 14. Explicit asset-type handling (2026-10-19)

### What changed

- **One alias table routes every candidate.** `DetectionService` now uses `ASSET_TYPE_ALIASES`:

| Detector | Accepted `asset_type` values |
|---|---|
| Domain | domain, url, dns, web, website |
| Mobile app | mobile_app, app, android, ios |
| Social | social, social_profile, social_media, social_account, twitter, x, instagram, facebook, linkedin, tiktok, youtube, telegram |

- **Unknown type is rejected.** It raises `ValidationError`, which returns HTTP 422 `VALIDATION_ERROR` with the accepted list in `details`. Previously it was silently scored by the social detector.
- **Missing type is labelled.** It still defaults to `social` for backward compatibility, but the result now carries `asset_type_defaulted: true` and an `assumption` evidence record asking the analyst to confirm the type.
- **Callers checked.** The frontend (Watchtower, AppContext, ExplainableAIAssistant), the seed data and the existing tests only send supported values.

### Tests

- Added: unknown type rejected, the 422 API response, missing type labelled, and platform aliases routed correctly.
- Backend suite: 135 passed.

## 15. URL path and structure rule signals (2026-10-19)

### What was added

- **Analyzer:** `backend/app/detection/url_path_analysis.py` does pure string parsing. It makes no network calls, so the SSRF surface is unchanged. Input is capped at 2,048 characters and malformed input returns no findings.
- **Wiring:** `DomainDetector` consumes the analyzer and emits two new signals. They are added to the rule score and appear in the evidence list; ML does not touch them.

| Signal | Fires when | Severity × confidence |
|---|---|---|
| `URL_PATH_CREDENTIAL_LURE` | Path has whole-token lures (login, signin, verify, password, otp, kyc, wallet, recover, secure, and similar). The URL must also be tied to the brand. | Hostname resembles brand: 25–30 × 0.80. Brand appears only in the path of an unrelated host: 20 × 0.60, with a "verify it is not a legitimate third-party page" note. |
| `URL_DECEPTIVE_STRUCTURE` | `brand.com@evil.host` userinfo trick (35), executable/installer path such as `.apk` or `.exe` (30), raw IP host (25), URL embedded in a redirect parameter (20), or credential field names in the query (20). The URL must also be tied to the brand. | Highest rule plus 5 for each additional rule, capped at 45, × 0.80 |

- **False-positive guard:** neither signal fires unless the URL is related to the protected brand. A bakery site with `/login/verify` produces nothing, and the existing "no signals means benign" shortcut still applies.
- **Official-domain exclusion** still runs first, so official paths are never flagged.
- **Explainability:** each explanation quotes the matched path or text, and the evidence record says "Rule-based, not an ML prediction".

### Tests

- `test_url_path_rules.py` has 12 tests covering whole-token matching, the userinfo trick reporting the real host, each structure rule, bad-input safety, no firing on unrelated sites, official exclusion, the score cap, and unchanged behaviour for hostname-only candidates.
- Backend suite: 147 passed.

### Limits

- **Token lists:** English only, hand-chosen, and not measured against labelled data. Their real-world precision and recall are unknown.
- **Where the path comes from:** only `source_url`, `url`, `candidate_name` and `domain` fields are read. Connectors that supply the URL elsewhere would not benefit.
- **Hostname and URL can differ:** if `candidate_name` and `source_url` name different hosts, the path rules judge the `source_url` path against the `candidate_name` host.

## 16. Model-artifact version safety (2026-10-19)

### The risk

- The committed `.joblib` models were written by scikit-learn 1.9.1, but `requirements.txt` only said `>=1.4.0`. A fresh Render or Docker build could install a different version and either crash on load or silently mis-score.
- Environment drift found: local development runs Python 3.14 with numpy 2.5.4 and scipy 1.18.1. Neither exists for the Dockerfile's Python 3.11. scikit-learn 1.9.1 and joblib 1.6.0 do exist for 3.11, so those two are pinned.

### What changed

- **New module:** `backend/app/ml/artifact_compat.py`. Every model load now goes through it: the URL, social, mobile, candidate and generic RandomForest models.
- **Where the artifact's version comes from:** scikit-learn removes its version stamp at load time. The only place it appears is sklearn's own `InconsistentVersionWarning`. The module reads the version from that warning, rather than trusting a manifest. No warning on an estimator means the version equals the runtime.

| Status | Meaning | Action |
|---|---|---|
| `verified` | Same version | Load |
| `patch_difference` | Same major.minor | Load, flagged |
| `unknown` | Not an sklearn estimator, no version | Load, flagged |
| `mismatch` | Different minor or major | **Refuse.** The model is treated as unavailable, so scoring falls back to the deterministic rules. The error says which version to pin. |
| `mismatch_overridden` | Mismatch with `SURAKSHA_ALLOW_ARTIFACT_VERSION_MISMATCH=1` | Load, flagged |
| `load_error` | Missing or corrupt file | No model; never raises |

- **Visibility:** `/ml` metadata now includes `runtime_versions` and `artifact_compatibility` per model. The generic classifier's status includes its own.
- **Provenance:** every trained-model manifest (URL, social, mobile, candidate, RandomForest) now records `runtime_versions` (Python, scikit-learn, joblib, numpy). The existing committed manifests do not have this field yet. It appears on the next retrain, and the load-time check does not depend on it.
- **Pins:** `scikit-learn==1.9.1` and `joblib==1.6.0`, with a comment explaining that upgrading means retraining every artifact and updating the pins together.

### Verification

- **Shipped artifacts:** URL, social and the RandomForest all load as `verified` under 1.9.1.
- **Bug found by the first test run:** a first version of the helper tried to read the version from the loaded object. That always returns the runtime version, so it could never detect a mismatch. It was replaced by the warning-based approach above, and the tests now fabricate artifacts "written by" older versions to prove detection.
- **Tests:** 11 new tests (158 total, all passing):
  - old-version artifact is refused, and the error names the version to pin;
  - the override environment variable works;
  - a patch-level difference is flagged but loads;
  - missing or corrupt files never raise;
  - `MLService` refuses a mismatched URL model and predictions then report unavailable;
  - the RandomForest refuses a mismatched artifact;
  - the shipped artifacts match the runtime;
  - the training manifest records the runtime versions;
  - `requirements.txt` pins match the installed versions.

### Limits

- Pickle loading can run code. Only load artifacts this project produced, and never user uploads.
- numpy and scipy are not pinned, because the versions installed locally are unavailable on Python 3.11. If production moves to Python 3.12 or later, pin them too.
- The offline tools (`url_eval.py`, `compare_url_models.py`) still use plain `joblib.load`, because they are run by hand, not served.

## 17. Brand-impersonation annotation pipeline and evaluation harness (2026-10-19)

### What was added

| Piece | Location |
|---|---|
| Empty annotation templates (social, app) and official-asset registry template, copied from the kit | `backend/app/ml/data/annotations/templates/` (tracked) |
| Labeling protocol | `docs/LABELING_PROTOCOL.md` |
| Schema, validator, registry parser, frozen split | `backend/app/ml/annotations.py` |
| Evaluation harness and CLI | `backend/app/ml/impersonation_eval.py` |
| Git protection | `.gitignore` now excludes any `*.csv` or `*.json` placed directly in `backend/app/ml/data/annotations/`, since reviewer data may contain personal profile data |

### What the validator checks

- **Completeness:** the schema columns are present, and every adjudicated row has source, evidence, reviewer, timestamps, permission basis and `split_group`.
- **Labels:** only the five protocol labels are allowed. Generic labels such as "fake" or "bot" are rejected.
- **URLs and timestamps:** URLs must be http(s), so `javascript:` is rejected. Timestamps must parse, must not be in the future, and review must not precede observation.
- **Confidence:** `label_confidence` must be between 0 and 1.
- **Official-source requirements:** `confirmed_impersonator` and `official_verified` rows must cite the official brand identity source URL.
- **Evidence quality:** evidence text must be at least 20 characters.
- **Registry cross-checks:**
  - A row labelled `official_verified` whose identifier is not in the brand's registry entry is an error.
  - A row labelled `confirmed_impersonator` whose identifier is in that registry is an error.
  - A brand missing from the registry is an error.
- **Consistency:**
  - The same asset appearing under conflicting labels is an error.
  - The same asset appearing across different `split_group`s (train/test leakage) is an error.
  - Duplicate `candidate_id`s are errors, and repeated assets are warnings.
- **Data minimisation:** an email address in a bio is a warning.
- **Triage labels:** `suspicious_unverified` and `unknown` are warnings. They are excluded from training and scoring.
- **Frozen split:** `assign_split` hashes the `split_group`. It is deterministic and order-independent, so adding rows never moves an existing group between train and test (about 30% go to test).

### What the harness does

- Scores the shipped social and app **rule detectors** on adjudicated rows, or any injected predictor, so a future ML model can be compared on the same frozen set.
- Refuses to compute anything when the annotations fail validation.
- Evaluates the frozen **test split** by default.
- Treats `confirmed_impersonator` as the positive class. `official_verified` and `benign_unrelated` are reported as **separate negative subgroups**, each with its own false-positive rate.
- Records how many official accounts were excluded by exact-match rather than by scoring.
- Reports precision, recall, F1, PR-AUC and bootstrap CIs, plus the ids of missed positives and false positives for error analysis.
- **Honesty gate:** fewer than 20 positives or 20 negatives yields `insufficient_data` and `claims_allowed: false`.
- Uses a fixed 25-point threshold, so nothing is tuned on the data.
- Does **not** use the InstaFake bot probability.

### Verified, and what that does not mean

- **Tests:** 33 new tests, 191 passing in total.
- **Fixtures are synthetic.** They exist to prove the plumbing works, and they say nothing about real-world accuracy.
- **Current state:** the CLI run on the empty templates correctly returns `no_labelled_data`.
- **Blocker for real numbers:** no real adjudicated social or app labels exist yet. The kit found no open, reusable impersonation dataset, so the labels must come from analyst-collected, authorised evidence.

### How to use it

1. Copy a template to `backend/app/ml/data/annotations/social.csv`, and fill `brand_registry.csv` with each brand's verified official assets (list cells use `;`; social handles are `platform:handle`).
2. Annotate candidates following `docs/LABELING_PROTOCOL.md`, with a second reviewer for confirmed impersonators.
3. Run `python -m backend.app.ml.impersonation_eval --kind social --annotations <csv> --registry <csv>`.
4. The report is written to `backend/app/ml/reports/impersonation_eval_social.json` (the `app` kind is analogous).
