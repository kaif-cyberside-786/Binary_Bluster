"""
Unit tests for AI-04 Execution Delay & Staleness Analysis
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas import DelayCheckRequest
from app.services.delay_service import analyze_delay


class TestDelayCheck(unittest.TestCase):
    def test_active_project_normal_low_severity(self):
        req = DelayCheckRequest(
            project_status="IN_PROGRESS",
            days_since_last_progress=25,
            days_since_sanction=60,
            percent_complete=45.0,
        )
        res = analyze_delay(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertLess(res.score, 40)

    def test_progress_gap_medium_severity(self):
        req = DelayCheckRequest(
            project_status="IN_PROGRESS",
            days_since_last_progress=100,  # >90 days
            days_since_sanction=120,
            percent_complete=30.0,
        )
        res = analyze_delay(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "MEDIUM")
        self.assertIn("delayed", res.message.lower())

    def test_stalled_progress_high_severity(self):
        req = DelayCheckRequest(
            project_status="IN_PROGRESS",
            days_since_last_progress=200,  # >180 days
            days_since_sanction=240,
            percent_complete=35.0,
        )
        res = analyze_delay(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "HIGH")
        self.assertGreaterEqual(res.score, 75)
        self.assertIn("Substantial project delay", res.message)


if __name__ == "__main__":
    unittest.main()
