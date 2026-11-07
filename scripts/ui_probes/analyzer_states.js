// Regression probe: every way an analysis run can end. fetch is stubbed per scenario, so this runs
// without a provider and repeats exactly. Nothing here needs the server's analysis route.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/analyzer_states.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const alertText = () => (visible($('analyzer-alert-card')) ? $('analyzer-alert-card').textContent : '');
const fieldError = (id) => ($(id).classList.contains('visible') ? $(id).textContent : '');
const toastText = () => $('toast-message').textContent;

const REPORT = (score) => ({
  analysis_id: `a${score}`,
  overall_score: score,
  score_breakdown: [
    { key: 'required_skills', name: 'Skills', points_earned: 30, max_points: 35, detail: 'Matched 3 of 3.' },
    { key: 'project_evidence', name: 'Projects', points_earned: 20, max_points: 25, detail: 'Two projects.' },
    { key: 'domain_responsibilities', name: 'Domain', points_earned: 10, max_points: 20, detail: 'Some overlap.' },
    { key: 'metrics_density', name: 'Metrics', points_earned: 5, max_points: 10, detail: 'Three numbers.' },
    { key: 'completeness_readability', name: 'Structure', points_earned: score - 65, max_points: 10, detail: 'Fine.' },
  ],
  document_snapshot: { document_id: 'd', revision_id: 'rev_0', text_hash: 'h', canonical_display_text: 'Built APIs in Python.' },
  resume_markups: [],
});
const BODY = (score) => `## Report for run ${score}\n\nFeedback text ${score}.\n\n<!-- STRUCTURED_REPORT_START -->\n${JSON.stringify(REPORT(score))}\n<!-- STRUCTURED_REPORT_END -->`;
const streamOf = (text) => new Response(new Blob([text]).stream(), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

const realFetch = window.fetch;
let analyzeCalls = 0;
let answer = null;
window.fetch = (input, init) => {
  const url = String(input && input.url ? input.url : input);
  if (!url.includes('/analyze')) return realFetch(input, init);
  analyzeCalls++;
  return answer(init && init.signal);
};
const abortable = (signal, makeResponse, delayMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve(makeResponse()), delayMs);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
});

const input = $('resume-file-input');
const dt = new DataTransfer();
dt.items.add(new File(['%PDF-1.4'], 'candidate.pdf', { type: 'application/pdf' }));
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
$('jd-textarea').value = 'Backend engineer. Python, Docker, SQL.';
$('jd-textarea').dispatchEvent(new Event('input', { bubbles: true }));

const run = async (answerFn, settleMs = 250) => {
  answer = answerFn;
  $('btn-analyze-submit').click();
  await sleep(settleMs);
};
const idle = () => !$('btn-analyze-submit').disabled && $('btn-cancel-request').style.display === 'none' && !visible($('analysis-progress-panel'));
const reportText = () => $('markdown-stream-output').textContent;

// --- First load ---------------------------------------------------------------
check('before any run the placeholder shows', visible($('results-placeholder')));
check('the provenance label does not claim a live session', !/live/i.test($('provenance-tag').textContent), $('provenance-tag').textContent);

// --- Failures with no earlier report ------------------------------------------
await run(() => Promise.reject(new TypeError('Failed to fetch')));
check('server unreachable: says so', /could not be reached/.test(alertText()), alertText());
check('server unreachable: back to idle', idle());
check('server unreachable: placeholder returns', visible($('results-placeholder')));
check('server unreachable: button offers a retry', $('btn-analyze-text').textContent === 'Try again', $('btn-analyze-text').textContent);
check('server unreachable: no "complete" toast', !/complete|ready/i.test(toastText()), toastText());

await run(() => Promise.resolve(streamOf('Analysis Error: Could not extract text from PDF (file may be scanned or image-based).')));
check('HTTP 200 with a stream error is a failure', appState.analyzer.status === 'error', appState.analyzer.status);
check('a scanned PDF is explained beside the file field', /scanned or image-based/.test(fieldError('file-error-msg')), fieldError('file-error-msg'));
check('the failure leaves no live provenance', !/live analysis/i.test($('provenance-tag').textContent), $('provenance-tag').textContent);
check('no report was stored', appState.analyzer.streamBuffer === '');
check('focus moved to the file field', document.activeElement === input, document.activeElement?.id);

