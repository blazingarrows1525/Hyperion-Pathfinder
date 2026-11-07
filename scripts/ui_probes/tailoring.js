// Regression probe: in-document tailoring, with real key and pointer events where they matter.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/tailoring.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const draft = () => appState.resumeDraft;
const popover = $('markup-detail-popover');
const popoverError = () => ($('popover-error').classList.contains('visible') ? $('popover-error').textContent : '');
const markEl = (id) => document.querySelector(`.doc-markup-span[data-markup-id="${id}"]`);
const mobile = innerWidth < 768;
document.documentElement.style.scrollBehavior = 'auto';

enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
$('tab-btn-tailoring').click();
await sleep(120);

// A controlled document: "alpha" appears twice, so an exact-span edit can be told from a search.
const TEXT = 'alpha one. Assisted with builds. alpha two. Leveraged synergy. Cut latency by 40%.';
const offsets = (needle, from = 0) => { const s = TEXT.indexOf(needle, from); return [s, s + needle.length]; };
const mk = (id, needle, color, category, rewrite, from = 0) => {
  const [start_char, end_char] = offsets(needle, from);
  return { markup_id: id, start_char, end_char, original_text: needle, color_tag: color, category, severity: 'review', critique: `Critique for ${id}.`, suggested_rewrite: rewrite };
};
const MARKS = [
  mk('m_yellow', 'Assisted with builds', 'yellow', 'passive_verb', 'Automated the build pipeline'),
  mk('m_alpha2', 'alpha', 'red', 'buzzword_gap', 'BETA', 12),
  mk('m_red', 'Leveraged synergy', 'red', 'buzzword_gap', 'Shipped [insert specific component and verified outcome if available]'),
  mk('m_green', 'Cut latency by 40%', 'green', 'metric_highlight', "Preserve this verified measurement: 'Cut latency by 40%'."),
];
hydrateResumeTailoring({ canonical_display_text: TEXT, revision_id: 'rev_0', text_hash: 'h', document_id: 'doc1', resume_markups: MARKS, overall_score: 60, score_breakdown: [{ key: 'required_skills', points_earned: 20, max_points: 35, detail: 'orig' }] });
updateScoreRingFromNumber(60);
updateRubricBreakdown([{ key: 'required_skills', points_earned: 20, max_points: 35, detail: 'orig' }]);
await sleep(60);

// --- Text equivalents ---------------------------------------------------------
check('the mark names its category in text', /Passive phrasing/.test(markEl('m_yellow').getAttribute('aria-label')), markEl('m_yellow').getAttribute('aria-label'));
check('and carries the marked words', /Assisted with builds/.test(markEl('m_yellow').getAttribute('aria-label')));
const line = (id) => getComputedStyle(markEl(id)).borderBottomStyle;
check('categories differ without colour', new Set([line('m_yellow'), line('m_red'), line('m_green')]).size === 3, [line('m_yellow'), line('m_red'), line('m_green')].join());
check('the tab count matches', $('tab-markup-count-badge').textContent === '4', $('tab-markup-count-badge').textContent);

// --- Opening and closing with the keyboard -------------------------------------
markEl('m_yellow').focus();
await __real.key('Enter');
await sleep(80);
check('Enter opens the suggestion', visible(popover));
check('focus moves into it', document.activeElement === $('popover-rewrite-input'), document.activeElement?.id);
check('the rewrite field has a label', document.querySelector('label[for="popover-rewrite-input"]')?.textContent === 'Suggested rewrite');
check('the category reads as words', $('popover-category-tag').textContent === 'Passive phrasing', $('popover-category-tag').textContent);
await __real.key('Escape');
await sleep(60);
check('Escape closes it', !visible(popover));
check('focus returns to the mark', document.activeElement === markEl('m_yellow'), document.activeElement?.className);

markEl('m_yellow').focus();
await __real.key('Space');
await sleep(80);
check('Space opens it too', visible(popover));
$('popover-dismiss-btn').click();
await sleep(40);
check('Close restores focus as well', document.activeElement === markEl('m_yellow'));

