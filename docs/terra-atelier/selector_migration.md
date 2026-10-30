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
