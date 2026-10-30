# Frontend Baseline Audit — Milestone 0

**Audit date:** 30 October 2026
**Repository:** `blazingarrows1525/SRM_Career_Catalyst`
**Baseline commit (HEAD at audit):** `654ca27e1917fc63adea2066ecbc5693445f0d09`
**Master prompt's own audit baseline:** `24ebc2224a76fb96e11dfe22e82b04c53b75b44e` (3 commits behind HEAD)
**Work branch:** `feat/m0-m1-baseline-truthfulness`
**Environment:** Windows 11, Python 3.10 venv, FastAPI/uvicorn on `127.0.0.1:8000`, Chromium-based in-app browser (desktop, 768×1024 tablet, 375×812 mobile emulation).

> Every finding is classified **Confirmed** (executed or observed at runtime), **Inferred** (from source reading only), or **Needs live verification** (not yet exercised). No performance, Lighthouse, or Core Web Vitals measurement was taken in this milestone, and none is claimed.

This document supersedes `docs/frontend_audit_before.md` for the current HEAD. That earlier report describes the tree *before* the three commits listed in §2, so it no longer reflects the code.

---

## 1. Source inventory

| File | Lines | Bytes | Prompt baseline |
|---|---:|---:|---|
| `index.html` | 2,058 | 124,970 | 1,804 lines / ~105 KB |
| `app.js` | 5,353 | 220,674 | 4,536 lines / ~186 KB |
| `styles.css` | 5,275 | 127,725 | — |
| `main.py` | 794 | 31,023 | — |

`index.original.html` is present and was not modified.

**Sections (runtime, 10):** `#hero`, `#recruiter-marquee`, `#how-it-works`, `#placement-snapshot`, `#analyzer`, `#genome`, `#company-intel`, `#prompt-studio`, `#buttons-lab`, `#faq`. `#placement-snapshot` was added after the prompt's baseline.

**External scripts:** Three.js `r128` (cdnjs), `lucide@latest` (unpkg), `marked` (jsdelivr, no version), `canvas-confetti@1.9.3` (jsdelivr). None carries a Subresource Integrity (`integrity`) attribute.

**Themes:** dark (obsidian) and light (ceramic) token sets, plus a minimalist/maximalist "designhead" mode.

---

## 2. Verification of prior commits' claims

Three commits landed on top of the prompt's baseline. Their messages were checked against the code:

| Commit | Claim | Finding |
|---|---|---|
| `fe67f98` | "master prompt compliance" | **Partial.** 27 static buttons still lack `type` (same count as the prompt baseline); 2 report buttons are dead; the Markdown sanitizer is bypassable. |
| `73b2b8b` | "honest telemetry" | **Not delivered.** `FAISS LATENCY 0.2ms`, `NEURAL V2`, `QUANTUM SYNTH`, and the `PLACEMENT_SKILLS_3D` match percentages are still presented as live data with no "illustrative" label. |
| `73b2b8b` | SRMIST 2026 placement snapshot | **Confirmed.** `placement_snapshot_2026.json` holds 8,214 offers / 421 employers / 562 job profiles, dated 2026‑09‑17, with no fabricated student count. |
| `654ca27` | audio synthesizer | **Confirmed compliant.** `SpatialAudioEngine` defaults to `enabled = false` and `playTone` returns early unless a user enables it. No autoplay. |
| — | "1,200+" corpus claim removed | **Confirmed.** No occurrence in `index.html` or `app.js`; the meta description states 226. |
| — | monochrome palette regression fixed | **Confirmed.** `--accent-*` tokens are chromatic in both themes (e.g. `--accent-blue: #5B8CFF` dark, `#1D4ED8` light). |

---

## 3. Test baseline

Command: `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider`

| Run | Result |
|---|---|
| Isolated (no server) | **77 passed, 1 failed** in 21.3 s |
| `tests/test_live_api.py` with backend on `:8000` | **1 passed** in 5.4 s |
| **Effective total** | **78 / 78** — the single failure is environmental: that test makes a real HTTP call and needs a running backend. |

`pytest` is **not** listed in `requirements.txt` and was not in the venv; it had to be installed (`pytest 9.2.0`) to run the suite. The README's "70 tests passing" is historical and does not match the current count of 78.

---

## 4. Findings register

