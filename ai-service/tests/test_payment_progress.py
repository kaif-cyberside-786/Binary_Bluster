"""
Unit tests for AI-05 Payment vs Physical Progress Anomaly Detection
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas import PaymentProgressRequest
from app.services.payment_service import analyze_payment_progress


class TestPaymentProgress(unittest.TestCase):
    def test_balanced_progress_low_severity(self):
        # 50L sanction, 20L disbursed (40%), 45% physical -> gap -5%
        req = PaymentProgressRequest(
            sanctioned_cost=5000000.0,
            total_disbursed=2000000.0,
            percent_complete=45.0,
        )
        res = analyze_payment_progress(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertLess(res.score, 40)
        self.assertEqual(res.evidence["financial_disbursed_percent"], 40.0)

    def test_moderate_gap_medium_severity(self):
        # 50L sanction, 30L disbursed (60%), 40% physical -> gap 20%
        req = PaymentProgressRequest(
            sanctioned_cost=5000000.0,
            total_disbursed=3000000.0,
            percent_complete=40.0,
        )
        res = analyze_payment_progress(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "MEDIUM")
        self.assertGreaterEqual(res.score, 40)
        self.assertLess(res.score, 75)

    def test_large_gap_high_severity(self):
        # 50L sanction, 45L disbursed (90%), 30% physical -> gap 60%
        req = PaymentProgressRequest(
            sanctioned_cost=5000000.0,
            total_disbursed=4500000.0,
            percent_complete=30.0,
        )
        res = analyze_payment_progress(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "HIGH")
        self.assertGreaterEqual(res.score, 75)
        self.assertIn("substantially exceeds", res.message)


if __name__ == "__main__":
    unittest.main()