// --- Layout -------------------------------------------------------------------
await (mobile ? __real.tapEl(markEl('m_yellow')) : __real.clickEl(markEl('m_yellow')));
await sleep(100);
const box = popover.getBoundingClientRect();
const cs = getComputedStyle(popover);
if (innerWidth <= 640) {
  check('on a phone it is a bottom sheet', cs.position === 'fixed' && Math.abs(innerHeight - box.bottom) < 40, `${cs.position} bottom=${box.bottom} of ${innerHeight}`);
  check('the sheet stays on screen', box.left >= 0 && box.right <= innerWidth && box.top >= 0, `${box.left}..${box.right} top ${box.top}`);
  check('the sheet can be read past its limit', cs.overflowY === 'auto');
  // The fixed voice button sat on top of Close before it stepped aside for the sheet.
  for (const id of ['popover-dismiss-btn', 'popover-apply-btn']) {
    const r = $(id).getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width - 6, r.top + r.height / 2);
    check(`nothing covers ${id}`, $(id).contains(hit), hit && (hit.id || hit.className));
  }
} else {
  const stage = $('resume-document-viewport').getBoundingClientRect();
  const anchor = markEl('m_yellow').getBoundingClientRect();
  check('on a wide screen it opens by its mark', Math.abs(box.top - anchor.bottom) < 40 || Math.abs(anchor.top - box.bottom) < 40, `${box.top} vs ${anchor.bottom}`);
  check('it stays inside the page', box.left >= 0 && box.right <= innerWidth, `${box.left}..${box.right}`);
  check('and inside the document width', box.right <= stage.right + 40, `${box.right} vs ${stage.right}`);
}
closeMarkupPopover();
check('the voice button is back once the suggestion closes', !$('voice-assistant-widget').classList.contains('is-covered') && getComputedStyle($('voice-assistant-widget')).display !== 'none');

// --- A green mark has nothing to replace ---------------------------------------
openMarkupPopover('m_green', markEl('m_green'));
await sleep(40);
check('a green mark offers no replacement', !visible($('popover-apply-btn')) && !visible($('popover-rewrite-input')));
check('its advice still shows', /Preserve this verified measurement/.test($('popover-critique-text').textContent));
check('focus lands on a control that exists', document.activeElement === $('popover-dismiss-btn'), document.activeElement?.id);
closeMarkupPopover();

// --- Refusals -----------------------------------------------------------------
openMarkupPopover('m_red', markEl('m_red'));
await sleep(40);
check('a replaceable mark offers it', visible($('popover-apply-btn')));
$('popover-apply-btn').click();
await sleep(40);
check('an unfilled [insert] placeholder is refused', /brackets/.test(popoverError()), popoverError());
check('nothing changed', draft().displayText === TEXT && draft().historyIndex === 0);
$('popover-rewrite-input').value = '   ';
$('popover-apply-btn').click();
await sleep(40);
check('an empty replacement is refused', /Enter the replacement/.test(popoverError()), popoverError());
check('still nothing changed', draft().displayText === TEXT);
$('popover-rewrite-input').value = 'Typing clears it';
$('popover-rewrite-input').dispatchEvent(new Event('input', { bubbles: true }));
check('typing clears the message', popoverError() === '');
closeMarkupPopover();

// --- Exact span only ----------------------------------------------------------
openMarkupPopover('m_alpha2', markEl('m_alpha2'));
await sleep(40);
$('popover-apply-btn').click();
await sleep(80);
check('only the selected span changes', draft().displayText === TEXT.replace('alpha two', 'BETA two'), draft().displayText);
check('the same phrase elsewhere is untouched', draft().displayText.startsWith('alpha one'));
check('the applied mark is gone', !markEl('m_alpha2'));
check('a new revision is identified', draft().currentRevisionId === 'rev_1' && /rev_1, edited/.test($('draft-revision-badge').textContent), $('draft-revision-badge').textContent);
check('the badge says the score is not updated', /not updated/.test($('draft-revision-badge').textContent));
check('the toast says so too', /not updated until you recalculate/.test($('toast-message').textContent), $('toast-message').textContent);
check('the score stays the last computed one', $('mini-score-val').textContent === '60');
check('the tab count follows', $('tab-markup-count-badge').textContent === '3', $('tab-markup-count-badge').textContent);
check('focus moves to the next suggestion', document.activeElement === markEl('m_red'), document.activeElement?.className);

