// Workflow A of the UI brief against a real backend: a synthetic one-page PDF (no personal
// data) analyzed once per reviewer lens, with the page reconciled against the structured
// report the server returned, then copy, export and storage checked.
// Needs a server in deterministic mode (provider keys unset), for example:
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440 --no-shots --eval-file scripts/ui_probes/workflow_live.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const visible = (el) => Boolean(el) && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const press = (el) => (innerWidth < 768 ? __real.tapEl(el) : __real.clickEl(el));
const flat = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
document.documentElement.style.scrollBehavior = 'auto';
window.confirm = () => true;

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
  'Worked on various data pipelines and assisted with testing.',
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
  + 'Preferred: AWS, CI/CD, Kafka.';

// Copy and export are observed, not performed.
let copied = null;
if (navigator.clipboard) navigator.clipboard.writeText = (text) => { copied = text; return Promise.resolve(); };
let exported = null;
const realCreate = URL.createObjectURL;
URL.createObjectURL = (blob) => { exported = blob; return realCreate.call(URL, blob); };
HTMLAnchorElement.prototype.click = function click() {}; // no real download

const input = $('resume-file-input');
const dt = new DataTransfer();
dt.items.add(new File([makePdf(RESUME)], 'synthetic_candidate.pdf', { type: 'application/pdf' }));
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
const jd = $('jd-textarea');
jd.value = JD;
jd.dispatchEvent(new Event('input', { bubbles: true }));

const summary = [];
const LENSES = ['auto', 'director_ai_research', 'principal_sde', 'cloud_infrastructure_director'];
for (const lens of LENSES) {
  const radio = document.querySelector(`input[name="executive_persona"][value="${lens}"]`);
  const chip = radio.closest('.persona-chip') || radio.closest('label');
  chip.scrollIntoView({ block: 'center' });
  await sleep(80);
  await press(chip);
  await sleep(80);
  check(`${lens}: the lens is selected`, radio.checked && appState.executiveReview.selectedPersonaId === lens, appState.executiveReview.selectedPersonaId);

  const before = appState.reportData;
  const t0 = performance.now();
  $('btn-analyze-submit').scrollIntoView({ block: 'center' });
  await sleep(60);
  await press($('btn-analyze-submit'));
  for (let i = 0; i < 240 && !(appState.analyzer.status === 'complete' && appState.reportData !== before); i++) {
    if (appState.analyzer.status === 'error') break;
    await sleep(250);
  }
  const ms = Math.round(performance.now() - t0);
  await sleep(400);
  const report = appState.reportData;
  const ok = appState.analyzer.status === 'complete' && report && report !== before;
  check(`${lens}: the analysis completes`, ok, `${appState.analyzer.status} after ${ms} ms`);
  if (!ok) { summary.push({ lens, status: appState.analyzer.status, ms }); continue; }

  check(`${lens}: no alert is shown`, !visible($('analyzer-alert-card')) || !flat($('analyzer-alert-card')), flat($('analyzer-alert-card')).slice(0, 80));
  check(`${lens}: the report is labelled live, not illustrative`, !/illustrative/i.test(flat($('provenance-tag'))), flat($('provenance-tag')));
  check(`${lens}: the ring shows the server's score`, flat($('mini-score-val')) === String(report.overall_score), `${flat($('mini-score-val'))} vs ${report.overall_score}`);
  const breakdown = report.score_breakdown || [];
  const sum = Math.round(breakdown.reduce((s, b) => s + b.points_earned, 0) * 10) / 10;
  check(`${lens}: the components add up to the score`, Math.abs(sum - report.overall_score) <= 1, `${sum} vs ${report.overall_score}`);
  const meterText = [...document.querySelectorAll('[id^="meter-val-"]')].map(flat).join(' ');
  check(`${lens}: every component's points are on the page`, breakdown.every((b) => meterText.includes(`${b.points_earned}`)), meterText);

  const review = report.persona_review;
  check(`${lens}: the server returned a review`, Boolean(review));
  if (review) {
    if (lens !== 'auto') check(`${lens}: the review uses the chosen lens`, review.persona_id === lens, review.persona_id);
    check(`${lens}: the page names the reviewer the server used`, flat($('exec-persona-title')) === review.persona_title, `${flat($('exec-persona-title'))} vs ${review.persona_title}`);
    const steps = flat($('exec-priorities-list'));
    check(`${lens}: next steps show the server's expected impact`, (review.strategic_priorities || []).every((p) => steps.includes(p.action) && (!p.expected_impact || steps.includes(p.expected_impact))), steps.slice(0, 160));
    const doubts = flat($('exec-skepticism-list'));
    check(`${lens}: doubts show what is missing and what to add`, (review.skepticism_points || []).every((s) => (!s.missing_evidence || doubts.includes(s.missing_evidence)) && (!s.suggested_action || doubts.includes(s.suggested_action))), doubts.slice(0, 160));
  }

  const markups = report.resume_markups || [];
  check(`${lens}: each markup is a span in the tailoring view`, document.querySelectorAll('#document-text-container [data-markup-id]').length === markups.length, `${document.querySelectorAll('#document-text-container [data-markup-id]').length} of ${markups.length}`);
  const skills = report.matched_skills || [];
  check(`${lens}: matched skills appear in the evidence panel`, skills.every((s) => flat($('skill-evidence-groups')).includes(s.canonical)), skills.map((s) => s.canonical).join(', '));

  copied = null;
  copyAnalysisToClipboard();
  await sleep(60);
  check(`${lens}: copy gives the live report`, copied && !/^Illustrative/.test(copied) && copied.length > 200, (copied || '').slice(0, 60));
  exported = null;
  exportAnalysisReport();
  await sleep(60);
  const exportedText = exported ? await exported.text() : '';
  check(`${lens}: export says it is a live analysis and carries the score`, /Live analysis of the uploaded resume/.test(exportedText) && exportedText.includes(`${report.overall_score}/100`), exportedText.slice(0, 120));

  summary.push({ lens, ms, score: report.overall_score, persona: review && review.persona_id, markups: markups.length, matched: skills.map((s) => `${s.canonical}:${s.evidence_status}`).join(' ') });
}

