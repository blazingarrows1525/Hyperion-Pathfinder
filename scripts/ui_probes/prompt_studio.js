// Regression probe: every framework in the registry, end to end through the Prompt Studio.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/prompt_studio.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const state = appState.promptStudio;
window.confirm = () => true;

const registry = await (await fetch('/api/frameworks')).json();
const EXPECTED = ['CLEAR', 'SMART', 'QUEST', 'GUIDE', 'FOCUS', 'IDEA', 'RISEN', 'RHODES', 'CREATE', 'RACE', 'TAG', 'TRACE', 'CARE', 'PAR', 'STAR', 'APE', 'CRISPE', 'RTF'];
const entries = registry.frameworks;

check('the registry holds exactly the 18 frameworks', entries.length === 18 && EXPECTED.every((id) => entries.some((f) => f.id === id)), entries.map((f) => f.id).join());
check('the studio loaded them from the API', state.registrySource === 'api' && state.frameworks.length === 18, state.registrySource);
check('the two groups are the registry\'s', new Set(entries.map((f) => f.group)).size === 2 && state.frameworks.every((f) => entries.find((e) => e.id === f.id).group === f.group));
const research = entries.filter((f) => f.group === 'Research & Structured Work').map((f) => f.id).join();
const tasks = entries.filter((f) => f.group === 'Task & Response Structuring').map((f) => f.id).join();
check('research group membership', research === 'CLEAR,SMART,QUEST,GUIDE,FOCUS,IDEA,RISEN,RHODES,CREATE', research);
check('task group membership', tasks === 'RACE,TAG,TRACE,CARE,PAR,STAR,APE,CRISPE,RTF', tasks);
const guide = promptFrameworksRegistry;
check('the writing guide holds no second definition of a framework', guide.every((g) => !('name' in g) && !('expansion' in g) && !('bestFor' in g) && !('category' in g) && !('acronym' in g)));

const previewText = () => $('prompt-preview-code').textContent;
const inputs = () => [...document.querySelectorAll('#builder-fields-container .fw-field-input')];

// --- Every framework ------------------------------------------------------------------
for (const entry of entries) {
  const id = entry.id;
  const row = document.querySelector(`.framework-item-btn[data-framework-id="${id}"]`);
  check(`${id}: listed with its expansion`, row && row.textContent.includes(entry.acronym), row && row.textContent);
  row.click();
  await sleep(10);
  check(`${id}: selecting marks the row`, row.isConnected ? row.getAttribute('aria-pressed') === 'true' : document.querySelector(`.framework-item-btn[data-framework-id="${id}"]`).getAttribute('aria-pressed') === 'true');
  check(`${id}: shows the registry name`, $('builder-fw-title').textContent === entry.name, $('builder-fw-title').textContent);
  check(`${id}: shows the registry definition`, $('builder-fw-desc').textContent.includes(entry.acronym) && $('builder-fw-desc').textContent.includes(entry.best_use), $('builder-fw-desc').textContent.slice(0, 60));

  const fieldEls = inputs();
  check(`${id}: one input per registry field, in order`, fieldEls.map((el) => el.dataset.fieldKey).join('|') === entry.fields.join('|'), fieldEls.map((el) => el.dataset.fieldKey).join('|'));
  check(`${id}: every input has its label`, fieldEls.every((el, i) => document.querySelector(`label[for="${el.id}"]`)?.textContent.includes(entry.fields[i])));
  const hintOf = (el) => document.getElementById(el.getAttribute('aria-describedby') || '');
  check(`${id}: every field has visible help of its own`, fieldEls.every((el) => hintOf(el) && visible(hintOf(el)) && hintOf(el).textContent.trim().length > 8 && !hintOf(el).textContent.startsWith('Write the ')), fieldEls.map((el) => (hintOf(el) ? hintOf(el).textContent.slice(0, 18) : 'none')).join('|'));

  // Blank preview
  const blank = previewText();
  check(`${id}: a blank field is marked, never invented`, entry.fields.every((f) => blank.includes(`[${f.toUpperCase()}]: [Fill in ${f}]`)), blank.slice(0, 120));
  check(`${id}: the preview names the framework`, blank.includes(`# [${id}] ${entry.name}`) && blank.includes(entry.best_use));

  // Example fill
  $('btn-fw-example').click();
  await sleep(10);
  const filled = previewText();
  const filledEls = inputs();
  check(`${id}: the example fills every field`, filledEls.every((el) => el.value.trim().length > 0), filledEls.filter((el) => !el.value.trim()).map((el) => el.dataset.fieldKey).join());
  check(`${id}: the example reaches the preview`, filledEls.every((el) => filled.includes(`[${el.dataset.fieldKey.toUpperCase()}]: ${el.value.trim()}`)));
  const order = entry.fields.map((f) => filled.indexOf(`[${f.toUpperCase()}]:`));
  check(`${id}: the output keeps registry order`, order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), order.join());
  check(`${id}: no blank marker remains`, !filled.includes('[Fill in'));
  check(`${id}: the progress says so`, $('builder-progress').textContent === `${entry.fields.length} of ${entry.fields.length} fields filled`, $('builder-progress').textContent);

  // Typing updates the preview
  const first = filledEls[0];
  first.value = `Typed for ${id}`;
  first.dispatchEvent(new Event('input', { bubbles: true }));
  check(`${id}: typing updates the preview`, previewText().includes(`[${entry.fields[0].toUpperCase()}]: Typed for ${id}`));
  check(`${id}: the character count follows`, $('prompt-char-count').textContent === `${previewText().length.toLocaleString()} characters`, $('prompt-char-count').textContent);
}

