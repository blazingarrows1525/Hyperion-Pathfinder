# Terra Atelier frontend redesign — report

Implements the Terra Atelier redesign brief on top of the audited M0/M1 truthfulness baseline. Each
claim below points to a screenshot, a test, a measurement or a commit. Nothing here was taken from a
README or a commit message without checking it.

## 1. Branch and commits

| | |
|---|---|
| Branch | `feat/terra-atelier-frontend-redesign` (local; not pushed, not merged) |
| Base | `ee21929` (tip of `feat/m0-m1-baseline-truthfulness`) |
| Code HEAD described here | `a806600`. This report and the screenshot matrix are committed on top of it. |

| Commit | Milestone | Subject |
|---|---|---|
| `4695cbd` | M0 | docs: capture Terra Atelier redesign baseline |
| `ddf4c27` | M1 | feat(ui): add Terra Atelier and Midnight Grove tokens |
| `38c261f` | M2 | feat(ui): rebuild masthead and Career Atlas hero |
| `9b3f9ca` | M2 | feat(ui): redesign placement snapshot and data story |
| `4d03d16` | M2/M5 | feat(ui): rebuild analyzer and results workspace surfaces |
| `a82aabe` | M2 | feat(ui): redesign genome and company intelligence |
| `782062e` | M2 | feat(ui): redesign 18-framework Prompt Studio |
| `9e9f408` | M2 | feat(ui): compact interaction showcase, methodology FAQ and footer |
| `5fbefc9` | M3 | feat(3d): upgrade Career Atlas scene and accessible controls |
| `bef9b74` | M7/M6 | fix(security): remove public API-key form, relative API base, pinned CDN with SRI |
| `19f9a03` | M5 | test(ui): add redesign regression and workflow coverage |
| `cf94d59` | M5 | fix(analyzer): readable demo stream that stops on cancel |
| `8fcb26c` | M6 | fix(a11y): AA contrast for small text and reflow at 200% text size |
| `a806600` | M6 | fix(ui): open the resume annotation popover as a bottom sheet on phones |

## 2. Files changed

`git diff --stat ee21929..8fcb26c`, excluding screenshots: 10 files, +7,885 / −6,852 lines. `a806600` then adds 16 lines of CSS.

| File | Why |
|---|---|
| `styles.css` (5,275 → 6,170 lines) | Token system for Terra and Grove. About 600 colour literals migrated by context and 35 "ceramic" patch rules deleted. New CSS for every rebuilt section; dead rules for removed markup pruned. |
| `index.html` (2,053 → 1,582 lines) | Every section restructured (§4). Inline style attributes fell from 354 to 152, with no colour literals left in them. Scripts pinned with SRI. Favicon added. |
| `app.js` (5,482 → 5,517 lines) | Theme and motion controllers and the palette helper. Masthead, atlas legend and evidence strip. Data-driven snapshot, Genome, directory and Prompt Studio. The new `CareerAtlas` scene replaces about 1,050 lines of the old constellation. Read-only engine dialog, `apiUrl()`, accessible dialogs, six bug fixes (§7). |
| `main.py` (+28) | One additive route: `GET /api/corpus-summary` (§8) |
| `tests/test_ui_design_system.py`, `tests/test_ui_redesign_contracts.py`, `tests/test_feature_api.py` | 17 new tests (§12) |
| `scripts/ui_audit.mjs`, `scripts/frontend_inventory.py`, `scripts/check_colors.py`, `scripts/capture_redesign_matrix.sh` | Dependency-free audit tooling: headless screenshots, overflow and console checks, the selector contract, the colour lint and the screenshot matrix |
| `docs/terra-atelier/` | Baseline, before/after screenshots, `selector_migration.md` (every changed ID, with its replacement) |

`index.original.html` is untouched (`git diff ee21929..HEAD -- index.original.html` is empty).

## 3. The Terra Atelier visual identity

- **Palette.** Warm paper (`#F3EFE6` canvas, `#FFFCF6` surfaces) and ink `#262438`. Accents are
  forest (primary action), terracotta, ochre, lagoon and orchid. Sections alternate paper, sage
  (snapshot), lilac (Prompt Studio) and alternate paper (Genome, Methodology). The obsidian `#060608`
  canvas and the cyan/blue/violet neon are gone from the default: compare `baseline/1440/hero.jpg`
  with `after/1440/hero.jpg`.
