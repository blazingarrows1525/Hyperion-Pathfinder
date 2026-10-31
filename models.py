"""
models.py
Typed schemas for LangGraph execution state, API payloads, and Pydantic report validation.
Includes exact span markup, executive persona reviews, and document snapshot contracts.
"""

from typing import TypedDict, List, Dict, Optional, Literal, Any
import uuid
from pydantic import BaseModel, Field, field_validator, model_validator, computed_field


# ==============================================================================
# 1. EXACT SPAN IN-DOCUMENT MARKUP CONTRACTS
# ==============================================================================

class WordMarkupItem(BaseModel):
    """
    Exact character span annotation within a declared canonical display text string.
    Interval is half-open [start_char, end_char).
    """
    markup_id: str = Field(..., description="Stable unique ID for this markup instance.")
    start_char: int = Field(ge=0, description="Inclusive start index in canonical display text.")
    end_char: int = Field(gt=0, description="Exclusive end index in canonical display text.")
    original_text: str = Field(..., description="Exact substring matching display_text[start_char:end_char].")
    
    category: Literal["metric_highlight", "passive_verb", "buzzword_gap"] = Field(
        ..., description="Taxonomy classification for the flagged phrase."
    )
    color_tag: Literal["green", "yellow", "red"] = Field(
        ..., description="Color tag mapped deterministically: green=metric, yellow=passive, red=gap."
    )
    critique: str = Field(..., description="Objective, evidence-based critique explaining the flag.")
    suggested_rewrite: str = Field(
        ..., description="Truthful suggested replacement with placeholders for unverified numbers."
    )
    
    severity: Literal["info", "review", "critical"] = Field(
        default="review", description="Diagnostic severity level."
    )
    evidence_basis: Literal["rule", "model_suggestion", "combined"] = Field(
        default="rule", description="Provenance of the markup detection."
    )
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    created_from_text_version: Optional[str] = None
    source_section: Optional[str] = None
    requires_user_confirmation: bool = True

    @model_validator(mode="after")
    def validate_span_bounds(self) -> "WordMarkupItem":
        if self.end_char <= self.start_char:
            raise ValueError(f"end_char ({self.end_char}) must be strictly greater than start_char ({self.start_char})")
        return self


class ResumeDocumentSnapshot(BaseModel):
    """
    Immutable representation of the normalized, PII-redacted resume text and its version hash.
    All character spans reference canonical_display_text.
    """
    document_id: str
    revision_id: str
    text_version: str = "1.0"
    text_hash: str = Field(..., description="SHA-256 hex digest of canonical_display_text.")
    canonical_display_text: str
    offset_unit: Literal["utf-16", "codepoint"] = "utf-16"
    page_count: int = 1
    extraction_quality: str = "high"
    redaction_applied: bool = True
    section_ranges: Dict[str, Dict[str, int]] = Field(default_factory=dict)


# ==============================================================================
# 2. EXECUTIVE PERSONA REVIEW CONTRACTS
# ==============================================================================

class EvidenceObservation(BaseModel):
    """Concrete evidence observation grounded in visible resume facts."""
    observation_id: str
    category: str
    statement: str
    evidence_status: Literal["demonstrated", "partially_demonstrated", "not_detected"]
    source_span_ids: List[str] = Field(default_factory=list)
    why_it_matters: str
    missing_evidence: Optional[str] = None
    suggested_action: Optional[str] = None


class ActionablePriority(BaseModel):
    """Ordered next action recommended by the executive reviewer."""
    priority_rank: int
    action: str
    expected_impact: str
    prerequisites: Optional[str] = None
    acceptance_condition: Optional[str] = None


class ExecutivePersonaReview(BaseModel):
    """
    Role-conditioned senior executive review lens.
    Delivers candid, role-tailored feedback without corrupting the canonical score.
    """
    persona_id: Literal["director_ai_research", "principal_sde", "cloud_infrastructure_director"]
    persona_title: str
    target_role: str
    target_company: Optional[str] = None
    company_context_source: Literal["user_supplied", "public_data", "not_provided"] = "not_provided"
    
    verdict: Literal["strong_evidence", "promising_with_gaps", "needs_more_proof", "insufficient_evidence"]
    reaction_summary: str
    what_catches_attention: List[EvidenceObservation] = Field(default_factory=list)
    skepticism_points: List[EvidenceObservation] = Field(default_factory=list)
    architecture_questions: List[str] = Field(default_factory=list)
    strategic_priorities: List[ActionablePriority] = Field(default_factory=list)
    
    score_adjustment: int = Field(
        default=0, ge=-20, le=20,
        description="Informational only persona adjustment. Never alters the canonical rubric overall_score."
    )
    review_confidence: Literal["high", "medium", "low"] = "high"
    disclaimer: str = (
        "This executive review is a simulated senior-role lens based solely on submitted resume text. "
        "It does not reflect an official employer decision or hiring forecast."
    )