### 4.1 Security and privacy

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| S1 | **Critical** (legal) | `vector_store/benchmark_resumes.pkl` contains **226 real student names** in its `file_name` fields and **318 ten-digit phone-number runs** in its text, with **zero** `[EMAIL_REDACTED]` / `[PHONE_REDACTED]` / `[LINK_REDACTED]` markers. The file is git-tracked, present in history under both its old name (`srm_resumes.pkl`, commit `fb5a2e3`) and new name (rename in `24ebc22`), and the repository is public. | Static scan of the serialized bytes (no deserialization). | **Confirmed** |
| S2 | **High** | `sanitizeHtmlSafe` (`app.js:2737`) is a blocklist. A `javascript:` URL split by a tab or newline (`java&#9;script:`) survives it, and the browser parses the surviving `href` as protocol `javascript:`. `<form action>` and `formaction` also survive. Model output — which is fed untrusted resume text — flows through this function. | Called the live function in the browser and read `a.protocol` (nothing was clicked or executed). | **Confirmed** (bypass). Exploitability via the current deterministic provider: **needs live verification**. |
| S3 | **High** | CORS: `allow_origins=["*"]` with `allow_credentials=True`. | `main.py:63-64`. `.env.example` also defaults `CORS_ORIGINS=*`. | **Confirmed** |
| S4 | **High** | `/api/llm/configure` and `/api/llm/test` accept an `api_key` in the request body with no authentication dependency. No auth module exists in the tree. | Route inventory in `main.py`. | **Confirmed** |
| S5 | Low | CDN scripts are unpinned (`lucide@latest`, `marked`) and none use SRI. | `index.html:13-16`. | **Confirmed** |
| — | Pass | `GET /api/llm/providers` returns no key-like values. | Live response checked for `sk-`, `gsk_`, `AIza`, `ghp_`, `github_pat_` patterns. | **Confirmed** |

**Discrepancy:** `docs/privacy_and_data_handling.md` §2 states the alumni corpus was scrubbed of emails, phones and URLs. The committed artifact (S1) shows phones were not redacted and names are exposed. Per the master prompt's source-of-truth order (§1.2), the data artifact outranks the document. **The privacy document is currently inaccurate.**

### 4.2 Functional

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| F1 | **High** | The report's **Copy** and **Download .md** buttons are dead: `onclick="copyAnalysisToClipboard()"` and `onclick="exportAnalysisReport()"` reference functions that do not exist. Clicking throws `ReferenceError`. Violates build rule 7. | `index.html:991, 994`; runtime check `typeof window[fn]`. | **Confirmed** |
| F2 | Medium | **67 of 169** runtime `<button>` elements lack an explicit `type` (27 in static HTML, 40 created by `app.js`). | Static regex scan + runtime DOM count. | **Confirmed** |
| F3 | Medium | Duplicate `@app.get("/")` registrations. The first (serves `index.html`) wins; the second (JSON) is unreachable dead code. | `main.py:86, 174`; live `GET /` → `200 text/html`. | **Confirmed** |
| — | Pass | No duplicate IDs at runtime (221 unique IDs after dynamic render). | Runtime DOM scan. | **Confirmed** |
| — | Pass | 19 of 21 distinct inline `onclick` handlers resolve. | Runtime check. | **Confirmed** |
| — | Pass | No console errors on initial load. | Browser console. | **Confirmed** |

### 4.3 Truthfulness (content and telemetry)

| # | Severity | Finding | Location | Status |
|---|---|---|---|---|
| T1 | **High** | The deterministic, rule-based fallback is branded as a neural model. `/health` reports `provider_class: IntelligentLocalProvider`, `model: deterministic-fallback`, while `/api/llm/providers` reports `Intelligent Neural Engine (Local Grounded)` / `resume-checker-neural-v2`. | `services/llm_provider.py:227, 231, 380, 384`; mirrored in `index.html:85, 1985`. | **Confirmed** (live) |
| T2 | Medium | HUD presents static values as live telemetry: `FAISS LATENCY 0.2ms` (hard-coded), `LLM ENGINE NEURAL V2` (fallback default), and `QUANTUM SYNTH` titled "Real-time Placement Frequency Synthesizer" (decorative CSS bars). | `index.html:255-267`; `app.js:5064`. | **Confirmed** |
| T3 | Medium | `PLACEMENT_SKILLS_3D` assigns every 3D skill node a fabricated `match` percentage (e.g. 99.1%, 96.4%) and a fabricated skill→recruiter mapping (e.g. "PyTorch → NVIDIA, Google DeepMind, Adobe"), shown in the node tooltip without an illustrative label. Violates build rule 8 and W.6. | `app.js:1103+`; tooltip `index.html:195`. | **Confirmed** |
| T4 | Medium | Hero and trust copy overclaim: "five **neural** career archetypes" (they are K-Means clusters), feedback "**grounded in real hiring outcomes**" (no outcome model exists — contradicts build rule 15 and §2.5), trust strip "**FAISS Neural Indexing**". | `index.html:139, 162`. | **Confirmed** |
| T5 | Low | Report provenance tag reads "Live Session Analysis — **Verified with Placed Alumni** FAISS Store". | `app.js:2715`. | **Confirmed** |
| — | Inferred | The `WebGL Engine • W×H • N Nodes` readout may be derived from the real `spatialNodes` registry. | `app.js:1081, 1429`. | **Needs live verification** |

