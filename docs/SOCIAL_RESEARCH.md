# Social account research: two separate tasks

| Task | Question | Data today | Status |
|---|---|---|---|
| **A. Brand impersonation** | Does this account pretend to be a specific protected brand? | None labelled. Collection + review queue below. | No model. Rules only, reported as unvalidated. |
| **B. Fake / automated profile** | Does this profile look fake or automated, regardless of brand? | InstaFake (CC BY-NC 4.0) | Shipped logistic model + an XGBoost **candidate** (not deployed). |

Bot-like or fake-like behaviour is not evidence of impersonation, and a similar username alone never establishes an impersonation label.

## Task B: reproduce

```bash
python -m backend.scripts.social_b_baseline            # audit + 3 evaluation protocols -> data/reports/social_b_baseline.{json,md}
python -m backend.scripts.train_social_xgb_candidate   # writes backend/app/ml/models/social_fake_xgb_candidate{.joblib,_manifest.json}
```

The shipped `social_fake_pipeline.joblib` / `social_fake_manifest.json` are unchanged and remain the only social model `MLService` loads. Promotion of the candidate is a separate, explicit decision.

## Task A: collection and labelling workflow

1. **Registry.** Fill `backend/app/ml/data/annotations/templates/brand_registry_template.csv` (copy it). Each official handle must be confirmed from the brand's own website (`official_profile_source_url`). This is the ground truth for `official_verified`.
2. **Collect.** `python -m backend.scripts.collect_social_candidates --registry <registry.csv>`
   - Uses only the public, unauthenticated search endpoints the live monitor already uses (Bluesky `app.bsky.actor.searchActors`, Mastodon `/api/v2/search?type=accounts`), throttled to one request per second.
   - Saves untouched responses to `data/raw/social_candidates/<run_id>/`, a manifest with sha256 + HTTP status + failures to `data/manifests/`, and appends new accounts to `data/processed/social_review_queue.csv` (annotation schema, de-duplicated by platform + handle, emails removed from bios).
   - Every row is **unlabelled**. `in_official_registry` in `profile_metadata_json` is a reviewer hint, not a label.
3. **Review.** A reviewer sets `label` to one of:
   - `confirmed_impersonator`: reviewable evidence it misrepresents the brand (e.g. claims to be official support, asks for credentials/OTP, links to a phishing site, copies the logo while the brand's site does not list it).
   - `official_verified`: listed on the brand's own site / in the registry.
   - `benign_unrelated`: reviewed; another legitimate account (fan page clearly labelled, a different company with the same word, a person).
   - `suspicious_unverified`: worth watching, not proven. Excluded from training and evaluation.
   - `unknown`: insufficient evidence. Excluded from training and evaluation.
   and fills `evidence_summary`, `reviewer_id`, `reviewed_at_utc`, `label_confidence`, `official_profile_source_url`. Confirmed labels should be double-reviewed.
4. **Validate + evaluate.** `python -m backend.app.ml.impersonation_eval --kind social --annotations <queue.csv> --registry <registry.csv>` checks completeness, provenance, conflicts and split leakage, then evaluates the current rules on adjudicated rows only. Only after enough adjudicated rows exist (and a held-out set by brand) is a Task A model trained.

Privacy: profiles are personal data even when public. `data/` is git-ignored; keep it private and delete it when the study ends. Follow each platform's current developer terms; stop if they change.

## Access request: The Imitation Game (USENIX Security 2024)

To: corresponding author(s) listed on the paper, CISPA Helmholtz Center for Information Security

Subject: Research data access request: The Imitation Game (USENIX Security 2024) brand-impersonation dataset

> Dear Dr. Acharya and co-authors,
>
> I am [name], [role] at [institution]. I am working on SURAKSHA, a research prototype that helps brands find and review accounts impersonating them on social platforms, and your paper "The Imitation Game: Exploring Brand Impersonation Attacks on Social Media Platforms" is the closest prior work to ours.
>
> Would it be possible to access the labelled data behind the paper (the squatting / impersonating profiles and the legitimate controls), or a subset of it? We would also be grateful for:
>
> 1. the schema and field definitions;
> 2. the annotation methodology: how an account was confirmed as impersonating, inter-annotator agreement, and how official accounts were verified;
> 3. the licence and terms of use, in particular whether research use, derivative models, and any commercial use are permitted, and any redistribution limits;
> 4. any platform-terms constraints (for example X, Instagram, Telegram, YouTube) that apply to sharing the records, and whether identifiers only (to re-collect ourselves) would be preferable;
> 5. how you would like the work to be cited.
>
> We would use the data only for research evaluation, keep it private and access-controlled, not redistribute it, and delete it on request. We are happy to sign a data-use agreement and to share our evaluation results with you.
>
> Thank you for considering this request.
>
> Kind regards,
> [name, institution, institutional email]

Access has **not** been granted; this is a draft for you to send.
