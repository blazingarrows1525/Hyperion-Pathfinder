# UI refresh, Phase 10: performance, 3D lifecycle and test runs

Labels as in [00_baseline.md](00_baseline.md).

## 1. Environment and limits

Windows 11, Chrome 156 headless over the DevTools protocol, WebGL through SwiftShader (a software renderer), Node
25.2.1, Python 3.10.11, the keys-off server on `127.0.0.1:8010`, no CPU or network throttling. These are **lab**
numbers from one machine: they show behaviour and relative cost, not real GPU speed or real networks. **[blocked]**
Field data (CrUX, RUM), real phones and real GPUs are not available here.

## 2. Load

`scripts/ui_probes/load_performance.js`, one run per width **[browser]**:

| Measure | 1440 x 900 | Baseline 1440 |
|---|---|---|
| First and largest contentful paint (LCP element: the hero `h1`) | 748 ms | 1,324 ms |
| DOMContentLoaded / load | 888 ms / 1,166 ms | |
| CLS at load | 0.0044 to 0.0057 over three runs (0.0279 before the fallback faces) | 0.0008 |
| Long tasks | 3, 702 ms in total | 3, 876 ms |
| Requests / JS heap | 14, none failing / 8.8 MB | 14 / 8.3 MB |

At 375 x 812 CLS was 0 in every run; the last full 375 load run (before the final font and border commits) gave
LCP 676 ms against a baseline of 1,440 ms. Targets: LCP 2.5 s and CLS 0.1 are met in the lab. A final 375 run of
`load_performance.js` on the last commit is still to do.

What the long tasks are: with the same page loaded, re-running each initialiser costs `lucide.createIcons` 3 ms
(102 icons), Atlas initialisation 10 to 11 ms, its first frame about 40 ms (shader compilation on the software
renderer), Genome 3 ms, the company directory 1 ms. So the load-time long tasks are first-time script evaluation and
shader compilation, not repeated work, and they finish before the largest paint. Nothing was deferred, because LCP
is the headline and it is already early.

Layout shift sources and fixes: the Atlas legend counts and corpus caption reserve their space; the provenance line
sits on its own line; local fallback faces carry measured `size-adjust` and ascent/descent overrides (DM Sans
measured per weight at interface sizes, because its optical-size axis makes it wider at 13 to 17 px than at display
sizes). What remains is a 1 px nudge of the italic headline phrase when DM Serif Display arrives.

## 3. Interaction latency

`scripts/ui_probes/interaction_latency.js`: 18 interactions with real input (legend, modes, zoom, Preferences,
theme, sample job description, typing, company search, filter and dialog, Genome tab, a framework and its fields,
report tabs, a tailoring mark, the voice panel), read through the Event Timing API that INP is built from
**[browser]**:

| Measure | 1440 | 375 |
|---|---|---|
| Worst interaction | 96 to 104 ms over the last runs | 88 to 184 ms (Atlas zoom or mode) |
| 75th percentile | 80 to 88 ms | 48 to 64 ms |
| Target (INP 200 ms) | met | met |

The slowest interactions redraw the Atlas (zoom, mode, legend) on the software renderer; their timings vary
between runs (90 to 190 ms for zoom at 375). A real GPU is expected to be well below these, **[inferred]**.

## 4. Career Atlas render lifecycle

The scheduler renders a frame only while something changes and names why (`frameReasons`: camera easing, node
selection, user-initiated orbit, ambient drift). Its state is one of `disposed`, `paused-<reason>`,
`frame-pending`, `ambient-timer-pending`, `at-rest`.

`scripts/ui_probes/atlas_frames.js` with `?debug3d` **[browser]**:

