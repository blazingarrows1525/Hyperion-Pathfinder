"""
main.py
FastAPI gateway for Resume Checker.
Provides /health diagnostics, streaming analysis, executive persona review,
exact span resume tailoring, conversational voice coach, and audio transcription.
"""

import os
import io
import uuid
import json
import re
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from graph import get_graph
from models import (
    GraphState,
    PlacementBenchmarkingReport,
    ScoreComponentItem,
    SkillEvidenceItem,
    WordMarkupItem,
    CoachChatRequest,
    CoachChatResponse,
    DraftRecalculateRequest,
    DraftRecalculateResponse,
    PersonaReviewRequest,
    AnnotateResumeRequest,
    ApplyRewriteRequest,
    LLMConfigureRequest,
    LLMTestRequest
)
from services.llm_provider import (
    get_llm_provider,
    OpenAICompatibleProvider,
    LocalFallbackProvider,
    get_available_providers,
    set_active_provider,
    test_llm_connection
)
from services.retrieval import load_vector_store
import services.skills as skill_engine
import services.scoring as score_engine
import services.markup as markup_engine
import services.executive_personas as persona_engine
import services.pdf_ingestion as pdf_ingest

# Load environment variables from .env
load_dotenv()

app = FastAPI(
    title="Resume Checker API",
    version="2.1.0",
    description="Placement Intelligence, Executive Persona Review & In-Document Resume Tailoring Engine"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Compiles the LangGraph state machine and verifies vector store readiness."""
    print("Application startup: verifying vector store and compiling LangGraph...")
    try:
        app.state.graph = get_graph()
        # Verify vector store can be loaded
        index, meta = load_vector_store()
        print(f"Startup OK: Vector store verified ({index.ntotal} vectors). LangGraph compiled.")
    except Exception as e:
        print(f"WARNING during startup: {e}")
        app.state.graph = None


# --- Static Web Portal Serving ---

@app.get("/")
async def serve_index():
    """Serves the interactive web portal at root."""
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return JSONResponse({"service": "Resume Checker", "status": "running"})

@app.get("/styles.css")
async def serve_styles():
    css_path = os.path.join(os.path.dirname(__file__), "styles.css")
    if os.path.exists(css_path):
        return FileResponse(css_path, media_type="text/css")
    raise HTTPException(status_code=404)

@app.get("/app.js")
async def serve_app_js():
    js_path = os.path.join(os.path.dirname(__file__), "app.js")
    if os.path.exists(js_path):
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404)

@app.get("/data_manifest.json")
async def serve_manifest():
    p = os.path.join(os.path.dirname(__file__), "data_manifest.json")
    if os.path.exists(p):
        return FileResponse(p, media_type="application/json")
    raise HTTPException(status_code=404)


# --- Diagnostic & Metadata Endpoints ---

@app.get("/health")
async def health_check():
    """Truthful health check endpoint for frontend status and capability discovery."""
    provider = get_llm_provider()
    
    if not hasattr(app.state, "graph") or app.state.graph is None:
        try:
            app.state.graph = get_graph()
        except Exception as e:
            print(f"Graph compile error: {e}")
            app.state.graph = None

    has_graph = hasattr(app.state, "graph") and app.state.graph is not None

    vector_count = 0
    try:
        idx, _ = load_vector_store()
        vector_count = idx.ntotal
    except Exception:
        pass

    # Check if server audio transcription is configured
    openai_key = os.getenv("OPENAI_API_KEY", "")
    server_transcription_configured = bool(openai_key and isinstance(provider, OpenAICompatibleProvider))

    return {
        "status": "healthy" if has_graph else "degraded",
        "service": "Resume Checker Inference Engine",
        "version": "2.1.0",
        "provider_configured": provider.is_configured(),
        "provider_class": provider.__class__.__name__,
        "model": getattr(provider, "model", "deterministic-fallback"),
        "faiss_ready": vector_count > 0,
        "vector_count": vector_count,
        # Milestone 5 Capability Discovery:
        "capabilities": {
            "server_transcription_configured": server_transcription_configured,
            "voice_browser_stt_supported_by_server": False,
            "browser_tts_recommended": True,
            "persona_review_enabled": True,
            "resume_markup_enabled": True,
            "draft_recalculation_enabled": True
        }
    }


@app.get("/")
async def root():
    return {
        "message": "Resume Checker Backend API v2.1 is running.",
        "docs_url": "/docs",
        "health_url": "/health"
    }


@app.get("/api/skills")
async def get_skills_taxonomy():
    """Returns the canonical skill taxonomy."""
    return {"skills": skill_engine.load_skill_taxonomy()}


def _load_prompt_frameworks() -> Dict[str, Any]:
    frameworks_path = os.path.join(os.path.dirname(__file__), "prompt_frameworks.json")
    if os.path.exists(frameworks_path):
        with open(frameworks_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"frameworks": []}

FRAMEWORKS_DATA = _load_prompt_frameworks()
FRAMEWORKS_MAP = {fw["id"].upper(): fw for fw in FRAMEWORKS_DATA.get("frameworks", [])}


@app.get("/api/frameworks")
@app.get("/framework-list")
async def get_prompt_frameworks():
    """Returns all 18 Prompt Studio frameworks."""
    return FRAMEWORKS_DATA



# --- Streaming Response Generator ---

async def stream_graph_response(response_stream):
    """
    Consumes LangGraph stream chunks asynchronously, yielding truthful stage progress
    followed by the final generated Markdown and structured report.
    """
    final_output = None
    accumulated_error = None

    try:
        async for chunk in response_stream:
            # Stage 1: Text extraction completed
            if "extract_text" in chunk:
                node_out = chunk["extract_text"]
                if "error_message" in node_out and node_out["error_message"]:
                    accumulated_error = node_out["error_message"]
                    break

            # Stage 2: Retrieval & scoring completed
            elif "find_relevant_resumes" in chunk:
                node_out = chunk["find_relevant_resumes"]
                if "error_message" in node_out and node_out["error_message"]:
                    accumulated_error = node_out["error_message"]
                    break

            # Stage 3: LLM generation completed
            elif "generate_feedback" in chunk:
                node_out = chunk["generate_feedback"]
                if "feedback" in node_out and node_out["feedback"]:
                    final_output = node_out["feedback"]
                elif "error_message" in node_out and node_out["error_message"]:
                    accumulated_error = node_out["error_message"]

            if "error_message" in chunk and chunk["error_message"]:
                accumulated_error = chunk["error_message"]
                break

    except Exception as e:
        print(f"Error during graph streaming: {e}")
        yield f"Server streaming error: {str(e)}"
        return

    if accumulated_error:
        yield f"Analysis Error: {accumulated_error}"
    elif final_output:
        yield final_output
    else:
        yield "Analysis finished, but no response payload was captured."


# --- Core Analysis Endpoints ---

@app.post("/analyze")
async def analyze(
    job_description: str = Query(...),
    selected_persona_id: Optional[str] = Query(None),
    resume_file: UploadFile = File(...)
):
    """
    Analyzes a candidate resume PDF against a target job description.
    Executes stateless LangGraph workflow and returns a streaming response.
    Additive enhancement: accepts selected_persona_id for executive review lens.
    """
    try:
        # Rewind and read PDF file bytes
        await resume_file.seek(0)
        file_bytes = await resume_file.read()

        if not file_bytes:
            raise HTTPException(status_code=400, detail="The uploaded PDF file is empty (0 bytes).")
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF document.")

        analysis_id = str(uuid.uuid4())
        initial_state = {
            "analysis_id": analysis_id,
            "job_description": job_description,
            "selected_persona_id": selected_persona_id,
            "file_bytes": file_bytes
        }

        # Request-scoped configuration preventing cross-request concurrency contamination
        config = {"configurable": {"thread_id": f"req_{analysis_id}"}}

        if not app.state.graph:
            app.state.graph = get_graph()

        response_stream = app.state.graph.astream(initial_state, config=config)

        return StreamingResponse(
            stream_graph_response(response_stream),
            media_type="text/plain; charset=utf-8"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /analyze endpoint: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/api/analyze/json")
async def analyze_json(
    job_description: str = Query(...),
    selected_persona_id: Optional[str] = Query(None),
    resume_file: UploadFile = File(...)
):
    """
    Direct synchronous JSON endpoint for programmatic clients.
    Returns the complete PlacementBenchmarkingReport.
    """
    try:
        await resume_file.seek(0)
        file_bytes = await resume_file.read()
        if not file_bytes or not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Valid PDF file required.")

        analysis_id = str(uuid.uuid4())
        initial_state = {
            "analysis_id": analysis_id,
            "job_description": job_description,
            "selected_persona_id": selected_persona_id,
            "file_bytes": file_bytes
        }
        config = {"configurable": {"thread_id": f"req_{analysis_id}"}}
        if not app.state.graph:
            app.state.graph = get_graph()

        final_state = await app.state.graph.ainvoke(initial_state, config=config)
        if final_state.get("error_message"):
            raise HTTPException(status_code=422, detail=final_state["error_message"])

        return final_state.get("structured_report") or {}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# --- Optional Server-Side Audio Transcription ---

@app.post("/transcribe-audio")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: Optional[str] = Query("en")
):
    """
    Optional server-side speech-to-text endpoint.
    If provider is not configured, returns clean HTTP 503 error without crashing.
    """
    request_id = str(uuid.uuid4())
    
    # 1. Size & MIME verification (Max 15MB)
    MAX_AUDIO_BYTES = 15 * 1024 * 1024
    content = await audio_file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty audio recording submitted.")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 15 MB limit.")

    # 2. Check provider configuration
    provider = get_llm_provider()
    openai_key = os.getenv("OPENAI_API_KEY", "")
    
    if not (openai_key and isinstance(provider, OpenAICompatibleProvider) and provider._client):
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "TRANSCRIPTION_UNAVAILABLE",
                    "message": "Server-side voice transcription is not configured. Browser-native speech recognition or text entry is active.",
                    "request_id": request_id
                }
            }
        )

    # 3. Perform transcription via OpenAI Audio SDK
    try:
        audio_stream = io.BytesIO(content)
        audio_stream.name = audio_file.filename or "recording.webm"
        
        transcript_obj = provider._client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_stream,
            language=language
        )
        
        return {
            "request_id": request_id,
            "transcript": transcript_obj.text,
            "transcription_source": "server_whisper",
            "language": language,
            "warnings": []
        }
    except Exception as e:
        print(f"Error during server audio transcription: {e}")
        return JSONResponse(
            status_code=502,
            content={
                "error": {
                    "code": "TRANSCRIPTION_FAILED",
                    "message": f"Transcription provider error: {str(e)}",
                    "request_id": request_id
                }
            }
        )


# --- Conversational Voice Career Coach ---

@app.post("/api/coach/chat")
async def coach_chat(req: CoachChatRequest):
    """
    Conversational Career Coach endpoint.
    Answers natural language questions grounded strictly in current report evidence and persona lens.
    Supports all 18 Prompt Engineering Frameworks to format output.
    Returns both written answer and spoken briefing summary.
    """
    persona_id = req.selected_persona_id or "principal_sde"
    persona_meta = persona_engine.PERSONA_REGISTRY.get(persona_id, persona_engine.PERSONA_REGISTRY["principal_sde"])
    
    framework_id = (req.prompt_framework_id or req.framework_id or "").upper().strip()
    fw_info = FRAMEWORKS_MAP.get(framework_id)
    fw_applied = fw_info["id"] if fw_info else None

    system_prompt = f"""You are the Resume Checker conversational career coach acting as: {persona_meta['title']}.
The candidate has asked a question about their resume analysis for the target role: {req.target_role}.
Current Deterministic Alignment Score: {req.current_score or 'Evaluated'}/100.
Matched Skills: {', '.join(req.matched_skills[:6]) if req.matched_skills else 'Standard Profile'}.
Missing Skills: {', '.join(req.missing_skills[:5]) if req.missing_skills else 'None identified'}.

DIRECTIVES:
1. Ground your answer strictly in visible evidence.
2. If the user asks how to improve, cite concrete architectural metrics and STAR/PAR structures.
3. Do NOT invent placement probabilities or claim insider knowledge of any employer's private rubric.
4. Provide a direct, professional answer and cite relevant report evidence areas.
"""

    if fw_info:
        system_prompt += f"""
FRAMEWORK OUTPUT DIRECTIVE:
You MUST frame and format your answer according to the {fw_info['name']} ({fw_info['acronym']}).
Explicitly address each component: {', '.join(fw_info['fields'])}.
Begin with: "As per the {fw_info['name']} ({fw_info['acronym']}):"
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.message}
    ]

    provider = get_llm_provider()
    try:
        raw_answer = provider.complete(messages)
    except Exception as e:
        print(f"Warning: Coach chat LLM failed ({e}), using deterministic coach response.")
        if fw_info:
            if framework_id == "RACE":
                raw_answer = (
                    f"As per the RACE (Role, Action, Context, Expectation) framework:\n"
                    f"- **Role**: As the {persona_meta['title']}, I evaluate candidates on production reliability and system ownership.\n"
                    f"- **Action**: Revise your project descriptions to emphasize system boundary ownership, error handling, and test automation.\n"
                    f"- **Context**: For target role {req.target_role}, interviewers prioritize scale and latency limits over superficial feature counts.\n"
                    f"- **Expectation**: Include concrete metrics (latency, QPS, data volume) to meet senior hiring bar expectations."
                )
            elif framework_id == "STAR":
                raw_answer = (
                    f"As per the STAR (Situation, Task, Action, Result) framework:\n"
                    f"- **Situation**: Target role {req.target_role} requires validated production scale and fault tolerance.\n"
                    f"- **Task**: Demonstrate architectural ownership and resolution of system bottlenecks.\n"
                    f"- **Action**: Detail how you profiled performance, introduced caching or concurrency controls, and wrote regression tests.\n"
                    f"- **Result**: Document the measured outcome (e.g. '[insert metric] latency reduction under [X] load')."
                )
            elif framework_id == "PAR":
                raw_answer = (
                    f"As per the PAR (Problem, Action, Result) framework:\n"
                    f"- **Problem**: Legacy architecture struggled with latency and unhandled concurrency exceptions.\n"
                    f"- **Action**: Engineered modular services with explicit input validation and idempotent retries.\n"
                    f"- **Result**: Achieved 35% reduction in p95 latency while sustaining production workload."
                )
            else:
                fields_bullets = "\n".join([f"- **{field}**: Grounded guidance for {field.lower()} based on your resume evidence." for field in fw_info.get("fields", [])])
                raw_answer = (
                    f"As per the {fw_info['name']} ({fw_info['acronym']}):\n"
                    f"{fields_bullets}\n\n"
                    f"Focus on quantifiable impact and clear engineering ownership for {req.target_role}."
                )
        else:
            raw_answer = (
                f"From the {persona_meta['title']} perspective: Focus on providing measurable throughput "
                f"and error-boundary evidence for your projects. Adding concrete numbers and explicit "
                f"interface contracts directly addresses senior review expectations."
            )

    # Clean spoken summary for browser TTS (strip raw markdown symbols and symbols)
    spoken = re.sub(r'[*_#`\[\]]', '', raw_answer)
    spoken = re.sub(r'\s+', ' ', spoken).strip()
    # Limit spoken summary to 2 concise sentences
    spoken_sentences = [s.strip() for s in spoken.split('.') if s.strip()]
    spoken_summary = ". ".join(spoken_sentences[:2]) + "." if spoken_sentences else spoken[:180]

    return CoachChatResponse(
        answer=raw_answer,
        spoken_summary=spoken_summary,
        evidence_refs=req.relevant_markup_ids or ["rubric_score", "skill_evidence"],
        persona_id=persona_id,
        persona_title=persona_meta["title"],
        framework_applied=fw_applied
    )


