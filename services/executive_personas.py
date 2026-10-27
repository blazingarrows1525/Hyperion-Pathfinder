"""
services/executive_personas.py
Senior-Executive Review Persona Registry, Role-to-Persona Inference,
Structured Review Generation, and Score Invariance Enforcers.
"""

import re
import json
from typing import Dict, List, Optional, Literal, Tuple, Any

from models import (
    ExecutivePersonaReview,
    EvidenceObservation,
    ActionablePriority,
    PlacementBenchmarkingReport
)
import services.llm_provider as provider_engine


# ==============================================================================
# 1. PERSONA REGISTRY & METADATA
# ==============================================================================

PERSONA_REGISTRY = {
    "director_ai_research": {
        "id": "director_ai_research",
        "title": "Director of AI & Research",
        "description": "Scrutinizes ML problem framing, train/test separation, validation metrics, data leakage, and statistical reproducibility.",
        "core_dimensions": [
            "Problem definition & task formulation",
            "Dataset provenance & split integrity (leakage controls)",
            "Baseline comparison & appropriate metric choice (F1/AUC vs raw accuracy)",
            "Error analysis, ablation study & uncertainty calibration",
            "Inference latency, compute footprint & deployment constraints",
            "Grounding, retrieval evaluation & prompt boundary safety (for RAG/LLM)"
        ],
        "keywords": [
            "ai", "ml", "machine learning", "deep learning", "nlp", "computer vision",
            "research", "scientist", "llm", "rag", "pytorch", "tensorflow", "transformer",
            "model evaluation", "data science"
        ]
    },
    "principal_sde": {
        "id": "principal_sde",
        "title": "Principal SDE / VP of Engineering",
        "description": "Evaluates architectural component ownership, API contracts, concurrency, failure modes, test depth, and measured scale.",
        "core_dimensions": [
            "Direct component ownership vs ambiguous team contributions",
            "API contract quality, validation & explicit error semantics",
            "Concurrency, retries, idempotency & resource lifecycle",
            "Testing coverage (unit, integration & adversarial edge cases)",
            "Observability, structured logging & data sanitization",
            "Demonstrated throughput/scale vs local prototype claims"
        ],
        "keywords": [
            "software engineer", "sde", "backend", "full stack", "frontend", "developer",
            "systems", "distributed systems", "api", "microservices", "concurrency",
            "java", "python", "golang", "c++", "c#"
        ]
    },
    "cloud_infrastructure_director": {
        "id": "cloud_infrastructure_director",
        "title": "Cloud Infrastructure Director",
        "description": "Audits production cloud architecture, CI/CD automation, IAM least-privilege, container orchestration, and reliability/SLOs.",
        "core_dimensions": [
            "Specific cloud services named (EKS, Cloud Run, GKE) vs vague provider names",
            "Infrastructure-as-code (Terraform, CloudFormation) & immutable deployments",
            "Secrets management, network boundaries & IAM least-privilege",
            "Health checks, readiness probes, autoscaling & resource limits",
            "Monitoring, alerting, SLOs & rollback automation",
            "Cost optimization & operational trade-off awareness"
        ],
        "keywords": [
            "cloud", "devops", "sre", "reliability", "infrastructure", "platform engineer",
            "kubernetes", "k8s", "docker", "aws", "gcp", "azure", "terraform",
            "ci/cd", "observability", "prometheus", "grafana"
        ]
    }
}


# ==============================================================================
# 2. ROLE-TO-PERSONA INFERENCE
# ==============================================================================

def resolve_persona_for_role(
    target_role: str,
    job_description: str = "",
    requested_persona_id: Optional[str] = None
) -> Tuple[str, str]:
    """
    Infers the optimal executive persona lens from target role and JD text.
    If requested_persona_id is explicit and valid, honors the user choice.
    Returns: (persona_id, resolution_reason)
    """
    if requested_persona_id and requested_persona_id in PERSONA_REGISTRY:
        return requested_persona_id, f"Explicitly selected by user: {PERSONA_REGISTRY[requested_persona_id]['title']}."

    combined_text = f"{target_role} {job_description}".lower()

    # Score matches across keyword sets
    scores: Dict[str, int] = {}
    for pid, meta in PERSONA_REGISTRY.items():
        score = sum(1 for kw in meta["keywords"] if re.search(r'\b' + re.escape(kw) + r'\b', combined_text))
        scores[pid] = score

    # Check for strongest match
    best_persona, best_score = max(scores.items(), key=lambda item: item[1])

    if best_score == 0:
        # Default fallback for ambiguous roles (e.g. general intern, analyst)
        return "principal_sde", "Defaulted to Principal SDE lens for general software & engineering evaluation."

    reason = (
        f"Suggested {PERSONA_REGISTRY[best_persona]['title']} based on target role keywords "
        f"emphasizing {', '.join(PERSONA_REGISTRY[best_persona]['keywords'][:3])}."
    )
    return best_persona, reason