### 4.4 Responsive layout

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| R1 | **High** | At 375 px the document is **1,144 px wide (769 px horizontal overflow)**. Root cause: `.nav-actions` renders 965 px wide without wrapping or collapsing. Consequence: the mobile menu button `#btn-mobile-menu` sits at x = 1,144 — **off-screen on phones**. The 6,009 px marquee track is correctly clipped by its container and is not the cause. | Runtime layout measurement excluding clipped descendants. | **Confirmed** |
| R2 | Low | At 800 px desktop width the primary nav clips its last item ("Buttons Lab"). | Screenshot. | **Confirmed** |

---

## 5. Discrepancy register

| Claim (source) | Reality | Resolution owner |
|---|---|---|
| Alumni corpus is PII-scrubbed (`docs/privacy_and_data_handling.md`) | Names and phone numbers present (S1) | Repository owner — data remediation and history purge |
| "70 tests passing" (README) | 78 tests; 77 pass isolated, 78 with a live server | Update README after M1 |
| "honest telemetry" (commit `73b2b8b`) | Not delivered (T2, T3) | M1 |
| Product is "SRM Career Catalyst" (master prompt) | UI is consistently "Resume Checker"; SRM references were deliberately removed in `24ebc22` | **Owner decision** — not changed in M1 |
| `/health`: `deterministic-fallback` | `/api/llm/providers`: "Neural Engine" (T1) | M1 |
| "All SRM references removed" (`24ebc22`) | UI presents SRMIST 2026 placement data | Owner decision; placement source attribution is an M6 item |

---

## 6. Needs live verification (not exercised in M0)

Full analyzer run with a real PDF (streaming, all result tabs); voice input (SpeechRecognition is browser-dependent); screen-reader flows; WebGL-unavailable fallback; `prefers-reduced-motion` behaviour; keyboard-only traversal; any performance or Core Web Vitals figure.

---

## 7. Milestone 1 plan (non-destructive)

1. Implement the two dead report actions (F1) using the existing `fallbackCopy`, `showToast` and download patterns.
2. Add explicit `type` to every button — static HTML and `app.js` templates (F2).
3. Replace or label fake telemetry (T2) and the `PLACEMENT_SKILLS_3D` fixture (T3).
4. Correct overclaiming copy (T4, T5) using the master prompt's §2.5 wording.
5. Honest naming for the local deterministic provider (T1) — a minimal, isolated backend change.
6. Replace the blocklist sanitizer with an allowlist (S2), in its own commit — required by build rule 10.

**Deferred:** R1/R2 to Milestone 3/8; S3, S4, F3 to Milestone 9; S5 to Milestone 9. **S1 cannot be fixed by a code change** — it requires the owner to purge history and rebuild a redacted corpus, and is reported separately.

---

## 8. Milestone 1 results — correctness and truthfulness

**Gate: passed.** Verified in-browser after rendering every conditional template: 0 of 171 buttons lack `type`; 21 of 21 inline handlers resolve; 0 duplicate IDs among 220; none of 19 listed overclaim phrases appears in page text; no console errors. Backend: **78 / 78** tests pass with a live server.

### 8.1 Baseline findings resolved