// --- Drafts ----------------------------------------------------------------------------
const pick = async (id) => { document.querySelector(`.framework-item-btn[data-framework-id="${id}"]`).click(); await sleep(10); };
await pick('CLEAR');
check('a draft survives switching away and back', inputs()[0].value === 'Typed for CLEAR', inputs()[0].value);
await pick('RACE');
check('each framework keeps its own draft', inputs()[0].value === 'Typed for RACE', inputs()[0].value);
check('drafts stay out of browser storage', !JSON.stringify({ ...localStorage, ...sessionStorage }).includes('Typed for'));

// --- Reset -----------------------------------------------------------------------------
$('btn-fw-reset').click();
await sleep(10);
check('reset clears the active framework', inputs().every((el) => el.value === ''));
check('and marks its fields blank again', previewText().includes('[Fill in'));
await pick('CLEAR');
check('and leaves other drafts alone', inputs()[0].value === 'Typed for CLEAR');
await pick('RACE');
check('a reset framework stays clear', inputs().every((el) => el.value === ''));

// --- Cancelling an example keeps the draft ------------------------------------------------
await pick('STAR');
const starDraft = inputs().map((el) => el.value).join('|');
window.confirm = () => false;
inputs()[0].value = 'My own words';
inputs()[0].dispatchEvent(new Event('input', { bubbles: true }));
$('btn-fw-example').click();
await sleep(10);
check('declining the example keeps what was written', inputs()[0].value === 'My own words', inputs()[0].value);
window.confirm = () => true;
check('the draft before that existed', starDraft.length > 0);

// --- Copy ------------------------------------------------------------------------------
let copied = null;
let writeMode = 'ok';
const realWrite = navigator.clipboard && navigator.clipboard.writeText;
const realExec = document.execCommand;
navigator.clipboard.writeText = (text) => {
  if (writeMode === 'fail') return Promise.reject(new Error('denied'));
  copied = text;
  return Promise.resolve();
};
await pick('CLEAR');
$('btn-copy-prompt').click();
await sleep(40);
check('copy puts the exact preview on the clipboard', copied === previewText(), (copied || '').slice(0, 60));
check('copy reports success', /copied/i.test($('toast-message').textContent), $('toast-message').textContent);
await pick('RACE');
$('btn-copy-prompt').click();
await sleep(40);
check('copy says when fields are still blank', /still blank/.test($('toast-message').textContent), $('toast-message').textContent);
writeMode = 'fail';
document.execCommand = () => false;
$('btn-copy-prompt').click();
await sleep(40);
check('a failed copy says it failed', /failed/i.test($('toast-message').textContent), $('toast-message').textContent);
document.execCommand = realExec;
writeMode = 'ok';

// --- Discovery --------------------------------------------------------------------------
const search = $('framework-search-input');
const listed = () => [...document.querySelectorAll('.framework-item-btn')].map((b) => b.dataset.frameworkId);
const setSearch = (value) => { search.value = value; search.dispatchEvent(new Event('input', { bubbles: true })); };
setSearch('hypothesis');
check('search finds a framework by a field word', listed().includes('RHODES'), listed().join());
setSearch('zzzz-nothing');
check('search has an empty state', /No frameworks match/.test($('frameworks-list-scroll').textContent) && listed().length === 0);
check('an empty search leaves the form alone', inputs().length > 0);
setSearch('');
check('clearing search restores all', listed().length === 18);
const cats = [...document.querySelectorAll('.btn-framework-cat')];
cats[2].click();
await sleep(10);
check('the Tasks group shows nine', listed().length === 9 && listed().includes('RTF') && !listed().includes('CLEAR'), listed().join());
check('the group button reports its state', cats[2].getAttribute('aria-pressed') === 'true' && cats[0].getAttribute('aria-pressed') === 'false');
cats[1].click();
await sleep(10);
check('the Research group shows nine', listed().length === 9 && listed().includes('CLEAR') && !listed().includes('RTF'), listed().join());
cats[0].click();
await sleep(10);

