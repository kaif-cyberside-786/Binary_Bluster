"""
Provider-Neutral AI Gateway for MPLADS Explainability
Abstracts LLM providers (Gemini, Ollama, Mock) behind a unified interface.
Complies with architecture.md §13, ADR 26.4.
"""
from typing import Dict, Any
from app.gateway.gemini_adapter import GeminiAdapter, _build_deterministic_fallback


class MockAdapter:
    """Mock LLM adapter for deterministic unit tests and offline demonstration."""
    def generate(self, overall_score: int, risk_level: str, category: str, top_contributors: list, evidence: Dict[str, Any]):
        explanation = _build_deterministic_fallback(overall_score, risk_level, top_contributors)
        return "AI_ANALYSIS_COMPLETE", f"[Mock LLM Advisory]\n{explanation}", "mock-model"


class OllamaAdapter:
    """Local Ollama adapter with graceful fallback if Ollama service is not running."""
    def __init__(self, base_url: str = None):
        import os
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")

    def generate(self, overall_score: int, risk_level: str, category: str, top_contributors: list, evidence: Dict[str, Any], model: str = None):
        import urllib.request
        import urllib.error
        import json
        import os

        target_model = model or os.getenv("OLLAMA_MODEL", "llama3")
        fallback = _build_deterministic_fallback(overall_score, risk_level, top_contributors)

        prompt = (
            f"You are an AI decision support assistant for MPLADS in India.\n"
            f"Produce an advisory explanation for overall risk {risk_level} (score {overall_score}) in category '{category}'.\n"
            f"Advisory only. Never say fraud or corruption. Maximum 100 words.\n"
            f"Metrics: {json.dumps(evidence)}"
        )

        req_data = json.dumps({
            "model": target_model,
            "prompt": prompt,
            "stream": False,
        }).encode("utf-8")

        try:
            req = urllib.request.Request(
                f"{self.base_url}/api/generate",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    text = data.get("response", "").strip()
                    if text:
                        return "AI_ANALYSIS_COMPLETE", text, target_model
        except Exception:
            pass

        return "AI_ANALYSIS_UNAVAILABLE", f"Ollama local model not running.\n{fallback}", target_model


class AIGateway:
    def __init__(self):
        self.gemini_adapter = GeminiAdapter()
        self.mock_adapter = MockAdapter()
        self.ollama_adapter = OllamaAdapter()

    def generate_explanation(
        self,
        overall_score: int,
        risk_level: str,
        category: str = "",
        top_contributors: list = None,
        evidence: Dict[str, Any] = None,
        provider: str = "gemini",
        model: str = None,
        api_key: str = None,
    ):
        top_contributors = top_contributors or []
        evidence = evidence or {}

        # Provider routing
        prov = (provider or "gemini").lower().strip()
        if prov == "mock":
            status, text, used_model = self.mock_adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence
            )
        elif prov == "ollama":
            status, text, used_model = self.ollama_adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence, model=model
            )
        else:
            adapter = GeminiAdapter(api_key=api_key, model=model) if (api_key is not None or model) else self.gemini_adapter
            status, text, used_model = adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence
            )

        return {
            "status": status,
            "explanation": text,
            "provider": prov,
            "model": used_model,
            "data_minimized": True,
        }


ai_gateway = AIGateway()