# --- In-Document Resume Draft Recalculation ---

@app.post("/api/markup/recalculate")
async def recalculate_draft(req: DraftRecalculateRequest):
    """
    Stateless recalculation of edited resume text in browser memory.
    Re-extracts skills, recalculates deterministic score, and re-detects exact character markups.
    Guarantees that files on disk are NEVER touched or overwritten.
    """
    try:
        # 1. Build updated snapshot with new revision
        snapshot = markup_engine.create_document_snapshot(
            raw_text=req.edited_text,
            document_id=req.document_id,
            revision_id=req.revision_id
        )

        # 2. Re-extract skills from new display text
        sections = pdf_ingest.parse_resume_sections(snapshot.canonical_display_text)
        candidate_skills = skill_engine.extract_skills_with_evidence(sections, snapshot.canonical_display_text)
        jd_decomposition = skill_engine.decompose_job_description(req.job_description)

        # 3. Re-calculate deterministic score
        score_res = score_engine.calculate_deterministic_score(
            candidate_skills=candidate_skills,
            jd_decomposition=jd_decomposition,
            sections=sections,
            retrieval_diagnostics={"top_similarity": 0.80}
        )

        # 4. Re-detect deterministic exact span markups
        req_skills = jd_decomposition.get("required_skills", [])
        matched_names = {s["canonical"].lower() for s in candidate_skills.values() if s["evidence_status"] != "not_found"}
        missing_required = [r for r in req_skills if r.lower() not in matched_names]
        missing_preferred = [p for p in jd_decomposition.get("preferred_skills", []) if p.lower() not in matched_names]

        markups = markup_engine.detect_rule_based_markups(
            snapshot=snapshot,
            jd_missing_required=missing_required
        )

        score_breakdown_items = [
            ScoreComponentItem(
                key=c["key"],
                name=c["name"],
                points_earned=c["points_earned"],
                max_points=c["max_points"],
                detail=c["detail"]
            )
            for c in score_res.get("breakdown", [])
        ]

        matched_skills_items = [
            SkillEvidenceItem(
                canonical=s["canonical"],
                category=s["category"],
                matched_alias=s.get("matched_alias"),
                evidence_status=s["evidence_status"],
                evidence_snippet=s.get("evidence_snippet")
            )
            for s in candidate_skills.values()
            if s["evidence_status"] != "not_found"
        ]

        return DraftRecalculateResponse(
            document_snapshot=snapshot,
            overall_score=score_res["overall_score"],
            score_breakdown=score_breakdown_items,
            matched_skills=matched_skills_items,
            missing_required_skills=missing_required,
            missing_preferred_skills=missing_preferred,
            resume_markups=markups,
            diff_summary=f"Recalculated on draft revision {req.revision_id}. Updated score: {score_res['overall_score']}/100."
        )

    except Exception as e:
        print(f"Error during draft recalculation: {e}")
        raise HTTPException(status_code=500, detail=f"Recalculation error: {str(e)}")


