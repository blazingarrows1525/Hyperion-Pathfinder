# Terra Atelier — selector migration map

Every DOM ID or section the redesign removes or replaces, with where its job went.
Checked with `python scripts/frontend_inventory.py --compare docs/terra-atelier/selector_contract_baseline.json`,
which also fails if `app.js` reads an ID that no longer exists.

## Masthead and Career Atlas hero

| Removed / changed | Status | Replacement |
|---|---|---|
| `header.top-nav`, `.nav-brand`, `.brand-icon-box` | replaced | `header.masthead`, `.wordmark`, `.wordmark-mark` |
| nav links (Home, How It Works, Placement 2026, Analyzer, Career Genome, Company Intel, Prompt Studio, Button Lab, FAQ) | regrouped | Primary links: Snapshot, Analyzer, Genome, Companies, Prompt Studio. "More" menu (`#btn-nav-more` → `#nav-more-menu`): How it works, Methodology & FAQ, Interaction showcase. `#nav-links-menu` keeps its ID and doubles as the mobile drawer. |
| `#btn-theme-toggle`, `#btn-motion-toggle`, `#btn-sound-toggle`, `#btn-designhead-*`, `#btn-llm-control-hub` | moved | Same IDs, now inside the preferences popover (`#btn-prefs` → `#prefs-panel`). The designhead switch is relabelled "3D detail: Low / High". |
| `#canvas-3d-container`, `.aurora-blur ×3`, `#ambient-spatial-canvas` | removed | Decorative full-page layers. `initAmbientSpatialCanvas()` was never called; it is deleted. |
| `.hero-grid` split layout, `.hero-badge-pill`, `.trust-strip` | replaced | Full-width `.atlas-hero-copy` (overline, headline, lede, disclaimer, CTAs) above the `.atlas-stage`. |
| `#hero-diagnostic-card`, `#hero-gauge-ring`, `#heroGaugeGrad` | removed | A fixed "84 sample score", "₹16.0 LPA archetype median" and "94.8% skill alignment" with no source. Real scores appear only in analyzer results. |
| `.orbiting-chip` ×2 ("Cluster #2 Software Dev: 95% Match") | removed | Unsourced match claim. |
| `#maximalist-hud-strip`, `#hud-faiss-val`, `#hud-vector-val`, `#hud-llm-engine-val` | removed | Backend state is shown by `#engine-status-badge` (masthead) and the Engine row in preferences; corpus facts by the evidence strip. `updateHudFromHealth()` is deleted. |
| `#hero-3d-stage`, `#spatial-canvas-wrapper`, `#spatial-hero-canvas`, 3D controls, tooltip | kept | Same IDs, now inside `figure.atlas-stage` with a DOM legend (`#atlas-legend-list`). |
| `section#recruiter-marquee`, `#recruiter-marquee-track` | removed | The ticker gave tier and salary bands (for example "Super Dream • ₹24–30 LPA") for nine companies that are not in the 2026 snapshot. It also called the 226 alumni resumes "verified benchmark profiles across industry leaders". The sourced recruiter ranking is in `#placement-snapshot`. |
| — | added | `section#evidence`: panel A (alumni corpus, from `GET /api/corpus-summary`) and panel B (2026 snapshot, from `placement_snapshot_2026.json`), each with its own source line. |

## Data access

| Before | After |
|---|---|
| `fetch('/data_manifest.json')`: the full manifest, which names two degraded documents | `GET /api/corpus-summary`: counts, embedding facts and per-archetype totals keyed by cluster id; no file or student names (`loadCorpusSummary()`) |
| `appState.dataManifest` | `appState.corpusSummary` |

## Process rail and placement snapshot