# ==============================================================================
# 3. PYDANTIC STRUCTURED REPORT CONTRACT
# ==============================================================================

class ScoreComponentItem(BaseModel):
    key: str
    name: str
    points_earned: float = Field(ge=0.0, le=100.0)
    max_points: int = Field(ge=0, le=100)
    detail: str


class SkillEvidenceItem(BaseModel):
    canonical: str
    category: str
    matched_alias: Optional[str] = None
    evidence_status: Literal["demonstrated", "used", "mentioned", "not_found"]
    evidence_snippet: Optional[str] = None


class RecommendationItem(BaseModel):
    priority: Literal["high", "medium", "low"]
    action: str
    why_it_matters: str
    alumni_precedent: Optional[str] = None


class PlacementBenchmarkingReport(BaseModel):
    """
    Validated Pydantic schema for the comprehensive placement intelligence diagnostic.
    Additive backward-compatible extension supporting executive persona reviews,
    exact span resume annotations, and document snapshot state.
    """
    schema_version: str = "2.0.0"
    analysis_id: str
    overall_score: int = Field(ge=0, le=100, description="Deterministic heuristic alignment score.")
    score_label: str = "Resume-to-Job Alignment (Heuristic)"
    score_confidence: Literal["high", "medium", "low"]
    
    detected_archetype: str
    archetype_confidence: float = Field(ge=0.0, le=1.0)
    is_archetype_uncertain: bool = False
    
    matched_skills: List[SkillEvidenceItem] = Field(default_factory=list)
    missing_required_skills: List[str] = Field(default_factory=list)
    missing_preferred_skills: List[str] = Field(default_factory=list)
    
    score_breakdown: List[ScoreComponentItem] = Field(default_factory=list)
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    
    alumni_precedents_used: int = 0
    feedback_markdown: str = ""
    disclaimer: str = (
        "This alignment score evaluates textual evidence alignment against target role requirements. "
        "It does not measure innate ability, official institutional statistics, or hiring guarantees."
    )
    
    # Milestone 1 Additive Fields:
    persona_review: Optional[ExecutivePersonaReview] = None
    resume_markups: List[WordMarkupItem] = Field(default_factory=list)
    document_snapshot: Optional[ResumeDocumentSnapshot] = None


# ==============================================================================
# 4. LANGGRAPH TYPED WORKFLOW STATE
# ==============================================================================

class GraphState(TypedDict, total=False):
    """
    Request-scoped LangGraph state machine data store.
    """
    analysis_id: str
    job_description: str
    file_bytes: Optional[bytes]
    resume_text: Optional[str]
    sections: Optional[Dict[str, str]]
    extraction_quality: Optional[str]
    
    # Milestone 1 additions
    document_snapshot: Optional[Dict[str, Any]]
    selected_persona_id: Optional[str]
    persona_review: Optional[Dict[str, Any]]
    resume_markups: Optional[List[Dict[str, Any]]]
    
    candidate_skills: Optional[Dict[str, Dict]]
    jd_requirements: Optional[Dict[str, List[str]]]
    
    retrieval_candidates: Optional[List[Dict[str, Any]]]
    retrieval_diagnostics: Optional[Dict[str, Any]]
    
    target_archetype: Optional[str]
    archetype_diagnostics: Optional[Dict[str, Any]]
    alumni_examples: Optional[str]
    
    deterministic_score: Optional[Dict[str, Any]]
    feedback: Optional[str]
    structured_report: Optional[Dict[str, Any]]
    
    error_message: Optional[str]
    error_code: Optional[str]


# ==============================================================================
# 5. CONVERSATIONAL COACH & DRAFT RECALCULATION PAYLOADS
# ==============================================================================

class CoachChatRequest(BaseModel):
    message: str = Field(default="", max_length=2000, description="User's query to the career coach.")
    selected_persona_id: Optional[str] = "principal_sde"
    target_role: Optional[str] = "Software Engineer"
    current_score: Optional[int] = None
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    relevant_markup_ids: List[str] = Field(default_factory=list)
    prompt_framework_id: Optional[str] = None
    framework_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_message_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("message") and data.get("user_message"):
                data["message"] = data["user_message"]
            if not data.get("prompt_framework_id") and data.get("framework_id"):
                data["prompt_framework_id"] = data["framework_id"]
        return data


