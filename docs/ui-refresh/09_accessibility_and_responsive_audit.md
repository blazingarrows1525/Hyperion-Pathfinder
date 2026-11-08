# UI refresh, Phase 9: accessibility and responsive audit

Automated checks run in headless Chrome 156 against the keys-off server; manual checks are screenshot reviews and
real-input walks. Labels as in [00_baseline.md](00_baseline.md). Each probe below runs in
`tests/test_ui_browser.py`; the counts are from the runs recorded in section 5.

## 1. Results against the brief's targets

| Target (brief §4) | Result | Evidence |
|---|---|---|
| No duplicate IDs, no missing JS references, buttons typed | 0 duplicates, 0 missing of 165 references, 0 untyped buttons | **[test]** `frontend_inventory.py`; **[browser]** harness static check on every capture |
| Every visible control named and wired | 242 controls; 0 unnamed (baseline 3), 0 unwired, 0 whose activation changed nothing | **[browser]** `control_census.js`, [control_inventory.json](control_inventory.json) |
| No document overflow from 320 to 1920 | 0 of 13 widths in Terra and 0 of 13 in Grove; 0 in all 63 screenshot runs of the after matrix | **[browser]** overflow sweep, `capture_redesign_matrix.sh` |
| Text contrast 4.5:1, large text 3:1 | 0 failures in all five views (page and four report tabs) at 1440 and 375, both themes. Baseline: Terra 7 at 1440 and 3 at 375, Grove 4 at 1440 | **[browser]** `contrast_scan.js` |
| Non-text contrast 3:1 (field edges, switch state) | 0 failures of 12 visible fields and the demo switch, both themes. Previous stylesheet: 12 fields at 1.69 to 1.93:1 | **[browser]** `contrast_scan.js` edge check |
| Targets: minimum 24 x 24, aim 44 x 44 | Phones (320, 375, 430): all 134 controls reach 44 px. Tablet and desktop with a mouse (768, 1440): 0 under 24 px without a WCAG exception (10 inline text links use the inline exception); 70 and 76 compact controls under 44 px. Coarse pointers at any width get the 44 px block. | **[browser]** `target_sizes.js` |
| Keyboard | A real Tab walk with a report on screen reaches the end of the page; every stop is visible, has a focus indicator and moves forward; Shift+Tab goes back; no trap. Dialogs trap and return focus; Escape closes popovers, menus and dialogs; report tabs use arrows, Home and End | **[browser]** `keyboard_walk.js`, `navigation_and_data.js`, `tailoring.js` |
| 200% text | Usable at 1920, 1440, 768, 375 and 320: no overflow, no clipped control text, no overlapping masthead | **[browser]** `text_and_modes.js` |
| Forced colours | Meters, bands, focus rings, selected states and marks stay visible through system colours | **[browser]** `text_and_modes.js` (emulated `forced-colors: active`) |
| Reduced motion and Calm | No continuous motion: no Atlas ambient drift (1 frame per action, 0 at rest), no tilt, no confetti, reveals already visible, no smooth scrolling | **[browser]** `reveal_motion.js --reduced-motion`, `atlas_lifecycle.js`, `atlas_frames.js` |
| Status messages | Toasts use `role="status"`; analysis progress, Atlas selection and the evidence card use polite live regions; errors use `role="alert"` next to their field | **[source]**; **[browser]** probes read them |
| No fabricated data in the UI | Report values come from the server or are labelled illustrative in the page, copy and export; the coach invents no score | **[browser]** `workflow_live.js`, `analyzer_states.js`, `coach_and_sound.js` |

## 2. What changed for accessibility

- Names for the three unnamed controls; one `h1`, no skipped heading levels; two skip links; `main` focusable.
- The dropzone is the native file input, so Enter and Space open the picker and screen readers announce a file input
  (was a `div role="button"` with no key handler).
- Report tabs follow the tabs pattern with roving tabindex. Tailoring marks are buttons named by category and the
  marked words, differ by underline style as well as colour, and return focus when their popover closes.
- The Atlas legend items are toggle buttons with `aria-pressed`; selection is announced in `#atlas-status`. The 2D
  fallback nodes are real buttons. The canvas has a text alternative and is never the only way to select.
- Inline errors are linked with `aria-describedby`; the analyzer never reports success for a failed run.
- 44 px targets on phones and coarse pointers; a single touch-target block after the components keeps it reliable.
- 200% text: long identifiers wrap, tables scroll inside labelled regions, the masthead collapses earlier.
- A forced-colours block; `body { overflow-x: hidden }` removed, so real overflow is found instead of hidden.
- Field and switch edges at 3:1 through `--color-border-control`.

## 3. Responsive behaviour

Breakpoints and the per-section layout are in [02](02_visual_specification.md), sections 4 and 7. Reviewed in
screenshots at 320, 375, 768 and 1440 in both themes, including every dialog and sheet at phone width **[browser]**.
Fixed in that pass: the voice button covering the tailoring sheet's Close button, the coach's framework picker
running past its panel, the coach answer's narrow column, the archetype comparison wider than its dialog, the
evidence card covering the Atlas, the company filter's ragged rows ([01](01_source_and_interaction_audit.md),
items 18 and 22).

## 4. Remaining gaps

| Gap | Why | Next action |
|---|---|---|
| No screen reader pass (NVDA, JAWS, VoiceOver, TalkBack) | **[blocked]** not available in this environment | Walk the analyzer, report tabs, tailoring popover and Atlas legend with NVDA and VoiceOver |
| No real phones, tablets or touch | **[blocked]**; phone layouts are emulated widths with a mouse | Check the bottom sheets, the Atlas drag in Orbit and the 44 px block on a real phone and an iPad |
| Windows High Contrast | **[inferred]** from emulated `forced-colors`; not seen in a real high-contrast theme | One pass in Windows contrast themes |
| Speech recognition | **[blocked]** headless Chrome has no microphone; the probe checks states and messages with a stub | One real dictation in Chrome and Edge |
| Smallest text | Some hints and badges are 0.65 to 0.7 rem (about 10.4 to 11.2 px). Not a WCAG failure, but small | Consider 0.75 rem as the floor |
| Desktop targets | Compact controls under 44 px with a mouse (meets the 24 px minimum) | Acceptable per the brief's "where practical"; revisit if usage shows touch laptops |
| Text in the 3D canvas labels | Node labels are HTML over the canvas; when the stage is narrower than 720 px they hide and the legend carries the names | None needed; noted for completeness |

## 5. Test runs behind these numbers

See [10](10_performance_and_3d_lifecycle.md#test-runs) for the commands and the exact pass counts of the browser
suite and the Python suite.
