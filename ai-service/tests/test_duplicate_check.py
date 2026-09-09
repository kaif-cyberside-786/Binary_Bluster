"""
Unit tests for AI-02 Duplicate and Overlap Detection
"""
import unittest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas import DuplicateCheckRequest, DuplicateCandidate
from app.services.duplicate_service import analyze_duplicates


class TestDuplicateCheck(unittest.TestCase):
    def test_no_candidates(self):
        target = DuplicateCandidate(
            project_id="PRJ-NEW-01",
            title="Construction of Community Hall at Ward 12",
            description="Community hall for public welfare",
            category="COMMUNITY_HALL",
            district="Indore",
        )
        req = DuplicateCheckRequest(target_project=target, candidate_projects=[])
        res = analyze_duplicates(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertEqual(res.score, 0)

    def test_identical_near_duplicate_high_severity(self):
        target = DuplicateCandidate(
            project_id="PRJ-NEW-02",
            title="Construction of Paver Road at Shivaji Nagar Ward 14",
            description="Laying 200m interlocking cement paver blocks with side drainage at Shivaji Nagar",
            category="ROADS",
            district="Indore",
            location="Shivaji Nagar",
            ward="Ward 14",
        )
        candidate = DuplicateCandidate(
            project_id="PRJ-HIST-01",
            title="Construction of Paver Road at Shivaji Nagar Ward 14",
            description="Laying interlocking cement paver blocks road and drainage Shivaji Nagar",
            category="ROADS",
            district="Indore",
            location="Shivaji Nagar",
            ward="Ward 14",
            status="COMPLETED",
            sanctioned_cost=1800000.0,
        )
        req = DuplicateCheckRequest(target_project=target, candidate_projects=[candidate])
        res = analyze_duplicates(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "HIGH")
        self.assertGreaterEqual(res.score, 75)
        self.assertIn("Possible repeated or overlapping work", res.message)
        self.assertGreater(len(res.evidence["top_matches"]), 0)
        self.assertEqual(res.evidence["top_matches"][0]["project_id"], "PRJ-HIST-01")

    def test_distinct_project_low_severity(self):
        target = DuplicateCandidate(
            project_id="PRJ-NEW-03",
            title="Installation of Solar High Mast Light at Bus Stand",
            description="Solar LED street illumination system",
            category="STREET_LIGHTING",
            district="Indore",
        )
        candidate = DuplicateCandidate(
            project_id="PRJ-HIST-02",
            title="Construction of Primary School Drinking Water Borewell",
            description="Submersible water pump and RO filtration system",
            category="DRINKING_WATER",
            district="Indore",
            status="COMPLETED",
        )
        req = DuplicateCheckRequest(target_project=target, candidate_projects=[candidate])
        res = analyze_duplicates(req)
        self.assertEqual(res.status, "OK")
        self.assertEqual(res.severity, "LOW")
        self.assertLess(res.score, 30)


if __name__ == "__main__":
    unittest.main()
