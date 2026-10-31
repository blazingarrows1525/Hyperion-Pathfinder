# Selector & DOM ID Migration Register

**Design Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  

---

## 1. ID Invariant & Discrepancy Status
- **Unique HTML IDs:** 249 (0 duplicates).
- **JS Queried IDs:** 150 (100% resolve to valid HTML elements or dynamic JS templates).
- **Untyped Buttons:** 0 (all 90 buttons declare explicit `type="button"` or `type="submit"`).
- **Internal Anchor Links:** 9 (`#hero`, `#evidence`, `#placement-snapshot`, `#how-it-works`, `#analyzer`, `#genome`, `#company-intel`, `#prompt-studio`, `#buttons-lab`, `#faq`), all resolve cleanly.

## 2. New Elements Introduced
| New ID | Type | Parent Container | Purpose |
| :--- | :--- | :--- | :--- |
| `diagnostic-rubric-canvas` | `div` | `#pane-diagnostic-report` | Top visual canvas for deterministic rubric |
| `rubric-provenance-pill` | `div` | `.rubric-summary-header` | Trust indicator for 100-point rubric invariant |
| `rubric-meters-grid` | `div` | `.rubric-summary-card` | Grid of 5 horizontal rubric progress meters |
| `meter-val-skills` | `span` | `.rubric-meter` | Required skills coverage numerical point display (max 35) |
| `meter-fill-skills` | `div` | `.meter-bar` | Required skills coverage animated bar fill |
| `meter-val-projects` | `span` | `.rubric-meter` | Practical project evidence point display (max 25) |
| `meter-fill-projects` | `div` | `.meter-bar` | Practical project evidence animated bar fill |
| `meter-val-domain` | `span` | `.rubric-meter` | Role domain responsibilities point display (max 20) |
| `meter-fill-domain` | `div` | `.meter-bar` | Role domain responsibilities animated bar fill |
| `meter-val-metrics` | `span` | `.rubric-meter` | Quantified metrics point display (max 10) |
| `meter-fill-metrics` | `div` | `.meter-bar` | Quantified metrics animated bar fill |
| `meter-val-structure` | `span` | `.rubric-meter` | Completeness & readability point display (max 10) |
| `meter-fill-structure` | `div` | `.meter-bar` | Completeness & readability animated bar fill |

## 3. Preserved Semantic Selectors
All 150 existing selectors remain 100% backward compatible:
- Analyzer: `#upload-form`, `#resume-file-input`, `#jd-textarea`, `#btn-analyze-submit`, `#btn-cancel-request`, `#provenance-tag`, `#mini-score-val`, `#mini-progress-ring`, `#markdown-stream-output`
- Results Tabs: `#tab-btn-report`, `#tab-btn-persona`, `#tab-btn-tailoring`, `#tab-btn-coach`
- Executive Review: `#exec-persona-title`, `#exec-target-role-label`, `#exec-verdict-badge`, `#exec-reaction-summary`, `#exec-attention-list`, `#exec-skepticism-list`, `#exec-questions-list`, `#exec-priorities-list`
- Resume Tailoring: `#tailoring-doc-text`, `#tailoring-popover`, `#popover-apply-btn`, `#popover-dismiss-btn`, `#btn-undo-rewrite`, `#btn-redo-rewrite`, `#btn-recalc-markup`
- Career Genome: `#genome-archetype-tabs`, `[data-archetype-id]`, `#genome-detail-name`, `#genome-detail-count`
- Company Intel: `#company-search-input`, `#company-table-body`, `#modal-company-details`
- Prompt Studio: `#framework-grid`, `#prompt-preview-text`, `#btn-copy-prompt`, `#btn-send-to-coach`