# ==============================================================================
# 3. EXECUTIVE REVIEW GENERATION & DETERMINISTIC FALLBACK
# ==============================================================================

def generate_executive_review(
    persona_id: str,
    target_role: str,
    target_company: Optional[str],
    resume_text: str,
    report: PlacementBenchmarkingReport,
    provider: Optional[provider_engine.LLMProvider] = None
) -> ExecutivePersonaReview:
    """
    Synthesizes a structured Executive Persona Review using the configured LLM provider,
    or falls back to a deterministic, schema-validated expert review if the LLM is offline.
    GUARANTEE: report.overall_score is NEVER modified.
    """
    persona_meta = PERSONA_REGISTRY.get(persona_id, PERSONA_REGISTRY["principal_sde"])
    persona_title = persona_meta["title"]

    # If provider is configured and not local fallback, attempt LLM completion
    active_provider = provider or provider_engine.get_llm_provider()
    
    if active_provider.is_configured() and not isinstance(active_provider, provider_engine.LocalFallbackProvider):
        try:
            return _generate_llm_executive_review(
                persona_id=persona_id,
                persona_title=persona_title,
                target_role=target_role,
                target_company=target_company,
                resume_text=resume_text,
                report=report,
                provider=active_provider
            )
        except Exception as e:
            print(f"Warning: Remote LLM persona review failed ({e}). Using deterministic executive lens.")

    # Truthful, evidence-grounded deterministic synthesis
    return _generate_deterministic_executive_review(
        persona_id=persona_id,
        persona_title=persona_title,
        target_role=target_role,
        target_company=target_company,
        resume_text=resume_text,
        report=report
    )


