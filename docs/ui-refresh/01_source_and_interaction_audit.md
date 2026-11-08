# UI refresh, Phase 1: source and interaction audit

What the frontend contains, how each control is wired, what was broken and how it was fixed. Labels as in
[00_baseline.md](00_baseline.md): **[source]**, **[test]**, **[browser]**, **[inferred]**, **[blocked]**.
The machine-readable inventory of every control is [control_inventory.json](control_inventory.json).

## 1. Method

1. Read `index.html`, `styles.css` and `app.js` end to end, and the server routes and models they call
   (`main.py`, `models.py`, `services/`).
2. `scripts/frontend_inventory.py` for IDs, references and handlers; `scripts/check_colors.py` for colour literals;
   `scripts/css_dead_selectors.py` for rules that can match nothing.
3. A live census (`scripts/ui_probes/control_census.js`) in headless Chrome: every actionable control, its real
   listeners (`getEventListeners`), its accessible name, size and state, and what clicking it changed (DOM, focus,
   URL, scroll, a request or a download).
4. One probe per feature in `scripts/ui_probes/`, driven with real input events (the `__real` bridge in
   `scripts/ui_audit.mjs`), each reporting named checks. `tests/test_ui_browser.py` runs them.
5. Screenshot review at 320, 375, 768 and 1440 in both themes, and every dialog and sheet at phone width.

## 2. Source map

| File | Lines at baseline (`9dd644e`) | Lines now | Responsibility |
|---|---|---|---|
| `index.html` | 1,634 | 1,665 | Ten sections, masthead, dialogs, voice widget, pre-paint theme script |
| `styles.css` | 6,857 | 6,825 | Tokens, fallback faces, components, sections, responsive, touch targets, forced colours |
| `app.js` | 5,964 | 6,535 | State (`appState`), Career Atlas (Three.js r128), analyzer run lifecycle, report, tailoring, coach, Genome, companies, Prompt Studio, voice, preferences |

`frontend_inventory.py` now: 11 `section[id]` elements, 276 IDs, 0 duplicates, 165 IDs referenced from `app.js` and
0 of them missing, 8 inline handlers and 0 undefined, 156 custom properties, 13 `appState` keys, 26 routes **[test]**.
`css_dead_selectors.py`: 0 rules that can match nothing **[test]**. `check_colors.py`: 0 colour literals outside the
token layer **[test]**.

The extra script lines are mostly correctness: the analyzer run lifecycle (stages, a safe-message allow-list,
cancellation, keeping the earlier report), the tailoring revision model and diff list, the Atlas render scheduler and
its 2D fallback, and roving focus for the report tabs.

## 3. Control census

`control_census.js` at 1440 with the demo report loaded, on 2026-11-08 **[browser]**:

| Measure | Result |
|---|---|
| Actionable controls found | 242: 184 visible, 58 inside closed panels (Preferences, menus, dialogs, the voice panel, unselected tabs) |
| Without an accessible name | 0 (baseline: 3) |
| Buttons without any listener, inline handler or delegated handler | 0 |
| Clicked once and watched | 126: every one changed the DOM, focus, the URL, the scroll position, a request or a download; 0 changed nothing; 0 threw |
| Re-rendered before their turn | 25 (company cards and framework rows rebuilt by an earlier click); covered by `navigation_and_data.js` and `prompt_studio.js` |
| Not clicked by design | 33 fields, selects and labels; covered by the feature probes |
| Disabled at census time | 6, each because there is nothing to act on yet: Undo and Redo (no draft history), Undo last change (no edit), Insert (no dictated text), Pause and Stop (nothing playing) |

The 58 controls in closed panels are exercised by the probes that open those panels (`navigation_and_data.js`,
`voice.js`, `tailoring.js`, `coach_and_sound.js`).

Each control's family carries the fields of the brief's section 11: user intent, handler, state read and changed,
API request, success feedback, failure, disabled or loading state, keyboard and touch behaviour, and the probe that
covers it. Families, in page order:

