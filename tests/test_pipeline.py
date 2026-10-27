"""
tests/test_pipeline.py
Automated Unit, Integration, and Invariant Verification Suite for SRM Career Catalyst.
"""

import os
import sys
import unittest
import numpy as np

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.pdf_ingestion import (
    validate_pdf_bytes,
    redact_pii,
    parse_resume_sections,
    chunk_resume_text,
    PDFValidationError
)
from services.skills import (
    load_skill_taxonomy,
    extract_skills_with_evidence,
    decompose_job_description
)
from services.embedding import encode_query
from services.retrieval import dense_search, sparse_search, hybrid_search, load_vector_store
from services.archetypes import classify_archetype_by_vote
from services.scoring import calculate_deterministic_score
from models import PlacementBenchmarkingReport, ScoreComponentItem, SkillEvidenceItem


class TestPDFIngestion(unittest.TestCase):

    def test_empty_bytes_raises_error(self):
        with self.assertRaises(PDFValidationError):
            validate_pdf_bytes(b"")

    def test_invalid_signature_raises_error(self):
        with self.assertRaises(PDFValidationError):
            validate_pdf_bytes(b"NOT_A_PDF_DOCUMENT_CONTENT")

    def test_pii_redaction(self):
        raw = "Contact me at student@srmist.edu.in or +91 9876543210. Visit https://portfolio.com."
        redacted = redact_pii(raw)
        self.assertNotIn("student@srmist.edu.in", redacted)
        self.assertNotIn("9876543210", redacted)
        self.assertNotIn("https://portfolio.com", redacted)
        self.assertIn("[EMAIL_REDACTED]", redacted)
        self.assertIn("[PHONE_REDACTED]", redacted)
        self.assertIn("[LINK_REDACTED]", redacted)

    def test_section_parsing(self):
        sample = """
        John Doe
        Summary
        Experienced software engineer.
        Education
        B.Tech in Computer Science, SRM Institute of Science and Technology.
        Skills
        Python, C++, PyTorch, Docker.
        Projects
        Distributed cache implementation with 10k QPS throughput.
        """
        sections = parse_resume_sections(sample)
        self.assertIn("education", sections)
        self.assertIn("skills", sections)
        self.assertIn("projects", sections)


class TestSkillsAndTaxonomy(unittest.TestCase):

    def test_taxonomy_loads_successfully(self):
        taxonomy = load_skill_taxonomy()
        self.assertGreater(len(taxonomy), 20)
        canonical_names = {s["canonical"] for s in taxonomy}
        self.assertIn("Python", canonical_names)
        self.assertIn("C++", canonical_names)
        self.assertIn("PyTorch", canonical_names)
        self.assertIn("Docker", canonical_names)

    def test_alias_resolution_and_evidence(self):
        sections = {
            "projects": "Implemented deep learning using sklearn and PyTorch with 94.5% accuracy.",
            "skills": "C++, Java, K8s, Python."
        }
        full_text = sections["projects"] + " " + sections["skills"]
        extracted = extract_skills_with_evidence(sections, full_text)

        # Verify PyTorch demonstrated with metric
        self.assertIn("pytorch", extracted)
        self.assertEqual(extracted["pytorch"]["evidence_status"], "demonstrated")

        # Verify scikit-learn alias 'sklearn' recognized
        self.assertIn("scikit_learn", extracted)
        self.assertEqual(extracted["scikit_learn"]["canonical"], "scikit-learn")

        # Verify Kubernetes alias 'K8s' recognized
        self.assertIn("kubernetes", extracted)
        self.assertEqual(extracted["kubernetes"]["canonical"], "Kubernetes")

    def test_jd_decomposition(self):
        jd = "Required: Python, PyTorch, Docker. Preferred: Kubernetes, Kafka."
        decomp = decompose_job_description(jd)
        self.assertIn("Python", decomp["required_skills"])
        self.assertIn("PyTorch", decomp["required_skills"])
        self.assertIn("Kubernetes", decomp["preferred_skills"])