- **Type.** DM Serif Display for headings and large numbers, DM Sans for UI and body, JetBrains Mono for
  data. Weight synthesis is disabled so the serif is never fake-bolded.
- **Midnight Grove.** An aubergine and forest night mode (`#201E2B`, mint `#80C9A9`), not black
  and electric blue (`after/1440/*.grove.jpg`).
- **Material language.** Editorial base, with tactile (inset/raised) treatment only on controls and wells.
  Glass is used only for the sticky masthead, dialogs and the atlas overlays. Clay appears on the atlas
  nodes and the process tiles. One light direction throughout. Card tilt is limited to 3.5°.

## 4. Structural layout changes

| Area | Before | After |
|---|---|---|
| Masthead | One row: 10 links + 5 toggles + CTA; overflowed at every width, with controls off-screen at 1440 | Wordmark, 5 primary links + "More", a status chip, one Preferences popover, one CTA; a drawer below 1080 px |
| Hero | Split copy / 153 px WebGL sliver, "84 sample score" gauge, "95% Match" chip, cyber HUD | Full-width editorial headline, lede, disclaimer and two CTAs, above a wide Career Atlas stage with a DOM legend of the five archetypes |
| Evidence | — | Two separate source panels (alumni corpus · 2026 snapshot), each with its own source line |
| Recruiter marquee | Ticker with unsourced salary tiers, for companies absent from the data | Removed |
| How it works | Four stacked cards | Numbered process rail: a timeline on phones |
| Snapshot | Dark KPI cards and duplicated static numbers | KPI band, bars with a text summary, a ranked category list, all 20 recruiters and data-driven caveats |
| Analyzer | JD first, then PDF; tilt on forms; persona bug | Ordered steps (PDF → JD → lens), privacy note before upload, demo mode clearly flagged, a calm report surface |
| Genome | Click-only `div` cards and "TF-IDF grounded" claims | Corpus field strip and an accessible tab list. Skills labelled curated. |
| Companies | Card grid with tier pills and salary-band filters | Table that becomes cards on phones; filters and sorts on sourced fields only; a dialog that separates facts from practice material |
| Prompt Studio | JS copy of the registry, typed data wiped on switch | Registry-driven; per-framework drafts kept; honest copy; coach handoff |
| Button lab | Full-width section with eight large samples | A compact "Preferences and control samples" section; the samples sit in a collapsed `<details>` |
| FAQ | Accordion that overclaimed ("verified", "proven") | Source notes beside five rewritten questions in native `<details>` |

The full selector-level record is in `docs/terra-atelier/selector_migration.md`.

## 5. Theme tokens and migration

- Semantic tokens (`--color-canvas … --color-focus`) are set per theme in `html[data-theme="terra"]` and
  `html[data-theme="grove"]`. Channel tokens (`--tint-rgb`, `--shade-rgb`, `--forest-rgb`, …) produce
  translucent tints. The legacy aliases components still read (`--bg-*`, `--text-*`, `--accent-*`,
  `--neu-*`, `--shadow-*`) resolve to the semantic tokens, so existing selectors kept working.
- Archetype accents are keyed by cluster id: 0 forest, 1 orchid, 2 terracotta, 3 lagoon, 4 ochre
  (`--arch-N-color`; asserted in `test_archetype_accents_are_keyed_by_cluster_id`).
- Literals were migrated by context:
  - white text on a surface → ink; white text on an accent fill → on-accent;
  - white overlays → ink tint;
  - neon glows → soft rings.

  Hex/rgb literals in `styles.css` fell from 697 to 94. All 94 are in the token layer or are white
  shadow highlights; `scripts/check_colors.py` reports 0 outside the token layer. THREE hex
  literals fell from 65 to 5 (white light colours and the transparent clear colour).
- Storage: `career_ui_theme_v2` (`ceramic → terra`, `cyber → grove`; the legacy key is removed once).
  `<html data-theme="terra">` plus a pre-paint script avoids a flash of the wrong theme. A theme
  switch recolours the 3D materials in place without resetting the analyzer (verified live: same
  renderer object, node colour `#1e6655 → #80c9a9 → #1e6655`).

## 6. 3D Career Atlas: architecture and data mapping

- **One renderer** (Three.js r128, as before). `class CareerAtlas` replaces a 25-node constellation
  built on an invented taxonomy. Canvases on the page: 2 → 1.
