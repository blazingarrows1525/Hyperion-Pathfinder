# 05. API Contract & Endpoint Map

| Method | Endpoint | Request Payload | Response Schema | Tested Status |
|---|---|---|---|---|
| `GET` | `/health` | None | `HealthResponse` (status, provider, faiss_ready, vector_count, capabilities) | CONFIRMED (200 OK) |
| `GET` | `/api/placement-snapshot` | None | `PlacementSnapshot` (8,214 offers, tiers, company list) | CONFIRMED (200 OK) |
| `GET` | `/api/frameworks` | None | Array of 18 `PromptFramework` objects | CONFIRMED (200 OK) |
| `GET` | `/api/skills` | None | Taxonomy dictionary across technical domains | CONFIRMED (200 OK) |
| `GET` | `/api/corpus-summary` | None | `{ source_count: 226, archetypes: [...] }` (PII-free) | CONFIRMED (200 OK) |
| `POST` | `/analyze` | Multipart: `resume_file` + query `job_description` | `text/plain` streaming chunks + structured JSON payload | CONFIRMED (200 OK) |
| `POST` | `/api/analyze/json` | JSON: `{ resume_text, job_description }` | `StructuredReport` with 5 rubric scores | CONFIRMED (200 OK) |
| `POST` | `/api/coach/chat` | JSON: `{ message, context }` | `{ reply, suggested_actions }` | CONFIRMED (200 OK) |
| `POST` | `/api/markup/recalculate` | JSON: `{ revised_text, job_description }` | `{ score, breakdown, new_spans }` | CONFIRMED (200 OK) |
| `POST` | `/api/persona-review` | JSON: `{ persona_id, report_data }` | `{ critique, strategic_priorities }` | CONFIRMED (200 OK) |
| `POST` | `/annotate-resume` | JSON: `{ resume_text, job_description }` | Array of exact-span annotations | CONFIRMED (200 OK) |
| `GET` | `/api/llm/providers` | None | List of configured providers (Safe metadata only) | CONFIRMED (200 OK) |

**Invariants:**
- All API calls use relative paths via `apiUrl()` to prevent hard-coded localhost failures in deployment.
- Public `/api/llm/configure` key input forms have been removed from the frontend client.