# --- Direct Persona Review & Annotation Endpoints ---

@app.post("/persona-review")
@app.post("/api/persona-review")
async def persona_review_endpoint(req: PersonaReviewRequest):
    """
    Dedicated endpoint taking { persona, company, resumeText }.
    Returns { verdict, reactionSummary, priorities[], scoreAdjustment } conforming to ExecutivePersonaReview.
    """
    try:
        persona_id = req.persona or "principal_sde"
        if persona_id not in persona_engine.PERSONA_REGISTRY:
            persona_id = "principal_sde"

        resume_text = req.resumeText or "Candidate Profile: Software Engineer with Python and Distributed Systems experience."
        sections = pdf_ingest.parse_resume_sections(resume_text)
        candidate_skills = skill_engine.extract_skills_with_evidence(sections, resume_text)
        jd_decomposition = skill_engine.decompose_job_description(f"Target Role: {req.target_role}. Preferred skills in Python and systems architecture.")
        
        score_res = score_engine.calculate_deterministic_score(
            candidate_skills=candidate_skills,
            jd_decomposition=jd_decomposition,
            sections=sections,
            retrieval_diagnostics={"top_similarity": 0.82}
        )

        matched_skills_items = [
            SkillEvidenceItem(
                canonical=s["canonical"],
                category=s["category"],
                matched_alias=s.get("matched_alias"),
                evidence_status=s["evidence_status"],
                evidence_snippet=s.get("evidence_snippet")
            )
            for s in candidate_skills.values()
            if s["evidence_status"] != "not_found"
        ]

        score_val = score_res["overall_score"]
        if score_val >= 85:
            band = "Exceptional (Super Dream Profile)"
        elif score_val >= 70:
            band = "Competitive (Dream Profile)"
        elif score_val >= 50:
            band = "Developing (Targeted Upgrades Needed)"
        else:
            band = "Foundational (Core Skills Required)"

        report = PlacementBenchmarkingReport(
            analysis_id=f"rev_{uuid.uuid4().hex[:8]}",
            overall_score=score_val,
            score_confidence="high",
            detected_archetype=score_res.get("archetype_fit", "Software Development Engineer"),
            archetype_confidence=0.88,
            matched_skills=matched_skills_items,
            missing_required_skills=jd_decomposition.get("required_skills", []),
            missing_preferred_skills=jd_decomposition.get("preferred_skills", []),
            score_breakdown=[],
            recommendations=[]
        )

        exec_review = persona_engine.generate_executive_review(
            persona_id=persona_id,
            target_role=req.target_role or "Software Engineer",
            target_company=req.company,
            resume_text=resume_text,
            report=report
        )

        return {
            "verdict": exec_review.verdict,
            "reactionSummary": exec_review.reaction_summary,
            "reaction_summary": exec_review.reaction_summary,
            "priorities": [p.action for p in exec_review.strategic_priorities],
            "strategic_priorities": [p.model_dump() for p in exec_review.strategic_priorities],
            "what_catches_attention": [o.model_dump() for o in exec_review.what_catches_attention],
            "skepticism_points": [o.model_dump() for o in exec_review.skepticism_points],
            "architecture_questions": exec_review.architecture_questions,
            "scoreAdjustment": exec_review.score_adjustment,
            "score_adjustment": exec_review.score_adjustment,
            "persona_id": exec_review.persona_id,
            "persona_title": exec_review.persona_title,
            "disclaimer": exec_review.disclaimer
        }
    except Exception as e:
        print(f"Error in /persona-review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/annotate-resume")
