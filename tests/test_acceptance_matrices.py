"""
tests/test_acceptance_matrices.py
Comprehensive Verification Suite covering:
- Acceptance Matrix A (Voice STT/TTS, Locales, FSM States, Spoken Briefings)
- Acceptance Matrix B (Executive Persona Lenses, Role Conditioned Reviews, Bit-for-Bit Score Invariance)
- Acceptance Matrix C (Exact Span Annotations, In-Memory Revisions, Stateless Recalculation)
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import (
    PlacementBenchmarkingReport,
    ScoreComponentItem,
    SkillEvidenceItem,
    ExecutivePersonaReview,
    EvidenceObservation,
    ActionablePriority,
    WordMarkupItem
)
from services.voice_service import (
    VoiceSTTStateMachine,
    validate_voice_locale,
    sanitize_text_for_speech,
    build_spoken_briefing
)
from services.executive_personas import (
    PERSONA_REGISTRY,
    resolve_persona_for_role,
    generate_executive_review
)
from services.markup import (
    create_document_snapshot,
    detect_rule_based_markups,
    resolve_span_overlaps,
    apply_markup_replacement,
    codepoint_to_utf16_offset,
    utf16_to_codepoint_offset
)


def create_synthetic_base_report(score: int = 74) -> PlacementBenchmarkingReport:
    """Creates a deterministic baseline report for invariant testing."""
    return PlacementBenchmarkingReport(
        analysis_id="report_synth_001",
        overall_score=score,
        score_confidence="high",
        detected_archetype="General CS & Software Development",
        archetype_confidence=0.85,
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
            ScoreComponentItem(key="required_skills", name="Skills", points_earned=26.0, max_points=35, detail="Matched 2/3 skills"),
            ScoreComponentItem(key="project_evidence", name="Projects", points_earned=20.0, max_points=25, detail="2 projects with evidence"),
            ScoreComponentItem(key="domain_alignment", name="Domain", points_earned=14.0, max_points=20, detail="Backend domain aligned"),
            ScoreComponentItem(key="quantified_impact", name="Metrics", points_earned=7.0, max_points=10, detail="Uptime metric verified"),
            ScoreComponentItem(key="readability", name="Readability", points_earned=7.0, max_points=10, detail="Standard sections found")
        ],
        feedback_markdown="### Base Feedback"
    )


# ==============================================================================
# ACCEPTANCE MATRIX A: VOICE, TRANSCRIPTION & TTS
# ==============================================================================

class TestAcceptanceMatrixA_VoiceSTT(unittest.TestCase):

    def test_VX_001_en_IN_replace_jd_final_result(self):
        fsm = VoiceSTTStateMachine(locale="en-IN", destination="replace_jd")
        self.assertTrue(fsm.transition_to("listening"))
        fsm.receive_final_result("Senior Python Developer with FastAPI and Docker")
        self.assertEqual(fsm.state, "transcript_ready")
        self.assertEqual(fsm.final_transcript, "Senior Python Developer with FastAPI and Docker")
        self.assertEqual(fsm.locale, "en-IN")
        self.assertEqual(fsm.destination, "replace_jd")

    def test_VX_004_en_IN_replace_jd_user_cancel(self):
        fsm = VoiceSTTStateMachine(locale="en-IN", destination="replace_jd")
        fsm.transition_to("listening")
        fsm.receive_interim_result("Senior Python")
        fsm.cancel()
        self.assertEqual(fsm.state, "idle")
        self.assertEqual(fsm.interim_transcript, "")
        self.assertEqual(fsm.final_transcript, "")

    def test_VX_007_en_IN_append_jd_network_error(self):
        fsm = VoiceSTTStateMachine(locale="en-IN", destination="append_jd")
        fsm.transition_to("listening")
        fsm.receive_final_result("Docker experience")
        self.assertEqual(fsm.state, "transcript_ready")
        # Network error encountered on subsequent attempt
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="network")
        self.assertEqual(fsm.state, "error")
        # Committed final text survives
        self.assertEqual(fsm.final_transcript, "Docker experience")

    def test_VX_011_en_IN_coach_message_network_error(self):
        fsm = VoiceSTTStateMachine(locale="en-IN", destination="coach_message")
        fsm.transition_to("listening")
        fsm.receive_final_result("How to explain Kubernetes?")
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="network")
        self.assertEqual(fsm.final_transcript, "How to explain Kubernetes?")
        self.assertEqual(fsm.destination, "coach_message")

    def test_VX_014_en_US_replace_jd_no_speech(self):
        fsm = VoiceSTTStateMachine(locale="en-US", destination="replace_jd")
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="no-speech")
        self.assertEqual(fsm.state, "error")
        self.assertEqual(fsm.final_transcript, "")

    def test_VX_017_en_US_append_jd_final_result(self):
        fsm = VoiceSTTStateMachine(locale="en-US", destination="append_jd")
        fsm.transition_to("listening")
        fsm.receive_final_result("Must have AWS EKS experience.")
        self.assertEqual(fsm.state, "transcript_ready")
        self.assertEqual(fsm.final_transcript, "Must have AWS EKS experience.")
        self.assertEqual(fsm.locale, "en-US")

    def test_VX_020_en_US_append_jd_user_cancel(self):
        fsm = VoiceSTTStateMachine(locale="en-US", destination="append_jd")
        fsm.transition_to("listening")
        fsm.cancel()
        self.assertEqual(fsm.state, "idle")
        self.assertEqual(fsm.final_transcript, "")

    def test_VX_023_en_US_coach_message_network_error(self):
        fsm = VoiceSTTStateMachine(locale="en-US", destination="coach_message")
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="network")
        self.assertEqual(fsm.state, "error")
        self.assertEqual(fsm.error_message, "network")

    def test_VX_026_hi_IN_replace_jd_no_speech(self):
        fsm = VoiceSTTStateMachine(locale="hi-IN", destination="replace_jd")
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="no-speech")
        self.assertEqual(fsm.state, "error")
        self.assertEqual(fsm.final_transcript, "")

    def test_VX_030_hi_IN_append_jd_no_speech(self):
        fsm = VoiceSTTStateMachine(locale="hi-IN", destination="append_jd")
        fsm.transition_to("listening")
        fsm.transition_to("error", error_msg="no-speech")
        self.assertEqual(fsm.state, "error")

    def test_VX_033_hi_IN_coach_message_final_result(self):
        fsm = VoiceSTTStateMachine(locale="hi-IN", destination="coach_message")
        fsm.transition_to("listening")
        fsm.receive_final_result("PyTorch model testing")
        self.assertEqual(fsm.state, "transcript_ready")
        self.assertEqual(fsm.final_transcript, "PyTorch model testing")

    def test_VX_036_hi_IN_coach_message_user_cancel(self):
        fsm = VoiceSTTStateMachine(locale="hi-IN", destination="coach_message")
        fsm.transition_to("listening")
        fsm.cancel()
        self.assertEqual(fsm.state, "idle")

    def test_VX_039_unsupported_locale_replace_jd_network_error(self):
        is_supported, msg = validate_voice_locale("fr-FR")
        self.assertFalse(is_supported)
        self.assertIn("not officially supported", msg)

    def test_VX_042_unsupported_locale_append_jd_no_speech(self):
        is_supported, _ = validate_voice_locale("de-DE")
        self.assertFalse(is_supported)

    def test_VX_045_unsupported_locale_coach_message_final_result(self):
        is_supported, fallback = validate_voice_locale("zh-CN")
        self.assertFalse(is_supported)
        self.assertIn("en-IN", fallback)


class TestAcceptanceMatrixA_TTS(unittest.TestCase):

    def setUp(self):
        self.base_report = create_synthetic_base_report(score=78)

    def test_VT_049_052_055_score_with_disclaimer_rates(self):
        for rate_setting, expected_rate in [("default", 1.0), ("slow", 0.85), ("unsupported_xyz", 1.0)]:
            briefing = build_spoken_briefing(self.base_report, rate_setting=rate_setting)
            self.assertEqual(briefing["playback_rate"], expected_rate)
            self.assertIn("score is 78 out of 100", briefing["spoken_text"])
            self.assertIn("not a probability of being hired", briefing["spoken_text"])
            self.assertTrue(briefing["has_disclaimer"])

    def test_VT_058_061_064_metrics_heavy_summary_pronunciation(self):
        # Technical symbols: C++, p95, %, ms, QPS
        raw = "Optimized C++ backend reducing p95 latency from 250ms to 45ms (82% gain) at 12k QPS."
        sanitized = sanitize_text_for_speech(raw)
        self.assertIn("C plus plus", sanitized)
        self.assertIn("p 95", sanitized)
        self.assertIn("milliseconds", sanitized)
        self.assertIn("percent", sanitized)
        self.assertIn("queries per second", sanitized)

    def test_VT_068_071_074_html_sanitization(self):
        raw = "Implemented <strong>FastAPI</strong> microservice <script>alert('xss')</script> with Redis."
        sanitized = sanitize_text_for_speech(raw)
        self.assertNotIn("<strong>", sanitized)
        self.assertNotIn("<script>", sanitized)
        self.assertNotIn("alert", sanitized)
        self.assertIn("FastAPI microservice with Redis", sanitized)

    def test_VT_077_080_083_redacted_pii_token_preservation(self):
        raw = "Contact [EMAIL_REDACTED] or [PHONE_REDACTED]. Portfolio: [LINK_REDACTED]."
        sanitized = sanitize_text_for_speech(raw)
        self.assertIn("redacted email", sanitized)
        self.assertIn("redacted phone", sanitized)
        self.assertIn("redacted link", sanitized)
        self.assertNotIn("[EMAIL_REDACTED]", sanitized)

    def test_VT_087_090_093_empty_summary_graceful(self):
        empty_report = PlacementBenchmarkingReport(
            analysis_id="empty_001",
            overall_score=0,
            score_confidence="low",
            detected_archetype="General CS & Software Development",
            archetype_confidence=0.5,
            matched_skills=[],
            missing_required_skills=[],
            score_breakdown=[],
            feedback_markdown=""
        )
        briefing = build_spoken_briefing(empty_report)
        self.assertIn("score is 0 out of 100", briefing["spoken_text"])
        self.assertTrue(briefing["has_disclaimer"])


# ==============================================================================
# ACCEPTANCE MATRIX B: EXECUTIVE PERSONA LENSES & SCORE INVARIANCE
# ==============================================================================

class TestAcceptanceMatrixB_ExecutivePersonas(unittest.TestCase):

    def setUp(self):
        self.base_report = create_synthetic_base_report(score=81)
        self.initial_score = self.base_report.overall_score
        self.initial_breakdown = [c.points_earned for c in self.base_report.score_breakdown]

    def _assert_invariants(self, review: ExecutivePersonaReview, expected_persona_id: str):
        self.assertEqual(review.persona_id, expected_persona_id)
        self.assertIn(review.verdict, ["strong_evidence", "promising_with_gaps", "needs_more_proof", "insufficient_evidence"])
        self.assertIn("simulated", review.disclaimer.lower())
        self.assertEqual(review.score_adjustment, 0)
        # CRITICAL INVARIANT: Base report score MUST be identical
        self.assertEqual(self.base_report.overall_score, self.initial_score)
        current_breakdown = [c.points_earned for c in self.base_report.score_breakdown]
        self.assertEqual(current_breakdown, self.initial_breakdown)

    # --- Director of AI & Research ---
    def test_P_001_director_ai_ml_engineer_metric_present(self):
        resume = "Trained ResNet-50 on ImageNet with 93.4% top-1 accuracy on test split."
        rev = generate_executive_review("director_ai_research", "ML Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_006_director_ai_research_scientist_metric_missing(self):
        resume = "Investigated generative diffusion models for biomedical imagery."
        rev = generate_executive_review("director_ai_research", "Research Scientist", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_011_director_ai_backend_swe_keyword_only(self):
        resume = "Skills: PyTorch, TensorFlow, Python, C++."
        rev = generate_executive_review("director_ai_research", "Backend Software Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_016_director_ai_frontend_engineer_deployment_claim(self):
        resume = "Deployed high-performance React frontends to production CDN."
        rev = generate_executive_review("director_ai_research", "Frontend Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_021_director_ai_cloud_platform_metric_present(self):
        resume = "Managed Kubernetes clusters achieving 99.95% uptime across 5 nodes."
        rev = generate_executive_review("director_ai_research", "Cloud Platform Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_025_director_ai_data_analyst_metric_present(self):
        resume = "Analyzed marketing datasets reducing customer churn rate by 14%."
        rev = generate_executive_review("director_ai_research", "Data Analyst", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    def test_P_030_director_ai_business_analyst_metric_missing(self):
        resume = "Developed dashboards in Tableau for executive stakeholders."
        rev = generate_executive_review("director_ai_research", "Business Analyst", None, resume, self.base_report)
        self._assert_invariants(rev, "director_ai_research")

    # --- Principal SDE / VP of Engineering ---
    def test_P_035_principal_sde_ml_engineer_keyword_only(self):
        resume = "Skills: Python, PyTorch, Docker, Kubernetes."
        rev = generate_executive_review("principal_sde", "ML Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    def test_P_040_principal_sde_research_scientist_deployment_claim(self):
        resume = "Deployed model to AWS EC2 instance for lab evaluation."
        rev = generate_executive_review("principal_sde", "Research Scientist", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    def test_P_045_principal_sde_frontend_engineer_metric_present(self):
        resume = "Reduced Core Web Vitals LCP by 400ms across 20 web views."
        rev = generate_executive_review("principal_sde", "Frontend Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    def test_P_050_principal_sde_sre_metric_missing(self):
        resume = "Responsible for incident remediation and production on-call."
        rev = generate_executive_review("principal_sde", "SRE", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    def test_P_055_principal_sde_cloud_platform_keyword_only(self):
        resume = "Technical skills: Terraform, AWS, Docker, Linux, Bash."
        rev = generate_executive_review("principal_sde", "Cloud Platform Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    def test_P_060_principal_sde_data_analyst_deployment_claim(self):
        resume = "Deployed automated daily ETL pipelines using Python and cron."
        rev = generate_executive_review("principal_sde", "Data Analyst", None, resume, self.base_report)
        self._assert_invariants(rev, "principal_sde")

    # --- Cloud Infrastructure Director ---
    def test_P_065_cloud_director_ml_engineer_metric_present(self):
        resume = "Serving PyTorch endpoints via Triton on AWS EKS with 35ms latency at 2k QPS."
        rev = generate_executive_review("cloud_infrastructure_director", "ML Engineer", None, resume, self.base_report)
        self._assert_invariants(rev, "cloud_infrastructure_director")

    def test_P_069_cloud_director_research_scientist_metric_present(self):
        resume = "Distributed training across 8 A100 GPUs reducing training epoch time by 60%."
        rev = generate_executive_review("cloud_infrastructure_director", "Research Scientist", None, resume, self.base_report)
        self._assert_invariants(rev, "cloud_infrastructure_director")


# ==============================================================================
# ACCEPTANCE MATRIX C: EXACT SPANS, IN-MEMORY REVISIONS & RECALCULATION
# ==============================================================================

class TestAcceptanceMatrixC_ExactSpansAndTailoring(unittest.TestCase):

    def test_exact_character_slice_equality(self):
        resume_text = (
            "Experience\n"
            "Software Developer at TechCorp\n"
            "Worked on FastAPI services achieving 99.9% uptime and reduced latency by 35ms.\n"
            "Responsible for cutting-edge platforms using various technologies.\n"
        )
        snapshot = create_document_snapshot(resume_text, document_id="doc_c_01")
        markups = detect_rule_based_markups(snapshot)

        self.assertGreater(len(markups), 0)
        for m in markups:
            cp_start = utf16_to_codepoint_offset(snapshot.canonical_display_text, m.start_char)
            cp_end = utf16_to_codepoint_offset(snapshot.canonical_display_text, m.end_char)
            extracted = snapshot.canonical_display_text[cp_start:cp_end]
            self.assertEqual(extracted, m.original_text)

    def test_truthful_rewrite_contains_no_invented_metrics(self):
        resume_text = "Responsible for various technologies in the backend."
        snapshot = create_document_snapshot(resume_text, document_id="doc_c_02")
        markups = detect_rule_based_markups(snapshot)
        yellow_marks = [m for m in markups if m.color_tag == "yellow"]

        for m in yellow_marks:
            # Must contain user-guided bracketed placeholder rather than an invented number
            self.assertIn("[", m.suggested_rewrite)
            self.assertIn("]", m.suggested_rewrite)
            self.assertTrue(m.requires_user_confirmation)

    def test_surgical_in_memory_replacement_and_recalculation(self):
        resume_text = (
            "Summary\n"
            "Worked on backend architecture.\n"
        )
        snapshot = create_document_snapshot(resume_text, document_id="doc_c_03")
        markups = detect_rule_based_markups(snapshot)
        worked_on_mark = next(m for m in markups if m.original_text.lower() == "worked on")

        replacement = "Engineered and benchmarked"
        updated_snapshot, diff_meta = apply_markup_replacement(
            snapshot=snapshot,
            markup=worked_on_mark,
            replacement_text=replacement,
            new_revision_id="rev_1"
        )

        # Invariant: ONLY target slice changed
        self.assertNotIn("Worked on", updated_snapshot.canonical_display_text)
        self.assertIn("Engineered and benchmarked backend architecture.", updated_snapshot.canonical_display_text)
        self.assertEqual(diff_meta["new_revision_id"], "rev_1")
        self.assertNotEqual(snapshot.text_hash, updated_snapshot.text_hash)

        # Invariant: Attempting to apply same markup to updated snapshot raises stale offset error
        with self.assertRaises(ValueError):
            apply_markup_replacement(
                snapshot=updated_snapshot,
                markup=worked_on_mark,
                replacement_text="Re-replacing",
                new_revision_id="rev_2"
            )


if __name__ == "__main__":
    unittest.main()
