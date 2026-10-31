# Security & Privacy Status Report

**Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  

---

## 1. Client-Side Privacy Guarantees
- **No LocalStorage Document Persistence:** Uploaded resume PDFs, extracted text strings, and target job descriptions are kept strictly in memory for the duration of the analysis session and are never written to `localStorage` or `sessionStorage`.
- **Zero API Key Leakage:** There are no client-side input forms for API keys, and no provider secrets exist in HTML, JS, or client state.
- **Client DOM Sanitization:** All streaming markdown is parsed and sanitized through `DOMPurify` with an explicit allowlist before injection into `#markdown-stream-output`. Forms, scripts, iframes, and arbitrary SVGs are strictly stripped.
- **Relative Path Routing:** No hardcoded `127.0.0.1` or `localhost` URLs exist in browser JS.

---

## 2. Server-Side Security Actions (Owner Action Register)
As required by Part 13 ("The visual redesign must not hide the real risks"), frontend styling does not replace backend infrastructure hardening. The following items remain in the owner action register:

1. **`vector_store/benchmark_resumes.pkl` History Audit:**
   - Pre-redesign audit found that the historical pickle file in git history contained real student names and phone numbers. An owner-approved git-filter-repo pass and new redacted vector index are recommended prior to broad public distribution.
2. **Unauthenticated Admin Endpoints (`/api/llm/configure`, `/api/llm/test`):**
   - The UI does not expose these endpoints. Server-side middleware must enforce role-based authentication or localhost-only gating before production deployment.
3. **CORS Hardening:**
   - The backend currently allows CORS credentials. In production deployments, `allow_origins` must be restricted to the explicit verified production domains rather than broad wildcards.
