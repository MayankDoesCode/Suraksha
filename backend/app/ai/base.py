from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseAIService(ABC):
    """
    Provider-independent AI assistance interface.
    
    CRITICAL ARCHITECTURAL CONSTRAINTS:
    1. AI never acts as the sole fraud decider or evidence creator.
    2. Detection signals are computed deterministically.
    3. AI functions purely as an analyst copilot for narrative synthesis and explanation.
    4. The entire platform functions normally even when no AI key is configured.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Return True only if AI credentials are configured and provider is reachable."""
        pass

    @abstractmethod
    def summarize_evidence(self, evidence_items: List[Dict[str, Any]]) -> str:
        """Synthesize collected candidate facts into a concise analyst executive summary."""
        pass

    @abstractmethod
    def generate_investigation_brief(
        self,
        brand_profile: Dict[str, Any],
        finding: Dict[str, Any],
        signals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate human-readable investigative context explaining why signals were triggered."""
        pass