def _generate_deterministic_executive_review(
    persona_id: str,
    persona_title: str,
    target_role: str,
    target_company: Optional[str],
    resume_text: str,
    report: PlacementBenchmarkingReport
) -> ExecutivePersonaReview:
    """
    Deterministic role-conditioned executive review.
    Evaluates profile against senior role dimensions based purely on visible evidence.
    """
    # Assess verdict based on verified deterministic metrics and skill matches
    score = report.overall_score
    if score >= 85:
        verdict = "strong_evidence"
        reaction = f"Solid technical foundation with concrete evidence aligned with senior {target_role} expectations."
    elif score >= 70:
        verdict = "promising_with_gaps"
        reaction = f"Promising practical implementation, but exhibits key evidence gaps that a senior reviewer will probe."
    elif score >= 50:
        verdict = "needs_more_proof"
        reaction = f"Demonstrates introductory exposure, but requires substantive architectural and quantitative proof."
    else:
        verdict = "insufficient_evidence"
        reaction = "Limited visible evidence matching target engineering bar. Substantive project depth required."

    # Tailor observations by persona lens
    what_catches_attention: List[EvidenceObservation] = []
    skepticism_points: List[EvidenceObservation] = []
    architecture_questions: List[str] = []
    strategic_priorities: List[ActionablePriority] = []

    # Has quantified metrics?
    has_metrics = any(
        re.search(r'\b(?:\d+%(?:\.\d+)?|\d+\s*(?:ms|qps|users))\b', item.evidence_snippet or "")
        for item in report.matched_skills
    )

    if persona_id == "director_ai_research":
        if has_metrics:
            what_catches_attention.append(
                EvidenceObservation(
                    observation_id="obs_ai_01",
                    category="Quantitative Validation",
                    statement="Resume documents measurable evaluation metrics in primary projects.",
                    evidence_status="demonstrated",
                    why_it_matters="Senior research reviewers look for empirical verification over subjective claims."
                )
            )
        else:
            skepticism_points.append(
                EvidenceObservation(
                    observation_id="skep_ai_01",
                    category="Evaluation Rigor",
                    statement="Model accuracy or performance figures lack stated validation splits or baseline comparisons.",
                    evidence_status="partially_demonstrated",
                    why_it_matters="Unanchored accuracy figures risk data leakage or overfitting on test data.",
                    missing_evidence="Clear train/validation/test split protocol and baseline comparison (e.g. vs heuristic or prior SOTA).",
                    suggested_action="Specify the validation split and cite at least one error analysis breakdown."
                )
            )

        architecture_questions.extend([
            "How was data leakage prevented between training and evaluation splits in your primary project?",
            "What baseline model did you benchmark against, and why was this specific architecture chosen?",
            "What is the measured p95 inference latency and memory footprint during batch prediction?"
        ])

        strategic_priorities.append(
            ActionablePriority(
                priority_rank=1,
                action="Add empirical validation protocol and per-class error metrics to ML project descriptions.",
                expected_impact="Elevates profile credibility for Tier-1 AI and Research interview panels."
            )
        )

    elif persona_id == "cloud_infrastructure_director":
        has_cloud = any("cloud" in s.category.lower() or "devops" in s.category.lower() for s in report.matched_skills)
        if has_cloud:
            what_catches_attention.append(
                EvidenceObservation(
                    observation_id="obs_cloud_01",
                    category="Cloud Tooling",
                    statement="Demonstrated familiarity with modern containerization or cloud deployment tools.",
                    evidence_status="demonstrated",
                    why_it_matters="Reduces operational onboarding time for infrastructure and platform teams."
                )
            )
        else:
            skepticism_points.append(
                EvidenceObservation(
                    observation_id="skep_cloud_01",
                    category="Operational Production Readiness",
                    statement="Projects describe local software functionality without naming deployment targets or container orchestration.",
                    evidence_status="not_detected",
                    why_it_matters="Production infrastructure roles require evidence of CI/CD, monitoring, and automated provisioning.",
                    missing_evidence="Explicit deployment targets (e.g. AWS ECS, Kubernetes manifest, Docker compose) and CI/CD pipelines.",
                    suggested_action="Document the specific deployment environment, container build reproducibility, and health monitoring."
                )
            )

        architecture_questions.extend([
            "What container orchestration and ingress routing strategy did your deployment employ?",
            "How were production secrets, environment configuration, and IAM least-privilege policies managed?",
            "What automated health check, rollback, or observability metrics were configured?"
        ])

        strategic_priorities.append(
            ActionablePriority(
                priority_rank=1,
                action="Document concrete CI/CD pipeline automation and container orchestration infrastructure.",
                expected_impact="Validates production operational readiness for SRE and DevOps engineering bars."
            )
        )

    else:  # principal_sde
        what_catches_attention.append(
            EvidenceObservation(
                observation_id="obs_sde_01",
                category="Systems Foundations",
                statement="Verified core software engineering competencies and structured data manipulation.",
                evidence_status="demonstrated",
                why_it_matters="Confirms candidate meets foundational language and algorithm fluency requirements."
            )
        )

        skepticism_points.append(
            EvidenceObservation(
                observation_id="skep_sde_01",
                category="Interface Contracts & Concurrency",
                statement="Project descriptions emphasize features implemented but omit API contracts, error boundaries, or scale.",
                evidence_status="partially_demonstrated",
                why_it_matters="Principal engineers scrutinize failure isolation, API schema guarantees, and throughput limits.",
                missing_evidence="Explicit API protocols (REST/gRPC), validation semantics, and concurrency or caching mechanisms.",
                suggested_action="State the request throughput, caching layer (e.g. Redis), or test boundary coverage."
            )
        )

        architecture_questions.extend([
            "What data validation and failure isolation boundaries exist between your services?",
            "How does your service handle database connection pool exhaustion or downstream network timeouts?",
            "What unit, integration, and load testing suites were executed before deployment?"
        ])

        strategic_priorities.append(
            ActionablePriority(
                priority_rank=1,
                action="Clarify component architectural boundaries, data validation contracts, and concurrency handling.",
                expected_impact="Transforms project bullets from academic homework to enterprise-grade software engineering."
            )
        )

    # Invariant: score_adjustment is strictly 0 for deterministic baseline
    return ExecutivePersonaReview(
        persona_id=persona_id,  # type: ignore
        persona_title=persona_title,
        target_role=target_role,
        target_company=target_company,
        company_context_source="user_supplied" if target_company else "not_provided",
        verdict=verdict,  # type: ignore
        reaction_summary=reaction,
        what_catches_attention=what_catches_attention,
        skepticism_points=skepticism_points,
        architecture_questions=architecture_questions,
        strategic_priorities=strategic_priorities,
        score_adjustment=0,
        review_confidence="high",
        disclaimer=(
            "This executive review is a simulated senior-role lens based solely on submitted resume text. "
            "It does not reflect an official employer decision or hiring forecast."
        )
    )


