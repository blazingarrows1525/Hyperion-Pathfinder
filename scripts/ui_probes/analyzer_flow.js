// Runs the analyzer end to end with a synthetic one-page PDF (no personal data) and
// reconciles what the page shows with the structured report the backend returned.
// Run against a server in deterministic mode (provider keys unset):
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440 --sections analyzer --tag flow --eval-file scripts/ui_probes/analyzer_flow.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const makePdf = (lines) => {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = 'BT /F1 11 Tf 50 790 Td 15 TL\n' + lines.map((l) => `(${esc(l)}) Tj T*`).join('\n') + '\nET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};
const RESUME = [
  'Synthetic Candidate', 'Software Engineer', '',
  'Experience',
  'Backend Engineer Intern at Example Labs',
  'Built REST APIs with Python and FastAPI serving 2,000 requests per minute.',
  'Containerized services with Docker and deployed them on Kubernetes.',
  'Reduced p95 latency from 180ms to 45ms by adding a Redis cache.',
  'Wrote unit tests with pytest and set up CI/CD with GitHub Actions.', '',
  'Projects',
  'Resume parser: Python, scikit-learn and PostgreSQL; processed 5,000 documents.', '',
  'Skills',
  'Python, FastAPI, Docker, Kubernetes, SQL, PostgreSQL, Redis, AWS, Git', '',
  'Education',
  'B.Tech Computer Science, 2025',
];
const JD = 'Backend Software Engineer. Required: Python, FastAPI, Docker, Kubernetes, SQL, Redis. '
  + 'Responsibilities: design REST APIs, deploy containerized services, write automated tests, monitor production systems. '
  + 'Preferred: AWS, CI/CD.';
const METERS = ['skills', 'projects', 'domain', 'metrics', 'structure'];
const readMeters = () => Object.fromEntries(METERS.map((k) => {
  const m = (document.getElementById(`meter-val-${k}`)?.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
  return [k, m ? [+m[1], +m[2]] : null];
}));

const metersBefore = readMeters();
const input = document.getElementById('resume-file-input');
const dt = new DataTransfer();
dt.items.add(new File([makePdf(RESUME)], 'synthetic_candidate.pdf', { type: 'application/pdf' }));
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
const jd = document.getElementById('jd-textarea');
jd.value = JD;
jd.dispatchEvent(new Event('input', { bubbles: true }));
appState.reportData = null;
const t0 = performance.now();
document.getElementById('btn-analyze-submit').click();
let report = null;
for (let i = 0; i < 160 && !report; i++) { await sleep(500); report = appState.reportData; }
const elapsedMs = Math.round(performance.now() - t0);
await sleep(1500);

const meters = readMeters();
const breakdown = report && Array.isArray(report.score_breakdown) ? report.score_breakdown : [];
const analyzeEntry = performance.getEntriesByType('resource').find((e) => e.name.includes('/analyze'));
const out = {
  elapsedMs,
  gotReport: !!report,
  reportKeys: report ? Object.keys(report).sort() : null,
  overallScore: report ? report.overall_score : null,
  breakdown: breakdown.map((b) => `${b.key}=${b.points_earned}/${b.max_points}`),
  breakdownSum: Math.round(breakdown.reduce((s, b) => s + b.points_earned, 0)),
  metersBefore,
  meters,
  meterSum: Object.values(meters).reduce((s, v) => s + (v ? v[0] : 0), 0),
  miniScore: document.getElementById('mini-score-val')?.textContent.trim(),
  provenance: document.getElementById('provenance-tag')?.textContent.trim(),
  analyzeUrlHasJdQuery: analyzeEntry ? /[?&]job_description=/.test(analyzeEntry.name) : null,
  personaPresent: !!(report && report.persona_review),
  reportMarkups: report && report.resume_markups ? report.resume_markups.length : null,
  snapshotHasText: !!(report && report.document_snapshot && report.document_snapshot.canonical_display_text),
  storageKeys: Object.keys(localStorage),
  sessionKeys: Object.keys(sessionStorage),
};
document.getElementById('tab-btn-persona')?.click();
await sleep(600);
const persona = document.getElementById('pane-executive-review');
out.personaPaneVisible = persona ? getComputedStyle(persona).display !== 'none' : null;
document.getElementById('tab-btn-tailoring')?.click();
await sleep(800);
out.markupSpansRendered = document.querySelectorAll('[data-markup-id]').length;
document.getElementById('tab-btn-report')?.click();
return out;