| Family | Controls | Wired by | API | Covered by |
|---|---|---|---|---|
| Skip links, section links | skip links, wordmark, nav links, hero actions, footer links | native anchors; `initSectionScrollSpy` sets `aria-current` | | `keyboard_walk.js`, `navigation_and_data.js` |
| Masthead disclosures | More, phone menu, Preferences | `initMasthead`, `initDisclosure` | | `navigation_and_data.js` |
| Preferences | theme, motion, sound, 3D detail, engine | `initThemeSwitcher`, `applyMotionSetting`, `initSpatialAudioController`, `initDesignheadController`, `initLLMControlHub` | `GET /api/llm/providers` | `theme_contract.js`, `reveal_motion.js`, `coach_and_sound.js`, `atlas_lifecycle.js` |
| Career Atlas | modes, zoom, reset, legend, Genome link, 2D nodes, retry 3D | `initAtlasControls`, `initAtlasLegend`, `showAtlasFallback` | `GET /api/corpus-summary` (counts) | `atlas_lifecycle.js` |
| Placement snapshot | recruiter filter | `initPlacementSnapshot` | `GET /placement_snapshot_2026.json` | `navigation_and_data.js` |
| Analyzer inputs | demo switch, file, sample chips, job description, clear, dictate | `initResumeAnalyzer` | | `analyzer_inputs.js` |
| Review lens | four radios | `initExecutivePersonaSelector` | sent with `/analyze` | `workflow_live.js` |
| Analysis run | Analyze, Cancel | `executeAnalysis`, `cancelAnalysis` | `POST /analyze` | `analyzer_states.js`, `workflow_live.js` |
| Report | tabs, copy, export, spoken briefing | `initResultsWorkspaceTabs`, `copyAnalysisToClipboard`, `exportAnalysisReport`, `initSpeechSynthesisController` | | `navigation_and_data.js`, `analyzer_states.js`, `voice.js` |
| Tailoring | marks, popover, undo, redo, diff, rescore, export draft | `initResumeTailoringController` | `POST /api/markup/recalculate` | `tailoring.js` |
| Career coach | chips, framework lens, dictate, question, Ask | `initCareerCoachController` | `POST /api/coach/chat` | `coach_and_sound.js`, `workflow_live.js` |
| Career Genome | tabs, use sample JD, compare, comparison pickers | `initCareerGenome` | | `navigation_and_data.js` |
| Company directory | search, filters, sort, details, use sample JD | `initCompanyIntelligence` | | `navigation_and_data.js` |
| Prompt Studio | scenarios, search, categories, frameworks, fields, example, reset, copy, send to coach, retry | `initPromptStudio` | `GET /api/frameworks` | `prompt_studio.js` |
| Control samples | Open preferences, samples, light puck | `initInteractionLab`, `initNeumorphicWorkbench` | | `navigation_and_data.js`, `target_sizes.js` |
| FAQ | five `<details>` | native | | `keyboard_walk.js` |
| Dictation | orb, panel, destination, language, transcript, record, insert, discard | `initVoiceAssistantController` | browser speech recognition | `voice.js` |

## 4. Defects found and fixed

Severity: P0 breaks a core workflow or misleads the user about a result; P1 a feature or accessibility failure;
P2 a smaller defect; P3 polish. Every fix has a regression check; most of them were also run against the previous code and failed there.

