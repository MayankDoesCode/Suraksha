"""
Webhook Alert Dispatcher for SURAKSHA SecOps Integrations.
Formats and dispatches threat alerts to Slack, Discord, Microsoft Teams, and custom SIEM webhooks.
"""

import json
import logging
import time
from typing import Any, Dict, Optional
import requests

logger = logging.getLogger(__name__)


class WebhookService:
    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    @staticmethod
    def detect_platform(webhook_url: str) -> str:
        """Infer target platform from webhook URL."""
        url_lower = webhook_url.lower()
        if "hooks.slack.com" in url_lower:
            return "slack"
        if "discord.com/api/webhooks" in url_lower:
            return "discord"
        if "webhook.office.com" in url_lower or "office365.com" in url_lower:
            return "teams"
        return "generic"

    def format_payload(self, platform: str, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format standardized threat alert payload for the target platform."""
        brand_name = alert_data.get("brand_name", "Protected Brand")
        asset_identifier = alert_data.get("asset_identifier", "Unknown Target")
        asset_type = alert_data.get("asset_type", "domain").upper()
        severity = alert_data.get("severity", "CRITICAL").upper()
        score = alert_data.get("risk_score", 90.0)
        signals = alert_data.get("signals", [])
        summary = alert_data.get("summary", "Suspected brand impersonation detected by SURAKSHA Watchtower.")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())

        color_hex = "#dc2626" if severity == "CRITICAL" else "#ea580c" if severity == "HIGH" else "#eab308"
        color_int = 0xDC2626 if severity == "CRITICAL" else 0xEA580C if severity == "HIGH" else 0xEAB308

        if platform == "slack":
            return {
                "text": f"🚨 [SURAKSHA ALERT] {severity} {asset_type} impersonating {brand_name}: {asset_identifier}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"🚨 SURAKSHA Threat Alert: {severity} Risk Detected",
                            "emoji": True,
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Protected Brand:*\n{brand_name}"},
                            {"type": "mrkdwn", "text": f"*Threat Type:*\n{asset_type}"},
                            {"type": "mrkdwn", "text": f"*Offending Asset:*\n`{asset_identifier}`"},
                            {"type": "mrkdwn", "text": f"*Algorithmic Score:*\n{score}/100 ({severity})"},
                        ],
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Investigation Summary:*\n{summary}\n*Signals:* {', '.join(signals) if signals else 'None'}",
                        },
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Detected by SURAKSHA Threat Intelligence · {timestamp}",
                            }
                        ],
                    },
                ],
            }

        if platform == "discord":
            return {
                "username": "SURAKSHA Watchtower",
                "avatar_url": "https://suraksha-platform.onrender.com/logo.png",
                "embeds": [
                    {
                        "title": f"🚨 Threat Detected: {asset_identifier}",
                        "description": summary,
                        "color": color_int,
                        "fields": [
                            {"name": "Brand", "value": brand_name, "inline": True},
                            {"name": "Type", "value": asset_type, "inline": True},
                            {"name": "Severity", "value": f"{severity} ({score}/100)", "inline": True},
                            {"name": "Signals", "value": ", ".join(signals) if signals else "None", "inline": False},
                        ],
                        "footer": {"text": f"SURAKSHA Digital Risk Protection · {timestamp}"},
                    }
                ],
            }

        if platform == "teams":
            return {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": color_hex.lstrip("#"),
                "summary": f"SURAKSHA Alert: {severity} Risk for {brand_name}",
                "sections": [
                    {
                        "activityTitle": f"🚨 SURAKSHA Alert: {severity} Risk on {asset_type}",
                        "activitySubtitle": f"Brand Target: {brand_name} · {timestamp}",
                        "facts": [
                            {"name": "Asset", "value": asset_identifier},
                            {"name": "Severity", "value": f"{severity} ({score}/100)"},
                            {"name": "Signals", "value": ", ".join(signals) if signals else "None"},
                        ],
                        "markdown": True,
                        "text": summary,
                    }
                ],
            }

        # Generic SIEM webhook JSON payload
        return {
            "source": "SURAKSHA",
            "event_type": "threat_alert",
            "timestamp": timestamp,
            "brand": brand_name,
            "threat": {
                "identifier": asset_identifier,
                "type": asset_type.lower(),
                "severity": severity,
                "score": score,
                "summary": summary,
                "signals": signals,
            },
        }

    def dispatch(self, webhook_url: str, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch formatted alert to destination webhook."""
        if not webhook_url or not webhook_url.startswith(("http://", "https://")):
            raise ValueError("Invalid webhook URL: Must begin with http:// or https://")

        platform = self.detect_platform(webhook_url)
        payload = self.format_payload(platform, alert_data)

        try:
            resp = requests.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=self.timeout,
            )
            return {
                "success": resp.status_code in (200, 201, 204),
                "platform": platform,
                "status_code": resp.status_code,
                "delivered_at": time.time(),
                "response_text": resp.text[:200],
            }
        except Exception as exc:
            logger.error("Failed to dispatch webhook alert to %s: %s", webhook_url, exc)
            return {
                "success": False,
                "platform": platform,
                "error": str(exc),
                "delivered_at": time.time(),
            }
