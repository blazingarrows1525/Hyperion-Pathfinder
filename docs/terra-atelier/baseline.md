# Terra Atelier redesign — Milestone 0 baseline

Recorded before any Terra Atelier code change, as required by the redesign brief's M0 gate.

## 1. Checkpoint

| Item | Value |
|---|---|
| Branch | `feat/terra-atelier-frontend-redesign`, cut from `feat/m0-m1-baseline-truthfulness` |
| Base commit | `ee21929` — docs: record Milestone 1 results and newly discovered findings |
| Working tree | clean |
| Backend tests | `pytest tests/` — **78 passed** (22 s) with the server live on `:8000` (`test_live_api` needs it) |
| Frontend files | `index.html` 2,053 lines · `styles.css` 5,275 · `app.js` 5,482 · `index.original.html` (kept untouched) |

## 2. Frontend audit

Measured by `scripts/ui_audit.mjs` (headless Chrome over the DevTools protocol) and
`scripts/frontend_inventory.py`. Raw output: `baseline/audit.json`, `baseline/matrix/audit.json`,
`selector_contract_baseline.json`.

| Check | Result |
|---|---|
| Duplicate IDs | 0 (220 unique IDs) |
| Buttons without `type` | 0 |
| Inline handlers calling undefined functions | 0 (15 handler targets) |
| IDs read by `app.js` but absent from `index.html` | 0 (167 referenced) |
| Console errors on first load (375, 1440) | 0 |
| Failed requests | `404 /favicon.ico` only |
| Theme on first load | none set → dark "cyber" `:root` |
| Canvases | 2 (full-page ambient + hero constellation) |

### Horizontal overflow — fails at every required width

`document.documentElement.scrollWidth` against `clientWidth` (gate: `scrollWidth <= clientWidth`):

| Width | scrollWidth | Main offender |
|---|---|---|
| 360 / 375 / 390 / 414 / 430 | 1149 | `.nav-actions` (970 px wide) and `.aurora-blur` glows |
| 768 | 1149 | `.nav-actions`, `#btn-theme-toggle` |
| 800 / 980 / 1024 | 2063 | `#nav-links-menu` runs to x = 1143, then `.nav-actions` |
| 1280 | 2063 | `.nav-actions` x = 1143–2063 |
| 1440 | 2087 | `.nav-actions` x = 1167–2087 |
| 1920 | 2327 | `.nav-actions` x = 1407–2327 |

`body { overflow-x: hidden }` hides the scrollbar, so the overflow shows up as unreachable
controls instead: at 1440 px the Maximalist, LLM hub, theme and sound toggles render past the
right edge (`baseline/1440/hero.jpg`). At 375 px the hero copy and CTAs are cut off
(`baseline/375/hero.jpg`).

## 3. Visual baseline — why it still reads as the old product

- Near-black `#060608` canvas with a grid texture, neon cyan→magenta gradient headline and a
  blue gradient primary CTA: obsidian/cyber/blue is the dominant impression.
- Split hero: copy on the left, a narrow 153×558 px WebGL sliver plus floating telemetry cards on
  the right. It includes a large "84 SAMPLE SCORE" gauge and a "Cluster #2 Software Dev: 95% Match"
  chip, which are decorative numbers rather than data.
- The masthead carries ten links plus five control buttons in a single row.
- The light "ceramic" theme exists (`baseline/ceramic/1440/`) but is opt-in.

## 4. Screenshots

| Set | Files |
|---|---|
| Desktop 1440×900 | `baseline/1440/{hero, placement-snapshot, analyzer, genome, company-intel, prompt-studio, faq}.jpg` |
| Mobile 375×812 | `baseline/375/` (same sections) |
| Hero at the other widths | `baseline/matrix/{360,390,414,430,768,800,980,1024,1280,1920}/hero.jpg` |
| Ceramic theme | `baseline/ceramic/1440/{hero,analyzer}.jpg` |

