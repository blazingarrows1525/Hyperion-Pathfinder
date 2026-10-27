# Architecture Decision Records (ADRs)
**Project:** SRM Career Catalyst  
**Status:** Active  

---

## ADR-001: Vector Normalization, Distance Metric & Exact Cosine Search

### Context
`services.py` encodes user queries with `normalize_embeddings=True` ($\|q\|_2 = 1.0$), while the original store was built as `faiss.IndexFlatL2`. Audit measurements revealed that the vectors stored in `srm_resumes.index` also have unit norms ($\|v\|_2 = 1.0$).
For unit vectors:
$$\|u - v\|_2^2 = 2 - 2(u \cdot v) = 2 - 2 \cos(u, v)$$
$$\cos(u, v) = 1 - \frac{\|u - v\|_2^2}{2}$$

### Decision
1. Convert the retrieval engine to evaluate exact **Cosine Similarity** ($\text{similarity} \in [-1, 1]$, where higher is better).
2. When searching `IndexFlatL2`, convert returned squared L2 distance into true cosine similarity: $\text{Cosine} = 1.0 - \frac{D_{L2}}{2.0}$.
3. Provide an upgraded index builder script that natively creates `faiss.IndexFlatIP` with strict unit-normalized vectors so that `index.search()` directly returns inner products equivalent to cosine similarities.

---

## ADR-002: Hybrid Retrieval (Dense Vector + BM25 Sparse + RRF)

### Context
Dense vector search with sentence embeddings (`all-MiniLM-L6-v2`) excels at semantic concept matching (e.g., mapping "distributed memory store" to "Redis") but frequently fails on exact, distinct technical acronyms (e.g., distinguishing between "C" and "C++", or spotting "Kafka", "AutoCAD", "PyTorch").

### Decision
1. Implement a hybrid retrieval pipeline combining:
   - **Dense Retrieval:** FAISS cosine search over normalized 384D embeddings.
   - **Sparse Retrieval:** `rank_bm25.BM25Okapi` over case-preserved, technical-symbol-aware tokens.
2. Fuse candidate ranks using **Reciprocal Rank Fusion (RRF)**:
   $$\text{RRF}(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{w_m}{k_{rrf} + \text{rank}_m(d)}$$
   with default $k_{rrf} = 60$, $w_{dense} = 1.0$, $w_{sparse} = 1.0$.
3. Deduplicate multiple chunks from the same source resume to prevent single-resume dominance in the context window.

---

## ADR-003: Deterministic Rubric Scoring vs. Non-Deterministic LLM Scoring

### Context
Currently, the LLM free-text response generates a score between 0 and 100 in Markdown. This introduces several major production flaws:
- Unstable, non-deterministic scores for the same resume.
- Brittle regex parsing on the frontend.
- Misleading candidates into treating the score as an institutional probability of getting placed.

### Decision
1. Decouple **Scoring** from **Explanation**:
   - The numerical alignment score (0–100) is calculated **deterministically** via a versioned rubric in application code before invoking any LLM.
   - The LLM's role is strictly to synthesize, explain, and recommend improvements based on the deterministic evidence.
2. The score is explicitly labeled as **"Resume-to-JD Heuristic Alignment Score"**, with an accompanying disclaimer that similarity $\ne$ hiring probability.
3. The rubric weights are configurable via `scoring_rubric.json`:
   - Required Technical Skill Evidence Coverage: 35%
   - Relevant Project / Work Implementation: 25%
   - Responsibility & Task Domain Alignment: 20%
   - Quantified Achievement & Metric Density: 10%
   - Resume Completeness & Section Readability: 10%

---

## ADR-004: Provider Abstraction & Migration from Retired GitHub Models Endpoint

### Context
GitHub Models was officially retired on July 30, 2026. The hardcoded dependency on `azure.ai.inference.ChatCompletionsClient` pointed at `https://models.github.ai/inference` fails in production when credentials are missing or endpoints change.

### Decision
1. Implement a clean `LLMProvider` abstraction interface:
   - Supports standard OpenAI v1 client specification (`OpenAI` / `AsyncOpenAI`), compatible with:
     * Azure OpenAI / Azure AI Foundry (`/openai/v1`)
     * Direct OpenAI API (`api.openai.com/v1`)
     * Self-hosted Ollama (`http://localhost:11434/v1`)
     * Local vLLM (`http://localhost:8000/v1`)
2. Maintain backward compatibility with legacy `GITHUB_TOKEN` credentials while enabling `OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, and `OLLAMA_BASE_URL`.
3. Provide an explicit offline/deterministic fallback mode when credentials are not configured or external endpoints are unreachable.
