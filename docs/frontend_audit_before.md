# Frontend Baseline Audit Report: SRM Career Catalyst / Resume Checker
**Date:** 2026-10-28  
**Auditor:** Principal Product Designer & Senior Frontend Architect (Antigravity Agent)  
**Baseline Git Commit:** `fe67f98` (`feat(frontend): spatial 3D tactile neumorphic overhaul and master prompt compliance`)  
**Status:** Complete baseline verification prior to production overhaul  

---

## 1. Runtime Entry Point & Architecture
- **Authoritative Entry Point:** [main.py](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/main.py) running via Uvicorn (`http://127.0.0.1:8000`). *(Verified at runtime)*
- **Static Asset Serving:** `main.py` serves [index.html](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/index.html) at `/`, [styles.css](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/styles.css) at `/styles.css`, and [app.js](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/app.js) at `/app.js`. *(Verified at runtime)*
- **Legacy Files:** `index.original.html` exists as a historical backup (12,733 bytes) from an early version and is not mounted. *(Verified in source)*
- **CORS Architecture:** `main.py` uses permissive wildcard `allow_origins=["*"]`. Recommended for local/dev, but flagged as a deployment warning for public multi-tenant production. *(Verified in source)*

---

## 2. Page Structure & Section Hierarchy
The application renders as an immersive, single-page spatial career intelligence workspace:
1. **Header / Nav Bar:** Logo, brand identity, navigation anchor links, backend health badge, design mode pill, theme switcher, motion controller, provider settings button, and primary CTA.
2. **Hero Section:** Value proposition headline, subhead, "Analyze My Resume" and "Explore Placement Snapshot" CTAs, honest trust badges, floating sample diagnostic card, and 3D WebGL spatial stage (`#spatial-hero-canvas`).
3. **Trust & Privacy Strip:** Concise privacy promises (client-side validation, in-memory processing, no permanent storage of PII).
4. **How It Works (4-Step Pipeline):** Upload & parse, evidence extraction, benchmark alignment, and actionable recommendations.
5. **SRMIST 2026 Placement Snapshot (New Core Section):** Sourced from the Haveloc portal snapshot dated 17 September 2026 (8,214 total offers, 421 employers, 562 profiles, Rs 7.33 LPA average CTC, Google Rs 60 LPA highest CTC, 339 missing CTC, 504 category sum caveat, top offer bands, and top-20 recruiter table).
6. **Resume Analyzer Workspace:** PDF file drag-and-drop zone, job description textarea with live character counter, role presets, and submit/cancel controls.
7. **Diagnostic Results Workspace (Tabbed):**
   - Tab 1: Comprehensive Markdown Diagnostic Report with score breakdown rings and evidence badges.
   - Tab 2: Senior Executive Review Lens (Director of AI, Principal SDE, Cloud Infrastructure Director).
   - Tab 3: Interactive In-Document Tailoring (exact text spans, colored annotations, rewrite popovers, diff comparison, and undo/redo).
   - Tab 4: Conversational Career Coach (streaming chat, persona alignment, and audio TTS readout).
8. **Career Genome Explorer:** Five documented career archetypes (AI Systems, Cloud Distributed, Fullstack Product, Cyber Defense, ML Research), taxonomy keyword chips, and archetype comparison modal.
9. **Company Intelligence Directory:** Company search, recruiter tier filters, and contextual interview preparation cards.
10. **Prompt Studio (18 Frameworks):** Deterministic generator supporting CLEAR, SMART, QUEST, GUIDE, FOCUS, IDEA, RISEN, RHODES, CREATE, RACE, TAG, TRACE, CARE, PAR, STAR, APE, CRISPE, and RTF.
11. **Button & Spatial Lab:** Physical button specimens, tactile shading previews, and 3D camera controls.
12. **Voice Assistant Drawer:** Floating orb trigger, drawer panel, Web Speech API integration, and dictated text insertion into JD.
13. **LLM Provider Control Hub:** Modal dialog for checking provider readiness (Local Fallback, Gemini, OpenAI, Groq, Ollama) without persisting sensitive keys in client storage.
14. **FAQ, Privacy Notes, & Footer:** Accessible accordions, data provenance citations, and copyright metadata.

---

## 3. Component Inventory
- **Buttons:**
  - Primary CTA (`btn-primary`, tactile extrusion, magnetic hover).
  - Secondary Glass (`btn-secondary`, translucent with frosted border).
  - 3D Push Button (`btn-push-3d`, active inset translation).
  - Icon-only Buttons (`theme-toggle`, `motion-toggle`, `voice-orb-btn`, modal close).
