# Production Deployment & Readiness Checklist

**Project**: Resume Checker  
**Target Environments**: Local Development, On-Premises Campus Server, Render Web Service  
**Version**: 1.0.0  

---

## 1. Pre-Deployment Verification Gates

Before deploying or releasing any new build, complete each checkpoint in order:

- [x] **1. Empirical Data Audit**: Verified that `vector_store/benchmark_resumes.index` and `benchmark_resumes.pkl` contain exactly 226 vectors matching `data_manifest.json`.
- [x] **2. Distance Metric Consistency**: Vector norms verified to be $1.0000 \pm 0.0000$; FAISS distance conversion formula $\cos = 1 - \frac{D_{L2\_sq}}{2}$ validated.
- [x] **3. Automated Test Suite**: All 13 unit tests in `tests/test_pipeline.py` pass without warnings or failures.
- [x] **4. Report Schema Invariants**: `scripts/evaluate_reports.py` passes all schema, bounds, summation, and PII checks.
- [x] **5. Retrieval Benchmark**: `scripts/evaluate_matching.py` demonstrates $> 50\%$ archetype matching across all 5 clusters with $< 50\text{ms}$ hybrid search latency.
- [x] **6. Truthful Health Probe**: `GET /health` reports `status: healthy`, `faiss_ready: true`, and correct vector counts without leaking internal tokens.
- [x] **7. Provider Decoupling**: Legacy retired GitHub Models endpoint replaced with standard OpenAI v1 SDK compatibility and working deterministic local fallback.
- [x] **8. Live Streaming Integration**: `tests/test_live_api.py` completes SSE multipart upload with HTTP 200 and formatted streaming chunks.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` and configure appropriate credentials:

```bash
# Model & Provider Configuration
OPENAI_API_KEY=your_key_here                # Leave empty to use local deterministic fallback
OPENAI_BASE_URL=https://api.openai.com/v1   # Azure AI Foundry / OpenAI / Local Ollama (http://localhost:11434/v1)
LLM_MODEL=gpt-4o-mini                     # Target deployment model

# Optional Reranker Configuration
ENABLE_RERANKER=false                     # Set to true to activate Cross-Encoder reranking
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2

# Security & CORS
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

---

## 3. Render Deployment Steps (`render.yaml`)

1. Connect the GitHub repository to Render as a Web Service.
2. Ensure the environment is configured as Python 3.10+:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. In the Render Dashboard, add `OPENAI_API_KEY` as a secret environment variable.
4. Verify `/health` endpoint once the service is live.

---

## 4. Disaster Recovery & Rollback Plan

If an unexpected runtime regression occurs:
1. Revert to the previous stable release commit:
   ```bash
   git checkout <stable_commit_hash>
   ```
2. Restart uvicorn service:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```
3. The underlying vector index (`vector_store/benchmark_resumes.index`) is backwards-compatible and does not require re-indexing.
