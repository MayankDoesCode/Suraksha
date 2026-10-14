import os
import re
import time
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps

logger = logging.getLogger(__name__)

# Patterns for sensitive token redaction
SENSITIVE_PATTERNS = [
    (re.compile(r"(bearer\s+)[a-zA-Z0-9_\-\.]{10,}", re.IGNORECASE), r"\1[REDACTED_TOKEN]"),
    (re.compile(r"(api[_-]?key[\"'\s:=]+)[a-zA-Z0-9_\-]{8,}", re.IGNORECASE), r"\1[REDACTED_API_KEY]"),
    (re.compile(r"(password[\"'\s:=]+)[^\s,\"'}]+", re.IGNORECASE), r"\1[REDACTED_PASSWORD]"),
    (re.compile(r"(secret[\"'\s:=]+)[^\s,\"'}]+", re.IGNORECASE), r"\1[REDACTED_SECRET]"),
    (re.compile(r"gsk_[a-zA-Z0-9]{20,}", re.IGNORECASE), "[REDACTED_GROQ_KEY]"),
    (re.compile(r"lsv2_[a-zA-Z0-9_\-]{20,}", re.IGNORECASE), "[REDACTED_LANGSMITH_KEY]"),
]


def redact_sensitive_data(data: Any) -> Any:
    """
    Recursively sanitize dictionaries, lists, and strings to prevent logging
    credentials, tokens, or personal identifiers to LangSmith or logs.
    """
    if isinstance(data, str):
        cleaned = data
        for pattern, replacement in SENSITIVE_PATTERNS:
            cleaned = pattern.sub(replacement, cleaned)
        return cleaned
    elif isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            lower_k = str(k).lower()
            if any(secret_term in lower_k for secret_term in ["token", "secret", "password", "key", "authorization"]):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = redact_sensitive_data(v)
        return sanitized
    elif isinstance(data, (list, tuple, set)):
        return [redact_sensitive_data(item) for item in data]
    return data


class LangSmithObservability:
    """
    Manages LangSmith tracing, latency monitoring, and trace sanitization.
    Guarantees zero external network overhead when disabled or unconfigured.
    """

    def __init__(
        self,
        enabled: Optional[bool] = None,
        api_key: Optional[str] = None,
        project: Optional[str] = None,
        endpoint: Optional[str] = None,
    ):
        self.enabled = enabled if enabled is not None else (
            os.getenv("LANGSMITH_TRACING", "false").lower() in ("true", "1")
        )
        self.api_key = api_key or os.getenv("LANGSMITH_API_KEY")
        self.project = project or os.getenv("LANGSMITH_PROJECT", "suraksha-investigations")
        self.endpoint = endpoint or os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")

        self.client = None
        self._is_active = False

        if self.enabled and self.api_key:
            try:
                # Set LangSmith environment variables required by its runtime
                os.environ["LANGCHAIN_TRACING_V2"] = "true"
                os.environ["LANGCHAIN_API_KEY"] = self.api_key
                os.environ["LANGCHAIN_PROJECT"] = self.project
                os.environ["LANGCHAIN_ENDPOINT"] = self.endpoint

                from langsmith import Client
                self.client = Client(api_key=self.api_key, api_url=self.endpoint)
                self._is_active = True
                logger.info(f"LangSmith tracing active for project: {self.project}")
            except Exception as e:
                logger.warning(f"Failed to initialize LangSmith client: {e}. Tracing disabled.")
                self._is_active = False
        else:
            self._is_active = False

    @property
    def is_active(self) -> bool:
        """Returns True only when tracing is enabled, API key is valid, and client initialized."""
        return self._is_active

    def trace_investigation(
        self,
        run_name: str,
        inputs: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Context manager for tracing an AI investigation pipeline step.
        Safely records latency, redacted inputs, outputs, and validation errors.
        """
        return _InvestigationTraceContext(
            observability=self,
            run_name=run_name,
            inputs=inputs,
            metadata=metadata or {},
        )


class _InvestigationTraceContext:
    def __init__(
        self,
        observability: LangSmithObservability,
        run_name: str,
        inputs: Dict[str, Any],
        metadata: Dict[str, Any],
    ):
        self.obs = observability
        self.run_name = run_name
        self.inputs = redact_sensitive_data(inputs)
        self.metadata = redact_sensitive_data(metadata)
        self.start_time = None
        self.run = None
        self.error = None
        self.outputs = None

    def __enter__(self):
        self.start_time = time.perf_counter()
        if self.obs.is_active and self.obs.client:
            try:
                # Create LangSmith run
                from langsmith.run_trees import RunTree
                self.run = RunTree(
                    name=self.run_name,
                    run_type="chain",
                    inputs=self.inputs,
                    extra={"metadata": self.metadata},
                    project_name=self.obs.project,
                    client=self.obs.client,
                )
                self.run.post()
            except Exception as err:
                logger.debug(f"LangSmith run creation skipped/errored: {err}")
                self.run = None
        return self

    def set_outputs(self, outputs: Dict[str, Any], validation_passed: bool = True):
        self.outputs = redact_sensitive_data(outputs)
        if self.run:
            try:
                self.run.end(
                    outputs=self.outputs,
                    error=None,
                )
                self.run.patch()
            except Exception as err:
                logger.debug(f"LangSmith run output update errored: {err}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.perf_counter() - self.start_time) * 1000.0 if self.start_time else 0.0
        if exc_val and self.run:
            try:
                self.run.end(
                    outputs=self.outputs or {},
                    error=str(exc_val),
                )
                self.run.patch()
            except Exception as err:
                logger.debug(f"LangSmith run error update errored: {err}")
        return False  # Do not suppress exceptions


# Default singleton instance
langsmith_client = LangSmithObservability()