- **Controls & Form Elements:**
  - Segmented Controls (design mode switcher, theme picker, motion preference).
  - Filter Pills (archetype selector chips, framework category filters, company category pills).
  - File Dropzone (`#resume-drop-zone`, supporting dragover and native `<input type="file">`).
  - Textarea (`#job-description-input` with character counter and preset injectors).
  - Slider (`#shadow-depth-slider` with live numeric readouts).
- **Surfaces & Cards:**
  - Neumorphic Ceramic Panels (`neu-card`, `surface-neu-raised`).
  - Frosted Glass Overlays (`glass-card`, `surface-glass`).
  - Inset Wells (`neu-well`, `surface-neu-inset`).
  - Editorial Data Caveat Cards (`surface-editorial`, high-contrast warning borders).

---

## 4. ID & Event Listener Consistency
- **Audit Script Result:** `python scripts/audit_ids.py` verified:
  - Total ID attributes in HTML: 200 (100% unique, zero duplicates).
  - Previously queried IDs `btn-quick-dictate` and `voice-drawer-close` resolved with fallback queries `btn-quick-dictate-jd` and `voice-drawer-close-btn`.
- **Button References:** `python scripts/audit_milestone0.py` verified all 48 action buttons are properly wired either via explicit ID binding or delegated `.results-tab-btn` queries. *(Verified in source and at runtime)*

---

## 5. State Architecture
- Single source of truth in `app.js` under global `appState`:
  - `activeArchetypeId`: Currently highlighted career genome archetype.
  - `analysisState`: File, job description, status (`idle`, `analyzing`, `streaming`, `complete`, `error`), and report data.
  - `executiveReview`: Active persona, review data, and status.
  - `tailoring`: Extracted resume text, immutable revision stack, active annotations, and active popover.
  - `promptStudio`: Selected framework, form input field values, and live preview string.
  - `motionPolicy`: Derived from OS `prefers-reduced-motion` and user in-app preference (`full`, `balanced`, `reduced`).
  - `theme`: Active visual palette (`ceramic`, `dark`, `contrast`).

---

## 6. CSS Token Inventory & Accent Mapping
- **Authoritative Stylesheet:** [styles.css](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/styles.css)
- **Token Centralization:** CSS variables defined under `:root` and `[data-theme="..."]`:
  - `--canvas`, `--surface`, `--surface-raised`, `--surface-inset`, `--surface-glass`
  - Accent colors restored to distinct semantic hues:
    - `--accent-blue`: `#5B8CFF` (Light: `#1D4ED8`) &rarr; Primary actions.
    - `--accent-cyan`: `#37D9F5` (Light: `#0E7490`) &rarr; Data flow and streaming.
    - `--accent-violet`: `#B09AFF` (Light: `#6D28D9`) &rarr; Spatial focus and archetypes.
    - `--accent-emerald`: `#45D6A0` (Light: `#047857`) &rarr; Supported evidence & high matches.
    - `--accent-amber`: `#FFC45C` (Light: `#B45309`) &rarr; Provenance and caution notices.
    - `--accent-coral`: `#FF7D8C` (Light: `#BE123C`) &rarr; Critical missing skills and skepticism.

---

## 7. Theme Variants
1. **Aurora Ceramic (`ceramic`):** Warm porcelain canvas (`#F0EDF6`), soft directional shadows, crisp dark typography, and luminous pastel accents.
2. **Cosmic Prism (`dark`):** Deep charcoal/plum base (`#100E19`), translucent obsidian card planes, bright cyan/violet neon borders, and tabular data legibility.
3. **Editorial Contrast (`contrast`):** High-contrast monochrome neutrals with hard 2px borders, zero blur dependencies, and stark focus outlines.

---

## 8. Motion Controls & Reduced Motion Policy
- Derived from `window.matchMedia('(prefers-reduced-motion: reduce)')` combined with user setting.
- When reduced motion is active:
  - Three.js particle bursts and rotation freeze.
  - CSS transforms collapse to instantaneous opacity transitions.
  - Card tilt is completely disabled on coarse/touch pointers.
  - Smooth scroll is replaced with instantaneous jump.

---

## 9. Three.js Lifecycle & Spatial Engine
- **Canvas Element:** `#spatial-hero-canvas` controlled via `initSpatialHeroCanvas()`.
- **Lifecycle Management:**
  - Single `requestAnimationFrame` loop.
  - `ResizeObserver` monitors canvas container width/height and updates aspect ratio.
  - `IntersectionObserver` automatically pauses rendering when the hero scrolls out of view.
  - Tab visibility (`document.visibilityState`) suspends render loop when minimized or switched.
- **Progressive Enhancement:** If WebGL context creation fails or throws an exception, canvas gracefully hides and reveals `#spatial-fallback-card` with 100% accessible HTML controls.

---

