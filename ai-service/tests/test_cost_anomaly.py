"""
Unit tests for AI-01 Cost Anomaly Detection
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas import CostAnomalyRequest
from app.services.cost_service import analyze_cost_anomaly


class TestCostAnomaly(unittest.TestCase):
    def test_insufficient_data_less_than_2_peers(self):
        req = CostAnomalyRequest(
            proposed_cost=5000000.0,
            peer_costs=[4800000.0],
            category="ROADS",
        )
        res = analyze_cost_anomaly(req)
        self.assertEqual(res.status, "INSUFFICIENT_DATA")
        self.assertEqual(res.severity, "LOW")
        self.assertEqual(res.score, 0)
        self.assertIn("Insufficient", res.message)

    def test_normal_cost_low_severity(self):
        # Peers median is 2,000,000, proposed is 2,100,000 (+5%)
        req = CostAnomalyRequest(
            proposed_cost=2100000.0,
            peer_costs=[1800000.0, 1900000.0, 2000000.0, 2100000.0, 2200000.0],
            category="COMMUNITY_HALL",
        )
        res = analyze_cost_anomaly(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertLess(res.score, 40)
        self.assertEqual(res.evidence["peer_median"], 2000000.0)
        self.assertEqual(res.evidence["deviation_percent"], 5.0)

    def test_moderate_deviation_medium_severity(self):
        # Peers median is 2,000,000, proposed is 2,600,000 (+30%)
        req = CostAnomalyRequest(
            proposed_cost=2600000.0,
            peer_costs=[1800000.0, 1900000.0, 2000000.0, 2100000.0, 2200000.0],
            category="COMMUNITY_HALL",
        )
        res = analyze_cost_anomaly(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "MEDIUM")
        self.assertGreaterEqual(res.score, 40)
        self.assertLess(res.score, 75)

    def test_excessive_deviation_high_severity(self):
        # Peers median is 2,200,000, proposed is 6,300,000 (+186%) per phases_doc.md
        peers = [2000000.0, 2100000.0, 2200000.0, 2300000.0, 2400000.0]
        req = CostAnomalyRequest(
            proposed_cost=6300000.0,
            peer_costs=peers,
            category="ROADS",
            district="Indore",
        )
        res = analyze_cost_anomaly(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "HIGH")
        self.assertGreaterEqual(res.score, 75)
        self.assertIn("Potential cost anomaly. Review recommended.", res.message)
        self.assertIn("peer_median", res.evidence)
        self.assertIn("iqr", res.evidence)


if __name__ == "__main__":
    unittest.main()