| Situation | 1440 | 375 |
|---|---|---|
| After load in Full motion: until the scheduler reaches `at-rest` | 11.4 s (the 10 s ambient window, then easing ends) | 11.4 s |
| At rest, 3 s | 0 frames | 0 frames |
| Zoom in Full motion: frames until rest | 339 frames over 11.8 s (the action re-arms the ambient window) | 305 over 11.7 s |
| Calm, at rest, 3 s | 0 frames | 0 frames |
| Zoom in Calm | 1 frame, at rest after 0.1 s | 1 frame, 0.1 s |
| Offscreen, 2 s | 0 frames, `paused-offscreen` | 0 frames |
| Baseline, Full motion, any 5 s in view | 110 to 116 frames: the loop never stopped | |

Scene size, from `renderer.info` **[browser]**: 35 draw calls, 5,864 triangles, 21 geometries, 1 texture, pixel ratio
capped (1 in this run), one canvas (baseline: 49, 28,616, 32 and 3).

Lifecycle, all checked by `atlas_lifecycle.js` **[browser]** (148 to 149 checks at 1440 and 375):

- **Pause and resume:** offscreen (IntersectionObserver), hidden tab (`visibilitychange`) and lost WebGL context
  each pause rendering; returning resumes with exactly one schedule; a request while paused stays paused.
- **Context loss:** the 2D map appears and is announced; it has all five clusters as real buttons with names and
  counts; restoring returns to 3D with the same selection, binds nothing twice, builds one scene and leaves no extra
  GPU resources.
- **Dispose:** nothing scheduled, canvas listeners removed, labels removed, safe to repeat; repeated init and
  dispose do not grow geometries, listeners, canvases or label layers.
- **Fallbacks:** a renderer that fails to start falls back to 2D; a low-memory device starts in 2D with a choice to
  load 3D.
- **Allocation:** the frame loop allocates nothing per frame **[test]** `test_atlas_frame_loop_allocates_nothing_and_rests`.
- **Touch:** in Atlas mode the page scrolls freely over the canvas; only Orbit takes the drag.

## 5. Payload

| Resource | Size (uncompressed, as served locally) |
|---|---|
| `styles.css` | 155 KB |
| `app.js` | 279 KB |
| Three.js r128 (cdnjs, SRI) | 118 KB transferred |
| marked, DOMPurify, canvas-confetti (pinned, SRI) | 13, 11 and 5 KB transferred; Lucide's size is not exposed to the page (no Timing-Allow-Origin) |
| Google Fonts stylesheet (three families, `display=swap`) | 1 KB, then the font files |
| Requests at load | 14, none failing |

No dependency was added or upgraded.

## 6. Security and privacy checks on the frontend

Pinned external scripts keep their SRI hashes **[test]** `test_ui_redesign_contracts.py`. Markdown goes through
DOMPurify (`markdownToSafeHtml`); without it, text is shown escaped. No API key entry exists in the page; browser
storage holds display preferences only **[browser]** `workflow_live.js`. User-facing errors come from an allow-list
and never show exception text, paths or provider names **[browser]** `analyzer_states.js`. The console never logs
resume or job description text **[source]**. Server-side findings are in [11](11_server_findings.md).

## Test runs

Recorded per probe during the work, against the keys-off server (latest run of each):
analyzer_inputs 39/39; analyzer_states 79/79 at 1440 and 375; coach_and_sound 36 and 37; tailoring 80 and 82;
reveal_motion 15/15 (also with reduced motion); atlas_lifecycle 149 and 148; prompt_studio 362/362; voice 56/56;
navigation_and_data 172 at 1440 and 175 at 375; target_sizes pass at 1440, 768, 430, 375 and 320; keyboard_walk
23/23; text_and_modes 23 to 26 at five widths; interaction_latency 2/2; workflow_live 67/67 at 1440 and 375;
contrast_scan 6/6 in both themes at 1440 and 375. Python: `tests/test_ui_design_system.py` 15 passed; the last full
`pytest -q` run without the browser suite gave 115 passed, 16 skipped.

**Still to run:** the whole browser suite in one pass
(`UI_BROWSER_BASE_URL=http://127.0.0.1:8010/ .venv/Scripts/python.exe -m pytest tests/test_ui_browser.py -q`)
and the full Python suite on the final commit, to record exact totals here.