const SECRET = 'C:\\srv\\app\\main.py line 12 KeyError sk-secret';
await run(() => Promise.resolve(streamOf(`Server streaming error: ${SECRET}`)));
check('server exception text never reaches the page', !document.body.innerText.includes('sk-secret') && /problem on the server/.test(alertText()), alertText());
await run(() => Promise.resolve(streamOf(`Analysis Error: Unexpected error during PDF ingestion: ${SECRET}`)));
check('ingestion exception text never reaches the page', !document.body.innerText.includes('sk-secret'), alertText());

await run(() => Promise.resolve(streamOf('Analysis finished, but no response payload was captured.')));
check('an empty result is a failure', appState.analyzer.status === 'error' && alertText() !== '', alertText());

await run(() => Promise.resolve(streamOf('Plain text and no structured block.')));
check('a response with no structured report is a failure', appState.analyzer.status === 'error' && /usable report/.test(alertText()), alertText());
await run(() => Promise.resolve(streamOf('<!-- STRUCTURED_REPORT_START -->{not json<!-- STRUCTURED_REPORT_END -->')));
check('a broken structured report is a failure', appState.analyzer.status === 'error' && /usable report/.test(alertText()), alertText());

await run(() => Promise.resolve(new Response(JSON.stringify({ detail: 'Uploaded file is not a valid PDF document.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
check('a rejected file is reported beside the file field', /not a valid PDF/.test(fieldError('file-error-msg')), fieldError('file-error-msg'));
check('and not as a connection failure', !/could not be reached|connection/i.test(alertText() + fieldError('file-error-msg')));
await run(() => Promise.resolve(new Response('Invalid HTTP request received.', { status: 400 })));
check('an over-long URL is reported beside the job description', /long/.test(fieldError('jd-error-msg')), fieldError('jd-error-msg'));
await run(() => Promise.resolve(new Response(JSON.stringify({ detail: `Internal server error: ${SECRET}` }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
check('a 500 keeps its detail off the page', !document.body.innerText.includes('sk-secret') && /could not finish/.test(alertText()), alertText());

// --- Success ------------------------------------------------------------------
await run(() => Promise.resolve(streamOf(BODY(70))), 400);
check('a good stream completes', appState.analyzer.status === 'complete', appState.analyzer.status);
check('the alert clears', alertText() === '');
check('the score reaches the ring', $('mini-score-val').textContent === '70', $('mini-score-val').textContent);
check('the report renders', /Report for run 70/.test(reportText()), reportText().slice(0, 60));
check('the provenance is live', /live analysis/i.test($('provenance-tag').textContent), $('provenance-tag').textContent);
check('the internal JSON is not shown', !reportText().includes('STRUCTURED'));
check('the toast states the true score', /70 of 100/.test(toastText()), toastText());
check('the button label is restored', $('btn-analyze-text').textContent === 'Analyze resume');

// --- Failures must not erase that report --------------------------------------
await run(() => Promise.reject(new TypeError('Failed to fetch')));
check('a failure keeps the earlier report', appState.analyzer.streamBuffer.includes('run 70') && /Report for run 70/.test(reportText()));
check('and shows it', visible($('markdown-stream-output')) && !visible($('results-placeholder')));
check('and keeps its score', $('mini-score-val').textContent === '70');
check('and says so', /earlier report is unchanged/.test(alertText()), alertText());

await run(() => Promise.resolve(streamOf('Analysis Error: Retrieval/scoring failure: boom')));
check('a stream failure keeps the earlier report', /Report for run 70/.test(reportText()) && $('mini-score-val').textContent === '70');

// --- Cancel -------------------------------------------------------------------
await run((signal) => abortable(signal, () => streamOf(BODY(75)), 8000), 120);
check('during a run the progress panel shows', visible($('analysis-progress-panel')));
check('during a run the earlier report is out of the way', !visible($('markdown-stream-output')));
check('during a run the button is locked', $('btn-analyze-submit').disabled);
check('during a run cancel is available', visible($('btn-cancel-request')));
check('during a run the panel is marked busy', document.querySelector('.analyzer-results-card').getAttribute('aria-busy') === 'true');
check('no percentage is invented', !/\d+\s*%/.test($('analysis-progress-panel').textContent), $('analysis-progress-panel').textContent);
$('btn-cancel-request').click();
await sleep(150);
check('cancel returns to idle', idle());
check('cancel restores the earlier report', /Report for run 70/.test(reportText()) && visible($('markdown-stream-output')));
check('cancel keeps the score', $('mini-score-val').textContent === '70');
check('cancel reports it truthfully', /cancelled/i.test(toastText()) && /unchanged/.test(toastText()), toastText());
check('cancel does not look like an error', alertText() === '');
check('cancel moves focus off the hidden button', document.activeElement !== $('btn-cancel-request'), document.activeElement?.id);

// Cancel while the stream is open: the late chunk must not land.
let release;
await run(() => Promise.resolve(new Response(new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('partial '));
    release = () => { try { controller.enqueue(new TextEncoder().encode(BODY(99))); controller.close(); } catch (e) { /* cancelled */ } };
  },
}), { status: 200 })), 200);
check('mid-stream the state is streaming', appState.analyzer.status === 'streaming', appState.analyzer.status);
$('btn-cancel-request').click();
release();
await sleep(200);
check('a late chunk after cancel changes nothing', /Report for run 70/.test(reportText()) && $('mini-score-val').textContent === '70');

// A connection that dies mid-stream.
await run(() => Promise.resolve(new Response(new ReadableStream({
  start(controller) { controller.enqueue(new TextEncoder().encode('partial')); setTimeout(() => controller.error(new Error('reset')), 60); },
}), { status: 200 })), 260);
check('a dropped stream says so', /connection closed/i.test(alertText()), alertText());

// --- Stale responses ----------------------------------------------------------
// The first run is replaced by a second before it answers; only the second may land.
answer = (signal) => abortable(signal, () => streamOf(BODY(71)), 700);
$('btn-analyze-submit').click();
await sleep(50);
answer = () => Promise.resolve(streamOf(BODY(82)));
executeAnalysis();
await sleep(1100);
check('a replaced run cannot overwrite the newer one', $('mini-score-val').textContent === '82' && /run 82/.test(reportText()), $('mini-score-val').textContent);
check('only one run remains', appState.analyzer.activeRun === null);

// --- Demo ---------------------------------------------------------------------
const callsBeforeDemo = analyzeCalls;
enableDemoAndRun();
await sleep(150);
check('the demo shows its own label while it runs', /illustrative demo/i.test($('analysis-progress-title').textContent));
$('btn-cancel-request').click();
await sleep(100);
check('cancelling the demo keeps the live report', /run 82/.test(reportText()) && /live analysis/i.test($('provenance-tag').textContent));

enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
check('the demo sends nothing to /analyze', analyzeCalls === callsBeforeDemo, analyzeCalls - callsBeforeDemo);
check('the demo is labelled', /illustrative/i.test($('provenance-tag').textContent), $('provenance-tag').textContent);
check('one demo does not leave demo mode switched on', appState.analyzer.demoMode === false && !$('demo-mode-toggle').checked);

let copied = null;
const realWrite = navigator.clipboard && navigator.clipboard.writeText;
if (navigator.clipboard) navigator.clipboard.writeText = (text) => { copied = text; return Promise.resolve(); };
copyAnalysisToClipboard();
await sleep(50);
check('copied demo text is labelled as illustrative', /^Illustrative demo output/.test(copied || ''), (copied || '').slice(0, 50));
await run(() => Promise.resolve(streamOf(BODY(70))), 400);
copyAnalysisToClipboard();
await sleep(50);
check('copied live text matches the report without the JSON', /Report for run 70/.test(copied) && !copied.includes('STRUCTURED'));
check('copied live text carries no demo label', !/^Illustrative/.test(copied));
if (realWrite) navigator.clipboard.writeText = realWrite;

window.fetch = realFetch;
return { checks };
