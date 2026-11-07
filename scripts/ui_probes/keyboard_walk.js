// Regression probe: walk the whole page with real Tab presses, with a report on screen.
// Every stop must be visible, show a focus indicator and move forward in document order, and the
// walk must reach the end of the page, so there is no keyboard trap.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/keyboard_walk.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList[0] ? `.${el.classList[0]}` : ''}`;

enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
document.documentElement.style.scrollBehavior = 'auto';
window.scrollTo(0, 0);
// Start at the very top of the document: focus a throwaway first element, then remove it.
const start = document.createElement('span');
start.tabIndex = -1;
document.body.prepend(start);
start.focus();
start.remove();
await sleep(200);

const footerLast = [...document.querySelectorAll('.footer-nav-links a')].pop();
const stops = [];
const problems = { invisible: [], noIndicator: [], backwards: [], hiddenPane: [] };
let reachedEnd = false;
let previous = null;

const hasIndicator = (el) => {
  const cs = getComputedStyle(el);
  if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1) return true;
  if (cs.boxShadow !== 'none') return true;
  const wrapper = el.closest('.dropzone-container, .table-filter, .input-step .persona-chip, .persona-chip');
  if (wrapper) {
    const wcs = getComputedStyle(wrapper);
    if (wcs.outlineStyle !== 'none' && parseFloat(wcs.outlineWidth) >= 1) return true;
  }
  // A switch or radio whose input is hidden shows focus on its sibling track.
  const sibling = el.nextElementSibling;
  if (sibling) {
    const scs = getComputedStyle(sibling);
    if (scs.outlineStyle !== 'none' && parseFloat(scs.outlineWidth) >= 1) return true;
  }
  return false;
};

for (let i = 0; i < 400; i++) {
  await __real.tab();
  await sleep(14);
  const el = document.activeElement;
  if (!el || el === document.body) {
    if (stops.length > 5) break;
    continue;
  }
  // Back at the first stop: the walk has wrapped round, which also proves there is no trap.
  if (stops.length > 5 && describe(el) === stops[0]) break;
  stops.push(describe(el));
  const rect = el.getBoundingClientRect();
  const hiddenByStyle = getComputedStyle(el).visibility === 'hidden' || (rect.width === 0 && rect.height === 0);
  const srOnly = el.classList.contains('sr-only');
  if (hiddenByStyle) problems.invisible.push(describe(el));
  if (!srOnly && !hasIndicator(el)) problems.noIndicator.push(describe(el));
  if (el.closest('.results-tab-pane') && getComputedStyle(el.closest('.results-tab-pane')).display === 'none') problems.hiddenPane.push(describe(el));
  if (previous && previous.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) problems.backwards.push(`${describe(previous)} -> ${describe(el)}`);
  previous = el;
  if (el === footerLast) { reachedEnd = true; }
}

check('Tab walks the whole page and reaches the footer', reachedEnd, `${stops.length} stops; last ${stops[stops.length - 1]}`);
check('the first stop is the skip link', stops[0] && stops[0].includes('skip-link'), stops[0]);
check('every stop is visible', problems.invisible.length === 0, problems.invisible.slice(0, 8).join('; '));
check('every stop shows focus', problems.noIndicator.length === 0, [...new Set(problems.noIndicator)].slice(0, 12).join('; '));
check('focus moves forward in document order', problems.backwards.length === 0, problems.backwards.slice(0, 6).join('; '));
check('nothing in a hidden tab can take focus', problems.hiddenPane.length === 0, problems.hiddenPane.slice(0, 6).join('; '));
const stopCounts = stops.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
const dead = Object.keys(stopCounts).filter((s) => s.startsWith('div#resume-dropzone'));
check('the dropzone wrapper is not a stop', dead.length === 0, dead.join());
check('the file input is a stop', stops.includes('input#resume-file-input.dropzone-input-hidden'), '');
check('the results tabs are one stop', stops.filter((s) => s.startsWith('button#tab-btn-')).length === 1, stops.filter((s) => s.startsWith('button#tab-btn-')).join());

// Shift+Tab goes back the same way.
footerLast.focus();
await __real.tab(true);
await sleep(20);
check('Shift+Tab goes backwards', document.activeElement !== footerLast && document.activeElement.compareDocumentPosition(footerLast) & Node.DOCUMENT_POSITION_FOLLOWING, describe(document.activeElement));

// The results tabs, with real keys.
const report = document.getElementById('tab-btn-report');
report.focus();
await __real.key('ArrowRight');
await sleep(30);
check('ArrowRight moves to the next report tab', document.activeElement.id === 'tab-btn-persona' && document.activeElement.getAttribute('aria-selected') === 'true', document.activeElement.id);
check('and shows its panel', getComputedStyle(document.getElementById('pane-executive-review')).display !== 'none');
await __real.key('End');
await sleep(30);
check('End goes to the last tab', document.activeElement.id === 'tab-btn-coach');
await __real.key('ArrowRight');
await sleep(30);
check('ArrowRight wraps to the first', document.activeElement.id === 'tab-btn-report');
await __real.key('Home');
await sleep(30);
check('Home stays on the first', document.activeElement.id === 'tab-btn-report');
await __real.key('ArrowLeft');
await sleep(30);
check('ArrowLeft wraps to the last', document.activeElement.id === 'tab-btn-coach');
document.getElementById('tab-btn-report').click();
const tablist = document.querySelector('.results-tabs');
check('the tablist holds only tabs', [...tablist.children].every((c) => c.getAttribute('role') === 'tab'), [...tablist.children].map((c) => c.tagName).join());
check('tabs and panels are linked', [...tablist.children].every((t) => document.getElementById(t.getAttribute('aria-controls'))?.getAttribute('aria-labelledby') === t.id));

// Persona radios: arrow keys change the lens, as native radios do.
const radios = [...document.querySelectorAll('input[name="executive_persona"]')];
radios[0].focus();
await __real.key('ArrowDown');
await sleep(30);
check('arrow keys change the review lens', radios[1].checked && appState.executiveReview.selectedPersonaId === radios[1].value, appState.executiveReview.selectedPersonaId);
check('the selected lens shows on its card', radios[1].closest('.persona-chip').classList.contains('active'));
const focusRing = getComputedStyle(radios[1].closest('.persona-chip'));
check('the focused lens shows a ring', focusRing.outlineStyle !== 'none', focusRing.outlineStyle);
radios[0].click();

// The demo switch.
const demo = document.getElementById('demo-mode-toggle');
demo.focus();
await __real.key('Space');
await sleep(30);
check('Space turns demo mode on', demo.checked && appState.analyzer.demoMode === true);
await __real.key('Space');
await sleep(30);
check('and off', !demo.checked && appState.analyzer.demoMode === false);

return { checks, stops: stops.length };
