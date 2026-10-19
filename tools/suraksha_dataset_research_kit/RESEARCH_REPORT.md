# SURAKSHA dataset research report

**Research checked:** 19 October 2026  
**Purpose:** Build accurate, evidence-backed datasets for SURAKSHA's URL phishing, social threat and mobile-app brand-impersonation workflows.

## Executive decision

Use separate task-specific datasets and keep a strict evidence/label policy. The best immediately accessible labelled source for URL modelling is UCI's PhiUSIIL dataset under CC BY 4.0. The best direct Instagram-specific generic fake/automation research dataset located is InstaFake, but it is from 2018 and CC BY-NC 4.0, so it is for non-commercial research only unless the authors grant additional permission. It is not a brand-impersonation dataset. No openly reusable, high-quality, large dataset specifically labelled for *mobile-app brand impersonation* was verified in this review. Build a provenance-heavy manually adjudicated dataset for social/app impersonation instead of borrowing unrelated labels.

## 1. URL phishing

### Primary source: UCI PhiUSIIL

- Source: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
- Dataset page reports 235,795 records: 134,850 legitimate and 100,945 phishing URLs, with 54 features; the source says label `1` means legitimate and `0` means phishing.
- License: CC BY 4.0; cite Prasad & Chandra (2024), UCI Machine Learning Repository, DOI https://doi.org/10.1016/j.cose.2023.103545.
- Why useful: larger and more recent than a tiny bootstrap set; has a URL field and class labels.
- Critical caveat: many other columns are derived from the website source/page and are not available to a URL-only inference endpoint. The extraction script preserves the full feature table for audit, but emits a separate URL-only labelled file for lexical training so the feature space matches the live URL classifier.
- Recommended validation: deduplicate normalized exact URLs, quarantine conflicting labels, group the splits by registrable domain, preserve the test split, report precision/recall/F1/PR-AUC/false positives and false negatives.

### Brand-specific website dataset: Phishpedia benchmark

- Source/code: https://github.com/lindsey98/Phishpedia
- The repository describes a 30k phishing benchmark, each website annotated with URL, HTML, screenshot and target brand, with a dataset linked separately through Google Drive.
- Why useful: target-brand labels and visual artefacts can support brand-intention/visual comparison research beyond lexical URL features.
- Caveat: the GitHub code has a CC0 license, but that must not automatically be assumed to cover the linked dataset's HTML/screenshots or every underlying asset. Review dataset terms and size before downloading or integrating. It is a website dataset, not an Instagram profile dataset.

### Operational feeds and terms

- OpenPhish Community Feed: https://openphish.com/phishing_feeds.html and https://openphish.com/terms.html. The community feed is limited and updated every 12 hours; terms prohibit using its data for organizational/product use without prior written consent. Do not use it to train/operate SURAKSHA as a product without written permission.
- URLhaus: https://urlhaus.abuse.ch/api/ focuses on URLs distributing malware, not specifically phishing. The community API documentation says commercial/for-profit needs may require an enhanced paid API. Do not merge its labels with phishing labels; review current terms before operational use.
- PhishTank: https://phishtank.org/api_info.php offers API/data access, but an archived terms page is not sufficient to establish current rights; review the current Cisco EULA before product use.

## 2. Social accounts

### Primary Instagram-specific research source: InstaFake

- Source: https://github.com/fcakyon/instafake-dataset
- Dataset reports anonymized Instagram account metadata collected in the second half of 2018, for generic fake-account and automated-account detection.
- Features include follower/following/post counts, profile picture/private-profile flags, biography/username lengths, username digit count, and some activity metadata.
- License: CC BY-NC 4.0, Attribution-NonCommercial. The downloader therefore requires an explicit non-commercial research opt-in.
- Use: historical baseline for *generic fake-account/automation classification* only, with a large distribution-shift caveat.
- Do not use its labels as evidence of brand impersonation; there is no brand-specific label. Do not ship the data or model artifacts trained on it in a commercial deployment without separate permission/legal review.
- Extraction correction: the repository's helper maps `media_comments_are_disabled` using the `mediaCommentNumbers` raw field; the supplied normalizer reads `mediaCommentsAreDisabled` separately to avoid reproducing that field mix-up.

### Generic bot benchmarks (optional)

- TwiBot-22: https://github.com/LuoUndergradXJTU/TwiBot-22 and paper https://proceedings.neurips.cc/paper_files/paper/2022/hash/e4fd610b1d77699a02df07ae97de992a-Abstract-Datasets_and_Benchmarks.html. Large graph-based Twitter/X bot benchmark; the official repo requires an access request with institutional email and instructs users to follow the dataset-specific terms and Twitter Developer Agreement/Policy. Useful only as a research comparison for generic bot behaviour—not as Instagram impersonation evidence and not a default source for a product model.
- Cresci datasets: classic Twitter bot/spam benchmarks; useful for historical baseline research, but platform and threat distributions differ. Evaluate external generalization explicitly.

