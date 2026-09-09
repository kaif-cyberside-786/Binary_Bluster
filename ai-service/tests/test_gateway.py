"""
Unit tests for AI Gateway and Explanation Layer
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.gateway.ai_gateway import ai_gateway
from app.gateway.gemini_adapter import GeminiAdapter, _build_deterministic_fallback


class TestAIGateway(unittest.TestCase):
    def setUp(self):
        self.evidence = {
            "proposed_cost": 6300000,
            "peer_median_cost": 2200000,
            "cost_deviation_percent": 186.4,
            "duplicate_similarity": 92.0,
        }
        self.contributors = [
            {
                "type": "COST_ANOMALY",
                "score": 88,
                "severity": "HIGH",
                "reason": "+186.4% above peer median",
            },
            {
                "type": "DUPLICATE_RISK",
                "score": 92,
                "severity": "HIGH",
                "reason": "92.0% similarity with historical work",
            },
        ]

    def test_mock_adapter_produces_advisory_explanation(self):
        res = ai_gateway.generate_explanation(
            overall_score=87,
            risk_level="HIGH",
            category="Roads & Bridges",
            top_contributors=self.contributors,
            evidence=self.evidence,
            provider="mock",
        )
        self.assertEqual(res["status"], "AI_ANALYSIS_COMPLETE")
        self.assertTrue("Overall Risk: HIGH — 87" in res["explanation"])
        self.assertTrue("Cost Anomaly" in res["explanation"])
        self.assertTrue("Review recommended" in res["explanation"])
        self.assertTrue(res["data_minimized"])

    def test_unconfigured_gemini_returns_unavailable_gracefully(self):
        adapter = GeminiAdapter(api_key="")
        status, explanation, model = adapter.generate(
            overall_score=87,
            risk_level="HIGH",
            category="Roads & Bridges",
            top_contributors=self.contributors,
            evidence=self.evidence,
        )
        self.assertEqual(status, "AI_ANALYSIS_UNAVAILABLE")
        self.assertTrue("AI analysis temporarily unavailable" in explanation)
        self.assertTrue("Overall Risk: HIGH — 87" in explanation)

    def test_ollama_fallback_when_offline(self):
        res = ai_gateway.generate_explanation(
            overall_score=75,
            risk_level="HIGH",
            category="Roads & Bridges",
            top_contributors=self.contributors,
            evidence=self.evidence,
            provider="ollama",
        )
        self.assertEqual(res["status"], "AI_ANALYSIS_UNAVAILABLE")
        self.assertTrue("Ollama local model not running" in res["explanation"])
        self.assertTrue("Review recommended" in res["explanation"])

    def test_gateway_accepts_api_key_parameter(self):
        res = ai_gateway.generate_explanation(
            overall_score=87,
            risk_level="HIGH",
            category="Roads & Bridges",
            top_contributors=self.contributors,
            evidence=self.evidence,
            provider="gemini",
            api_key="",  # explicitly empty
        )
        self.assertEqual(res["status"], "AI_ANALYSIS_UNAVAILABLE")
        self.assertTrue("AI analysis temporarily unavailable" in res["explanation"])


if __name__ == "__main__":
    unittest.main()
