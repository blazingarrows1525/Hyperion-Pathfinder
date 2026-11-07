# UI refresh, Phase 0: baseline

Recorded on 2026-11-07, before any product file changed. Product code at this point is identical to
`origin/feat/ui-art-direction-refresh` (`9dd644e`). Later commits on the branch add tooling and tests only.

Evidence labels used in every report in this folder:
**[source]** confirmed by reading the code, **[test]** confirmed by an automated test,
**[browser]** confirmed in a real browser, **[inferred]** concluded but not observed,
**[blocked]** not tested, with the reason.

## Repository state

| Item | Value |
|---|---|
| Branch | `feat/ui-art-direction-refresh`, tracking origin |
| Remote head | `9dd644e docs(3d): document timer-based adaptive atlas scheduling` |
| Local head before this document | `1b8732d`, three commits ahead of origin (probes, test isolation, matrix script) |
| Draft pull request | [blazingarrows1525/Hyperion-Pathfinder#1](https://github.com/blazingarrows1525/Hyperion-Pathfinder/pull/1): open, draft, mergeable, base `main` |
| Branch compared with `main` | 18 files; `styles.css` +382 lines at end of file, `app.js` +90/-1, `index.html` one line, plus docs and tests |
| Working tree | One edit belongs to the owner and is left alone: `app.py`, one trailing newline. It is never staged. |
| `git diff --check main...HEAD` | Trailing whitespace only, in `docs/ui_art_direction_refresh.md` |

## Environment

Windows 11, Python 3.10.11 (`.venv`), pytest 9.2.0 (development environment only, not in `requirements.txt`),
Node 25.2.1, Chrome 156.0.8078.49 headless over the DevTools protocol, WebGL through SwiftShader (software).
The server runs with every provider key blank on port 8010:

```bash
GEMINI_API_KEY= GOOGLE_API_KEY= OPENAI_API_KEY= GROQ_API_KEY= GITHUB_TOKEN= .venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8010
```

Results from this machine are lab numbers on a software renderer. They show behaviour and relative cost, not
real GPU speed or field data. **[blocked]** Real phones, real GPUs, and field Core Web Vitals are not available here.

## Static checks and tests

| Command | Result |
|---|---|
| `python -m pytest -q` | 99 passed, 3 warnings, 23.33 s, none failing |
| `python scripts/frontend_inventory.py` | 10 sections, 244 IDs, 0 duplicates, 151 JS ID references, 0 missing, 9 inline handlers, 0 undefined, 155 custom properties, 13 `appState` keys, 26 routes |
| `python scripts/check_colors.py` | 0 violations |

## Browser baseline

All numbers come from `scripts/ui_audit.mjs` and the probes in `scripts/ui_probes/`.

| Check | Result |
|---|---|
| Overflow, console errors, failed requests at all 13 widths | Terra 13/13 clean, Grove 13/13 clean **[browser]** |
| Reduced motion at 375 and 1440 | No overflow, no errors, no failed requests **[browser]** |
| Duplicate IDs, untyped buttons, skipped headings, positive tabindex | All 0; one `h1`; skip link present **[browser]** |
| Controls without an accessible name | 3: `#popover-rewrite-input`, `#coach-query-input`, `#neu-tactile-toggle` **[browser]** |
| Rendered text contrast, Terra | 3 failures at 375, 7 at 1440 **[browser]** |
| Rendered text contrast, Grove | 0 failures at 375, 4 at 1440 **[browser]** |
| Targets under 24 px without an exception | 6 at 375 (footer links, 23 px tall), 0 at 1440 **[browser]** |
| Targets under 44 px | 27 at 375, 36 at 1440 **[browser]** |
| Masthead side gap | 1 px at widths 1321 to 1400, and -1 px at 1181: the bar fills the viewport **[browser]** |
| Theme contract | Pre-paint and runtime agree 6/6, including legacy key migration and bad values; a theme switch keeps the renderer and the report **[browser]** |

### Load metrics (lab, one run, unthrottled, software WebGL)

| Viewport | FCP / LCP | CLS | Long tasks | Requests | JS heap |
|---|---|---|---|---|---|
| 1440 x 900 | 1324 ms | 0.0008 | 3, 876 ms total | 14 | 8.3 MB |
| 375 x 812 | 1440 ms | 0.0016 | 3, 721 ms total | 14 | 7.5 MB |

The Google Fonts stylesheet takes 802 to 980 ms and requests five families.

### Career Atlas frames

| State | Frames rendered |
|---|---|
| Full motion, first 5 s in view | 116 |
| Full motion, 5 s window starting 17 s later | 110: the loop never stops while in view |
| Calm, 3 s | 0 |
| Offscreen, 2 s | 0 |
| Scene size | 49 draw calls, 28,616 triangles, 32 geometries, 3 textures |

Frame counts measure loop activity, not GPU speed.

## Defects confirmed at baseline

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | P0 | A live report leaves the score ring at "—" and the meters at sample values. The server scored 78 with a matching breakdown, the page shows 86. 0 of 2 markups render, so tailoring is empty. `app.js` reads `deterministic_score`, `deterministic_score_breakdown` and top-level `canonical_display_text`, which the server does not send. | **[browser]** `analyzer_flow.js`, `report_truth.js` |
| 2 | P0 | Meters show the sample values 30/22/17/9/8 before any analysis, under a "Live Session" label. | **[browser]** `report_truth.js` |
| 3 | P0 | Recalculating the draft changes the ring to 59 and leaves the meters at 87. | **[browser]** `report_truth.js` |
| 4 | P0 | The Preferences sound toggle is dead on this branch and on `main`: `initSpatialAudioController` is defined and never called. | **[source]** `app.js:76`; **[browser]** census found no listener |
| 5 | P0 | A stream that ends in `Analysis Error: …` with HTTP 200 still reports "Analysis complete." and a live provenance label. | **[source]** `app.js:2560-2563`, `main.py` stream wrapper |
| 6 | P0 | Every failure is labelled "Connection to Backend Failed", including a rejected file or a server error. | **[source]** `app.js:2576-2582` |
| 7 | P0 | Cancel and a new run erase a valid earlier report. A cancelled run can also still write, because nothing ties a response to its run. | **[source]** `app.js:2410-2418`, `resetAnalyzerState` |
| 8 | P1 | The job description has no length limit while it travels in the request URL, so a long one risks a server or proxy rejection, and it can reach access logs. | **[browser]** `analyzeUrlHasJdQuery: true`; security note below |
| 9 | P1 | The dropzone is `div role="button" tabindex="0"` with no key handler, a dead tab stop around the real input. | **[browser]** census: activation has no effect |
| 10 | P1 | Results tabs respond to clicks only. | **[source]** `initResultsWorkspaceTabs` |
| 11 | P1 | Closing the markup popover does not restore focus. Marks are colour plus `title` only. | **[source]** `closeMarkupPopover` |
| 12 | P1 | SVG fallback nodes are `aria-hidden` click-only groups. | **[source]** `showAtlasFallback` |
| 13 | P1 | `promptFrameworksRegistry` is a second, hard-coded framework registry beside `/api/frameworks`. | **[source]** |
| 14 | P1 | The Atlas ambient loop never ends while the canvas is in view, which is the idle wake-up loop §8.3 warns about. | **[browser]** frames above |
| 15 | P1 | The reveal system's `MutationObserver` on `body` has no owner and re-animates rows on every filter keystroke. `.hp-reveal` content can stay invisible in print. | **[source]** `initEditorialRevealSystem` |
| 16 | P1 | `styles.css` ends with a 382-line override layer, which the brief forbids leaving in place. | **[source]** |
| 17 | P1 | Visual defects: the hero gradient clips "where" at a line break; `.container` 1360 px against masthead 1280 px; `.process-step` and `.kpi` lost their padding; `.section-index` clips "01"; blotchy body gradients on tinted sections; a synthetic HUD kicker above the headline; brand tag "Prismatic Career Intelligence"; copy still says "Resume Checker". | **[browser]** `before/` screenshots |
| 18 | P1 | Privacy copy says "Nothing is stored after the request finishes" and "In-memory privacy", which are stronger than what has been verified. | **[source]** |

The census reported 34 further "no effect" controls in its first run. They were false positives from stale
references to re-rendered rows, and the probe now re-finds the live row. Zoom and reset report no DOM effect because
they act on the camera, which the Phase 8 tests measure directly.

## Security and privacy findings

These are server-side, outside this brief's frontend scope, recorded here and not changed in visual commits.
Approval is needed before widening scope. A ready fix exists on the local branch `feat/hyperion-spatial-redesign`,
commit `c83c6ee`.

| Severity | Finding | Evidence |
|---|---|---|
| Critical | Provider admin routes are open to anyone who can reach the server. | **[source]** `main.py` |
| High | CORS allows `*` together with credentials. | **[source]** `main.py` |
| High | The job description travels in the request URL, so it can reach access logs, proxies and history. | **[browser]** `analyzer_flow.js` |
| Medium | The health manifest exposes corpus filenames. | **[source]** `main.py` |
| Medium | Corpus PII remains in git history; removal needs a history rewrite, which needs owner approval. | **[source]** repository history, `docs/implementation_audit/07_security_findings.md` |
| Medium | No rate limits on `/analyze`. | **[source]** `main.py` |
| Low | `services/workflow.py:200` uses a default score of 75 if scoring produces nothing. | **[source]** |

No code that writes uploads to disk was found in `main.py` or `services/`, and the workflow logs only node names
and counts **[source]**. That is not proof about deployment logs or hosted providers, so the privacy copy will say
only what the code supports.

## Baseline screenshots

`docs/ui-refresh/before/<width>/`, 95 JPEG files, 6.4 MB, captured by:

```bash
bash scripts/capture_redesign_matrix.sh docs/ui-refresh/before http://127.0.0.1:8010/
```

- All sections at 1440, 768 and 375.
- Hero at the other ten widths.
- Midnight Grove at 1440 and 375.
- States at 1440 and 375: selected node, preferences open, engine dialog, file selected, invalid file, streaming,
  completed report, executive review, markup popover, diff drawer, career coach, Genome selected and compare,
  company modal, two extra frameworks, WebGL fallback, report in Grove, reduced motion.

The first capture stopped at the career-coach state when the DevTools connection vanished, most likely a port
collision between concurrent harness runs. The harness now uses a browser-assigned port, and the remaining states
were captured afterwards from the same code.

## Conflict between briefs

An earlier brief chose the Prism themes, and work for it sits on the local, unpushed branch
`feat/hyperion-spatial-redesign`. The current brief requires Terra Atelier and Midnight Grove. This work follows the
current brief. In-scope fixes are cherry-picked from that branch, while its Prism wiring, server security commit and
IDE files stay there for the owner to decide on.