| Removed / changed | Status | Replacement |
|---|---|---|
| `ol.steps-grid > li.step-card` (how it works) | replaced | `ol.process-rail > li.process-step`: horizontal rail with connectors, a 2×2 grid on tablets, a vertical timeline on phones. Step copy no longer calls the corpus "placed alumni". |
| `.snapshot-source-ribbon` | replaced | `.source-line` with `[data-snapshot]` slots (source, date, batch) filled from the JSON file |
| `.snapshot-kpi-card ×6` | replaced | `dl.kpi-band > .kpi`. The IDs `kpi-total-offers`, `kpi-unique-employers`, `kpi-job-profiles`, `kpi-avg-ctc`, `kpi-median-ctc` and `kpi-highest-ctc` are kept; `kpi-note-highest` is new. |
| Hard-coded offer bands, category pills and 10 static table rows | removed | Rendered by `renderPlacementSnapshot()` from `placement_snapshot_2026.json` into `#offer-bands-list`, `#category-rank-list` and `#snapshot-table-body` (all 20 recruiters). `#bands-summary` is the chart's text equivalent. |
| `.editorial-caveat-banner` and the "339 offers" footnote | replaced | `aside.snapshot-caveats` with `#caveat-students`, `#caveat-categories` and `#caveat-no-ctc-count`, each read from the file's own caveat fields |
| — | added | `#snapshot-status`: a truthful notice if the snapshot file cannot be loaded (no hard-coded fallback copy of the data) |
| `.btn-use-context` "Target" | kept | Same class and data attributes, plus an `aria-label`; handled by one delegated listener → `useCompanyAsAnalyzerTarget()`, which fires the JD textarea's own `input` event |
| `#snapshot-company-search` | kept | `filterSnapshotTable()` hides non-matching rows with the `hidden` attribute |

## Analyzer workspace and results

All analyzer IDs used by `app.js` are kept; the changes are structural.

| Removed / changed | Status | Replacement |
|---|---|---|
| Input order: JD → PDF → lens | reordered | `ol.input-steps`: 1 Resume PDF, 2 Job description, 3 Review lens (optional), then run. A privacy and size note sits above the dropzone. |
| `.analyzer-form-card.neu-card.spatial-tilt-card`, `.analyzer-results-card.neu-card.spatial-tilt-card`, `.specular-glare` | replaced | `.workspace-panel` (no tilt or glare on forms or reports; `init3DCardTilt()` now targets only small showcase cards) |
| "Demo Mode:" checkbox in the card header | restyled | Same `#demo-mode-toggle`, inside a labelled `.demo-switch` with `#demo-mode-note`; when demo mode is on, the whole input card is outlined in ochre |
| `label[for="persona-select-container"]` (pointed at a div) | fixed | `#persona-group-label` + `aria-labelledby` on the radiogroup |
| `input[name="persona_option"]` (JS) vs `name="executive_persona"` (HTML) | **bug fixed** | The JS now reads `executive_persona`, so the selected lens is sent (`selected_persona_id`) and the chip shows `.active`. Before this, every analysis sent `auto`. |
| "Direct endpoint: POST /analyze on http://127.0.0.1:8000" | removed | A hard-coded host note, wrong on any deployment |
| Tabs "In-Doc Tailoring" / "Voice Coach" | renamed | "Resume Tailoring" / "Career Coach" (IDs unchanged) |
| Empty state "Ready for Placement Benchmarking" + `.btn-glass-shimmer` | replaced | "Your report will appear here" + `.btn-secondary`. `enableDemoAndRun()` now loads a sample JD when the field is empty; before, the one-click demo failed validation. |
| Score banner "Placement Alignment Score — evaluated against successfully placed alumni patterns" and the decorative award tile | replaced | "Alignment score — how closely the resume's evidence matches this job description. Not a hiring probability." |
| Confetti on analysis completion | removed | A diagnostic report is not a celebration. `triggerConfetti()` remains for the interaction showcase button. |

## Career Genome and Company directory