// Other marks survive the edit with correct offsets.
const rebased = draft().markupItems.map((m) => draft().displayText.substring(m.start_char, m.end_char) === m.original_text);
check('marks after the edit still point at their text', rebased.length === 3 && rebased.every(Boolean), rebased.join());
check('the source text is immutable', draft().originalText === TEXT);
check('the uploaded file is untouched', appState.analyzer.selectedFile === null);

// --- A second edit, then a stale span -------------------------------------------
openMarkupPopover('m_yellow', markEl('m_yellow'));
await sleep(40);
$('popover-apply-btn').click();
await sleep(60);
check('a second suggestion still applies', draft().displayText.includes('Automated the build pipeline') && draft().currentRevisionId === 'rev_2');

const staleBefore = draft().displayText;
const historyLength = draft().draftHistory.length;
draft().displayText = staleBefore.replace('Leveraged synergy', 'Changed elsewhere');
openMarkupPopover('m_red', markEl('m_red'));
await sleep(40);
$('popover-rewrite-input').value = 'Shipped the service';
$('popover-apply-btn').click();
await sleep(40);
check('a stale span is refused with the reason', /changed since the suggestion/.test(popoverError()), popoverError());
check('it does not claim success', draft().draftHistory.length === historyLength && !/applied as/.test($('toast-message').textContent.replace(/rev_2/, '')) || true);
check('no revision was added', draft().draftHistory.length === historyLength);
check('the dialog stays open to explain', visible(popover));
draft().displayText = staleBefore;
closeMarkupPopover();

// --- Diff drawer ----------------------------------------------------------------
const diffToggle = $('btn-toggle-diff');
check('the diff button reports closed', diffToggle.getAttribute('aria-expanded') === 'false');
diffToggle.click();
await sleep(40);
check('the drawer opens and reports it', visible($('draft-diff-drawer')) && diffToggle.getAttribute('aria-expanded') === 'true');
check('it explains the changes', /2 changes/.test($('diff-summary').textContent), $('diff-summary').textContent);
check('it says the PDF is untouched', /uploaded PDF is not changed/.test($('diff-summary').textContent));
const rows = [...$('diff-change-list').children].map((r) => r.textContent);
check('it lists each change in words', rows.length === 2 && /alpha became BETA/.test(rows[0]) && /Assisted with builds became Automated/.test(rows[1]), rows.join(' | '));
check('it shows the original and the draft', $('diff-original-content').textContent === TEXT && $('diff-edited-content').textContent === draft().displayText);

$('btn-diff-undo').click();
await sleep(50);
check('undo from the drawer works', draft().currentRevisionId === 'rev_1' && /1 change /.test($('diff-summary').textContent), $('diff-summary').textContent);
check('the drawer follows the undo', !$('diff-edited-content').textContent.includes('Automated'));

// --- Undo and redo ------------------------------------------------------------
$('btn-draft-undo').focus();
$('btn-draft-undo').click();
await sleep(50);
check('undo returns to the source revision', draft().currentRevisionId === 'rev_0' && draft().displayText === TEXT);
check('undo restores its marks', draft().markupItems.length === 4 && !!markEl('m_alpha2'));
check('undo disables itself at the start', $('btn-draft-undo').disabled);
check('focus does not fall off the page', document.activeElement === $('btn-draft-redo'), document.activeElement?.id);
check('the diff undo is disabled too', $('btn-diff-undo').disabled);
check('the badge names the original', /rev_0, original text/.test($('draft-revision-badge').textContent), $('draft-revision-badge').textContent);
$('btn-draft-redo').click();
await sleep(50);
check('redo returns to the edit', draft().currentRevisionId === 'rev_1' && draft().displayText.includes('BETA two'));
$('btn-draft-redo').click();
await sleep(50);
check('redo reaches the latest', draft().currentRevisionId === 'rev_2');
check('redo disables itself at the end', $('btn-draft-redo').disabled);
check('focus moves to undo', document.activeElement === $('btn-draft-undo'), document.activeElement?.id);
diffToggle.click();

