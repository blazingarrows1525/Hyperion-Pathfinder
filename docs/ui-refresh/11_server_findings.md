# Server and privacy findings for the owner

Found while integrating the frontend. They are server-side and outside the UI brief, so nothing here was changed on
`feat/ui-art-direction-refresh`. Each needs an owner decision. A fix for the first four exists on the local,
unpushed branch `feat/hyperion-spatial-redesign`, commit `c83c6ee`, and has not been reviewed or pushed.

Labels as in [00_baseline.md](00_baseline.md).

| # | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|
| S1 | Critical | `POST /api/llm/configure` and `POST /api/llm/test` need no authentication. Anyone who can reach the server can switch its provider and key at runtime, or make it send requests to a `base_url` of their choosing. | **[source]** `main.py:797-820` | Require an admin token (or remove the routes from public deployments); validate `base_url` against an allow-list. `c83c6ee` adds a token check. |
| S2 | High | CORS allows every origin together with credentials. | **[source]** `main.py:64-65` | Read allowed origins from configuration (`CORS_ORIGINS` in `c83c6ee`); drop credentials unless needed. |
| S3 | High | The job description travels in the `/analyze` query string, so it can reach access logs, proxies and browser history. Uvicorn also rejects very long URLs: 32,000 characters passed, 60,000 returned a plain-text `400 Invalid HTTP request received.` | **[source]** `main.py:291`, `main.py:340`; **[browser]** `workflow_live.js` records `jdSentInQueryString: true` | Accept the job description in the multipart form body. The page caps it at 20,000 characters meanwhile, so no user reaches the URL limit. |
| S4 | High (privacy) | The public route `GET /data_manifest.json` returns `degraded_documents`: the filenames of two corpus resumes, and the filenames contain people's names. The page never requests this route (it uses `/api/corpus-summary`, which returns counts only), but anyone can. The names are not repeated in this report. | **[source]** `main.py:109-115`; **[browser]** fetched from the keys-off server on 2026-11-08 | Remove the route or strip `degraded_documents`; `/api/corpus-summary` already covers the page's needs. |
| S5 | Medium | Corpus PII remains in git history. | **[source]** repository history; `docs/implementation_audit/07_security_findings.md` | History rewrite, which needs owner approval and a force-push plan. |
| S6 | Medium | No rate limit on `/analyze` or `/api/coach/chat`. | **[source]** `main.py` | A per-client limit at the proxy or in the app. |
| S7 | P2 (truthfulness) | Without a language model, two coach templates state results no resume supplied, as if they were the user's: the PAR answer in `main.py` ("Achieved 35% reduction in p95 latency while sustaining production workload.") and the PAR answer of the local provider ("Sustained 4x higher traffic volume while keeping error rates below 0.05%."), which the page showed for a demo question in the after-screenshot pass. `services/llm_provider.py:365` offers "reduced p95 latency by 35%" as an example, labelled, but close to advice to claim it. The page labels these answers as templates and adds no figures of its own. | **[source]** `main.py:517`, `services/llm_provider.py:382`, `:365`; **[browser]** `after/375/pane-career-coach.coach-answer.jpg` | Use placeholders as the STAR branches already do (`'[insert metric] latency reduction'`). |
| S9 | Low | The local provider expands CLEAR as "Concise, Logical, Explicit, Adaptive, Reflective", while the framework registry (`prompt_frameworks.json`, shown in Prompt Studio) defines it as Context, Logic, Expectations, Action, Restriction. | **[source]** `services/llm_provider.py:385-390` | Build the template's field list from the registry, as the generic branch in `main.py` does. |
| S8 | Low | If scoring produces nothing, `generate_feedback` falls back to an overall score of 75. | **[source]** `services/workflow.py:200` | Fail the run instead of inventing a score. The page already refuses to show a report without a valid score. |

What the code supports about privacy, and what the page now says: the PDF is read from memory
(`services/pdf_ingestion.py`) and not written to disk by `main.py` or `services/` **[source]**; with a provider
configured, the extracted text is sent to that provider. Deployment logs and hosted providers were not inspected
**[blocked]**, so the page makes no stronger claim.

HawkScan (dynamic scan) was not run: the session has no `HAWK_API_KEY` **[blocked]**.
