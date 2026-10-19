# SURAKSHA Dataset Research & Extraction Kit

This kit provides **reproducible download, normalization, labelling, and evaluation scaffolding** for SURAKSHA's URL phishing, social-account, and app-impersonation work.

> **Important:** The current chat runtime could research dataset sources but could not download external dataset bytes into this package. The scripts below retrieve the datasets from their official/source-controlled endpoints when you run them from your development machine. No row counts or model metrics are fabricated in this package.

## What is included

- Research report and terms/licensing notes.
- UCI PhiUSIIL fetcher, with standardised labels and a URL-only extract.
- Domain-disjoint train/validation/test split + URL-only TF-IDF/Logistic Regression benchmark.
- Opt-in downloader and normalizer for InstaFake, isolated as CC BY-NC 4.0 research-only data.
- Generic Instagram fake-account repeated-CV benchmark (not brand impersonation).
- F-Droid metadata reference fetcher and Apple App Store candidate search fetcher.
- Label templates for manually verified social and mobile-app impersonation.
- Annotation and dataset-governance protocol.
- Prompt for safe integration into the actual SURAKSHA repository.

## Data-source decisions

| Task | Source | What it is suitable for | Main caveat |
|---|---|---|---|
| URL phishing | UCI PhiUSIIL | URL-only lexical benchmark and broader structured-feature research | Source label 1=legitimate, 0=phishing; script normalizes to 1=phishing. Group split by registrable domain. |
| Generic Instagram fake accounts | InstaFake | Historical research baseline | CC BY-NC 4.0, old dataset, not brand impersonation. Do not ship into a commercial product without permission. |
| Website brand phishing | Phishpedia 30k benchmark | Research on target-brand/visual website phishing | Large linked dataset; review dataset-specific terms separate from code license before download/use. |
| Generic bots | TwiBot-22 / Cresci | Optional research baseline for generic bot behavior | Twitter/X, not Instagram impersonation; access/redistribution terms apply. |
| App listing reference | F-Droid index / Apple iTunes Search API | Package/title/publisher reference candidates | Reference/catalog listing is not an automatic benign/official label. |
| App brand impersonation | Manually adjudicated candidates | Needed for the actual target task | No openly reusable, high-quality, large brand-impersonation dataset was verified in this review. Preserve evidence and labels. |

Full details and source URLs are in [`RESEARCH_REPORT.md`](RESEARCH_REPORT.md). Annotation rules are in [`LABELING_PROTOCOL.md`](LABELING_PROTOCOL.md).

## Run on Windows

From the SURAKSHA repo root, extract this kit to `tools/suraksha_dataset_research_kit/` (or any path you prefer), then use a Python virtual environment. Commands below assume that path.

```powershell
py -3.11 -m venv .venv-data
.\.venv-data\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r tools\suraksha_dataset_research_kit\requirements.txt
```

### 1. Download and extract URL phishing data

```powershell
python tools\suraksha_dataset_research_kit\scripts\01_download_phiusiil.py --output-root data\suraksha_ml
python tools\suraksha_dataset_research_kit\scripts\06_train_eval_url_baseline.py --output-root data\suraksha_ml
```

The UCI fetcher saves:

- `data/suraksha_ml/raw/phiusiil/phiusiil_full_features.csv` — source feature table for audit/research.
- `data/suraksha_ml/processed/url_phishing_labels.csv` — URL + normalized label corpus.
- `data/suraksha_ml/manifests/phiusiil_manifest.json` — citation, license, label mapping, row count and SHA-256.

The benchmark persists domain-grouped train/validation/test CSVs under `processed/splits/`, trains a model on URL strings only, and saves metrics and predictions under `reports/`. SHA-256 digests of the exact split files are included in the metrics JSON. The research model is stored in `artifacts/research_only/` and must not replace the live model until a shared test benchmark and API contract review are completed.

### 2. Optional Instagram generic fake-account research dataset

Only run if your use is within the dataset's stated non-commercial license and its terms have been reviewed. These commands require explicit flags by design:

```powershell
python tools\suraksha_dataset_research_kit\scripts\02_download_instafake_noncommercial.py --output-root data\suraksha_ml --confirm-noncommercial
python tools\suraksha_dataset_research_kit\scripts\03_prepare_instafake.py --output-root data\suraksha_ml --confirm-noncommercial
python tools\suraksha_dataset_research_kit\scripts\07_eval_instafake_baseline.py --output-root data\suraksha_ml --research-only
```

Outputs go to `processed/research_only/`. They **must not** be copied into a commercial deployment without additional permission/legal review. The data labels generic fake/automated accounts, not brand impersonation. Repeated cross-validation is diagnostic and cannot guarantee current-platform performance.

### 3. Fetch app metadata reference candidates

```powershell
python tools\suraksha_dataset_research_kit\scripts\04_fetch_fdroid_reference.py --output-root data\suraksha_ml
python tools\suraksha_dataset_research_kit\scripts\05_fetch_itunes_candidates.py --output-root data\suraksha_ml --country us --term Instagram --term WhatsApp --term "Google Chrome"
```

F-Droid records are explicitly marked `ground_truth_label=unknown`. Apple search results are marked as candidates needing authoritative official verification. Neither script downloads APKs or artwork.

### 4. Validate downloaded CSVs and manifests

```powershell
python tools\suraksha_dataset_research_kit\scripts\08_validate_dataset_files.py --output-root data\suraksha_ml
```

## Dataset handling rules

- Do not commit raw datasets, API keys, APKs, restricted research data, or sensitive profile data. Keep raw data locally and check existing `.gitignore` and Docker build context rules.
- Do not ship the restricted InstaFake data/model into production without permission/legal review.
- Keep phishing, generic social bot, social brand-impersonation, app malware, and app brand-impersonation labels separate.
- Every manually confirmed impersonation label must include source evidence, observation time, reviewer, and an official brand reference.
- Split URL data by root/registrable domain. Split app data by package/bundle ID and clone/developer families where appropriate. Split social data by account/campaign where stable identifiers exist.
- No supervised training from `suspicious_unverified` or `unknown` labels.
- A risk score is not proof of maliciousness; show evidence and uncertainty.

## Recommended path for SURAKSHA

1. Get the UCI URL pipeline downloaded and benchmarked first.
2. Compare it to the currently deployed URL model on the same frozen domain-disjoint test set.
3. Use InstaFake only as a restricted research benchmark, not as brand-impersonation ground truth.
4. Build a separately adjudicated social/app brand-impersonation annotation set using the templates.
5. Only after enough valid labels exist, evaluate a brand-specific model and promote it behind a shadow/analyst-review workflow.

See [`PROMPT_INTEGRATE_IN_SURAKSHA.md`](PROMPT_INTEGRATE_IN_SURAKSHA.md) for a copy/paste implementation prompt.

### 5. Validate manually annotated records

After filling either annotation template:

```powershell
python tools\suraksha_dataset_research_kit\scripts\09_validate_annotations.py data\suraksha_ml\your_annotations.csv --kind social --output-root data\suraksha_ml
```

For an app file, use `--kind app`. This validator checks label vocabulary and required evidence fields; it does **not** prove that annotations are correct.

### 6. Run kit self-tests

From the extracted kit directory:

```powershell
python -m unittest discover -s tests -v
```