## 5. Contract inventory

Full lists: `selector_contract_baseline.json`.

- **Sections:** `hero`, `recruiter-marquee`, `how-it-works`, `placement-snapshot`, `analyzer`,
  `genome`, `company-intel`, `prompt-studio`, `buttons-lab`, `faq`.
- **Inline handler targets (15):** `askCoachPrompt`, `closeCompanyModal`, `closeCompareModal`,
  `copyAnalysisToClipboard`, `copyPromptAndOpenAnalyzer`, `copyPromptToClipboard`,
  `enableDemoAndRun`, `exportAnalysisReport`, `focusNextArchetypeNode`, `reset3DCamera`,
  `resetFrameworkFields`, `setNeuPreviewShape`, `showToast`, `toggle3DAcceleration`,
  `triggerConfetti`.
- **CSS custom properties:** 92. The aliases consumed across the stylesheet are `--bg-*`, `--text-*`,
  `--accent-*`, `--arch-0..4-color`, `--border-*`, `--shadow-*`, `--grad-*`, `--neu-*`, `--font-*`,
  `--radius-*` and `--ease-*`. Theme switching uses `html[data-theme="ceramic"]` overrides and
  stores the choice in `localStorage['resume_checker_theme']`.
- **`appState` keys:** `motionMode`, `apiStatus`, `backendBaseUrl`, `analyzer`, `genome`,
  `companies`, `placementSnapshot`, `dataManifest`, `promptStudio`, `voice`, `executiveReview`,
  `resumeDraft`, `coachChat`, `reportData`.
- **API routes (25):** `POST /analyze`, `/api/analyze/json`, `/transcribe-audio`,
  `/api/coach/chat`, `/api/markup/recalculate`, `/api/persona-review` (+ `/persona-review`),
  `/api/annotate-resume` (+ alias), `/api/apply-rewrite` (+ alias), `/api/llm/configure`,
  `/api/llm/test`. `GET /health`, `/api/skills`, `/api/frameworks`, `/framework-list`,
  `/api/llm/providers`, `/api/placement-snapshot`, `/placement_snapshot_2026.json`,
  `/data_manifest.json`, plus static `/`, `/styles.css` and `/app.js`. `GET /` is declared twice.

## 6. Open items carried into this redesign

From `docs/frontend_baseline_audit.md` §8, plus this audit:

| Item | Where it will be handled |
|---|---|
| Overflow at all widths; nav controls unreachable at 1440 | M2 masthead rebuild, verified in M6 |
| N5 — the 3D constellation uses an invented taxonomy, not the five archetypes | M3 |
| Two render loops (ambient full-page canvas + hero) | M3 |
| Hero decorative numbers ("84 SAMPLE SCORE", "95% Match") | M2 hero rebuild |
| N7 — `appState.backendBaseUrl` hard-coded to `http://127.0.0.1:8000` | M7 |
| Client fetches the full `/data_manifest.json` (it contains two student names) | M7 — use a summary instead |
| Public API-key form in the LLM hub | M7 |
| `lucide@latest` and `marked` loaded unpinned, without SRI | M7 |
| Missing favicon (404) | M7 |

**Owner-only blockers.** These are documented and not fixable from the frontend:

- tracked corpus PII (`vector_store/benchmark_resumes.pkl`);
- student names served by `GET /data_manifest.json`;
- CORS `*` with credentials;
- unauthenticated `/api/llm/configure` and `/api/llm/test`.

## 7. Reproducing

```bash
python -m uvicorn main:app --port 8000
node scripts/ui_audit.mjs --out docs/terra-atelier/baseline --widths 1440,375
node scripts/ui_audit.mjs --out <dir> --widths 360,375,390,414,430,768,800,980,1024,1280,1440,1920 --no-shots
python scripts/frontend_inventory.py --compare docs/terra-atelier/selector_contract_baseline.json
```
