from typing import List, Dict, Any
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

from backend.app.ai.feature_extractor import ThreatFeatureExtractor


class TextFeatureExtractorTransformer(BaseEstimator, TransformerMixin):
    """Transformer extracting textual representation for TF-IDF vectorization."""

    def fit(self, X, y=None):
        return self

    def transform(self, X: List[Dict[str, Any]]):
        corpus = []
        for item in X:
            extracted = ThreatFeatureExtractor.extract_record_features(item)
            corpus.append(extracted["combined_text"])
        return corpus


class DenseFeatureExtractorTransformer(BaseEstimator, TransformerMixin):
    """Transformer extracting dense numeric and categorical indicators."""

    def fit(self, X, y=None):
        return self

    def transform(self, X: List[Dict[str, Any]]) -> np.ndarray:
        vectors = []
        for item in X:
            extracted = ThreatFeatureExtractor.extract_record_features(item)
            vectors.append(extracted["dense_features"])
        return np.array(vectors, dtype=np.float32)


def build_risk_classification_pipeline(
    random_state: int = 42,
    n_estimators: int = 100,
    max_depth: int = 6
) -> Pipeline:
    """
    Construct a unified end-to-end preprocessing and classification pipeline.
    Accepts raw candidate dicts directly for both training and inference.
    """
    feature_union = FeatureUnion([
        (
            "text_branch",
            Pipeline([
                ("extract_text", TextFeatureExtractorTransformer()),
                (
                    "tfidf",
                    TfidfVectorizer(
                        max_features=80,
                        ngram_range=(1, 2),
                        sublinear_tf=True,
                        stop_words="english",
                    )
                ),
            ])
        ),
        (
            "dense_branch",
            Pipeline([
                ("extract_dense", DenseFeatureExtractorTransformer()),
                ("scaler", StandardScaler(with_mean=False)),
            ])
        ),
    ])

    classifier = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=3,
        class_weight="balanced",
        random_state=random_state,
    )

    return Pipeline([
        ("features", feature_union),
        ("classifier", classifier),
    ])
