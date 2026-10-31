# 02. Tracked File Inventory & Entry Points

### Runtime Entry Points
- **Web App Frontend:** `index.html` (1,582 lines), `styles.css` (6,186 lines), `app.js` (5,517 lines)
- **FastAPI Application:** `main.py` (serving static files and API endpoints at `http://127.0.0.1:8000`)
- **LangGraph Workflow Orchestrator:** `graph.py` / `services/workflow.py`

### Backend Services (`services/`)
- `services/scoring.py` (Deterministic scoring rubric: 100 points, 5 weighted components)
- `services/retrieval.py` (FAISS cosine similarity retrieval against 226 alumni resumes)
- `services/embedding.py` (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions)
- `services/skills.py` (Skill taxonomy normalizer against `skill_taxonomy.json`)
- `services/archetypes.py` (K-Means 5-cluster archetypes manager)
- `services/pdf_ingestion.py` (In-memory `pypdf` extraction, no disk persistence)
- `services/llm_provider.py` (Deterministic local provider fallback + Gemini/Groq/Ollama connectors)
- `services/executive_personas.py` (3 executive reviewer lenses: AI Director, VP Engineering, Cloud Director)
- `services/markup.py` (Exact-span UTF-16 in-document annotations, recalculation engine)
- `services/voice_service.py` (Optional server-side transcription)

### Versioned Data & Schemas
- `placement_snapshot_2026.json` (SRMIST 17-Sep-2026 verified placement snapshot)
- `data_manifest.json` (Alumni benchmark corpus manifest, 226 resumes)
- `prompt_frameworks.json` (18 verified career prompting frameworks)
- `skill_taxonomy.json` (Domain-categorized skill dictionary)
- `scoring_rubric.json` (Invariant 5-component rubric definition)
- `vector_store/benchmark_resumes.index` (FAISS IndexFlatIP binary)
- `vector_store/benchmark_resumes.pkl` (Serialized resume metadata)

### Verification Suite (`tests/`)
- `tests/test_ui_design_system.py` (Theme tokens, contrast, CSS compliance)
- `tests/test_ui_redesign_contracts.py` (Frontend DOM IDs, event contracts, security SRI)
- `tests/test_annotation_spans.py` (Exact-span markup and recalculations)
- `tests/test_executive_personas.py` (Persona reviews without score mutation)
- `tests/test_feature_api.py` (FastAPI route compliance)
- `tests/test_live_api.py` (Live server integration tests)
- `tests/test_pipeline.py` (Full intake-to-report pipeline verification)
- `tests/test_acceptance_matrices.py` (Rubric invariants and boundary cases)