| Finding | Resolution | Commit |
|---|---|---|
| F1 dead Copy / Download report buttons | Implemented with the existing clipboard and download patterns; exports strip the internal JSON block and label demo output | `40553c6` |
| F2 67 buttons without `type` | All set to `type="button"` (no `<form>` exists); each changed line differs only by that attribute | `61d979f` |
| T1 deterministic fallback branded "Neural Engine" | Display name "Local Deterministic Engine (no LLM)", model `deterministic-fallback`; `/health` and `/api/llm/providers` now agree. Provider id `neural_local` kept (API contract) | `8791d42` |
| T2 fake HUD telemetry | FAISS readiness and corpus size read from `GET /health`; engine from `/api/llm/providers`; synth bars relabelled decorative | `c951634` |
| T3 `PLACEMENT_SKILLS_3D` fabricated match %, tier, recruiters | Tooltip labelled illustrative; fabricated fields removed after a reference search | `c951634` |
| T4 / T5 overclaiming hero, meta, trust strip, provenance copy | Rewritten with the master prompt's §1.7 / §2.5 wording | `c951634` |
| S2 bypassable Markdown sanitizer | DOMPurify 3.4.17, pinned with a cross-verified SRI hash; Markdown-only allowlist; escaped-text fallback if it fails to load. 9 / 9 payloads neutralized | `b7a686f` |
| — "needs live verification": WebGL readout | **Confirmed genuine**: built from the real canvas size and `PLACEMENT_SKILLS_3D.length` | — |

### 8.2 New findings discovered during M1

| # | Finding | Status |
|---|---|---|
| N1 | Headline score wrong: the fallback regex captured the denominator in "Overall Score (out of 100): 86/100", so the ring showed **100 for an 86 report** (always in demo mode). Unparseable reports defaulted to an invented **84**. | Fixed `40553c6` — ring now matches the report; unparseable shows a dash |
| N2 | Company directory "N Placed" counts contradicted the project's own 2026 report (Google **42** vs **1** offer; Amazon 114 vs 38) and labelled offers as "placed alumni". Highest-CTC values were also wrong. | Fixed `c951634` — real offers / profiles / highest CTC from `placement_snapshot_2026.json`; "Not in the 2026 report excerpt" otherwise |
| N3 | Company modal printed "Provenance: … unverified" above a heading "**Verified** Interview Rounds". | Fixed `c951634` |
| N4 | Career Genome showed a per-archetype **"Placement Conversion" of 84–96%** and a median CTC under "Verified Placement Benchmarks". The corpus holds resumes only; no source exists. | Fixed `c951634` — real cluster sizes from `data_manifest.json` (sum 226), mapped by cluster id |
| N5 | The 3D constellation uses an invented taxonomy ("Cloud & DevOps", "Cyber & Security", …), not the five K-Means archetypes. | Labelled illustrative. **Re-mapping deferred to M3 / M6** |
| N6 | `GET /data_manifest.json` is public and lists two real student names under `degraded_documents`. The PII exposure is served by the live application, not only stored in git. | **Open — owner decision** (with S1) |
| N7 | `appState.backendBaseUrl` is hard-coded to `http://127.0.0.1:8000`; `/health` is fetched through it while other calls are relative, so the status badge and HUD would read "offline" on any deployed origin. | **Open — M9** |

### 8.3 Deferred by plan

| Item | Milestone |
|---|---|
| R1 mobile overflow (`.nav-actions` 965 px; menu button off-screen) and R2 desktop nav clipping | M3 / M8 |
| S3 CORS wildcard with credentials; S4 unauthenticated `/api/llm/configure` and `/api/llm/test` | M9 |
| S5 unpinned CDN scripts without SRI (`lucide@latest`, `marked`) — only DOMPurify is pinned so far | M9 |
| F3 duplicate `@app.get("/")`; N7 hard-coded base URL | M9 |

### 8.4 Owner decisions requested

1. **S1 + N6 — alumni PII.** Purge `vector_store/` from history, remove names from `data_manifest.json`, rebuild a redacted corpus, and correct `docs/privacy_and_data_handling.md`. This cannot be done by a code change and involves rewriting public history.
2. **Brand.** The UI is consistently "Resume Checker" (SRM references were deliberately removed in `24ebc22`); the master prompt calls the product "SRM Career Catalyst". Not changed.
3. **"Placed alumni" wording.** Three descriptive passages still call the corpus "placed alumni" (`index.html` analyzer title, results subtitle, Genome intro). The artifacts carry no placement-status field and the master prompt's suggested copy avoids the word. Verification claims built on it were removed in M1; these descriptive uses were left for you.