- **Data mapping.**
  - Five clay nodes, one per K-Means cluster id, labelled and sized from `GET /api/corpus-summary`:
    17 / 53 / 88 / 31 / 37 records.
  - Up to 150 seeded illustrative dots (70 on phones or Low detail), never individual alumni.
  - Uniform arcs between neighbouring clusters: no similarity weight is implied.
- **Modes.**
  - Atlas (default): page scroll stays free on touch.
  - Orbit: drag with a visible hint, clamped rotation, inertia stops within roughly 30 frames.
  - Evidence map: dims the other clusters, frames the selection, and shows its count and curated
    skills.
  - Zoom and reset are buttons; there is no wheel hijacking and no particle burst.
- **Sync.** Node click, the legend, the Genome tabs and the SVG fallback share one selection.
  Legend hover and focus preview a node. The tooltip shows label, count, share and cluster;
  Escape hides it.
- **Lifecycle.**
  - Renders on demand.
  - Pauses offscreen (IntersectionObserver) and in hidden tabs.
  - ResizeObserver; DPR ≤ 1.5 (1 on Low detail).
  - `webglcontextlost` shows the SVG fallback and `webglcontextrestored` rebuilds the scene.
  - Full disposal on teardown.

  All of this was verified live: context loss and restore, fallback selection, reduced motion,
  teardown and re-init. See `after/*/hero-3d-stage.webgl-fallback.jpg`.

## 7. Existing features preserved, and how they were tested

Every analyzer ID used by `app.js` was kept. `frontend_inventory.py --compare` reports 0 IDs read by
the JS but missing from the HTML, 0 duplicate IDs and 0 undefined inline handlers. Manual workflow
runs in the in-app browser against the live backend (deterministic local engine):

| Workflow | Result |
|---|---|
| Upload a synthetic PDF + sample JD + "Principal SDE" lens → live `/analyze` | Report streamed. The request carried `selected_persona_id=principal_sde`, and the Executive Review rendered that persona. |
| Validation | Wrong type, >10 MB, empty JD and missing file each show field errors |
| Cancel mid-stream | UI returns to idle and the stream stops (after fix `cf94d59`) |
| API unreachable (`CAREER_CONFIG.API_BASE_URL` set to a closed port) | "Connection to Backend Failed" with a demo option |
| One-click illustrative demo | Loads a sample JD; provenance "Illustrative Demo Output"; score ring 86 matches the report |
| Resume Tailoring | 5 spans; popover; apply → rev_1; undo → rev_0; redo → rev_1; diff drawer; draft export `resume_tailored_rev_1.md`; recalculation against the backend (re-scored 59/100, fresh spans) |
| Report copy / export | `resume_analysis_report_demo.md` |
| Career Coach | The STAR lens reply is structured as STAR; the badge shows "STAR Active" |
| Snapshot | All 20 recruiters rendered from JSON; filter; "Target" handoff fills the JD through the textarea's own input event |
| Genome | Arrow, Home and End keys; comparison dialog with focus restore |
| Companies | Snapshot filter (5 of 10); CTC ≥ ₹20 LPA (Amazon, Microsoft, Google); sort; empty state; Cisco shows "Not in this snapshot excerpt"; Tab trap; focus restore |
| Prompt Studio | 18 frameworks from the API; drafts survive switching; scoped reset; example fill; scenario recommendation; coach handoff |
| Theme | Legacy `cyber` → grove migration; toggle; 3D recoloured in place; no console errors |

Bugs found and fixed along the way (all pre-existing):

1. The persona radios were named `executive_persona`, but the JS read `persona_option`, so every
   analysis sent `auto`.
2. "Try the illustrative demo" failed validation unless a JD had already been typed.
3. The demo annotation offsets had drifted, so every demo Apply failed.
4. The demo stream appended every fifth character.
5. Cancel did not stop the demo stream.
6. Prompt Studio discarded typed text when switching framework.
7. The copy fallback reported success even when it failed.
8. The voice orb's icon was invisible (cream on cream) and the widget sat above dialogs.

## 8. API contracts touched

- **Added:** `GET /api/corpus-summary` returns counts, embedding facts and per-archetype totals keyed
  by cluster id, with no degraded-document list and no names. Covered by
  `test_corpus_summary_is_privacy_safe`. It lets the browser stop downloading `/data_manifest.json`,
  which names two degraded documents.
