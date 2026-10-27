"""
services package initialization.
Exports all modular sub-services for PDF ingestion, skills, embeddings, retrieval, scoring, archetypes, and LLM providers.
"""

from services.pdf_ingestion import (
    validate_pdf_bytes,
    extract_text_and_sections,
    parse_resume_sections,
    redact_pii,
    chunk_resume_text,
    PDFValidationError
)

from services.skills import (
    load_skill_taxonomy,
    extract_skills_with_evidence,
    decompose_job_description
)

from services.embedding import (
    get_embedding_model,
    encode_query,
    encode_documents
)

from services.retrieval import (
    load_vector_store,
    dense_search,
    sparse_search,
    hybrid_search
)

from services.archetypes import (
    classify_archetype_by_vote
)

from services.scoring import (
    calculate_deterministic_score
)

from services.llm_provider import (
    get_llm_provider,
    LLMProvider,
    OpenAICompatibleProvider,
    LocalFallbackProvider
)

from services.workflow import (
    extract_text,
    find_relevant_resumes,
    generate_feedback,
    did_process_fail,
    load_models_and_store,
    get_github_ai_client
)

from services.markup import (
    codepoint_to_utf16_offset,
    utf16_to_codepoint_offset,
    normalize_canonical_text,
    compute_text_hash,
    create_document_snapshot,
    detect_rule_based_markups,
    resolve_span_overlaps,
    apply_markup_replacement
)

from services.executive_personas import (
    PERSONA_REGISTRY,
    resolve_persona_for_role,
    generate_executive_review
)