class CoachChatResponse(BaseModel):
    answer: str
    spoken_summary: str
    evidence_refs: List[str] = Field(default_factory=list)
    persona_id: str
    persona_title: str
    framework_applied: Optional[str] = None
    disclaimer: str = (
        "Simulated career coaching advice grounded in submitted resume evidence. "
        "Not an official hiring assessment or employment guarantee."
    )

    @computed_field
    @property
    def spoken_briefing(self) -> str:
        return self.spoken_summary

    @computed_field
    @property
    def referenced_evidence_ids(self) -> List[str]:
        return self.evidence_refs


class PersonaReviewRequest(BaseModel):
    persona: str = Field(default="principal_sde")
    company: Optional[str] = None
    resumeText: str = Field(default="")
    target_role: Optional[str] = "Software Engineer"

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("persona") and data.get("selected_persona_id"):
                data["persona"] = data["selected_persona_id"]
            if not data.get("resumeText") and data.get("resume_text"):
                data["resumeText"] = data["resume_text"]
            if not data.get("company") and data.get("target_company"):
                data["company"] = data["target_company"]
            if not data.get("target_role") and data.get("role"):
                data["target_role"] = data["role"]
        return data


class AnnotateResumeRequest(BaseModel):
    resumeText: str = Field(default="")
    jdText: str = Field(default="")

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("resumeText") and data.get("resume_text"):
                data["resumeText"] = data["resume_text"]
            if not data.get("jdText") and data.get("job_description"):
                data["jdText"] = data["job_description"]
        return data


class ApplyRewriteRequest(BaseModel):
    originalText: str = Field(default="")
    suggestion: str = Field(default="")
    spanId: Optional[Any] = None
    resumeText: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("originalText") and data.get("original_text"):
                data["originalText"] = data["original_text"]
            if not data.get("suggestion") and data.get("suggested_rewrite"):
                data["suggestion"] = data["suggested_rewrite"]
            if not data.get("resumeText") and data.get("resume_text"):
                data["resumeText"] = data["resume_text"]
            if not data.get("spanId") and data.get("markup_id"):
                data["spanId"] = data["markup_id"]
        return data



class DraftRecalculateRequest(BaseModel):
    edited_text: str = Field(..., max_length=100000, description="Full in-memory edited resume draft text.")
    job_description: str = Field(default="", max_length=50000, description="Target job description.")
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:8]}")
    revision_id: str = "rev_0"
    selected_persona_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_recalc_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("edited_text") and data.get("draft_text"):
                data["edited_text"] = data["draft_text"]
            if not data.get("job_description") and data.get("target_job_description"):
                data["job_description"] = data["target_job_description"]
            if not data.get("revision_id") and data.get("base_revision_id"):
                data["revision_id"] = data["base_revision_id"]
            if not data.get("document_id") and data.get("analysis_id"):
                data["document_id"] = data["analysis_id"]
        return data


class DraftRecalculateResponse(BaseModel):
    document_snapshot: ResumeDocumentSnapshot
    overall_score: int
    score_breakdown: List[ScoreComponentItem]
    matched_skills: List[SkillEvidenceItem]
    missing_required_skills: List[str]
    missing_preferred_skills: List[str]
    resume_markups: List[WordMarkupItem]
    diff_summary: str

    @computed_field
    @property
    def recalculated_score(self) -> int:
        return self.overall_score

    @computed_field
    @property
    def active_markups(self) -> List[WordMarkupItem]:
        return self.resume_markups

    @computed_field
    @property
    def new_revision_id(self) -> str:
        return self.document_snapshot.revision_id


# ==============================================================================
# 6. LLM SERVICE CONFIGURATION AND CONTROL CONTRACTS
# ==============================================================================

class LLMConfigureRequest(BaseModel):
    provider_id: str = Field(..., description="Provider identifier: 'gemini', 'openai', 'groq', 'ollama', 'neural_local'")
    api_key: Optional[str] = Field(default=None, description="Optional provider API key")
    model: Optional[str] = Field(default=None, description="Optional model identifier override")
    base_url: Optional[str] = Field(default=None, description="Optional custom base URL endpoint")


class LLMTestRequest(BaseModel):
    provider_id: str = Field(..., description="Provider identifier to test")
    api_key: Optional[str] = Field(default=None, description="Optional provider API key to test")
    model: Optional[str] = Field(default=None, description="Optional model identifier to test")
    base_url: Optional[str] = Field(default=None, description="Optional custom base URL to test")


