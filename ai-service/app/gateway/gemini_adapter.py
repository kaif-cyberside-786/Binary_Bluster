"""
Gemini Adapter for MPLADS AI Gateway
Invokes Google Gemini API with strict data minimization (structured de-identified evidence only).
Adheres to architecture.md §13, §15.5 and rules.md §10, §12.
"""
import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple

logger = logging.getLogger("mplads.gateway.gemini")

GEMINI_API_KEY_ENV = "GEMINI_API_KEY"
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_TIMEOUT_SEC = 8.0

SYSTEM_INSTRUCTION = (
    "You are an AI decision-support assistant for the Member of Parliament Local Area Development Scheme (MPLADS) in India. "
    "Your sole purpose is to produce a concise, professional, explainable government advisory narrative based on already-calculated statistical and compliance evidence. "
    "RULES: "
    "1. Strictly advisory: Use phrases like 'Review recommended', 'Possible repeated or overlapping work', 'Technical estimate exceeds historical benchmark'. "
    "2. NEVER use accusatory language: NEVER say 'fraud', 'fraudster', 'corruption', 'corrupt', 'fake', 'raid', or 'guilty'. "
    "3. NEVER state or imply government decisions: NEVER say 'AI approves', 'AI rejects', or 'payment stopped'. The human official makes all decisions. "
    "4. Base your summary strictly and only on the supplied metrics. "
    "5. Keep explanation under 120 words in clean bulleted structure."
)


def _build_deterministic_fallback(overall_score: int, risk_level: str, top_contributors: list) -> str:
    """Deterministic, explainable rule-based explanation when LLM is unavailable."""
    lines = [f"Overall Risk: {risk_level} — {overall_score}"]
    if top_contributors:
        lines.append("\nMain contributing signals:")
        for c in top_contributors[:3]:
            sig_type = c.get("type", "").replace("_", " ").title()
            severity = c.get("severity", "MEDIUM")
            reason = c.get("reason", "Elevated variance detected")
            lines.append(f"• {sig_type} — {severity}: {reason}.")
    lines.append("\nReview recommended by authorized administrative official before decision.")
    return "\n".join(lines)


class GeminiAdapter:
    def __init__(self, api_key: str = None, model: str = None, timeout_sec: float = DEFAULT_TIMEOUT_SEC):
        self.api_key = api_key.strip() if api_key is not None else os.getenv(GEMINI_API_KEY_ENV, "").strip()
        self.model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
        self.timeout_sec = timeout_sec

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(
        self,
        overall_score: int,
        risk_level: str,
        category: str,
        top_contributors: list,
        evidence: Dict[str, Any],
    ) -> Tuple[str, str, str]:
        """
        Generate explanation using Gemini.
        Returns (status, explanation_text, model_name).
        """
        # If API key is not configured, gracefully return AI_ANALYSIS_UNAVAILABLE per Section 14
        if not self.is_configured():
            logger.info("Gemini API key not configured. Returning AI_ANALYSIS_UNAVAILABLE.")
            fallback_text = (
                "AI analysis temporarily unavailable (provider credentials not configured). "
                "The risk score and underlying evidence are still available for review.\n\n"
                + _build_deterministic_fallback(overall_score, risk_level, top_contributors)
            )
            return "AI_ANALYSIS_UNAVAILABLE", fallback_text, self.model

        # Build de-identified structured evidence payload
        sanitized_contributors = []
        for c in top_contributors:
            sanitized_contributors.append({
                "signal": c.get("type"),
                "severity": c.get("severity"),
                "score": c.get("score"),
                "reason": c.get("reason"),
            })

        evidence_summary = {
            "overall_score": overall_score,
            "risk_level": risk_level,
            "category": category,
            "contributors": sanitized_contributors,
            "metrics": {
                k: v for k, v in evidence.items()
                if isinstance(v, (int, float, bool, str)) and k not in ("token", "password", "email", "name")
            },
        }

        user_prompt = (
            f"Explain the following MPLADS project risk assessment based strictly on these metrics:\n"
            f"{json.dumps(evidence_summary, indent=2)}\n\n"
            f"Summarize the overall risk level and the top 2-3 contributing factors. Emphasize advisory review."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_INSTRUCTION}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "thinkingConfig": {
                    "thinkingBudget": 0
                },
            },
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(request_body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            try:
                response = urllib.request.urlopen(req, timeout=self.timeout_sec)
            except urllib.error.HTTPError as http_err:
                # If thinkingConfig caused 400 on an older model, retry without thinkingConfig
                if http_err.code == 400 and "thinkingConfig" in request_body.get("generationConfig", {}):
                    request_body["generationConfig"].pop("thinkingConfig", None)
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(request_body).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    response = urllib.request.urlopen(req, timeout=self.timeout_sec)
                else:
                    raise http_err

            with response:
                if response.status != 200:
                    logger.warning(f"Gemini returned HTTP {response.status}")
                    return (
                        "AI_ANALYSIS_UNAVAILABLE",
                        "AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.",
                        self.model,
                    )

                resp_data = json.loads(response.read().decode("utf-8"))
                candidates = resp_data.get("candidates", [])
                if not candidates:
                    return (
                        "AI_ANALYSIS_UNAVAILABLE",
                        "AI analysis temporarily unavailable (empty model response).",
                        self.model,
                    )

                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                if not text:
                    return (
                        "AI_ANALYSIS_UNAVAILABLE",
                        "AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.",
                        self.model,
                    )

                return "AI_ANALYSIS_COMPLETE", text, self.model

        except urllib.error.HTTPError as e:
            logger.warning(f"Gemini HTTPError {e.code}: {e.reason}")
            return (
                "AI_ANALYSIS_UNAVAILABLE",
                "AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.",
                self.model,
            )
        except Exception as err:
            logger.warning(f"Gemini request exception: {str(err)}")
            return (
                "AI_ANALYSIS_UNAVAILABLE",
                "AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.",
                self.model,
            )

