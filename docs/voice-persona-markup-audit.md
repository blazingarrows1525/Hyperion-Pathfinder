# SRM Career Catalyst: Voice Assistant, Executive Review, and Interactive Resume Tailoring
## System Architecture & Technical Audit (Milestone 0)

**Document Release:** 1.0.0  
**Audit Date:** 2026-10-27  
**Scope:** Architecture baseline, component contracts, offset invariants, and risk register for Voice STT/TTS, Senior Executive Review, and In-Document Exact Span Tailoring.

---

### 1. Repository Layout & Module Boundaries

- **Repository Root:** `c:\Users\ASUS\Desktop\resume expert\SRM_Resume_Expert`
- **Active Frontend Entrypoints:**
  - `index.html`: Unified semantic layout with Three.js canvas, Glassdoor placement intelligence, 18 Prompt Framework Studio, Analyzer Workspace, and Dialogs.
  - `styles.css`: Vanilla CSS design system featuring Neumorphism (soft UI depth, concave/convex surfaces, tactile inset/outset shadows), ceramic & minimalist monochrome palette (`#090a0f` base, `#ffffff` accents, `#94a3b8` borders).
  - `app.js`: Master vanilla JS client controller (`appState` store, Three.js 3D constellation, Prompt Studio renderer, Analyzer streaming client, toast/modal controllers).
- **Backend Architecture & Module Paths:**
  - `main.py`: FastAPI application gateway (port 8000), CORS middleware, streaming generator, metadata routes.
  - `models.py`: Pydantic v2 schemas (`PlacementBenchmarkingReport`, `ScoreComponentItem`, `SkillEvidenceItem`, `RecommendationItem`) and LangGraph `GraphState`.
  - `graph.py`: LangGraph `StateGraph(GraphState)` compilation and conditional failure transitions.
  - `services/pdf_ingestion.py`: PyPDF extraction, 10MB/15-page limits, magic header validation, PII redaction, heuristic section parser.
  - `services/skills.py`: Canonical 24-skill taxonomy matching (`skill_taxonomy.json`), alias resolution, regex evidence search, JD requirement decomposition.
  - `services/embedding.py`: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional normalized vectors).
  - `services/retrieval.py`: FAISS Dense Index (226 alumni records) + Rank-BM25 sparse search with Reciprocal Rank Fusion (RRF).
  - `services/archetypes.py`: Cosine-weighted k-NN voting across 5 placement archetypes with margin-based uncertainty flagging.
  - `services/scoring.py`: Deterministic 100-point rubric (Skills 35, Practical Evidence 25, Role Alignment 20, Quantified Metrics 10, Completeness 10).
  - `services/llm_provider.py`: Provider abstraction (`OpenAICompatibleProvider` with Azure/OpenAI/Ollama support, and zero-crash `LocalFallbackProvider`).

---

### 2. Runtime Environment & Package Dependencies

- **Python Runtime:** Python 3.10.11 (AMD64 Windows, MSC v.1929 64 bit)
- **Virtual Environment:** `c:\Users\ASUS\Desktop\resume expert\SRM_Resume_Expert\.venv`
- **Dependency Manager:** `pip` (`requirements.txt`)
- **Key Package Versions:**
  - `fastapi`: 0.139.2
  - `pydantic`: 2.13.4 (Pydantic v2)
  - `langgraph`: 1.2.9
  - `pypdf`: 6.14.2
  - `openai`: 3.37.0
  - `sentence-transformers`: 5.3.0
  - `faiss-cpu`: 1.13.2
  - `torch`: 2.10.0+cpu
  - `scikit-learn`: 1.7.2

---

### 3. Pydantic Models & State Consumers

- **`GraphState` Consumers:**
  - `services/workflow.py`: `extract_text`, `find_relevant_resumes`, `generate_feedback`, `did_process_fail`.
  - `graph.py`: `StateGraph(GraphState)`.
  - `main.py`: Initialized at `POST /analyze` with `analysis_id`, `job_description`, and `file_bytes`.
- **`PlacementBenchmarkingReport` Consumers:**
  - Compiled in `services/workflow.py` (`generate_feedback`) using deterministic scoring outputs.
  - Serialized via `report.model_dump()` into `state["structured_report"]`.
  - Validated by automated tests in `tests/test_pipeline.py`.

---

### 4. API Endpoints & Response Contracts

| Endpoint | Method | Input Parameters / Body | Response Schema / Type | Current Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `GET /health` | GET | None | JSON: `{ status, service, version, provider_configured, provider_class, model, faiss_ready, vector_count }` | Returns runtime health & vector store status. |
| `POST /analyze` | POST | Query: `job_description: str`<br>File: `resume_file: UploadFile` | `text/plain; charset=utf-8` streaming response | Executes LangGraph pipeline and streams Markdown feedback. |
| `GET /api/skills` | GET | None | JSON: `{ skills: [...] }` | Returns canonical skill taxonomy. |
| `GET /api/frameworks`| GET | None | JSON: `{ frameworks: [...] }` | Returns 18 Prompt Frameworks. |

---

### 5. Stream Transport, Event Format, & Disconnect Handling

- **Transport:** HTTP Chunked Transfer Encoding via `StreamingResponse(media_type="text/plain; charset=utf-8")`.
- **Framing:** Plain text tokens streamed asynchronously from LangGraph generator.
- **Frontend Parser:** `response.body.pipeThrough(new TextDecoderStream()).getReader()`. Accumulates string chunks into `appState.analyzer.streamBuffer` and updates DOM text node live.
- **Cancellation:** Client uses `AbortController.abort()`. Request passes `signal: appState.analyzer.abortController.signal`. Server LangGraph thread key is isolated as `thread_id: req_{analysis_id}`.