- **No existing route changed.** The frontend no longer calls `/api/llm/configure`, `/api/llm/test` or
  `/data_manifest.json`. Those routes still exist on the server (§14).

## 9. Screenshot matrix

Before: `docs/terra-atelier/baseline/` (1440 and 375 for all sections; hero at the other widths).
After: `docs/terra-atelier/after/<width>/`. Regenerate with `bash scripts/capture_redesign_matrix.sh`.

| View | Before | After |
|---|---|---|
| Hero, 1440 | `baseline/1440/hero.jpg` | `after/1440/hero.jpg` |
| Hero, 375 | `baseline/375/hero.jpg` | `after/375/hero.jpg` |
| Hero at 1280 / 1024 / 800 / 768 / 390 | `baseline/matrix/<w>/hero.jpg` | `after/<w>/hero.jpg` |
| Snapshot, analyzer, Genome, companies, Prompt Studio, 1440 and 375 | `baseline/<w>/<section>.jpg` | `after/<w>/<section>.jpg` (also at 1280 / 1024 / 800 / 768 / 390) |

States from §19.2, captured at 1440 and 375 as `after/<w>/<section>.<state>.jpg`:

1. initial hero (Terra): `hero.jpg`
2. selected node: `hero-3d-stage.selected-node.jpg`
3. snapshot with source note: `placement-snapshot.jpg`
4. analyzer empty: `analyzer.jpg`
5. file selected: `analyzer.file-selected.jpg`
6. streaming: `analyzer.streaming.jpg`
7. completed report: `analyzer.report.jpg`, `pane-executive-review.executive-review.jpg`, `pane-career-coach.career-coach.jpg`
8. markup popover and diff drawer: `pane-interactive-tailoring.markup-popover.jpg`, `pane-interactive-tailoring.diff-drawer.jpg`
9. Genome with a selected archetype: `genome.genome-selected.jpg`
10. company filter and dialog: `company-intel.company-modal.jpg`
11. Prompt Studio, CLEAR and RHODES: `prompt-studio.jpg`, `prompt-studio.prompt-rhodes.jpg`
12. Grove: `hero.grove.jpg`, `placement-snapshot.grove.jpg`, `analyzer.grove.jpg`
13. reduced motion: `hero.reduced-motion.jpg`
14. WebGL fallback: `hero-3d-stage.webgl-fallback.jpg`
15. engine status dialog: `hero.engine-dialog.jpg`

## 10. Accessibility results

- **Overflow.** `scrollWidth == clientWidth` at all 12 required widths (360, 375, 390, 414, 430, 768,
  800, 980, 1024, 1280, 1440, 1920). The baseline overflowed at every one of them, at 1149–2327 px.
- **200% text** (root font size): no horizontal overflow at 1280 or at 375 (`8fcb26c`).
- **Interaction states:** the 15 states of the screenshot matrix (dialogs, popover, report tabs,
  fallback, Grove, reduced motion) also pass the overflow check at 375 and 1440. The annotation
  popover became a bottom sheet on phones in `a806600`.
- **Contrast.** WCAG ratios computed from the tokens. All body and UI text pairs are ≥ 4.5:1 in both themes: for
  example, ink on paper is 13.15 (Terra) and 14.46 (Grove), muted on inset is 4.87 / 7.79, and
  on-accent on forest is 6.64 / 8.87. Terracotta (3.55:1 in Terra) is used only for large headline text;
  small terracotta text uses the darker ink (7.05:1).
- **Keyboard and focus.** The tab order follows the visual order, with no positive `tabindex`
  anywhere: skip link → wordmark → Snapshot / Analyzer / Genome / Companies / Prompt Studio → More →
  Preferences → CTA → hero actions → Atlas / Orbit / Evidence map → zoom → reset (171 tab stops in
  total). Skip link. Focus-visible ring in `--color-focus`. The masthead drawer and
  Preferences close on Escape and return focus. Dialogs move focus to their close button, trap Tab and
  restore focus (verified). The Genome tabs follow the tabs pattern. The FAQ and showcase use native
  `<details>`. Filters expose `aria-pressed`. The JD field is `aria-required`.
- **Non-pointer equivalents.** The atlas legend and Genome tabs do everything a node click does. The SVG
  fallback keeps selection. Tooltips are not the only route to any information.
