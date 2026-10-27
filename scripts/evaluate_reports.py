"""
scripts/evaluate_reports.py
Deterministic validation harness for placement benchmarking reports.
Verifies Pydantic schema conformance, score invariants, evidence grounding,
absence of PII, and recommendation consistency.
"""

import sys
import os
import json
import re
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import PlacementBenchmarkingReport, ScoreComponentItem, SkillEvidenceItem, RecommendationItem
from services.pdf_ingestion import EMAIL_REGEX, PHONE_REGEX


def validate_report_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates a report dictionary against formal schema and business invariants.
    Returns a dict with status, errors, and warnings.
    """
    errors: List[str] = []
    warnings: List[str] = []

    # 1. Pydantic schema validation
    try:
        report = PlacementBenchmarkingReport(**data)
    except Exception as e:
        return {
            "is_valid": False,
            "errors": [f"Pydantic Schema Error: {str(e)}"],
            "warnings": []
        }

    # 2. Score bounds check [0, 100]
    if not (0 <= report.overall_score <= 100):
        errors.append(f"Overall score {report.overall_score} out of bounds [0, 100].")

    # 3. Score breakdown summation invariant
    if report.score_breakdown:
        total_max = sum(c.max_points for c in report.score_breakdown)
        if total_max != 100:
            errors.append(f"Rubric max points sum to {total_max}, expected 100.")

        total_earned = sum(c.points_earned for c in report.score_breakdown)
        if abs(round(total_earned) - report.overall_score) > 1:
            errors.append(
                f"Sum of earned points ({total_earned:.1f}) does not match overall score ({report.overall_score})."
            )

    # 4. Evidence grounding check
    for rec in report.recommendations:
        if not rec.action or len(rec.action.strip()) < 10:
            warnings.append(f"Recommendation action is too brief or empty: '{rec.action}'")
        if not rec.why_it_matters:
            warnings.append(f"Recommendation missing 'why_it_matters' grounding: '{rec.action}'")

    # 5. PII scrubbing check
    serialized_text = json.dumps(data)
    if EMAIL_REGEX.search(serialized_text):
        errors.append("Unredacted email address detected in report content.")
    if PHONE_REGEX.search(serialized_text):
        warnings.append("Possible telephone number pattern detected in report content.")

    # 6. Skill absence contradiction check
    matched_canonical = {
        s.canonical.lower() for s in report.matched_skills if s.evidence_status in ("demonstrated", "used")
    }
    for missing in report.missing_required_skills:
        if missing.lower() in matched_canonical:
            errors.append(
                f"Contradiction: Skill '{missing}' marked as missing required, but found in matched evidence."
            )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "overall_score": report.overall_score,
        "archetype": report.detected_archetype,
        "recommendations_count": len(report.recommendations)
    }


def run_self_test():
    """Runs automated validation test cases over valid and adversarial reports."""
    print("--- Running Deterministic Report Evaluation Suite ---")

    # Test Case 1: Valid compliant report
    valid_sample = {
        "schema_version": "2.0.0",
        "analysis_id": "eval_001",
        "overall_score": 78,
        "score_label": "Resume-to-Job Alignment (Heuristic)",
        "score_confidence": "high",
        "detected_archetype": "Data Science & AI/ML",
        "archetype_confidence": 0.85,
        "is_archetype_uncertain": False,
        "score_breakdown": [
            {"key": "required_skills", "name": "Required Skill Coverage", "points_earned": 28.0, "max_points": 35, "detail": "Covered 4/5 skills"},
            {"key": "project_evidence", "name": "Relevant Project Evidence", "points_earned": 20.0, "max_points": 25, "detail": "2 strong ML projects"},
            {"key": "task_alignment", "name": "Task & Responsibility Alignment", "points_earned": 15.0, "max_points": 20, "detail": "Aligned tasks"},
            {"key": "quantified_impact", "name": "Quantified Impact & Metrics", "points_earned": 7.0, "max_points": 10, "detail": "Latency improvements"},
            {"key": "resume_completeness", "name": "Formatting & Completeness", "points_earned": 8.0, "max_points": 10, "detail": "Standard layout"}
        ],
        "matched_skills": [
            {"canonical": "Python", "category": "Languages", "matched_alias": "python", "evidence_status": "demonstrated", "evidence_snippet": "Built pipeline in Python with 95% accuracy"}
        ],
        "missing_required_skills": ["Docker"],
        "missing_preferred_skills": ["Kubernetes"],
        "recommendations": [
            {
                "priority": "high",
                "action": "Add Docker containerization to your image classification project.",
                "why_it_matters": "JD requires Docker deployment experience for MLOps.",
                "alumni_precedent": "Alumni placed in ML roles highlight containerized REST endpoints."
            }
        ],
        "alumni_precedents_used": 3,
        "feedback_markdown": "### Alignment Diagnostic\nYour profile demonstrates strong alignment.",
        "disclaimer": "Diagnostic support only; not an official hiring or placement guarantee."
    }

    result_valid = validate_report_dict(valid_sample)
    print(f"Test 1 (Valid Report): {'PASSED' if result_valid['is_valid'] else 'FAILED'}")
    assert result_valid["is_valid"], f"Valid report failed: {result_valid['errors']}"

    # Test Case 2: Adversarial report with unredacted PII and contradiction
    adversarial_sample = dict(valid_sample)
    adversarial_sample["feedback_markdown"] = "Contact candidate at candidate@university.edu"
    adversarial_sample["missing_required_skills"] = ["Python"]
    result_adv = validate_report_dict(adversarial_sample)
    print(f"Test 2 (Adversarial Report Rejection): {'PASSED' if not result_adv['is_valid'] else 'FAILED'}")
    assert not result_adv["is_valid"], "Adversarial report should have failed validation!"
    print(f"  Caught expected errors: {result_adv['errors']}")

    print("\n--- [OK] All Report Evaluation Tests Passed! ---")



if __name__ == "__main__":
    run_self_test()
