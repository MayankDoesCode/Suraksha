# Real-data evaluation

116 hand-labelled live handles (33 impersonators).

| Method | Precision | Recall | F1 | TP | FP | FN |
|---|---|---|---|---|---|---|
| Suraksha detector (score >= 40) | 0.689 | 0.939 | 0.795 | 31 | 14 | 2 |
| Look-alike ML model | 0.35 | 0.636 | 0.452 | 21 | 39 | 12 |
| String-similarity rule | 0.0 | 0.0 | 0.0 | 0 | 15 | 33 |

## Errors of the Suraksha detector

| Brand | Handle | Score | Label | Error |
|---|---|---|---|---|
| Paytm | paytm-temp | 21.6 | impersonator | missed |
| HDFC Bank | HDFCBANK | 45.0 | unrelated | false positive |
| Swiggy | swiggystardust.bsky.social | 45.0 | unrelated | false positive |
| Swiggy | swiggsyswigs.bsky.social | 45.0 | unrelated | false positive |
| Swiggy | swageleska.bsky.social | 45.0 | unrelated | false positive |
| Swiggy | achilleanexpress.bsky.social | 45.0 | unrelated | false positive |
| Airtel | airtel1234.bsky.social | 21.6 | impersonator | missed |
| Jio | starboyxcx.bsky.social | 45.0 | unrelated | false positive |
| Jio | jorrbi.bsky.social | 45.0 | unrelated | false positive |
| Jio | jio@ioc.exchange | 45.0 | unrelated | false positive |
| Jio | jio@ruby.social | 45.0 | unrelated | false positive |
| Jio | nikotinaturner | 45.0 | unrelated | false positive |
| Zerodha | zerodha | 45.0 | unrelated | false positive |
| Binance | binance-app-rank.bsky.social | 74.80000000000001 | unrelated | false positive |
| Netflix | portalnetflix.bsky.social | 74.80000000000001 | unrelated | false positive |
| Netflix | alunamoon.bsky.social | 74.80000000000001 | unrelated | false positive |

Limits: labels by one evaluator; candidates limited to what the live scan surfaced.

## Tuning note
Before tuning (offline rescoring, threshold 40): precision 0.65, recall 0.79, F1 0.71. After adding scam-lure handle words and
down-weighting bare "brand name inside a longer handle" matches: precision 0.69, recall 0.94, F1 0.80.
Caveat: the rules were tuned on these same labelled handles, so the "after" numbers are optimistic. Collect and label a fresh
set of handles for an unbiased check. Remaining false positives are mostly personal accounts whose display name equals the brand
(name alone cannot separate them from impersonators; follower count, account age and bio are needed).