| # | Sev | Defect | Root cause | Fix (commit) | Regression check |
|---|---|---|---|---|---|
| 1 | P0 | A live report showed sample scores; ring at "—"; 0 tailoring spans | The page read fields the server does not send (`deterministic_score`, top-level `canonical_display_text`) | Read `overall_score`, `score_breakdown`, `document_snapshot`; never show sample values outside demo (`c594e77`) | `test_report_contract.py`, `workflow_live.js` |
| 2 | P0 | Clicking the dropzone did nothing (the "cannot upload a PDF" report) | A `div role="button"` sat over the input with no handler | The dropzone is the native file input; drop lands on it (`e15d63a`) | `analyzer_inputs.js` (file chooser opens on real click and Space) |
| 3 | P0 | A stream ending in `Analysis Error: …` with HTTP 200 reported success | Success was assumed once the stream ended | Explicit run states; failure text recognised; safe messages from an allow-list (`7aa4d41`) | `analyzer_states.js` |
| 4 | P0 | Cancel or a failed run erased the earlier report; a cancelled run could still write | No run identity; reset before validation | `startAnalysisRun` / `isCurrentRun`; the report changes only after validation (`7aa4d41`) | `analyzer_states.js` |
| 5 | P0 | The coach stated a score of 84 and invented metrics | Fallback text was hard-coded | Payload uses report values only; fallback is labelled general guidance (`28bb708`) | `coach_and_sound.js` |
| 6 | P0 | The sound toggle did nothing | `initSpatialAudioController` was never called | Called at start-up (`28bb708`) | `coach_and_sound.js` |
| 7 | P0 | Applying a suggestion pasted the advice into the resume; recalculation always sent `rev_0` and the wrong job description | Rewrite field held the critique; revision and JD not tracked | Real replacements only, placeholders refused, revisions numbered, the report's JD used (`07622d4`) | `tailoring.js` |
| 8 | P0 | The dictation panel never became visible while the microphone could start | The drawer toggled a class its CSS ignored | `hidden` attribute and `aria-expanded`; closing always stops listening (`8521e23`) | `voice.js`, `navigation_and_data.js` (aria-expanded must match visibility) |
| 9 | P1 | The Atlas rendered continuously while in view (about 22 frames a second at rest) | An unbounded ambient loop | Render scheduler: frames only while something changes; bounded ambient window; pause offscreen, hidden tab, lost context (`b360e31`) | `atlas_lifecycle.js`, `test_ui_design_system.py` |
| 10 | P1 | Reveal re-animated rows on every filter keystroke; content could stay invisible in print | A `MutationObserver` on `body` | Reveal only static panels below the fold, once (`07622d4`) | `reveal_motion.js` |
| 11 | P1 | A second, hard-coded framework registry beside `/api/frameworks` | Duplicate data | One registry from the API; the client keeps only samples and field hints (`1727c4d`) | `prompt_studio.js`, `test_prompt_framework_coverage.py` |
| 12 | P1 | Text contrast failures (Terra 7 at 1440, 3 at 375; Grove 4 at 1440) | Muted text on tinted wells | Component colours and token use (`028f78e`) | `contrast_scan.js` (both themes) |
| 13 | P1 | No forced-colours support; 200% text overflowed; `body { overflow-x: hidden }` hid real overflow | Missing rules; overflow hidden instead of fixed | Forced-colours block, wrapping rules, overflow removed (`6cadc25`) | `text_and_modes.js`, overflow sweep |
| 14 | P1 | Targets under 24 px on phones; under 44 px widely | Component sizes | One touch-target block after the components (`c11880e`) | `target_sizes.js` |
| 15 | P1 | The report's next steps never showed the expected effect or acceptance condition, and ignored the rank | Client read `expected_improvement`; the server sends `expected_impact` | Server field names, ordered list, labelled details (`16684b7`) | `analyzer_states.js` |
| 16 | P1 | A reviewer's doubts dropped "missing evidence" and "what to add" | Fields not rendered | Rendered with labels (`36faa0f`) | `analyzer_states.js` |
| 17 | P2 | A stray `}` made the browser drop the next rule | Leftover from an earlier edit | Removed; unused tilt and float rules removed (`35131d3`) | `test_stylesheet_braces_balance` |
| 18 | P2 | Phone: the voice button covered the tailoring sheet's Close; coach picker overflowed; comparison wider than its dialog | Stacking context of the page wrapper; fixed widths | `cc30e69` | `tailoring.js`, `coach_and_sound.js`, `navigation_and_data.js` |
| 19 | P2 | Layout shift from late data and font swap (CLS 0.028 at 1440) | Unreserved space; fallback fonts with other metrics | Reserved space; metric-matched fallback faces per weight (`8ef657f`, `38556c8`, `ed84a4b`) | `interaction_latency.js` (CLS under 0.1) |
| 20 | P2 | Field and switch edges below 3:1 | Borders used the decorative strong border | `--color-border-control`; a dark knob when off (`68040c8`) | `contrast_scan.js` edge check |
| 21 | P2 | A failed engine status request left "Checking…" on screen; the celebration sample did nothing in Calm without saying why | No failure branch | Explicit unavailable status; a toast in Calm (`06b2371`) | `navigation_and_data.js` |
| 22 | P2 | In Evidence map mode the evidence card covered the selected archetype on desktop and the whole scene on phones; a phone coach answer had about 150 px of width | The card was positioned over the stage; nested paddings | The card sits between stage and legend; phone padding reduced (`8ea0a9a`) | `atlas_lifecycle.js`, `coach_and_sound.js` |

The baseline also listed visual defects (clipped gradient text, mismatched container widths, lost padding, a synthetic
HUD kicker, stale product names) and privacy copy stronger than the code supports. These were fixed in the masthead,
hero and material commits (`1b63121`, `028f78e`) and are visible in the screenshot pairs.

## 5. Selector and DOM migration