---

### 6. PDF Ingestion, Text Redaction, & Span Offset Audit

- **Ingestion Pipeline:** PyPDF parses pages into memory. Raw bytes are purged immediately after extraction.
- **Current PII Redaction:** Regex-based replacement of URLs (`[LINK_REDACTED]`), Emails (`[EMAIL_REDACTED]`), and Phone numbers (`[PHONE_REDACTED]`).
- **Section Parsing:** Heuristic line splitter detecting headings (`education`, `experience`, `projects`, `skills`, `certifications`, `achievements`).
- **Critical Span Invariant Discovery:** Currently, `parse_resume_sections` strips lines individually and joins them, which alters character offsets relative to `full_text`.
- **Offset Requirement for Interactive Markup:**
  - Offsets must point to a declared `canonical_display_text`.
  - Normalization: UTF-8 / NFC normalization with LF newlines (`\n`).
  - Unit: UTF-16 code units for direct JavaScript string compatibility (`String.prototype.slice(start, end)`).
  - Exact invariant: `canonical_display_text[start_char:end_char] === original_text`.
  - Draft edits must produce a new `revision_id` and recalculate text hash (`SHA-256`), invalidating old offsets.

---

### 7. Baseline Test Suite Verification

- Executed `python -m unittest discover tests` on 2026-10-27:
  - Total Tests: 13 tests across `TestPDFIngestion`, `TestSkillsAndTaxonomy`, `TestRetrievalAndEmbeddings`, `TestArchetypesAndScoring`, and `TestPydanticReportContract`.
  - Result: `13 tests in 5.369s - OK`.
  - Zero baseline regressions.

---

### 8. Existing UI Components & Accessible Design System

- **Buttons & Controls:**
  - `btn-analyze-submit`, `btn-cancel-request`, `btn-reset-analyzer`.
  - Interactive tactile hover and 3D pointer parallax via `.card-3d-tilt`, `.neu-btn`.
- **Toasts & Feedback:**
  - `showToast(msg)`: Accessible status notifications.
  - `triggerConfetti()`: Milestone celebration.
  - `modal-framework-detail`, `modal-compare-archetypes`: Trapped keyboard focus and Escape key handling.
- **Reduced Motion:** Fully integrated via `window.matchMedia('(prefers-reduced-motion: reduce)')`.

---

### 9. Browser Speech API & Server Transcription Matrix

| Feature | Browser-Native STT | Server Transcription (Optional) | Browser-Native TTS |
| :--- | :--- | :--- | :--- |
| **API / Technology** | `window.SpeechRecognition` / `window.webkitSpeechRecognition` | `POST /transcribe-audio` (OpenAI Audio / Whisper compatible) | `window.speechSynthesis` / `SpeechSynthesisUtterance` |
| **Availability** | Chrome, Edge, Safari (with webkit prefix). Firefox: Unsupported/Flagged. | Configured only when `OPENAI_API_KEY` present. Otherwise returns HTTP 503. | Universal in modern desktop and mobile browsers. |
| **Permission Model** | Explicit user click required. Never pre-flights on load. | Explicit audio upload by user action. | No microphone permission required. |
| **Privacy Disclosure** | Speech audio may be processed by browser vendor's recognition service. | Audio processed transiently in memory, zero disk persistence. | Runs entirely client-side. |
| **Fallback** | Manual typing in textarea; server upload if configured. | Manual typing; browser STT. | Visual text report display. |

---

### 10. Risk Register & Quality Gates

| Risk ID | Severity | Module | Description & Failure Mode | Mitigation & Quality Gate |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | High | `services/scoring.py` | Executive persona review accidentally corrupts the canonical 100-pt rubric score. | **Gate 2 Invariant:** `overall_score` and `score_breakdown` must be bit-for-bit invariant across all persona evaluations. |
| **R-02** | Critical | `services/markup.py` | Character offset mismatch corrupts resume text during inline replacement. | **Gate 1 Invariant:** Strict half-open intervals `[start_char, end_char)` validated against `canonical_display_text` hash. Stale offsets rejected. |
| **R-03** | High | `services/markup.py` | AI rewrite generates hallucinated metrics or inflated claims (e.g., claiming 10M users when not in source). | **Gate 3 Constraint:** Template requires bracketed user-fill placeholders `[insert verified metric]` rather than invented numbers. |
| **R-04** | Medium | `app.js` (Voice) | Continuous speech events overwrite user manual edits or throw unhandled permission errors. | **Gate 4 Invariant:** Finite state machine (`idle`, `listening`, `processing`, `transcript_ready`, `error`). Disallow interim text submission. |
| **R-05** | Medium | `main.py` | Server transcription endpoint crashes or leaks keys when provider is unconfigured. | **Gate 5 Check:** Truthful HTTP 503 with machine-readable error payload `{ error: { code: 'TRANSCRIPTION_UNAVAILABLE' } }`. |
| **R-06** | Low | `styles.css` / UI | Spatial / Neumorphic styling impairs readability or fails WCAG AA contrast. | **Gate 6 Review:** Crisp border contrasts (`#94a3b8` / `#334155`), text labels alongside category colors, 44x44px touch targets. |

---
*End of Milestone 0 Audit Document. Proceed to Milestone 1 Data Contracts.*