| Removed / changed | Status | Replacement |
|---|---|---|
| `div.archetype-chip-card[onclick]` ×5 (not keyboard reachable) | replaced | `#archetypes-selector-grid` is a `role="tablist"` of `button.archetype-tab[role="tab"]` with roving `tabindex`; arrow keys, Home and End move the selection; `#archetype-detail-panel` is the `tabpanel` |
| — | added | `#genome-field-strip`: each archetype's share of the corpus. A share-of-whole chart is valid here because K-Means puts each record in exactly one cluster. |
| "Distinguishing Technical Competencies (TF-IDF Grounded)" | relabelled | "Representative skills (curated)". Nothing in the repo links these lists to TF-IDF output; `label_clusters.py` only prints keywords for a person to read. |
| Archetype names in `archetypesDatabase` | sourced | `getArchetypeLabel()` prefers the official label from `/api/corpus-summary` (for example "General CS & Software Development") |
| Comparison modal inline `onchange` and a "Key differentiator" row that showed one illustrative role | replaced | Delegated `change` listener; rows: records in corpus, representative skills (curated), typical roles (illustrative) |
| `.company-card` grid with tier pills ("Super Dream") and category labels | replaced | `table.company-table` (stacked cards below 760 px): company, offers, profiles, highest CTC, source chip, actions. Tier and category labels are no longer shown as facts. |
| Filters "Super Dream (₹20+ LPA)", "Dream (₹10–20 LPA)", "Product & Tech", "FinTech", "Automotive & Core" | replaced | Filters on sourced attributes only: All, In the 2026 snapshot, Highest CTC ≥ ₹20 LPA (reported). Each button carries `aria-pressed`. |
| Sort "Placement Tier" | replaced | Sorts on offers, highest reported CTC, job profiles, or name; companies absent from the snapshot sort last |
| — | added | `#company-results-count` (live region) |
| Company modal | restructured | "From the 2026 placement snapshot" (facts, or "Not in this snapshot excerpt" with the excerpt's real list sizes) kept apart from "Practice material — unverified" (skills, sample rounds) |
| Modal titles (styled `div`s) | replaced | `h2.modal-title` "Company details" / "Compare two archetypes" |
| — | added | `openModal()` / `closeModal()`: focus moves to the close button, Tab is trapped inside, focus returns to the trigger. Phones get a bottom sheet. |

## Prompt Studio

| Removed / changed | Status | Replacement |
|---|---|---|
| `promptFrameworksRegistry` as the data source | demoted | `GET /api/frameworks` (`prompt_frameworks.json`) supplies names, groups, expansions, "best for", fields and scenarios. The JS entries had drifted (15 of 18 "best for" texts differed; SMART and FOCUS used different field keys). They now only supply per-field placeholders, hints and examples, matched by normalised field name, plus a labelled fallback if the registry fails. |
| Filters "Research / Goals / Tasks / Stories" (JS-only categories) | replaced | The registry's two groups (`data-cat` = group name) with `aria-pressed`; the list is grouped under sticky group labels |
| `button.framework-item-btn[onclick]` | replaced | `data-framework-id` + one delegated listener; `aria-pressed` marks the open framework |
| Switching framework reset fields to the sample (silently discarding input) | fixed | Per-framework drafts in `appState.promptStudio.drafts` (memory only, never browser storage). Fields start empty with placeholders; "Fill with an example" asks before replacing text. |
| `input.fw-field-input` | replaced | Labelled `textarea.fw-field-input` with `aria-describedby` hints, a field-letter badge, and an "n of m fields filled" counter |
| `onclick="resetFrameworkFields()"` | replaced | `#btn-fw-reset`: clears only the selected framework and its draft |
| `onclick="copyPromptToClipboard()"` and `fallbackCopy()` (reported success even when the copy failed) | fixed | `#btn-copy-prompt` → `copyText()` resolves true only when the clipboard write succeeded; failure tells the user to copy manually |
| `onclick="copyPromptAndOpenAnalyzer()"` "Copy & Jump to Resume Matcher" | replaced | `#btn-prompt-to-coach` "Use as Career Coach lens": sets `#coach-framework-select`, opens the Career Coach tab and scrolls to it, a defined destination for a framework (pasting a prompt into the JD field was not) |
| Recommendation box inline `onclick` buttons | replaced | `data-load-framework` delegation; the text names the expansion and the alternative's "best for" from the registry |
| `div#prompt-preview-code[role=textbox]` | replaced | `pre#prompt-preview-code` (focusable, labelled) |

## Interaction section, FAQ and footer

| Removed / changed | Status | Replacement |
|---|---|---|
| "All Possible Hover Buttons Laboratory" full section (8 large samples + studio always visible) | compacted | "07 Interaction": a pointer to Preferences (`#btn-open-prefs` opens `#prefs-panel` and focuses its first control) plus the samples inside a collapsed `details.showcase-details`. All sample and studio IDs are kept. Sample texts no longer use the old cyber vocabulary or show a salary tier ("Super Dream (₹20+ LPA)"). |
| `.neu-card.spatial-tilt-card.reveal-spatial` studio wrapper + `.specular-glare` | replaced | `.neu-card.showcase-studio` (no tilt or reveal effect) |
| FAQ `.faq-question-btn` + JS accordion (no `aria-expanded`) | replaced | Native `details.faq-item > summary.faq-summary`; the accordion JS is removed |
| FAQ copy ("226 verified benchmark alumni resumes", "proven career archetypes", "placement alignment score") | rewritten | Five plain answers; the privacy answer discloses that the JD travels as a URL parameter and can reach access logs |
| — | added | `dl.method-notes`: corpus, snapshot, scoring and curated material, with figures filled from `[data-evidence]` / `[data-snapshot]` |
| Footer links (Home, Button Lab, …) | replaced | Wordmark line plus links matching the new navigation |

## Career Atlas (3D)

| Removed / changed | Status | Replacement |
|---|---|---|
| Old constellation module: `PLACEMENT_SKILLS_3D` (25 invented skill nodes in an invented 5-group taxonomy), central "quantum core", 350 particles, globe/radar/warp overlays, `sceneController`, a 2D canvas fallback, about 1,050 lines | replaced | `class CareerAtlas`: five clay nodes, one per K-Means archetype, sized by corpus count from `/api/corpus-summary`, on a matte paper disc. Seeded illustrative dots (≤150, ≤70 on Low detail or phones) and uniform arcs (no implied similarity weights). |
| Mode buttons Constellation / Skill Globe / Sonar Radar / Hyper-Warp + `#btn-3d-burst` | replaced | `.btn-3d-mode[data-mode]` Atlas / Orbit / Evidence map with `aria-pressed`. The particle burst is removed. |
| Continuous render loop | replaced | Render on demand: a frame runs only while easing; nothing renders while the scene is still. Paused offscreen (IntersectionObserver) and in hidden tabs; ResizeObserver; DPR ≤ 1.5 (1 on Low detail). Theme changes recolour materials in place. |
| Wheel zoom | removed | No scroll hijacking; `#btn-3d-zoom-in`, `#btn-3d-zoom-out` and `#btn-3d-reset-cam-stage` are buttons. Orbit mode captures drags (with a visible hint); Atlas keeps `touch-action: pan-y`. |
| Tooltip "Illustrative skill map — not a measured match…" | replaced | Same `#canvas-3d-tooltip`: label, record count, share of corpus, cluster id. Escape hides it. |
| `#canvas-engine-badge` "WebGL Engine • 900x460 • 25 Nodes • CONSTELLATION" | replaced | A plain caption: "Illustrative layout · cluster sizes from the alumni corpus". Renderer diagnostics are available only with `?debug3d` (`window.careerAtlas`). |
| Reduced motion hid the canvas (blank stage) | fixed | The atlas stays visible; easing becomes instant and parallax is off. |
| WebGL missing or context lost (old: blank or 2D dots) | replaced | `#atlas-fallback`: an SVG atlas of the same five clusters, still selectable, with the brief's note. `webglcontextrestored` rebuilds the scene. |
| — | added | `#atlas-evidence-card` (Evidence map: count, curated skills, link to Genome). Legend hover and focus preview the node, and `selectArchetype()` syncs the scene, legend, Genome and fallback. |
| Showcase "Spatial 3D Constellation Camera" (`#btn-3d-accelerate`, `#btn-3d-cluster-focus`, `#btn-3d-reset-cam`) and `toggle3DAcceleration` / `focusNextArchetypeNode` | removed | Duplicated the stage controls |

## Security, deployment and motion (M6 / M7)

| Removed / changed | Status | Replacement |
|---|---|---|
| LLM control hub with a public API-key form (`#llm-input-api-key` type=password, model and endpoint inputs, provider tabs, `#btn-test-llm-ping`, `#btn-activate-llm-provider`), posting to unauthenticated `/api/llm/configure` and `/api/llm/test` | removed | `#modal-llm-control-hub` is now a read-only "Analysis engine" dialog: the active engine, each provider's state as the backend reports it, and server `.env` instructions. The browser never asks for or stores a key. The endpoints still exist on the server (owner item). |
| `appState.backendBaseUrl = 'http://127.0.0.1:8000'` | removed | `apiUrl()` / `resolveApiBase()`: same origin by default, `window.CAREER_CONFIG.API_BASE_URL` for split deployments; all 8 fetches use it |
| `lucide@latest`, unversioned `marked`, `three` r128 and `canvas-confetti` without integrity | pinned | Exact versions (`lucide@1.65.0`, `marked@15.0.12`, the versions already served) with `integrity` + `crossorigin` on every third-party script |
| Missing favicon (404) | fixed | Inline SVG favicon |
| `#cyber-scanline` element | removed | No styles remained |
| Motion toggle Full ↔ Reduced (ignored later OS changes) | replaced | `#btn-motion-toggle` cycles System / Calm / Full (stored as a display preference, `career_ui_motion_v1`); System follows `prefers-reduced-motion` live. Calm clears tilt and magnetic offsets and makes the atlas static. |
| Card tilt ±9.5° | reduced | ±3.5° (brief: 2–4°); handlers re-check motion at event time |
| Voice orb: cream icon on a cream surface (invisible), `z-index: 9999` above dialogs | fixed | Forest icon on paper, `z-index: 800`, icon-only 48 px on phones |