### Missing data that matters

A reliable, openly reusable benchmark that labels Instagram *brand impersonation* specifically was not verified here. That is a different target from generic fake/bot classification. Build a separate, source-attributed set of public/authorized candidate profile records, labelled `confirmed_impersonator`, `official_verified`, `suspicious_unverified`, `benign_unrelated`, or `unknown`. Keep uncertain cases out of supervised evaluation. Obtain consent/rights where applicable and respect platform data-access policies.

## 3. Mobile applications

### Official/current metadata references

- F-Droid index v2: https://f-droid.org/repo/index-v2.json. Official documentation: https://fdroid.gitlab.io/jekyll-fdroid/docs/All_our_APIs/. The supplied fetcher stores title, package ID, declared license, developer/source metadata and version fields. It explicitly sets the label to `unknown`: listing in a catalog is not a security verdict and must not be automatically treated as malware-free ground truth.
- Apple iTunes Search API documentation: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/. The supplied fetcher gathers app listing candidates by search term, but marks each `candidate_requires_official_verification`. Confirm seller/bundle ID against the brand's own site or registry before labelling it official. Artwork is not downloaded.

### Malware datasets are not impersonation datasets

- CICMalDroid 2020: https://www.unb.ca/cic/datasets/maldroid-2020.html reports Android malware categories and extracted features. It can inform a separate malware-behaviour task, subject to the dataset's terms/rights, but does not directly label whether an app impersonates a brand.
- AndroZoo: https://androzoo.uni.lu/access requires access application and states no commercial use and no redistribution without explicit consent. Not a default production source.
- AndroMalPack: https://www.nature.com/articles/s41598-022-23766-w reports hash-based data related to repacked Android apps; it does not provide a ready-to-use, fully labelled brand-impersonation dataset, and underlying app corpora have separate access controls.

### Recommended collection design

Maintain three distinct app signals: (1) official-identity mismatch, (2) potential brand impersonation, and (3) malware evidence. Do not equate them. Manually confirm impersonation through exact listing URLs, publisher/package mismatch, source-attributed brand identity, official warnings/security reports or documented takedown evidence. Preserve timestamps, evidence and reviewer decisions. Do not download or execute APKs as part of basic dataset extraction.

## 4. Recommended data architecture

- `raw/`: immutable upstream files and source metadata; never commit automatically.
- `processed/`: normalized, schema-validated datasets.
- `processed/research_only/`: data restricted to non-commercial research, such as InstaFake.
- `manifests/`: source URL, retrieval timestamp, license/terms, citation, row count, label mapping, checksum, transformations and caveats.
- `reports/`: data-quality and evaluation reports.
- `artifacts/research_only/`: model artifacts trained from restricted research data; must not leak into production builds.

Add `data/` and dataset artifacts to `.gitignore` unless there is a deliberate, legally reviewed reason to version a small transformed sample. Never commit API keys, downloaded APKs, raw account identifiers, or datasets with restrictions.

## 5. Quality gate before any model is used in SURAKSHA

1. Confirm rights and exact label meaning.
2. Validate schema, missing fields, duplicate rows and conflicting labels.
3. Group splits by domain/account/package/developer/campaign where possible.
4. Fit transforms only on training data.
5. Compare against the current baseline on the same frozen test set.
6. Report precision, recall, F1, confusion matrix, false-positive and false-negative counts, PR-AUC, and calibration only if measured.
7. Verify performance on recent and out-of-distribution cases where data supports it.
8. Keep the model in shadow/research mode until the full application contract and failure behavior are verified.

## Sources checked

- UCI PhiUSIIL dataset: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
- InstaFake dataset and license: https://github.com/fcakyon/instafake-dataset
- Phishpedia repository/dataset description: https://github.com/lindsey98/Phishpedia
- TwiBot-22 official repository: https://github.com/LuoUndergradXJTU/TwiBot-22
- F-Droid index docs: https://fdroid.gitlab.io/jekyll-fdroid/docs/All_our_APIs/
- Apple iTunes Search API docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
- CICMalDroid 2020: https://www.unb.ca/cic/datasets/maldroid-2020.html
- AndroZoo access conditions: https://androzoo.uni.lu/access
- OpenPhish terms: https://openphish.com/terms.html
- URLhaus API/terms context: https://urlhaus.abuse.ch/api/
- PhishTank API: https://phishtank.org/api_info.php