// One live question to the coach, with the report as context.
switchResultsTab('pane-career-coach');
await sleep(80);
const transcriptBefore = $('coach-chat-transcript').children.length;
$('coach-query-input').value = 'What is the biggest gap in this report?';
await press($('btn-send-coach-msg'));
for (let i = 0; i < 80 && $('coach-chat-transcript').children.length < transcriptBefore + 2; i++) await sleep(250);
await sleep(400);
const reply = flat($('coach-chat-transcript').lastElementChild);
check('the coach answers a question about the live report', reply.length > 40 && !/did not respond/.test(reply), reply.slice(0, 140));
check('the coach invents no score', !/\b(\d{2})\s*\/\s*100\b/.test(reply) || reply.includes(`${appState.reportData.overall_score}/100`), reply.slice(0, 140));

const allowed = new Set(['career_ui_theme_v2', 'career_ui_motion_v1', 'resume_checker_mode', 'resume_checker_theme']);
const stored = Object.keys(localStorage);
check('local storage holds display preferences only', stored.every((k) => allowed.has(k)), stored.join(', '));
const storedText = stored.map((k) => localStorage.getItem(k)).join(' ') + Object.keys(sessionStorage).map((k) => sessionStorage.getItem(k)).join(' ');
check('no resume or job description text is stored', !/Synthetic Candidate|Backend Software Engineer|FastAPI serving/.test(storedText));

URL.createObjectURL = realCreate;
const analyzeEntry = performance.getEntriesByType('resource').find((e) => e.name.includes('/analyze'));
return {
  checks,
  summary,
  jdSentInQueryString: analyzeEntry ? /[?&]job_description=/.test(analyzeEntry.name) : null,
};
