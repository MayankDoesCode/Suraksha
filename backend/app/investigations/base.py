from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime

@dataclass
class EvidenceArtifact:
    """Immutable evidence captured during candidate observation."""
    id: str
    source_type: str        # 'web_page', 'social_profile', 'app_listing'
    source_url: str
    observed_at: str
    snapshot_hash: Optional[str] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)
    analyst_verified: bool = False

@dataclass
class ThreatCampaignCorrelation:
    """Cross-platform threat correlation connecting multiple sightings into a campaign."""
    campaign_id: str
    correlated_finding_ids: List[str]
    correlation_vectors: List[str]  # e.g., ['shared_registrar', 'identical_logo_phash', 'matching_developer_id']
    first_seen: str
    last_seen: str