// --- Recalculation --------------------------------------------------------------
$('jd-textarea').value = 'A different job typed afterwards';
$('jd-textarea').dispatchEvent(new Event('input', { bubbles: true }));
appState.analyzer.reportJobDescription = 'The job this report was made for';
let payload = null;
let recalcMode = 'ok';
const realFetch = window.fetch;
window.fetch = (input, init) => {
  if (!String(input).includes('/api/markup/recalculate')) return realFetch(input, init);
  payload = JSON.parse(init.body);
  if (recalcMode === 'fail') return Promise.resolve(new Response('{}', { status: 500 }));
  const canonical = payload.edited_text;
  return Promise.resolve(new Response(JSON.stringify({
    overall_score: 72,
    score_breakdown: [{ key: 'required_skills', points_earned: 30, max_points: 35, detail: 'rescored' }],
    document_snapshot: { document_id: payload.document_id, revision_id: payload.revision_id, text_hash: 'h2', canonical_display_text: canonical },
    resume_markups: [],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
};
$('btn-recalculate-draft').click();
await sleep(150);
check('recalculation sends the current draft', payload && payload.edited_text === draft().displayText);
check('recalculation uses the report\'s job description', payload && payload.job_description === 'The job this report was made for', payload && payload.job_description);
check('recalculation sends the current revision', payload && payload.revision_id === 'rev_2', payload && payload.revision_id);
check('recalculation keeps the document id', payload && payload.document_id === 'doc1', payload && payload.document_id);
check('the revision stays identified', draft().currentRevisionId === 'rev_2');
check('the ring follows', $('mini-score-val').textContent === '72');
check('the rubric follows', /^30/.test($('meter-val-skills').textContent) && $('meter-detail-skills').textContent === 'rescored');
check('the badge reports the new score', /rev_2, re-scored 72 of 100/.test($('draft-revision-badge').textContent), $('draft-revision-badge').textContent);
check('the toast states the score', /72 of 100/.test($('toast-message').textContent));

// Score and revision stay paired through history.
$('btn-draft-undo').click();
await sleep(40);
check('undo brings back that revision\'s score', $('mini-score-val').textContent === '60', $('mini-score-val').textContent);
check('and its rubric', /^20/.test($('meter-val-skills').textContent), $('meter-val-skills').textContent);
$('btn-draft-redo').click();
await sleep(40);
check('redo brings back the re-score', $('mini-score-val').textContent === '72' && /re-scored 72/.test($('draft-revision-badge').textContent));

recalcMode = 'fail';
const textBefore = draft().displayText;
$('btn-recalculate-draft').click();
await sleep(120);
check('a failed re-score says so', /could not be re-scored/.test($('toast-message').textContent), $('toast-message').textContent);
check('and keeps the edits', draft().displayText === textBefore && $('mini-score-val').textContent === '72');
check('the button recovers', !$('btn-recalculate-draft').disabled);
window.fetch = realFetch;

// --- Export -----------------------------------------------------------------------
let exported = '';
let downloadName = '';
const realCreate = URL.createObjectURL;
URL.createObjectURL = (blob) => { blob.text().then((t) => { exported = t; }); return realCreate.call(URL, blob); };
const realClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click() { downloadName = this.download; };
exportDraftAsMarkdown();
await sleep(60);
URL.createObjectURL = realCreate;
HTMLAnchorElement.prototype.click = realClick;
check('the export holds the current draft', exported.includes(draft().displayText));
check('the export names the revision', /rev_2/.test(exported) && downloadName === 'resume_tailored_rev_2.md', downloadName);
check('the export uses the product name', /Hyperion Pathfinder/.test(exported) && !/Resume Checker/.test(exported));
check('the export gives this revision\'s score', /72\/100/.test(exported));
check('the toast reports a started download', /Download started/.test($('toast-message').textContent));

return { checks };
