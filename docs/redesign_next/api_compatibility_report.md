# API & Data Compatibility Report

**Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  

---

## 1. Zero Backend API Changes
As mandated by Part 10.3 ("Prefer no API changes for a frontend redesign"), 100% of the existing FastAPI endpoints, schemas, and routes remain unchanged.

| Endpoint | Method | Response / Payload | Status |
| :--- | :--- | :--- | :--- |
| `/health` | GET | `{"status": "healthy", "service": "Resume Checker Inference Engine", "version": "2.1.0"}` | Verified (200 OK) |
| `/api/corpus-summary` | GET | 226 source count, 224 valid documents, 2 degraded, 384-dim embeddings | Verified (200 OK) |
| `/api/placement-snapshot` | GET | 8,214 total offers, 421 employers, 562 job profiles, 17-Sep-2026 census | Verified (200 OK) |
| `/api/frameworks` | GET | 18 prompt frameworks registry | Verified (200 OK) |
| `/api/skills` | GET | Skill taxonomy with canonical names & aliases | Verified (200 OK) |
| `/api/llm/providers` | GET | Active provider status (Deterministic local fallback) | Verified (200 OK) |
| `/analyze` | POST | Streaming response with `STRUCTURED_REPORT_START` JSON comment | Verified (200 OK) |
| `/api/coach/chat` | POST | Role-grounded contextual response | Verified (200 OK) |
| `/api/markup/recalculate`| POST | Exact span recalculation on modified canonical display text | Verified (200 OK) |

## 2. Client Fetch Compliance
- Zero hardcoded `localhost:8000` or `127.0.0.1:8000` URLs exist in browser JS.
- All requests pass through `apiUrl(path)` to support same-origin deployment, reverse proxies, and local testing.
- `AbortController` cancellation signal is passed into every asynchronous `fetch()`.

## 3. Data Integrity & Provenance Preservation
- 226 Alumni Vectors (K-Means 5 clusters) remain strictly separated from the 8,214 SRMIST placement offers.
- Deterministic 100-point rubric is invariant: UI themes, reviewer personas, camera positions, or framework selections never alter the underlying score calculation.
