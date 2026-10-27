"""
services/skills.py
Canonical skill extraction, alias normalization, and evidence-span analysis.
"""

import os
import json
import re
from typing import Dict, List, Optional, Set, Tuple


TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "skill_taxonomy.json")


def load_skill_taxonomy() -> List[Dict]:
    """Loads the canonical skill taxonomy JSON."""
    if not os.path.exists(TAXONOMY_PATH):
        return []
    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("skills", [])


METRIC_REGEX = re.compile(
    r'(?:\b\d+(?:\.\d+)?%|\b\d+\+?\s*(?:qps|users|req|ms|seconds|minutes|lpa|stars|downloads|clients|queries|tb|gb|mb)\b)',
    re.IGNORECASE
)


def extract_skills_with_evidence(sections: Dict[str, str], full_text: str) -> Dict[str, Dict]:
    """
    Extracts all known canonical skills from resume sections and classifies evidence depth:
    - 'demonstrated': skill is contextualized with a metric in projects/experience
    - 'used': skill appears in projects or experience description
    - 'mentioned': skill appears only in skills/summary section
    - 'not_found': not detected in resume text
    """
    taxonomy = load_skill_taxonomy()
    extracted = {}

    lower_full = full_text.lower()
    projects_text = (sections.get("projects", "") + " " + sections.get("experience", "")).lower()
    skills_text = (sections.get("skills", "") + " " + sections.get("summary", "")).lower()

    for skill in taxonomy:
        canonical = skill["canonical"]
        category = skill["category"]
        aliases = skill.get("aliases", [canonical.lower()])

        found = False
        matched_alias = None
        evidence_status = "not_found"
        evidence_snippet = None

        for alias in aliases:
            # Word-boundary matching for short acronyms, exact substring for phrases
            pattern = r'\b' + re.escape(alias.lower()) + r'\b'
            match = re.search(pattern, lower_full)
            if match:
                found = True
                matched_alias = alias
                
                # Check evidence level
                proj_match = re.search(pattern, projects_text)
                if proj_match:
                    # Look around the match for numerical impact metrics
                    start_char = max(0, proj_match.start() - 100)
                    end_char = min(len(projects_text), proj_match.end() + 100)
                    surrounding = projects_text[start_char:end_char]
                    
                    if METRIC_REGEX.search(surrounding):
                        evidence_status = "demonstrated"
                    else:
                        evidence_status = "used"
                    evidence_snippet = surrounding.strip()
                else:
                    evidence_status = "mentioned"
                    evidence_snippet = f"Listed in skills/summary section under {alias}"
                break

        if found:
            extracted[skill["id"]] = {
                "id": skill["id"],
                "canonical": canonical,
                "category": category,
                "matched_alias": matched_alias,
                "evidence_status": evidence_status,
                "evidence_snippet": evidence_snippet
            }

    return extracted


def decompose_job_description(jd_text: str) -> Dict:
    """
    Identifies required vs preferred skills from job description text.
    """
    taxonomy = load_skill_taxonomy()
    lower_jd = jd_text.lower()

    # Split into sections if 'preferred' / 'nice to have' is mentioned
    preferred_split = re.split(r'\b(?:preferred|nice to have|good to have|bonus|plus)\b', lower_jd, maxsplit=1)
    
    required_corpus = preferred_split[0]
    preferred_corpus = preferred_split[1] if len(preferred_split) > 1 else ""

    required_skills = []
    preferred_skills = []

    for skill in taxonomy:
        aliases = skill.get("aliases", [skill["canonical"].lower()])
        in_required = False
        in_preferred = False

        for alias in aliases:
            pat = r'\b' + re.escape(alias.lower()) + r'\b'
            if re.search(pat, required_corpus):
                in_required = True
                break
            elif preferred_corpus and re.search(pat, preferred_corpus):
                in_preferred = True
                break

        if in_required:
            required_skills.append(skill["canonical"])
        elif in_preferred:
            preferred_skills.append(skill["canonical"])

    # Fallback: if no required skills detected, extract all found skills as required
    if not required_skills and not preferred_skills:
        for skill in taxonomy:
            for alias in skill.get("aliases", [skill["canonical"].lower()]):
                if re.search(r'\b' + re.escape(alias.lower()) + r'\b', lower_jd):
                    required_skills.append(skill["canonical"])
                    break

    return {
        "required_skills": required_skills,
        "preferred_skills": preferred_skills
    }