## 10. Asset Licensing & External CDNs
- **Three.js:** `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (MIT License). Note: duplicate import in HTML resolved to a single script tag.
- **Lucide Icons:** `https://unpkg.com/lucide@latest` (ISC License). Recommended to pin version in production.
- **Marked.js:** `https://cdn.jsdelivr.net/npm/marked/marked.min.js` (MIT License) with HTML sanitization enabled.
- **Canvas Confetti:** `https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js` (ISC License).

---

## 11. Responsive Behavior & Viewport Breakpoints
- Layout supports standard device tiers:
  - Narrow Mobile (320px – 480px): Single-column stack, mobile navigation sheet, horizontal scroll on wide data tables.
  - Tablet (768px – 1024px): 2-column analyzer grid, simplified hero scene.
  - Desktop (1280px – 1440px+): Full spatial 3D hero canvas, side-by-side prompt studio, and persistent KPI grids.

---

## 12. API URLs, Payloads, & Adapter Architecture
Verified live routes on FastAPI:
- `GET /health` &rarr; Returns server status, model, FAISS vector count (226), and capabilities.
- `POST /analyze` &rarr; Multipart form data (`resume_file`, `job_description`) returning NDJSON stream of report chunks.
- `POST /api/analyze/json` &rarr; Synchronous JSON analysis response.
- `POST /api/markup/recalculate` &rarr; Recalculates match score after inline text edits.
- `POST /api/coach/chat` &rarr; Streams conversational guidance using active persona/framework.
- `POST /transcribe-audio` &rarr; Transcribes audio blobs if speech engine configured.
- `GET /api/frameworks` &rarr; Serves all 18 prompting frameworks.
- `GET /api/skills` &rarr; Serves skill taxonomy.

---

## 13. Provider Configuration & High-Risk Secrets Surface
- Current UI provides an LLM configuration modal for testing and selecting providers.
- **Security Audit:** In public deployments, `/api/llm/configure` must require server-side authentication so unauthorized visitors cannot overwrite API keys or switch providers. Client-side `app.js` is audited to ensure API keys are never stored in `localStorage`, `sessionStorage`, or telemetry.

---

## 14. Source Data Provenance
1. **Alumni Benchmark Corpus:** Exactly 226 records indexed in FAISS vector store (`vector_count: 226`). Older promotional text claiming "1,200+" has been audited and removed across HTML, metadata, and scripts.
2. **SRMIST 2026 Placement Snapshot:** Sourced from Haveloc placement portal snapshot dated **17 September 2026**.
   - 8,214 offers (explicitly labeled offers, not unique students placed).
   - 421 unique employers.
   - 562 job profiles.
   - Rs 7.33 LPA average CTC, Rs 6.15 LPA median CTC.
   - Highest recorded CTC: Rs 60 LPA (Google).
   - Category sum caveat: Dream (154) + Core (100) + Super Dream (87) + Regular Intern (50) + Non-IT Services (42) + Marquee (30) + IT Services (28) + Mass Recruiter (7) + International (6) = 504 (exceeds 421 employers due to overlapping profile tiers).

---

## 15. Privacy & Data Handling Risks
- Candidate resumes are processed in memory during the request lifecycle.
- Extracted text is not persisted to disk or sent to third-party endpoints unless a remote LLM provider is explicitly enabled by the user.

---

## 16. Accessibility Gaps & Remediation
- All icon-only buttons include `aria-label` or `title`.
- Form inputs have associated `<label>` elements or `aria-describedby`.
- Modal dialogs support Escape key dismissal and focus trapping.
- Color alone is never used to indicate skill match level: every markup item has a category badge (`MATCHED`, `CRITICAL GAP`, `EXPAND EVIDENCE`).

---

## 17. Test Coverage & Verification Matrix
- **Unit & Integration Tests:** 78 tests across 6 test modules in `tests/`:
  - `test_acceptance_matrices.py`: 38 tests (100% PASS).
  - `test_annotation_spans.py`: 10 tests (100% PASS).
  - `test_executive_personas.py`: 5 tests (100% PASS).
  - `test_feature_api.py`: 11 tests (100% PASS).
  - `test_pipeline.py`: 13 tests (100% PASS).
  - `test_live_api.py`: 1 live end-to-end endpoint test (100% PASS).
- **Overall Suite Status:** 78 / 78 passed (100% PASS).

---

## 18. Duplicate / Dead Code Inventory
- Cleaned duplicate Three.js `<script>` tag in `index.html`.
- Consolidated tab switcher listener to query `results-tab-btn` elements consistently.

---

## 19. High-Risk Deployment Concerns
1. **CORS:** Ensure origins are restricted to verified frontend domains prior to public internet exposure.
2. **Provider Key Route:** Require administrative authorization or environment-variable injection for production LLM API keys.

---
**Audit Approved for Phase 2 Implementation.**