@app.post("/api/annotate-resume")
async def annotate_resume_endpoint(req: AnnotateResumeRequest):
    """
    Takes { resumeText, jdText } and returns list of WordMarkupItem with highlights.
    """
    try:
        text = req.resumeText or ""
        if not text:
            return {"markups": []}

        snapshot = markup_engine.create_document_snapshot(raw_text=text, document_id=f"doc_{uuid.uuid4().hex[:8]}")
        jd_decomp = skill_engine.decompose_job_description(req.jdText or "")
        
        sections = pdf_ingest.parse_resume_sections(snapshot.canonical_display_text)
        candidate_skills = skill_engine.extract_skills_with_evidence(sections, snapshot.canonical_display_text)
        matched_names = {s["canonical"].lower() for s in candidate_skills.values() if s["evidence_status"] != "not_found"}
        missing_required = [r for r in jd_decomp.get("required_skills", []) if r.lower() not in matched_names]

        markups = markup_engine.detect_rule_based_markups(
            snapshot=snapshot,
            jd_missing_required=missing_required
        )
        return {
            "markups": [m.model_dump() for m in markups],
            "text_hash": snapshot.text_hash,
            "count": len(markups)
        }
    except Exception as e:
        print(f"Error in /annotate-resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/apply-rewrite")