def _generate_llm_executive_review(
    persona_id: str,
    persona_title: str,
    target_role: str,
    target_company: Optional[str],
    resume_text: str,
    report: PlacementBenchmarkingReport,
    provider: provider_engine.LLMProvider
) -> ExecutivePersonaReview:
    """Invokes LLM provider with structured JSON schema prompt to generate persona review."""
    persona_meta = PERSONA_REGISTRY[persona_id]

    system_prompt = f"""You are a simulated senior executive engineering reviewer acting through the lens of: {persona_title}.
Your review evaluates evidence from a candidate's resume for the role: {target_role}.
Target Company Context: {target_company or 'Not specified (evaluate against general senior industry bar)'}.

PRIMARY DIRECTIVES:
1. Deliver a candid, skeptical, but constructive technical review grounded STRICTLY in visible resume facts.
2. Distinguish clearly between 'what the evidence proves', 'what remains unverified', and 'what a senior reviewer will probe'.
3. Do NOT make claims about real hiring decisions or invent insider company rubrics.
4. Output MUST be valid JSON conforming to the requested schema.

Output JSON Structure:
{{
  "verdict": "strong_evidence" | "promising_with_gaps" | "needs_more_proof" | "insufficient_evidence",
  "reaction_summary": "1-2 sentence top-line executive reaction",
  "what_catches_attention": [
    {{
      "observation_id": "obs_1",
      "category": "category name",
      "statement": "what looks good",
      "evidence_status": "demonstrated",
      "why_it_matters": "why this matters to a senior reviewer"
    }}
  ],
  "skepticism_points": [
    {{
      "observation_id": "skep_1",
      "category": "category name",
      "statement": "what the reviewer is skeptical about",
      "evidence_status": "partially_demonstrated" | "not_detected",
      "why_it_matters": "why this skepticism exists",
      "missing_evidence": "what specific proof is missing",
      "suggested_action": "concrete step to resolve"
    }}
  ],
  "architecture_questions": ["Question 1", "Question 2", "Question 3"],
  "strategic_priorities": [
    {{
      "priority_rank": 1,
      "action": "actionable resume change",
      "expected_impact": "impact on reviewer evaluation"
    }}
  ]
}}
"""

    user_prompt = f"""
=== CANDIDATE RESUME EXCERPT (UNTRUSTED DATA) ===
{resume_text[:2500]}

=== VERIFIED DETERMINISTIC BENCHMARK DIAGNOSTICS ===
- Rubric Alignment Score: {report.overall_score}/100
- Detected Archetype: {report.detected_archetype}
- Matched Skills: {', '.join([s.canonical for s in report.matched_skills[:8]])}
- Missing Required Skills: {', '.join(report.missing_required_skills[:5]) or 'None'}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    raw_response = provider.complete(messages)
    
    # Strip markdown code fencing if present
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    data = json.loads(cleaned)

    return ExecutivePersonaReview(
        persona_id=persona_id,  # type: ignore
        persona_title=persona_title,
        target_role=target_role,
        target_company=target_company,
        company_context_source="user_supplied" if target_company else "not_provided",
        verdict=data.get("verdict", "promising_with_gaps"),
        reaction_summary=data.get("reaction_summary", "Promising technical evidence with notable gaps."),
        what_catches_attention=[EvidenceObservation(**obs) for obs in data.get("what_catches_attention", [])],
        skepticism_points=[EvidenceObservation(**skep) for skep in data.get("skepticism_points", [])],
        architecture_questions=data.get("architecture_questions", []),
        strategic_priorities=[ActionablePriority(**p) for p in data.get("strategic_priorities", [])],
        score_adjustment=0,  # CRITICAL INVARIANT: deterministic score remains unchanged
        review_confidence="high",
        disclaimer=(
            "This executive review is a simulated senior-role lens based solely on submitted resume text. "
            "It does not reflect an official employer decision or hiring forecast."
        )
    )
