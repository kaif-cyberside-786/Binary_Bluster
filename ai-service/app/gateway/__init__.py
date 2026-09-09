"""
AI Gateway Package for MPLADS Explainability Layer
Abstracts underlying LLM providers (Gemini, Ollama, Mock) behind a provider-neutral interface.
"""
from app.gateway.ai_gateway import ai_gateway

__all__ = ["ai_gateway"]