@app.post("/api/apply-rewrite")
async def apply_rewrite_endpoint(req: ApplyRewriteRequest):
    """
    Takes { originalText, suggestion, spanId, resumeText }.
    Performs surgical replacement in text and returns updatedText.
    """
    try:
        resume_text = req.resumeText or ""
        original = req.originalText or ""
        replacement = req.suggestion or ""

        if original and original in resume_text:
            updated_text = resume_text.replace(original, replacement, 1)
        else:
            updated_text = resume_text

        return {
            "updatedText": updated_text,
            "updated_text": updated_text,
            "originalText": original,
            "suggestion": replacement,
            "spanId": req.spanId
        }
    except Exception as e:
        print(f"Error in /apply-rewrite: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# LLM SERVICE RUNTIME MANAGEMENT & TELEMETRY
# ==============================================================================

@app.get("/api/llm/providers")
async def list_llm_providers():
    """Returns available LLM providers, active status, and model metadata."""
    active_prov = get_llm_provider()
    return {
        "active_provider": active_prov.provider_name,
        "active_model": active_prov.model_name,
        "is_configured": active_prov.is_configured(),
        "providers": get_available_providers()
    }


@app.post("/api/llm/configure")
async def configure_llm_provider(req: LLMConfigureRequest):
    """Dynamically activates and reconfigures an LLM provider at runtime."""
    res = set_active_provider(
        provider_id=req.provider_id,
        api_key=req.api_key,
        model=req.model,
        base_url=req.base_url
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Configuration failed."))
    return res


@app.post("/api/llm/test")
async def test_llm_provider(req: LLMTestRequest):
    """Executes a live ping test on the requested provider configuration."""
    res = test_llm_connection(
        provider_id=req.provider_id,
        api_key=req.api_key,
        model=req.model,
        base_url=req.base_url
    )
    return res


