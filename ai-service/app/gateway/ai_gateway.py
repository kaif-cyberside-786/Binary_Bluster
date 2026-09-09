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
    """Local Ollama adapter placeholder for future air-gapped or local government deployment."""
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url

    def generate(self, overall_score: int, risk_level: str, category: str, top_contributors: list, evidence: Dict[str, Any]):
        # Future Ollama integration
        fallback = _build_deterministic_fallback(overall_score, risk_level, top_contributors)
        return "AI_ANALYSIS_UNAVAILABLE", f"Ollama local model not running.\n{fallback}", "ollama-llama3"


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
    ):
        top_contributors = top_contributors or []
        evidence = evidence or {}

        # Provider routing
        if provider == "mock":
            status, text, used_model = self.mock_adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence
            )
        elif provider == "ollama":
            status, text, used_model = self.ollama_adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence
            )
        else:
            adapter = GeminiAdapter(model=model) if model else self.gemini_adapter
            status, text, used_model = adapter.generate(
                overall_score, risk_level, category, top_contributors, evidence
            )

        return {
            "status": status,
            "explanation": text,
            "provider": provider,
            "model": used_model,
            "data_minimized": True,
        }


ai_gateway = AIGateway()