// --- Recommendations --------------------------------------------------------------------
await pick('CLEAR');
const clearDraft = inputs()[0].value;
for (const [key, rec] of Object.entries(scenarioRecommendations)) {
  check(`recommendation ${key}: both frameworks exist`, entries.some((e) => e.id === rec.primaryId) && entries.some((e) => e.id === rec.altId), `${rec.primaryId}/${rec.altId}`);
  const chip = document.querySelector(`.btn-scenario-chip[data-scenario="${key}"]`);
  chip.click();
  await sleep(10);
  check(`recommendation ${key}: opens the framework`, state.selectedFrameworkId === rec.primaryId, state.selectedFrameworkId);
  check(`recommendation ${key}: the chip reports its state`, chip.getAttribute('aria-pressed') === 'true');
  check(`recommendation ${key}: explains itself`, $('recommendation-explanation-box').textContent.includes(rec.primaryId) && $('recommendation-explanation-box').textContent.includes(rec.altId));
}
await pick('CLEAR');
check('recommendations do not erase a draft', inputs()[0].value === clearDraft, inputs()[0].value);
$('recommendation-explanation-box').querySelector('[data-load-framework]')?.click();
await sleep(10);
check('the explanation can open its framework', state.selectedFrameworkId === scenarioRecommendations.experiment.primaryId, state.selectedFrameworkId);

// --- Coach handoff ------------------------------------------------------------------------
let coachSends = 0;
const realFetch = window.fetch;
window.fetch = (input, init) => {
  if (String(input).includes('/api/coach/chat')) {
    coachSends++;
    return Promise.resolve(new Response(JSON.stringify({ answer: 'Noted.', spoken_summary: 'Noted.', evidence_refs: [], persona_id: 'auto', persona_title: 'P', disclaimer: 'D' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  return realFetch(input, init);
};
const coachInput = $('coach-query-input');
await pick('TAG');
$('btn-fw-reset').click();
await sleep(10);
$('btn-prompt-to-coach').click();
await sleep(60);
check('handoff opens the coach', visible($('pane-career-coach')));
check('handoff sets the framework', $('coach-framework-select').value === 'TAG', $('coach-framework-select').value);
check('handoff with no draft asks for a question', /Type your question/.test($('toast-message').textContent), $('toast-message').textContent);
check('handoff focuses the question box', document.activeElement === coachInput);
check('handoff with no draft sends nothing', coachSends === 0);

await pick('STAR');
const starEntry = entries.find((e) => e.id === 'STAR');
inputs().forEach((el, i) => { el.value = i === 1 ? '' : `Value ${i} for ${el.dataset.fieldKey}`; el.dispatchEvent(new Event('input', { bubbles: true })); });
$('btn-prompt-to-coach').click();
await sleep(60);
const expected = starEntry.fields.map((f, i) => (i === 1 ? null : `${f}: Value ${i} for ${f}`)).filter(Boolean).join('\n');
check('handoff carries the filled fields, in order, in full', coachInput.value === expected, coachInput.value);
check('handoff has no placeholder text', !coachInput.value.includes('[Fill in'));
check('handoff has no header to duplicate', !coachInput.value.includes('# ['));
check('handoff sets that framework', $('coach-framework-select').value === 'STAR');
check('handoff sends nothing until asked', coachSends === 0 && /Review it/.test($('toast-message').textContent), $('toast-message').textContent);

coachInput.focus();
await __real.key('Enter', 8);
await sleep(30);
check('Shift+Enter does not send', coachSends === 0);
await __real.key('Enter');
await sleep(80);
check('Enter asks', coachSends === 1, coachSends);
check('the box empties after asking', coachInput.value === '');

coachInput.value = 'x'.repeat(2001);
$('btn-send-coach-msg').click();
await sleep(50);
check('an over-long question is refused, not truncated', coachSends === 1 && coachInput.value.length === 2001 && /over the 2,000/.test($('toast-message').textContent), $('toast-message').textContent);
coachInput.value = '';
$('coach-framework-select').value = '';
window.fetch = realFetch;

// --- Registry failure -----------------------------------------------------------------------
const framesBefore = state.frameworks;
const selectedBefore = state.selectedFrameworkId;
let registryUp = false;
window.fetch = (input, init) => {
  if (String(input).includes('/api/frameworks')) {
    return registryUp ? realFetch(input, init) : Promise.resolve(new Response('{}', { status: 503 }));
  }
  return realFetch(input, init);
};
await startPromptStudio();
await sleep(20);
check('a failed registry shows no invented list', state.frameworks.length === 0 && document.querySelectorAll('.framework-item-btn').length === 0);
check('it says so', /could not be loaded/.test($('frameworks-list-scroll').textContent) && /unavailable/i.test($('builder-fw-title').textContent));
check('copy and handoff leave with it', !visible($('btn-copy-prompt')) && !visible($('btn-prompt-to-coach')));
registryUp = true;
document.querySelector('.btn-registry-retry').click();
await sleep(400);
check('retry brings the frameworks back', state.frameworks.length === 18 && document.querySelectorAll('.framework-item-btn').length === 18);
check('and the controls', visible($('btn-copy-prompt')) && visible($('btn-prompt-to-coach')));
check('and the selection', state.selectedFrameworkId === selectedBefore, state.selectedFrameworkId);
check('and the coach list', [...$('coach-framework-select').options].filter((o) => o.value).length === 18);
window.fetch = realFetch;
if (realWrite) navigator.clipboard.writeText = realWrite;
check('the earlier framework objects were replaced, not merged', framesBefore !== state.frameworks);

return { checks };
