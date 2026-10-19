# SURAKSHA dataset labeling protocol

## 1. Keep separate prediction targets

Never make a single label called `fake` cover all of these tasks:

- `url_phishing`: the URL or page is supported by evidence as a phishing site.
- `social_generic_fake`: source labels indicate generic fake-account or automation behavior.
- `social_brand_impersonation`: the profile is attempting to misrepresent a specific brand/person/organization.
- `app_brand_impersonation`: a listing/app improperly imitates a named brand.
- `app_malware`: app behavior/artifacts are labelled malicious by a malware dataset.
- `relationship`: two assets share a confirmed indicator, or a relationship is an inference.

These labels are not interchangeable. Malware does not prove brand impersonation; brand-name similarity does not prove phishing; bot-like behavior does not prove impersonation.

## 2. Allowed labels for manually reviewed social/app candidates

Use one of:

- `confirmed_impersonator`: strong, reviewable evidence that the asset misrepresents itself as the protected brand/person. Record the exact evidence and source. One annotator must not infer this from name similarity alone.
- `official_verified`: identifier has been confirmed against an official brand source, such as the brand's own website linking to the profile/listing or a verified official package/bundle ID.
- `benign_unrelated`: reviewed and no brand impersonation evidence found at the observation time. Do not use for merely unreviewed data.
- `suspicious_unverified`: evidence warrants review but does not prove impersonation. This is a triage state, not a supervised positive/negative label.
- `unknown`: insufficient evidence or source access.

For model training, use only adjudicated records: `confirmed_impersonator` as positive and `official_verified` / `benign_unrelated` as negative where their definitions fit the target task. Keep `suspicious_unverified` and `unknown` out of supervised training/evaluation. Evaluate official accounts and unrelated benign accounts as separate negative subgroups so the model cannot appear strong by only distinguishing an official account from a fake one.

## 3. Evidence rules

Every confirmed label must capture:

- original source URL or listing URL;
- observation timestamp (UTC);
- official brand identity source;
- objective evidence (e.g. cross-link, package/seller mismatch, deceptive description, confirmed report, credential-harvesting evidence);
- reviewer and review timestamp;
- exact target brand;
- how the source was lawfully accessed.

A takedown report or a removed listing may support a label but must be corroborated where possible; it is not automatically proof that every similar candidate is malicious.

## 4. Quality control

- Two independent reviewers for high-impact confirmed impersonation labels where practical.
- Resolve disagreement with a documented adjudication note.
- Keep source provenance and a timestamp for every record.
- Minimize personal data; avoid private messages, passwords, session tokens, private account information, or unnecessary personal data.
- Do not scrape or bypass platform restrictions. Use authorized APIs, researcher-provided datasets, user-submitted public metadata, and documented manual evidence.
- Preserve an immutable raw snapshot where permitted, alongside a normalized derivative and transformation version.

## 5. Train/test split rules

- Split URL data by registrable/root domain, not by random URL row.
- Split app records by package/bundle ID and, where appropriate, developer or clone family.
- Split social records by stable account identifier, campaign, or collection event where available.
- Do not split duplicates or near-duplicates across train and test.
- Use a time-based holdout when collection timestamps and sample count support it.
- Freeze a final test set. Do not tune model parameters or thresholds on it.

## 6. Metrics

Report precision, recall, F1, confusion matrix, false-positive and false-negative counts, and class prevalence. For rankings, include PR-AUC/average precision; ROC-AUC is supplementary. Report calibration only if explicitly measured. Include confidence intervals where reasonable, and break down results by source/time/brand when sample sizes support it.
