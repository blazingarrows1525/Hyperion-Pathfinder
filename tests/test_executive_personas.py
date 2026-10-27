"""
tests/test_executive_personas.py
Unit tests verifying executive persona registry, role-to-persona inference,
structured review contracts, and bit-for-bit score invariance.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import (
    PlacementBenchmarkingReport,
    ScoreComponentItem,
    SkillEvidenceItem,
    ExecutivePersonaReview
)
from services.executive_personas import (
    PERSONA_REGISTRY,
    resolve_persona_for_role,
    generate_executive_review
)


class TestPersonaInference(unittest.TestCase):

    def test_ai_research_role_inference(self):
        persona_id, reason = resolve_persona_for_role("Senior Machine Learning Engineer", "PyTorch, model evaluation, LLM RAG")
        self.assertEqual(persona_id, "director_ai_research")
        self.assertIn("Director of AI & Research", reason)

    def test_principal_sde_role_inference(self):
        persona_id, reason = resolve_persona_for_role("Backend Software Engineer", "Distributed systems, REST APIs, concurrency")
        self.assertEqual(persona_id, "principal_sde")
        self.assertIn("Principal SDE", reason)

    def test_cloud_infrastructure_role_inference(self):
        persona_id, reason = resolve_persona_for_role("DevOps / Cloud Platform Engineer", "Kubernetes, AWS, CI/CD, Terraform")
        self.assertEqual(persona_id, "cloud_infrastructure_director")
        self.assertIn("Cloud Infrastructure Director", reason)

    def test_explicit_user_override(self):
        persona_id, reason = resolve_persona_for_role(
            target_role="Frontend Engineer",
            job_description="React, CSS, HTML",
            requested_persona_id="director_ai_research"
        )
        self.assertEqual(persona_id, "director_ai_research")
        self.assertIn("Explicitly selected by user", reason)


class TestExecutiveReviewAndScoreInvariance(unittest.TestCase):

    def setUp(self):
        # Build canonical base report
        self.base_report = PlacementBenchmarkingReport(
            analysis_id="test_inv_001",
            overall_score=78,
            score_confidence="high",
            detected_archetype="General CS & Software Development",
            archetype_confidence=0.82,
            is_archetype_uncertain=False,
            matched_skills=[
                SkillEvidenceItem(
                    canonical="Python",
                    category="Programming Languages",
                    evidence_status="demonstrated",
                    evidence_snippet="Built microservices with 99.9% uptime"
                ),
                SkillEvidenceItem(
                    canonical="Docker",
                    category="DevOps & Tools",
                    evidence_status="used",
                    evidence_snippet="Containerized FastAPI services"
                )
            ],
            missing_required_skills=["Kubernetes"],
            missing_preferred_skills=["Kafka"],
            score_breakdown=[
                ScoreComponentItem(key="required_skills", name="Skills", points_earned=28.0, max_points=35, detail="Matched 2/3"),
                ScoreComponentItem(key="project_evidence", name="Projects", points_earned=20.0, max_points=25, detail="Good project depth"),
                ScoreComponentItem(key="domain_alignment", name="Domain", points_earned=15.0, max_points=20, detail="Backend aligned"),
                ScoreComponentItem(key="quantified_impact", name="Metrics", points_earned=8.0, max_points=10, detail="Uptime metric found"),
                ScoreComponentItem(key="readability", name="Readability", points_earned=7.0, max_points=10, detail="Clean structure")
            ],
            feedback_markdown="### Base Feedback"
        )
        self.sample_resume = (
            "Experience:\n"
            "Software Developer at TechCorp.\n"
            "Built backend microservices in Python and Docker with 99.9% uptime.\n"
        )

    def test_canonical_score_is_bit_for_bit_invariant(self):
        """CRITICAL INVARIANT: Persona review must NEVER alter report.overall_score or breakdown."""
        initial_score = self.base_report.overall_score
        initial_breakdown_points = [c.points_earned for c in self.base_report.score_breakdown]

        for pid in ["director_ai_research", "principal_sde", "cloud_infrastructure_director"]:
            review = generate_executive_review(
                persona_id=pid,
                target_role="Software Engineer",
                target_company="Acme Corp",
                resume_text=self.sample_resume,
                report=self.base_report
            )

            # Assert review fields
            self.assertIsInstance(review, ExecutivePersonaReview)
            self.assertEqual(review.persona_id, pid)
            self.assertIn(review.verdict, ["strong_evidence", "promising_with_gaps", "needs_more_proof", "insufficient_evidence"])
            self.assertGreater(len(review.architecture_questions), 0)
            self.assertGreater(len(review.strategic_priorities), 0)
            self.assertIn("simulated senior-role lens", review.disclaimer)

            # Invariant assertion
            self.assertEqual(self.base_report.overall_score, initial_score)
            current_breakdown_points = [c.points_earned for c in self.base_report.score_breakdown]
            self.assertEqual(current_breakdown_points, initial_breakdown_points)
            self.assertEqual(review.score_adjustment, 0)


if __name__ == "__main__":
    unittest.main()