- **Motion.** System / Calm / Full, where System follows `prefers-reduced-motion` live. Calm makes the
  atlas static and removes tilt and magnetic offsets. Nothing autoplays sound (sound is off by
  default).
- **Not verified:** a screen-reader pass with NVDA or VoiceOver, and real microphone permission flows
  (only API presence was checked).

## 11. Performance (measured)

Environment: headless Chrome via `scripts/ui_audit.mjs`, SwiftShader WebGL, device scale factor 1,
local FastAPI on 127.0.0.1:8000, HTTP cache disabled.

| Metric | 1440×900 | 375×812 |
|---|---|---|
| DOMContentLoaded / load | 1,108 / 1,407 ms | 672 / 924 ms |
| Requests (after favicon fix: 0 failed) | 13 | 13 |
| JS heap | 7.9 MB | 8.6 MB |
| Canvases | 1 | 1 |
| Atlas draw calls / triangles | 24 / 12,560 | 24 / 12,560 |
| GPU geometries / textures | 12 / 1 | 12 / 1 |
| Illustrative dots | 150 | 69 |
| Frames rendered while idle (3 s) | **0** | **0** |
| Frames for one zoom click | 33, then stops | 33, then stops |
| Offscreen | paused (`pauseReasons: offscreen`), 0 frames during interaction | same |

No FPS figure is shown anywhere in the product. Renderer diagnostics are available only with
`?debug3d` (`window.careerAtlas`).

## 12. Tests executed

- `pytest tests/` with the server live: **95 passed**, against 78 at the baseline. The 17 new tests:
  - `test_ui_design_system.py` (6): theme values, archetype keys, storage migration, colour lint, selector contract.
  - `test_ui_redesign_contracts.py` (10): no key entry, SRI on all scripts, `apiUrl()` everywhere, no
    manifest fetch, no fabricated hero numbers, persona wiring, demo offsets, registry-driven studio,
    atlas contract, motion preference.
  - `test_feature_api.py` (+1): corpus summary is privacy-safe.
- `python scripts/check_colors.py`: 0 literals outside the token layer.
- `python scripts/frontend_inventory.py --compare docs/terra-atelier/selector_contract_baseline.json`:
  0 missing, 0 duplicate, 0 undefined.
- `node scripts/ui_audit.mjs --widths 360,…,1920 --no-shots`: 0 overflow, 0 console errors and
  0 failed requests at all 12 widths.

## 13. Known limitations

- The analyzer's inner result components (Executive Review cards, the tailoring toolbar, coach chat,
  voice drawer) were re-themed through tokens, but their markup was not recomposed.
- Some legacy CSS for the neumorphic samples remains (`styles.css` is 6,170 lines). Rules for removed
  markup were pruned section by section, not across the whole file.
- Company roles, interview rounds and archetype skill lists are still curated and unverified. They are
  labelled as such, but sourced data would be better.
- Three.js stays at r128 because the brief requires compatibility.
- The deterministic local engine writes generic report text. That is backend behaviour, outside this
  UI work.

## 14. Security owner actions still required (not fixed by frontend changes)

1. **Corpus PII.** `vector_store/benchmark_resumes.pkl` (226 real names and phone numbers) is tracked
   and in the public git history. It needs a history purge and a redacted rebuild.
2. **`GET /data_manifest.json`** still serves two student names. The UI no longer needs it, so the
   route can be removed or redacted.
3. **`POST /api/llm/configure` and `/api/llm/test`** are unauthenticated. The UI no longer calls them;
   remove them or put them behind auth.
4. **CORS** is `allow_origins=["*"]` with `allow_credentials=True`.
5. **The job description is sent as a URL query parameter** (`/analyze?job_description=…`), so it can
   land in access logs. It should move into the form body (an API change).

## 15. Deployment

1. `pip install -r requirements.txt`, then run `uvicorn main:app --host 0.0.0.0 --port 8000`
   (`render.yaml` exists). FastAPI serves the UI at `/`, and the API is same-origin by default.
2. If the UI is hosted separately, define `window.CAREER_CONFIG = { API_BASE_URL: 'https://…' }` before
   `app.js`, and fix CORS (§14.4).
3. LLM (optional): set `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` or `OLLAMA_BASE_URL` in
   `.env` on the server and restart. The Engine dialog reflects the change.
