"""Host-only feature builder for the URL model. Lives in the app package so the saved artifact does not depend on a script."""
import math

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FunctionTransformer, Pipeline, make_union


def _ent(h):
    c = {ch: h.count(ch) for ch in set(h)}
    return -sum(v / len(h) * math.log2(v / len(h)) for v in c.values()) if h else 0.0


def host_feats(hosts):
    rows = []
    for h in hosts:
        h = str(h); lab = h.split(".")
        rows.append([len(h), h.count("."), h.count("-"), sum(c.isdigit() for c in h) / max(1, len(h)), _ent(h), max(map(len, lab)), int(h.replace(".", "").isdigit()), len(lab[-1]), int("xn--" in h)])
    return np.array(rows, float)


def build(C, cw):
    feats = Pipeline([("f", FunctionTransformer(host_feats)), ("s", StandardScaler())])
    return Pipeline([("u", make_union(TfidfVectorizer(analyzer="char", ngram_range=(2, 5), min_df=3, sublinear_tf=True, max_features=200000), feats)),
                     ("clf", LogisticRegression(C=C, class_weight=cw, max_iter=2000))])