API routes, request and response keys, event names and preference keys are unchanged **[test]**
`test_selector_contract_holds`. DOM changes, for anyone styling or scripting the page:

| Before | Now |
|---|---|
| `.chapter-tag`, `.chapter-badge` above the headline | Removed; `.hero-kicker` |
| `#resume-dropzone` with `role="button"`, `tabindex` and `.neu-dropzone` | A plain container; the native `#resume-file-input` covers it |
| `.atlas-legend-item` as links | Buttons with `aria-pressed`; one `.atlas-legend-link` opens Genome |
| `.atlas-toolbar` inside `#spatial-canvas-wrapper` | Inside the figure, above the stage |
| `#atlas-evidence-card` inside the wrapper | Beside it; new live region `#atlas-status` |
| `#canvas-engine-badge` on the canvas | In the figcaption, with `.atlas-provenance` on its own line |
| `#coach-query-input` an `<input>` | A `<textarea>`: Enter asks, Shift+Enter adds a line |
| Report tabs directly in the bar | `.results-tabs` (`role="tablist"`) inside `.results-tab-bar`; roving tabindex |
| `#coach-framework-badge` always visible | Hidden unless a lens is chosen |
| Comparison table | Explicit table roles; stacked per attribute below 480 px |
| New IDs | `analysis-progress-panel`, `analysis-progress-title`, `analysis-progress-detail`, `analysis-progress-elapsed`, `analysis-stage-list`, `analysis-stream-preview`, `analysis-report-body`, `score-banner-box`, `results-empty-title`, `results-empty-desc`, `coach-context-note`, `diff-summary`, `diff-change-list`, `btn-diff-undo`, `popover-rewrite-box`, `popover-error`, `popover-rewrite-hint`, `resume-file-hint`, `skill-evidence-panel`, `skill-evidence-context`, `skill-evidence-groups`, `skill-evidence-title`, `mini-score-of`, `exec-lens-note`, `snapshot-empty`, `neu-tactile-toggle-name`, `atlas-status` |
| Functions | `parseAndHydrateStructuredReport` became `readStructuredReport` + `hydrateStructuredReport`; `resetAnalyzerState` and `resetAnalyzerButtons` became the run lifecycle (`startAnalysisRun`, `endAnalysisRun`); `generateGroundedCoachReply` became `coachFallbackReply`; `initSpatialScrollReveals` removed |
| Removed CSS | The 382-line override layer, the Prism themes, `.card-3d-tilt`, `.spatial-tilt-card`, `@keyframes spatialFloat`, and rules that matched nothing (`css_dead_selectors.py` reports 0) |

Browser storage holds display preferences only: `career_ui_theme_v2`, `career_ui_motion_v1`, `resume_checker_mode`,
and a one-time read of the legacy `resume_checker_theme`. No resume, job description, transcript or report text is
stored **[browser]** `workflow_live.js`.

Kept on purpose: four native `confirm()` prompts before replacing typed text (accessible and simple), and eight inline
`onclick` handlers on sample buttons and report actions, all defined **[test]** `frontend_inventory.py`.

## 6. Historical reports

| Report | Status now |
|---|---|
| `docs/frontend_baseline_audit.md` | Stale. Describes the page before this branch's fixes. Its defect list is superseded by section 4. |
| `docs/terra_atelier_frontend_redesign_report.md` | Partly stale. Its Terra and Grove direction holds; its claims of verified behaviour predate the defects in section 4. |
| `docs/implementation_audit/03_frontend_component_map.md` | Stale: component names and the dropzone, tabs and legend structure changed (section 5). |
| `docs/implementation_audit/04_state_and_event_map.md` | Stale: the analyzer states and tailoring revisions changed (section 4, items 3, 4, 7). |
| `docs/implementation_audit/07_security_findings.md` | Still valid, and extended by [11_server_findings.md](11_server_findings.md). |
| `docs/implementation_audit/08_accessibility_findings.md` | Stale: superseded by [09](09_accessibility_and_responsive_audit.md). |
| `docs/implementation_audit/09_visual_baseline.md` | Stale: superseded by `docs/ui-refresh/before/` and `after/`. |
| `docs/implementation_audit/12_decisions_and_risks.md` | Partly stale: the Prism decision is superseded by the current brief (see [02](02_visual_specification.md), section 1). |
| `docs/ui_art_direction_refresh.md` | Rewritten as the summary of this branch, pointing to these reports. |
