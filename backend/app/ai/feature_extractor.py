import re
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse

from backend.app.detection.similarity import NameSimilarityService, SUSPICIOUS_KEYWORDS

SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "cc",
    "online", "download", "site", "info", "vip", "work", "icu",
}

NUMERIC_FEATURE_NAMES = [
    "name_similarity",
    "exact_name_match",
    "contains_brand_name",
    "is_leet_match",
    "candidate_name_length",
    "length_diff",
    "suspicious_keyword_count",
    "has_suspicious_keyword",
    "has_publisher",
    "publisher_match",
    "publisher_similarity",
    "has_url",
    "url_length",
    "has_suspicious_tld",
    "domain_matches_official",
    "is_social",
    "is_mobile_app",
    "is_domain",
    "has_description",
    "description_length",
]


class ThreatFeatureExtractor:
    """
    Extracts lexical, structural, keyword, and entity relationship features
    from candidate digital risk assets against verified brand profiles.
    
    Guarantees:
    - Safe handling of missing, empty, or malformed fields.
    - Zero active network requests (purely offline feature extraction).
    - Consistent feature schemas between training and live inference.
    """

    @classmethod
    def get_feature_names(cls) -> List[str]:
        return list(NUMERIC_FEATURE_NAMES)

    @classmethod
    def extract_record_features(
        cls,
        candidate_data: Dict[str, Any],
        brand_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract numeric features and textual representation for a single candidate record.
        """
        candidate_data = candidate_data or {}
        brand_profile = brand_profile or {}

        # 1. Resolve Brand Baseline
        brand_name = (
            brand_profile.get("name") or
            brand_profile.get("brand_name") or
            candidate_data.get("brand_name") or ""
        ).strip()

        official_publishers = [
            p.get("publisher_name", "").strip().lower()
            if isinstance(p, dict) else str(p).strip().lower()
            for p in (brand_profile.get("publishers") or candidate_data.get("official_publishers") or [])
            if p
        ]

        official_domains = [
            d.get("domain", "").strip().lower()
            if isinstance(d, dict) else str(d).strip().lower()
            for d in (brand_profile.get("domains") or candidate_data.get("official_domains") or [])
            if d
        ]

        # 2. Candidate Metadata Fields
        candidate_name = str(
            candidate_data.get("candidate_name") or
            candidate_data.get("handle") or
            candidate_data.get("app_name") or ""
        ).strip()

        display_name = str(candidate_data.get("display_name") or "").strip()
        publisher_name = str(
            candidate_data.get("publisher_name") or
            candidate_data.get("developer") or ""
        ).strip()
        description = str(candidate_data.get("description") or "").strip()
        source_url = str(
            candidate_data.get("source_url") or
            candidate_data.get("profile_url") or ""
        ).strip()
        website_url = str(
            candidate_data.get("website_url") or
            candidate_data.get("website") or ""
        ).strip()
        package_id = str(
            candidate_data.get("package_id") or
            candidate_data.get("identifier") or ""
        ).strip()
        asset_type = str(candidate_data.get("asset_type") or "social").strip().lower()

        # 3. Name & Similarity Signals
        sim_result = NameSimilarityService.compare(candidate_name, brand_name)
        name_similarity = float(sim_result.similarity_score)
        exact_name_match = 1.0 if sim_result.match_type == "EXACT" else 0.0

        norm_cand = NameSimilarityService.normalize_compact(candidate_name)
        norm_brand = NameSimilarityService.normalize_compact(brand_name)
        contains_brand_name = 1.0 if (norm_brand and norm_brand in norm_cand) else 0.0

        deleet_cand = NameSimilarityService.apply_deleet(norm_cand)
        deleet_brand = NameSimilarityService.apply_deleet(norm_brand)
        is_leet_match = 1.0 if (deleet_cand == deleet_brand and norm_cand != norm_brand) else 0.0

        candidate_name_length = float(len(candidate_name))
        length_diff = float(abs(len(candidate_name) - len(brand_name)))

        # 4. Keyword Mimicry Analysis
        all_text_content = f"{candidate_name} {display_name} {description} {package_id}".lower()
        extracted_keywords = NameSimilarityService.extract_suspicious_keywords(all_text_content)
        suspicious_keyword_count = float(len(extracted_keywords))
        has_suspicious_keyword = 1.0 if suspicious_keyword_count > 0 else 0.0

        # 5. Publisher / Developer Relationship
        has_publisher = 1.0 if publisher_name else 0.0
        publisher_match = 0.0
        publisher_similarity = 0.0

        if publisher_name and official_publishers:
            pub_norm = publisher_name.lower()
            is_match = any(
                pub_norm == off_pub or pub_norm in off_pub or off_pub in pub_norm
                for off_pub in official_publishers
            )
            if is_match:
                publisher_match = 1.0
                publisher_similarity = 1.0
            else:
                publisher_match = -1.0  # Explicit mismatch flag
                # Best partial similarity
                best_sim = max(
                    NameSimilarityService.compare(publisher_name, off).similarity_score
                    for off in official_publishers
                )
                publisher_similarity = float(best_sim)

        # 6. Domain & URL Characteristics
        target_url = website_url or source_url
        has_url = 1.0 if target_url else 0.0
        url_length = float(len(target_url))
        has_suspicious_tld = 0.0
        domain_matches_official = 0.0

        if target_url:
            parsed = urlparse(target_url if "://" in target_url else f"http://{target_url}")
            domain = (parsed.netloc or parsed.path).lower().split(":")[0]
            if domain.startswith("www."):
                domain = domain[4:]

            tld = domain.split(".")[-1] if "." in domain else ""
            if tld in SUSPICIOUS_TLDS:
                has_suspicious_tld = 1.0

            if official_domains:
                is_official_domain = any(
                    domain == off_d or domain.endswith(f".{off_d}")
                    for off_d in official_domains
                )
                domain_matches_official = 1.0 if is_official_domain else -1.0

        # 7. Asset Type Categorical Flags
        is_social = 1.0 if asset_type == "social" else 0.0
        is_mobile_app = 1.0 if asset_type in ("mobile_app", "app") else 0.0
        is_domain = 1.0 if asset_type == "domain" else 0.0

        # 8. Description & Metadata Completeness
        has_description = 1.0 if len(description) > 0 else 0.0
        description_length = float(len(description))

        # 9. Synthetic text corpus for TF-IDF
        combined_text = (
            f"type_{asset_type} "
            f"cand_{candidate_name} "
            f"disp_{display_name} "
            f"brand_{brand_name} "
            f"pub_{publisher_name} "
            f"desc_{description} "
            f"url_{target_url}"
        ).strip().lower()

        dense_vector = [
            name_similarity,
            exact_name_match,
            contains_brand_name,
            is_leet_match,
            candidate_name_length,
            length_diff,
            suspicious_keyword_count,
            has_suspicious_keyword,
            has_publisher,
            publisher_match,
            publisher_similarity,
            has_url,
            url_length,
            has_suspicious_tld,
            domain_matches_official,
            is_social,
            is_mobile_app,
            is_domain,
            has_description,
            description_length,
        ]

        return {
            "combined_text": combined_text,
            "dense_features": dense_vector,
            "feature_dict": dict(zip(NUMERIC_FEATURE_NAMES, dense_vector)),
            "brand_name": brand_name,
            "candidate_name": candidate_name,
            "asset_type": asset_type,
        }

    @classmethod
    def extract_batch(
        cls,
        dataset: List[Dict[str, Any]]
    ) -> Tuple[List[str], List[List[float]], List[str]]:
        """
        Extract text corpus and dense feature matrix across a batch of candidate records.
        Returns:
            (text_list, dense_matrix, feature_names)
        """
        text_corpus = []
        dense_matrix = []
        for record in dataset:
            extracted = cls.extract_record_features(record)
            text_corpus.append(extracted["combined_text"])
            dense_matrix.append(extracted["dense_features"])
        return text_corpus, dense_matrix, cls.get_feature_names()
