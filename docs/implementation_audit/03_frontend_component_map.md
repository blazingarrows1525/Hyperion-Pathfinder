# 03. Frontend Component & Section Map

### 10 Major Semantic Sections
1. `#hero` (`.atlas-hero`): Wordmark, value proposition, 3D Career Atlas canvas (`#spatial-hero-canvas`), fallback SVG (`#atlas-fallback`), tooltip (`#canvas-3d-tooltip`), and archetype legend (`#atlas-legend-list`).
2. `#evidence` (`.evidence-strip`): Two provenance-separated panels (Panel A: Alumni Corpus [226 records]; Panel B: 2026 Placement Snapshot [8,214 offers]).
3. `#how-it-works` (`.process-section`): 4-step linear semantic process rail explaining in-memory parsing, evidence extraction, vector alignment, and actionable rewriting.
4. `#placement-snapshot` (`.snapshot-section`): KPI band (8,214 offers, 421 employers, 562 profiles, ₹7.33 LPA avg CTC, ₹6.15 LPA median CTC), band tier chart, recruiter search/sort table, category overlap disclosures.
5. `#analyzer` (`.analyzer-section`): Multipart resume dropzone (`#resume-dropzone`), native file input (`#resume-file-input`), target JD textarea (`#job-description-input`), submission controls (`#btn-analyze-resume`, `#btn-analyze-demo`), progress stream HUD (`#analysis-progress-panel`).
6. `#results-workspace` (`.results-workspace`): Tabbed report navigation (`#tab-btn-report`, `#tab-btn-persona`, `#tab-btn-tailoring`, `#tab-btn-coach`), score ring (`#report-score-ring`), rubric breakdown, executive critique cards, in-document annotation viewer (`#doc-tailoring-viewer`), STAR career coach panel (`#coach-chat-container`).
7. `#genome` (`.genome-section`): 5 K-Means archetype cards (`.archetype-card`), skill taxonomy tags, cluster distribution counts, side-by-side comparison matrix modal (`#archetype-compare-modal`).
8. `#company-intel` (`.company-section`): 421 recruiter search directory, tier filter chips, sort options, company detail modal (`#company-modal`) with verified offer stats vs unverified practice rounds.
9. `#prompt-studio` (`.prompt-studio-section`): 18-framework interactive studio, category pills, search bar, dynamic form fields generator (`#framework-dynamic-form`), live generated prompt preview, copy/coach handoff buttons.
10. `#faq` & `#buttons-lab`: Methodology questions, provenance details, tactile neumorphic laboratory (`#neu-light-well`, `#neu-light-puck`).

### Modal & Dialog Registry
- `#archetype-compare-modal`: Two-archetype comparison drawer
- `#company-modal`: Recruiter profile with offer breakdown
- `#engine-dialog`: Truthful backend engine status and capability flags
- `#resume-markup-popover`: Exact-span resume rewrite bottom sheet / popover
