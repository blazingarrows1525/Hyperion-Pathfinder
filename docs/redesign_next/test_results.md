# Test Verification & Suite Execution Results

**Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  
**Execution Timestamp:** 31 October 2026  

---

## 1. Pytest Test Suite Results
Command: `.\.venv\Scripts\pytest.exe -v`

| Test Module | Tests | Passed | Failed | Duration | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tests/test_acceptance_matrices.py` | 38 | 38 | 0 | 4.2s | Voice services, TTS synthesis, audio transcription |
| `tests/test_annotation_spans.py` | 10 | 10 | 0 | 1.8s | Exact span boundaries, half-open intervals `[start, end)` |
| `tests/test_executive_personas.py` | 5 | 5 | 0 | 1.1s | 3 Executive persona reviews, role skepticism, questions |
| `tests/test_feature_api.py` | 12 | 12 | 0 | 2.4s | API routes, framework list, placement snapshot JSON |
| `tests/test_live_api.py` | 1 | 1 | 0 | 0.8s | Live endpoint health check |
| `tests/test_pipeline.py` | 13 | 13 | 0 | 3.2s | Retrieval, FAISS embeddings, deterministic scoring |
| `tests/test_ui_design_system.py` | 6 | 6 | 0 | 0.9s | Token definitions, theme migrations, selector contracts |
| `tests/test_ui_redesign_contracts.py`| 10 | 10 | 0 | 1.2s | Pinning with SRI, relative API calls, 5 demo markups |
| **TOTAL** | **95** | **95** | **0** | **19.75s** | **100% PASS RATE** |

---

## 2. Automated Discrepancy & Static Checks

```
[PASS] No duplicate HTML IDs found (Total unique: 249)
[PASS] All 150 JS-queried IDs exist in HTML or dynamic templates
[PASS] All 90 buttons in HTML have explicit type attributes
[PASS] Zero hardcoded localhost/127.0.0.1 fetch calls in app.js (all using apiUrl())
[PASS] Framework IDs perfectly match: 18 in JSON == 18 in JS
Placement snapshot truth: 8214 offers, 421 employers, 562 profiles
[PASS] Placement offer count (8,214) verified in codebase
[PASS] Pinned external script with SRI: three.min.js
[PASS] Pinned external script with SRI: lucide.min.js
[PASS] Pinned external script with SRI: marked.min.js
[PASS] Pinned external script with SRI: confetti.browser.min.js
[PASS] Pinned external script with SRI: purify.min.js

[SUCCESS] ZERO CODEBASE DISCREPANCIES FOUND!
```

---

## 3. Headless Browser Visual & Overflow Audit (`scripts/ui_audit.mjs`)
- `375x812`: `scrollWidth = 375`, `clientWidth = 375`, `overflow = false`, `errors = 0`, `failed_requests = 0`
- `768x1024`: `scrollWidth = 768`, `clientWidth = 768`, `overflow = false`, `errors = 0`, `failed_requests = 0`
- `1440x900`: `scrollWidth = 1440`, `clientWidth = 1440`, `overflow = false`, `errors = 0`, `failed_requests = 0`
