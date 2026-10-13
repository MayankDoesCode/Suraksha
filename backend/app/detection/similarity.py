import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

SUSPICIOUS_KEYWORDS = [
    "support",
    "help",
    "official",
    "care",
    "customercare",
    "service",
    "desk",
    "security",
    "kyc",
    "claims",
    "verify",
    "verification",
    "login",
    "portal",
    "secure",
    "pay",
    "alert",
    "billing",
    "app",
    "mobile",
    "loan",
    "cash",
    "wallet",
    "credit",
    "invest",
    "refund",
    "reward",
    "banking",
]

# Common leetspeak substitutions
LEET_MAP = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "@": "a",
    "$": "s",
}

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate the minimum edit operations (insert, delete, substitute) between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


@dataclass
class SimilarityResult:
    """Explainable similarity comparison result."""
    similarity_score: float             # Normalized 0.0 to 1.0
    match_type: str                     # 'EXACT', 'CLOSE_VARIANT', 'KEYWORD_COMPOUND', 'SUBSTRING', 'LOW'
    target_name: str
    candidate_name: str
    normalized_target: str
    normalized_candidate: str
    detected_keywords: List[str] = field(default_factory=list)
    explanation: str = ""


class NameSimilarityService:
    """
    Deterministic name similarity and normalization engine.
    Detects typosquatting, character substitutions, keyword additions, and casing changes.
    """

    @staticmethod
    def normalize_text(text: Optional[str]) -> str:
        """
        Normalize text:
        - Lowercases
        - Strips handle symbols (@) and common URL schemes
        - Replaces punctuation/separators (_, -, ., /, +) with spaces
        - Collapses duplicate whitespaces
        """
        if not text:
            return ""
        s = str(text).strip().lower()
        # Strip URL prefixes if present
        s = re.sub(r"^https?://(www\.)?", "", s)
        # Strip leading @
        s = re.sub(r"^@+", "", s)
        # Replace common separators with spaces
        s = re.sub(r"[\-_./+:]+", " ", s)
        # Remove other non-alphanumeric except spaces
        s = re.sub(r"[^\w\s]", "", s)
        # Collapse multiple spaces
        s = re.sub(r"\s+", " ", s).strip()
        return s

    @staticmethod
    def normalize_compact(text: Optional[str]) -> str:
        """Normalize into a continuous alphanumeric string (no spaces or separators)."""
        normalized = NameSimilarityService.normalize_text(text)
        return re.sub(r"\s+", "", normalized)

    @classmethod
    def apply_deleet(cls, text: str) -> str:
        """Convert known leetspeak digits/symbols to alphabet equivalents."""
        result = []
        for char in text.lower():
            result.append(LEET_MAP.get(char, char))
        return "".join(result)

    @classmethod
    def extract_suspicious_keywords(cls, text: str) -> List[str]:
        """Detect presence of brand-squatting or customer support mimicry keywords."""
        normalized = cls.normalize_text(text)
        tokens = set(normalized.split())
        compact = cls.normalize_compact(text)

        found = []
        for kw in SUSPICIOUS_KEYWORDS:
            if kw in tokens:
                found.append(kw)
            elif len(kw) >= 4 and kw in compact:
                # e.g., 'acmecustomercare' contains 'customercare'
                if kw not in found:
                    found.append(kw)
        return sorted(found)

    @classmethod
    def compare(cls, candidate: str, target: str) -> SimilarityResult:
        """
        Compare candidate name against target name and produce an explainable SimilarityResult.
        """
        norm_candidate = cls.normalize_text(candidate)
        norm_target = cls.normalize_text(target)

        compact_cand = cls.normalize_compact(candidate)
        compact_target = cls.normalize_compact(target)

        if not norm_candidate or not norm_target:
            return SimilarityResult(
                similarity_score=0.0,
                match_type="LOW",
                target_name=target,
                candidate_name=candidate,
                normalized_target=norm_target,
                normalized_candidate=norm_candidate,
                detected_keywords=[],
                explanation="Empty candidate or target string provided."
            )

        # 1. Exact Match Check
        if norm_candidate == norm_target or compact_cand == compact_target:
            return SimilarityResult(
                similarity_score=1.0,
                match_type="EXACT",
                target_name=target,
                candidate_name=candidate,
                normalized_target=norm_target,
                normalized_candidate=norm_candidate,
                detected_keywords=[],
                explanation=f"Exact match between candidate '{candidate}' and target '{target}'."
            )

        # Extract suspicious keywords in candidate
        keywords = cls.extract_suspicious_keywords(candidate)

        # Check leetspeak variant
        deleet_cand = cls.apply_deleet(compact_cand)
        deleet_target = cls.apply_deleet(compact_target)
        is_leet_match = (deleet_cand == deleet_target and compact_cand != compact_target)

        # 2. Levenshtein edit distance on compact strings
        max_len = max(len(compact_cand), len(compact_target))
        edit_dist = levenshtein_distance(compact_cand, compact_target)
        edit_similarity = 1.0 - (edit_dist / max_len) if max_len > 0 else 0.0

        # 3. Keyword Compound Check (e.g. "Acme Support", "Acme Official", "acme_care")
        contains_target = (
            compact_target in compact_cand or
            norm_target in norm_candidate
        )

        if is_leet_match:
            score = 0.90
            match_type = "CLOSE_VARIANT"
            explanation = (
                f"Candidate '{candidate}' is a character substitution (homoglyph/leetspeak) "
                f"variant of '{target}'."
            )
        elif contains_target:
            score = 0.86 if keywords else 0.76
            match_type = "KEYWORD_COMPOUND" if keywords else "SUBSTRING"
            kw_detail = f" with trust keyword(s): {keywords}" if keywords else " with additional terms"
            explanation = (
                f"Candidate '{candidate}' incorporates the verified brand name '{target}'{kw_detail}."
            )
        elif edit_similarity >= 0.80:
            score = round(edit_similarity, 2)
            match_type = "CLOSE_VARIANT"
            explanation = (
                f"Candidate '{candidate}' is a close spelling variation of '{target}' "
                f"({int(score * 100)}% edit similarity, {edit_dist} character difference)."
            )
        elif edit_similarity >= 0.65:
            score = round(edit_similarity, 2)
            match_type = "SUBSTRING"
            explanation = (
                f"Candidate '{candidate}' shares moderate name similarity with '{target}' "
                f"({int(score * 100)}% similarity)."
            )
        else:
            score = round(edit_similarity, 2)
            match_type = "LOW"
            explanation = (
                f"Candidate '{candidate}' has low phonetic and lexical similarity ({int(score * 100)}%) "
                f"to brand '{target}'."
            )

        return SimilarityResult(
            similarity_score=score,
            match_type=match_type,
            target_name=target,
            candidate_name=candidate,
            normalized_target=norm_target,
            normalized_candidate=norm_candidate,
            detected_keywords=keywords,
            explanation=explanation
        )
