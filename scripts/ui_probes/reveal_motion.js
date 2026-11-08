// Regression probe: section reveals must never hide content, delay a tool or break fixed positioning.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/reveal_motion.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
document.documentElement.style.scrollBehavior = 'auto';

const hidden = () => [...document.querySelectorAll('.hp-reveal')].filter((el) => !el.classList.contains('hp-reveal-visible'));
const describe = (el) => `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`;

// Tools and the opening statement are never held back by a reveal.
for (const sel of ['.atlas-hero-copy', '.hero-title', '.atlas-stage', '.analyzer-form-card', '.analyzer-results-card', '#company-search-input', '#framework-search-input', '#jd-textarea']) {
  const el = document.querySelector(sel);
  check(`${sel} takes no part in reveals`, el && !el.closest('.hp-reveal'), el ? describe(el.closest('.hp-reveal') || el) : 'missing');
}
const hero = document.querySelector('.hero-title');
check('the headline is fully visible at load', getComputedStyle(hero).opacity === '1', getComputedStyle(hero).opacity);

// Print shows everything, whether or not it has been scrolled to.
const pending = hidden();
check('some panels are waiting to reveal below the fold', pending.length > 0 || appState.motionMode === 'reduced', pending.length);
if (pending.length) {
  await __cdp('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(100);
  check('nothing is invisible in print', pending.every((el) => getComputedStyle(el).opacity === '1'), pending.filter((el) => getComputedStyle(el).opacity !== '1').map(describe).slice(0, 5).join());
  await __cdp('Emulation.setEmulatedMedia', { media: '' });
  await sleep(60);
}

// Rendering a filter again must not start animations.
const companySearch = document.getElementById('company-search-input');
companySearch.value = 'go';
companySearch.dispatchEvent(new Event('input', { bubbles: true }));
await sleep(80);
const rows = [...document.querySelectorAll('#company-intel .hp-reveal')].filter((el) => el.closest('tbody, .company-grid, .company-directory-list'));
check('re-rendered rows do not animate', rows.length === 0, rows.length);
companySearch.value = '';
companySearch.dispatchEvent(new Event('input', { bubbles: true }));

// Scrolling through reveals everything, and each element ends with no transform at all.
const total = document.documentElement.scrollHeight;
for (let y = 0; y < total; y += Math.round(innerHeight * 0.6)) { window.scrollTo(0, y); await sleep(70); }
await sleep(900);
// A fast scroll can pass a panel between frames; it must still reveal once it is really in view.
for (const el of hidden()) { el.scrollIntoView({ block: 'center' }); await sleep(900); }
check('every panel reveals when it is in view', hidden().length === 0, hidden().map(describe).slice(0, 6).join());
const leftover = [...document.querySelectorAll('.hp-reveal')].filter((el) => { const cs = getComputedStyle(el); return cs.transform !== 'none' || cs.opacity !== '1'; });
check('revealed panels keep no transform', leftover.length === 0, leftover.map((el) => `${describe(el)} ${getComputedStyle(el).transform}`).slice(0, 5).join());

// position: fixed must mean the viewport: no ancestor of a sheet or dialog may trap it.
const trapped = ['markup-detail-popover', 'toast-notification', 'modal-llm-control-hub', 'company-modal-backdrop', 'compare-modal-backdrop'].flatMap((id) => {
  const out = [];
  for (let n = document.getElementById(id)?.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' || cs.backdropFilter !== 'none') out.push(`${id} inside ${describe(n)}`);
  }
  return out;
});
check('no ancestor traps fixed-position layers', trapped.length === 0, trapped.join('; '));

// Every animation that is running must be a known, essential one once things settle.
window.scrollTo(0, 0);
await sleep(1000);
const running = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity);
const reduced = appState.motionMode === 'reduced';
if (reduced) check('reduced motion leaves no endless animation', running.length === 0, running.map((a) => a.animationName).join());
return { checks, endless: running.map((a) => `${a.animationName} on ${a.effect.target ? describe(a.effect.target) : '?'}`) };
