// Regression probe: the Preferences sound control and the truthfulness of the Career Coach.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/coach_and_sound.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

// --- Sound --------------------------------------------------------------------
const soundBtn = $('btn-sound-toggle');
check('sound starts off', soundBtn.getAttribute('aria-pressed') === 'false' && spatialAudio.enabled === false);
check('no audio context exists before anyone asks for sound', spatialAudio.ctx === null);
const prefsWereOpen = !$('prefs-panel').hidden;
if (!prefsWereOpen) $('btn-prefs').click();
await sleep(150);
await __real.clickEl(soundBtn);
await sleep(120);
check('activating sound turns it on', spatialAudio.enabled === true);
check('the pressed state follows', soundBtn.getAttribute('aria-pressed') === 'true');
check('the visible label follows', $('sound-toggle-label').textContent === 'On', $('sound-toggle-label').textContent);
check('the toast states the result', /sounds on/i.test($('toast-message').textContent), $('toast-message').textContent);
await __real.clickEl(soundBtn);
await sleep(120);
check('activating it again turns it off', spatialAudio.enabled === false && soundBtn.getAttribute('aria-pressed') === 'false');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
if (!$('prefs-panel').hidden) $('btn-prefs').click();

// --- Coach with no report -----------------------------------------------------
let payloads = [];
let mode = 'ok';
const ANSWER = { answer: 'As per **STAR**:\n\n- **Situation**: name the context.\n\n<img src=x onerror="window.__xss=1">', spoken_summary: 'Short.', spoken_briefing: 'Short.', evidence_refs: ['rubric_score'], persona_id: 'auto', persona_title: 'P', framework_applied: 'STAR', disclaimer: 'D' };
const realFetch = window.fetch;
window.fetch = (input, init) => {
  if (!String(input).includes('/api/coach/chat')) return realFetch(input, init);
  payloads.push(JSON.parse(init.body));
  if (mode === 'down') return Promise.reject(new TypeError('Failed to fetch'));
  if (mode === 'error') return Promise.resolve(new Response('{}', { status: 500 }));
  return Promise.resolve(new Response(JSON.stringify(ANSWER), { status: 200, headers: { 'Content-Type': 'application/json' } }));
};
const lastAssistant = () => { const all = document.querySelectorAll('#coach-chat-transcript .coach-msg-assistant'); return all[all.length - 1]; };
const ask = async (text) => { $('coach-query-input').value = text; $('btn-send-coach-msg').click(); await sleep(180); };

$('tab-btn-coach').click();
await sleep(100);
check('the coach tab opens without a report', visible($('pane-career-coach')) && visible($('coach-query-input')));
check('the score banner stays hidden with no report', !visible($('score-banner-box')));
check('the note says there is no report', /no report yet/i.test($('coach-context-note').textContent), $('coach-context-note').textContent);
$('tab-btn-persona').click();
await sleep(60);
check('other tabs explain what they need', /executive review comes with a report/i.test($('results-empty-title').textContent) && visible($('results-placeholder')));
$('tab-btn-coach').click();
await sleep(60);

await ask('How do I quantify impact?');
const first = payloads[payloads.length - 1];
check('no invented score is sent', !('current_score' in first), JSON.stringify(first.current_score));
check('no invented role is sent', !('target_role' in first), first.target_role);
check('no invented skills are sent', first.matched_skills.length === 0 && first.missing_skills.length === 0);
const body = lastAssistant().querySelector('.coach-msg-body');
check('the answer renders its Markdown', body && body.querySelector('strong') && !body.textContent.includes('**'), body && body.innerHTML.slice(0, 120));
check('the answer goes through the sanitizer', !body.querySelector('img') && !window.__xss);
check('evidence references come from the response', /rubric_score/.test(lastAssistant().textContent));

// --- Coach service down -------------------------------------------------------
for (const failure of ['down', 'error']) {
  mode = failure;
  await ask('What is my score?');
  const reply = lastAssistant().textContent;
  check(`service ${failure}: the reply says it is general guidance`, /did not respond/.test(reply) && /not an answer based on your resume/.test(reply), reply.slice(0, 100));
  check(`service ${failure}: no invented score`, !/\b84\b|out of 100|\/100/.test(reply), reply);
  check(`service ${failure}: no invented results`, !/\d+\s*%|\d+\s*ms|QPS|10,000/.test(reply), reply);
}
const select = $('coach-framework-select');
select.value = 'PAR';
select.dispatchEvent(new Event('change', { bubbles: true }));
await ask('Rewrite this bullet');
const parReply = lastAssistant().textContent;
check('a framework fallback lists the registry fields', /Problem/.test(parReply) && /Action/.test(parReply) && /Result/.test(parReply), parReply.slice(0, 160));
check('a framework fallback invents no results', !/\d+\s*%|\d+\s*ms|QPS/.test(parReply), parReply);
check('the framework badge follows the selection', /PAR/.test($('coach-framework-badge').textContent), $('coach-framework-badge').textContent);
select.value = '';
select.dispatchEvent(new Event('change', { bubbles: true }));
mode = 'ok';

// --- Coach options come from the registry ------------------------------------
const registry = appState.promptStudio.frameworks;
const options = [...select.options].filter((o) => o.value).map((o) => o.value);
check('the coach lists all 18 frameworks', options.length === 18, options.length);
check('in registry order', options.join() === registry.map((f) => f.id).join(), options.join());
check('with the registry expansion', [...select.options].filter((o) => o.value).every((o) => o.textContent.includes(registry.find((f) => f.id === o.value).expansion)));

// --- With a demo report -------------------------------------------------------
enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
check('the note says the demo report is not a real resume', /illustrative demo/i.test($('coach-context-note').textContent), $('coach-context-note').textContent);
$('tab-btn-coach').click();
await sleep(60);
await ask('How is my score?');
const demoPayload = payloads[payloads.length - 1];
check('with a report its real score is sent', demoPayload.current_score === 86, demoPayload.current_score);
check('with a report its role is sent', demoPayload.target_role === 'Data Science & AI/ML Engineer', demoPayload.target_role);
$('tab-btn-report').click();
check('the score banner shows with a report', visible($('score-banner-box')));

window.fetch = realFetch;
return { checks };
