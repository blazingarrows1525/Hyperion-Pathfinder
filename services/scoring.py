"""
services/scoring.py
Deterministic Resume-to-Job Alignment Scoring Engine with transparent component breakdowns.
"""

import os
import json
import re
from typing import Dict, List, Optional


RUBRIC_PATH = os.path.join(os.path.dirname(__file__), "..", "scoring_rubric.json")


def load_rubric() -> Dict:
    """Loads the versioned scoring rubric configuration."""
    if not os.path.exists(RUBRIC_PATH):
        return {
            "rubric_id": "DEFAULT",
            "version": "1.0.0",
            "disclaimer": "Heuristic alignment score. Does not measure hiring probability.",
            "components": []
        }
    with open(RUBRIC_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


METRIC_PATTERN = re.compile(
    r'(?:\b\d+(?:\.\d+)?%|\b\d+\+?\s*(?:qps|users|req|ms|seconds|minutes|lpa|stars|downloads|clients|queries|tb|gb|mb)\b)',
    re.IGNORECASE
)


def calculate_deterministic_score(
    candidate_skills: Dict[str, Dict],
    jd_decomposition: Dict[str, List[str]],
    sections: Dict[str, str],
    retrieval_diagnostics: Dict[str, float]
) -> Dict:
    """
    Calculates a fully deterministic, explainable alignment score based on the versioned rubric:
    - Required Skills Coverage (35%)
    - Project Implementation Evidence (25%)
    - Role Domain & Responsibility Alignment (20%)
    - Quantified Metric Density (10%)
    - Section Completeness & Readability (10%)
    """
    rubric = load_rubric()

    required_skills = jd_decomposition.get("required_skills", [])
    matched_canonical = {s["canonical"].lower() for s in candidate_skills.values() if s["evidence_status"] != "not_found"}
    
    # 1. Required Skills Coverage (35 points)
    if required_skills:
        req_matched_count = sum(1 for req in required_skills if req.lower() in matched_canonical)
        req_ratio = req_matched_count / len(required_skills)
    else:
        req_matched_count = len(matched_canonical)
        req_ratio = min(1.0, req_matched_count / 5.0)  # Baseline assumption if JD had no explicit skills

    score_req_skills = round(req_ratio * 35.0, 1)

    # 2. Project Implementation Evidence (25 points)
    # Counts skills with 'used' or 'demonstrated' status
    demonstrated_count = sum(1 for s in candidate_skills.values() if s["evidence_status"] == "demonstrated")
    used_count = sum(1 for s in candidate_skills.values() if s["evidence_status"] == "used")
    
    total_practical = (demonstrated_count * 1.0) + (used_count * 0.7)
    practical_ratio = min(1.0, total_practical / max(1, len(matched_canonical))) if matched_canonical else 0.0
    score_projects = round(practical_ratio * 25.0, 1)

    # 3. Domain & Responsibility Alignment (20 points)
    # Grounded in the top cosine similarity retrieved from alumni precedents in that role
    top_sim = retrieval_diagnostics.get("top_similarity", 0.5)
    # Map cosine similarity (typically 0.3 - 0.85) to a 0.0 - 1.0 ratio
    norm_sim = max(0.0, min(1.0, (top_sim - 0.25) / 0.60))
    score_domain = round(norm_sim * 20.0, 1)

    # 4. Quantified Metrics Density (10 points)
    full_text = " ".join(sections.values())
    metrics_found = METRIC_PATTERN.findall(full_text)
    metric_count = len(metrics_found)
    metric_ratio = min(1.0, metric_count / 4.0)  # 4+ metrics gets full 10 points
    score_metrics = round(metric_ratio * 10.0, 1)

    # 5. Section Completeness (10 points)
    core_sections = ["education", "experience", "projects", "skills"]
    sections_present = sum(1 for s in core_sections if s in sections and len(sections[s]) > 20)
    completeness_ratio = sections_present / len(core_sections)
    score_completeness = round(completeness_ratio * 10.0, 1)

    total_score = int(round(score_req_skills + score_projects + score_domain + score_metrics + score_completeness))
    total_score = max(0, min(100, total_score))

    breakdown = [
        {
            "key": "required_skills",
            "name": "Required Technical Skills Coverage",
            "points_earned": score_req_skills,
            "max_points": 35,
            "detail": f"Matched {req_matched_count} of {len(required_skills)} target requirements."
        },
        {
            "key": "project_evidence",
            "name": "Project & Implementation Context",
            "points_earned": score_projects,
            "max_points": 25,
            "detail": f"{demonstrated_count} skills demonstrated with metrics; {used_count} used in projects."
        },
        {
            "key": "domain_responsibilities",
            "name": "Role Domain Alignment",
            "points_earned": score_domain,
            "max_points": 20,
            "detail": f"Semantic alignment score of {top_sim:.3f} against target alumni knowledge store."
        },
        {
            "key": "metrics_density",
            "name": "Quantified Achievements",
            "points_earned": score_metrics,
            "max_points": 10,
            "detail": f"Identified {metric_count} quantifiable technical/business achievement metrics."
        },
        {
            "key": "completeness_readability",
            "name": "Completeness & Readability",
            "points_earned": score_completeness,
            "max_points": 10,
            "detail": f"{sections_present} of 4 core resume sections explicitly identified."
        }
    ]

    return {
        "overall_score": total_score,
        "rubric_id": rubric.get("rubric_id", "RESUME-CHECKER-ALIGN-v1.0"),
        "score_label": "Resume-to-Job Alignment (Heuristic)",
        "disclaimer": rubric.get("disclaimer"),
        "breakdown": breakdown
    }