class TestRetrievalAndEmbeddings(unittest.TestCase):

    def test_vector_store_integrity(self):
        index, metadata = load_vector_store()
        self.assertEqual(index.ntotal, 226)
        self.assertEqual(len(metadata), 226)
        self.assertEqual(index.d, 384)

    def test_embedding_normalization(self):
        vec = encode_query("Senior Machine Learning Engineer with PyTorch")
        self.assertEqual(vec.shape, (1, 384))
        norm = float(np.linalg.norm(vec))
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_hybrid_search_rrf(self):
        query = "Frontend React developer building web dashboards with TypeScript and Node.js"
        res = hybrid_search(query, top_k=5)
        self.assertIn("candidates", res)
        self.assertIn("diagnostics", res)
        self.assertLessEqual(len(res["candidates"]), 5)
        self.assertGreater(len(res["candidates"]), 0)
        
        # Verify cosine similarity is bounded in [-1, 1]
        for c in res["candidates"]:
            self.assertGreaterEqual(c["cosine_similarity"], -1.0)
            self.assertLessEqual(c["cosine_similarity"], 1.0)


class TestArchetypesAndScoring(unittest.TestCase):

    def test_archetype_voting_unanimous(self):
        candidates = [
            {"archetype": "Data Science & AI/ML", "cosine_similarity": 0.85},
            {"archetype": "Data Science & AI/ML", "cosine_similarity": 0.80},
            {"archetype": "Data Science & AI/ML", "cosine_similarity": 0.75}
        ]
        result = classify_archetype_by_vote(candidates)
        self.assertEqual(result["target_archetype"], "Data Science & AI/ML")
        self.assertFalse(result["is_uncertain"])
        self.assertGreater(result["confidence_ratio"], 0.70)

    def test_deterministic_scoring_bounds(self):
        candidate_skills = {
            "python": {"canonical": "Python", "evidence_status": "demonstrated"},
            "pytorch": {"canonical": "PyTorch", "evidence_status": "used"},
            "docker": {"canonical": "Docker", "evidence_status": "mentioned"}
        }
        jd_reqs = {
            "required_skills": ["Python", "PyTorch", "Docker"],
            "preferred_skills": ["Kubernetes"]
        }
        sections = {
            "education": "SRM B.Tech in CSE",
            "experience": "ML Intern at startup",
            "projects": "Engineered model with 92% accuracy and 15ms latency.",
            "skills": "Python, PyTorch, Docker"
        }
        diagnostics = {"top_similarity": 0.78}

        score_res = calculate_deterministic_score(candidate_skills, jd_reqs, sections, diagnostics)
        score = score_res["overall_score"]
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        self.assertEqual(len(score_res["breakdown"]), 5)

        # Sum of maximum points across components must equal 100
        max_total = sum(c["max_points"] for c in score_res["breakdown"])
        self.assertEqual(max_total, 100)


class TestPydanticReportContract(unittest.TestCase):

    def test_report_validation(self):
        report = PlacementBenchmarkingReport(
            analysis_id="test_analysis_001",
            overall_score=85,
            score_confidence="high",
            detected_archetype="Data Science & AI/ML",
            archetype_confidence=0.88,
            is_archetype_uncertain=False,
            matched_skills=[
                SkillEvidenceItem(
                    canonical="Python",
                    category="Programming Languages",
                    evidence_status="demonstrated",
                    evidence_snippet="Scaled data pipeline to 10k QPS"
                )
            ],
            missing_required_skills=["PyTorch"],
            missing_preferred_skills=["Kubernetes"],
            score_breakdown=[
                ScoreComponentItem(
                    key="required_skills",
                    name="Skills",
                    points_earned=30.0,
                    max_points=35,
                    detail="Matched 2/3"
                )
            ],
            alumni_precedents_used=3,
            feedback_markdown="### Benchmark Report"
        )
        self.assertEqual(report.overall_score, 85)
        self.assertEqual(report.schema_version, "2.0.0")


if __name__ == "__main__":
    unittest.main()
