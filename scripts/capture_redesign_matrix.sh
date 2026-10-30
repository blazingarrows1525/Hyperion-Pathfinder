#!/usr/bin/env bash
# Regenerates the Terra Atelier "after" screenshot matrix (brief §19.2).
# Needs the backend on http://127.0.0.1:8000 and Chrome or Edge installed.
#   bash scripts/capture_redesign_matrix.sh [out_dir]
set -euo pipefail
OUT="${1:-docs/terra-atelier/after}"
AUDIT="node scripts/ui_audit.mjs --out $OUT"

# Layout matrix at the seven review viewports, default Terra theme
$AUDIT --widths 1440,1280,1024,800,768,390,375 \
  --sections hero,placement-snapshot,analyzer,genome,company-intel,prompt-studio

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
state file-selected analyzer "$PDF"
state streaming analyzer "enableDemoAndRun(); await new Promise(r => setTimeout(r, 1200));"
state report analyzer "$DEMO_DONE"
state executive-review pane-executive-review "$DEMO_DONE document.getElementById('tab-btn-persona').click();"
state markup-popover pane-interactive-tailoring "$DEMO_DONE document.getElementById('tab-btn-tailoring').click(); document.querySelectorAll('.doc-markup-span')[1].click();"
state diff-drawer pane-interactive-tailoring "$DEMO_DONE document.getElementById('tab-btn-tailoring').click(); document.querySelectorAll('.doc-markup-span')[1].click(); document.getElementById('popover-apply-btn').click(); document.getElementById('btn-toggle-diff').click();"
state career-coach pane-career-coach "$DEMO_DONE document.getElementById('tab-btn-coach').click();"
state genome-selected genome "selectArchetype(1);"
state company-modal company-intel "setCompanyFilter('in-snapshot'); openCompanyModal('google');"
state prompt-rhodes prompt-studio "window.confirm = () => true; selectFramework('RHODES'); fillFrameworkExample();"
state webgl-fallback hero-3d-stage "cleanup3DScene(); showAtlasFallback('Interactive 3D is unavailable in this browser; the career map remains available in 2D.');"
state engine-dialog hero "document.getElementById('btn-llm-control-hub').click();"
state grove hero,placement-snapshot,analyzer "" "--theme grove"
state reduced-motion hero "" "--reduced-motion"
