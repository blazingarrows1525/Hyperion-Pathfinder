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
