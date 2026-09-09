"""
Unit tests for AI-03 Engineering Specification Comparison
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas import SpecComparisonRequest
from app.services.spec_service import analyze_spec_comparison


class TestSpecComparison(unittest.TestCase):
    def test_minimal_deviation_low_severity(self):
        req = SpecComparisonRequest(
            estimated_cost=2500000.0,
            detailed_estimate=2600000.0,  # +4% drift
            recommendation_description="200m bitumen road with stone pitching",
            engineering_remarks="200m bitumen road work according to standard SOR specifications",
        )
        res = analyze_spec_comparison(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertLess(res.score, 40)
        self.assertEqual(res.evidence["cost_drift_percent"], 4.0)

    def test_moderate_deviation_medium_severity(self):
        req = SpecComparisonRequest(
            estimated_cost=2000000.0,
            detailed_estimate=2350000.0,  # +17.5% drift
            recommendation_description="Construction of 2 rooms community center",
            engineering_remarks="Community center with RCC roof and brick masonry",
        )
        res = analyze_spec_comparison(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "MEDIUM")
        self.assertGreaterEqual(res.score, 40)
        self.assertLess(res.score, 75)

    def test_large_cost_drift_high_severity(self):
        req = SpecComparisonRequest(
            estimated_cost=2000000.0,
            detailed_estimate=3200000.0,  # +60% drift
            recommendation_description="Basic rural approach road",
            engineering_remarks="Expanded dual lane with heavy commercial pavement design",
        )
        res = analyze_spec_comparison(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "HIGH")
        self.assertGreaterEqual(res.score, 75)
        self.assertIn("deviates +60.0%", res.message)


if __name__ == "__main__":
    unittest.main()