4. Gate the release on `pytest tests/`, `scripts/check_colors.py`, `scripts/frontend_inventory.py --compare …`,
   and `node scripts/ui_audit.mjs --widths 360,375,390,414,430,768,800,980,1024,1280,1440,1920 --no-shots`.
5. Do not deploy publicly before the owner items in §14 are resolved or signed off.

## 16. Rollback

- The branch is unmerged. Not merging is a complete rollback.
- After a merge, `git revert` the redesign commits, or any single one; each is scoped (tokens,
  masthead/hero, snapshot, analyzer, Genome/companies, studio, showcase, 3D, security, tests,
  fixes). Do not rewrite history or touch source data.
- `GET /api/corpus-summary` is additive and safe to keep after a frontend rollback.
- Returning users of the old UI: the theme migration removed `resume_checker_theme`, so the old UI
  falls back to its default theme. This is harmless.

## 17. Why this is not the previous UI with new colours

- **The page structure is different.** The split hero became a full-width editorial hero with a wide
  atlas stage. A source-split evidence strip was added. The marquee is gone. The process became a rail,
  the snapshot a data story, Genome a tab list, and companies a table that becomes cards. The lab is
  collapsed. Compare any `baseline/1440/<section>.jpg` with `after/1440/<section>.jpg`.
- **The 3D scene shows different content.** It went from 25 invented skill nodes, a neon core and 350
  particles to the five real archetypes, sized by their real counts, with an accessible legend and a 2D
  fallback.
- **The numbers changed.** The fake 84 score, "95% Match", "94.8%", the ₹16.0 LPA archetype median
  and the unsourced salary tiers are gone. All 20 snapshot recruiters and every caveat now come from
  the JSON file.
- **The behaviour changed.** The persona selection now reaches the server. The demo works in one
  click. Apply and undo work in the demo. Cancel stops. Drafts survive. Dialogs manage focus. Motion
  follows the OS. Nothing renders while the scene is still.
- **The metrics changed.**
  - Horizontal overflow: 12 of 12 widths failed before, 0 of 12 now.
  - Colour literals outside tokens: 697 before, 0 now.
  - Canvases: 2 → 1.
  - Tests: 78 → 95.

## Acceptance scorecard (§21)

| Area | Evidence | Result |
|---|---|---|
| New visual identity | `after/1440/hero.jpg` and `after/375/hero.jpg` against `baseline/…`; `check_colors.py` | Pass |
| New page composition | §4 table; before/after screenshots of the hero and 6 sections | Pass |
| Theme system | `*.grove.jpg`; live theme toggle with in-place 3D recolour; storage migration test | Pass. Grove was reviewed on the hero, snapshot and analyzer, not on every component state. |
| Design token migration | `check_colors.py` = 0; THREE literals 65 → 5 (white lights) | Pass |
| 3D Career Atlas | `hero-3d-stage.*.jpg`; live lifecycle tests (§6); `test_career_atlas_renders_the_five_archetypes` | Pass |
| Responsive layout | 12-width sweep: 0 overflow; drawer test at 375 | Pass |
| Analyzer workflow | §7: upload, JD, stream, report, cancel, errors, export | Pass, against the deterministic engine. No LLM-backed run was possible here. |
| Report workspace | §7: report, persona, tailoring (apply/undo/redo/diff/recalc/export) and coach | Pass |
| Placement data | Snapshot rendered from JSON; caveats from the file's fields; `students_placed_count` never shown as a number | Pass |
| Company directory | Filter, sort and dialog tests (§7); "Not in this snapshot excerpt"; unverified labels | Pass |
| Prompt Studio | 18 frameworks from `/api/frameworks`; `test_prompt_studio_reads_the_registry` | Pass |
| Motion system | System/Calm/Full; no wheel or scroll hijack; reduced-motion screenshot; atlas static in Calm | Pass |
| Accessibility | Contrast table, 200% text, keyboard and dialog checks (§10) | Partial: no screen-reader pass recorded |
| Performance | §11 measurements; idle 0 frames; offscreen pause | Pass. Headless SwiftShader numbers, not a real GPU or phone. |
| Security | Key form removed; SRI; no new data exposure; §14 owner items documented | Pass for the UI. Release is blocked on the §14 owner items. |
| Deployment | §15 and §16; `apiUrl()` same-origin or configurable; pinned dependencies | Pass |
