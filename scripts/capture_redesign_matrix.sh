#!/usr/bin/env bash
# Regenerates the UI screenshot matrix (viewports and states of the UI brief, section 15.1).
# Needs a keys-off server and Chrome or Edge:
#   GEMINI_API_KEY= GOOGLE_API_KEY= OPENAI_API_KEY= GROQ_API_KEY= GITHUB_TOKEN= #     .venv/Scripts/python.exe -m uvicorn main:app --port 8010
#   bash scripts/capture_redesign_matrix.sh [out_dir] [url]
set -euo pipefail
OUT="${1:-docs/ui-refresh/after}"
URL="${2:-http://127.0.0.1:8010/}"
AUDIT="node scripts/ui_audit.mjs --url $URL --out $OUT"
SECTIONS=hero,evidence,how-it-works,placement-snapshot,analyzer,genome,company-intel,prompt-studio,faq

# Layout: every section at desktop, tablet and phone; the hero at the other widths of the matrix
$AUDIT --widths 1440,768,375 --sections $SECTIONS
$AUDIT --widths 1920,1280,1024,980,800,430,414,390,360,320 --sections hero
# Midnight Grove
$AUDIT --widths 1440,375 --sections $SECTIONS --theme grove --tag grove

DEMO_DONE="enableDemoAndRun(); await new Promise(r => setTimeout(r, 7000));"
PDF="const lines = ['Sample Candidate - Software Engineer', 'Skills: Python, FastAPI, SQL, Docker, AWS'];
const stream = 'BT /F1 11 Tf 50 760 Td 16 TL ' + lines.map(l => '(' + l + ') Tj T*').join(' ') + ' ET';
const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
let pdf = '%PDF-1.4\n'; const offs = [];
objs.forEach((o, i) => { offs.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
const x = pdf.length;
pdf += 'xref\n0 6\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
const dt = new DataTransfer(); dt.items.add(new File([pdf], 'sample_candidate_resume.pdf', { type: 'application/pdf' }));
const input = document.getElementById('resume-file-input'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
document.querySelector('.btn-preset-chip[data-preset=google]').click();"

state() { # tag, sections, eval, [extra flags]
  $AUDIT --widths 1440,375 --tag "$1" --sections "$2" --eval "$3" ${4:-}
}

state selected-node hero-3d-stage "selectArchetype(2);"
state prefs-open hero "document.getElementById('btn-prefs').click();"
state engine-dialog hero "document.getElementById('btn-llm-control-hub').click();"
state file-selected analyzer "$PDF"
state invalid-file analyzer "const dt = new DataTransfer(); dt.items.add(new File(['not a pdf'], 'notes.txt', { type: 'text/plain' })); const input = document.getElementById('resume-file-input'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));"
state streaming analyzer "enableDemoAndRun(); await new Promise(r => setTimeout(r, 1200));"
state report analyzer "$DEMO_DONE"
state executive-review pane-executive-review "$DEMO_DONE document.getElementById('tab-btn-persona').click();"
state markup-popover pane-interactive-tailoring "$DEMO_DONE document.getElementById('tab-btn-tailoring').click(); document.querySelectorAll('.doc-markup-span')[1].click();"
state diff-drawer pane-interactive-tailoring "$DEMO_DONE document.getElementById('tab-btn-tailoring').click(); document.querySelectorAll('.doc-markup-span')[1].click(); document.getElementById('popover-apply-btn').click(); document.getElementById('btn-toggle-diff').click();"
state career-coach pane-career-coach "$DEMO_DONE document.getElementById('tab-btn-coach').click();"
state genome-selected genome "selectArchetype(1);"
state genome-compare genome "selectArchetype(1); openArchetypeComparisonModal(1);"
state company-modal company-intel "setCompanyFilter('in-snapshot'); openCompanyModal('google');"
state prompt-rhodes prompt-studio "window.confirm = () => true; selectFramework('RHODES'); fillFrameworkExample();"
state prompt-race prompt-studio "window.confirm = () => true; selectFramework('RACE'); fillFrameworkExample();"
state webgl-fallback hero-3d-stage "cleanup3DScene(); showAtlasFallback('Interactive 3D is unavailable in this browser; the career map remains available in 2D.');"
state report-grove analyzer "$DEMO_DONE" "--theme grove"
state reduced-motion hero,analyzer "" "--reduced-motion"
