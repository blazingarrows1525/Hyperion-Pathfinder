// Regression probe: 200% text, forced colors and the operating system's motion preference.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1920,1440,768,375,320 --no-shots --eval-file scripts/ui_probes/text_and_modes.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
document.documentElement.style.scrollBehavior = 'auto';
const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
const narrow = innerWidth <= 1080;

// --- 200% text --------------------------------------------------------------------------
enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
document.documentElement.style.fontSize = '200%';
await sleep(500);

const pageWidth = document.documentElement.clientWidth;
check('200% text: the page does not scroll sideways', document.documentElement.scrollWidth <= pageWidth, `${document.documentElement.scrollWidth} > ${pageWidth}`);

const CONTROL = 'button, a[href], input:not([type="hidden"]):not(.sr-only):not(.dropzone-input-hidden), select, textarea, summary, [role="switch"]';
const onScreenX = (el) => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= pageWidth + 1; };
const insideScroller = (el) => {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowX;
    if (o === 'auto' || o === 'scroll') return true;
  }
  return false;
};
const controls = [...document.querySelectorAll(CONTROL)].filter(visible);
const off = controls.filter((el) => !onScreenX(el) && !insideScroller(el));
check('200% text: every control stays on screen', off.length === 0, off.slice(0, 8).map((el) => `${describe(el)} ${Math.round(el.getBoundingClientRect().right)}`).join('; '));

// Clipped text: a box too small for its own text, with no way to scroll to the rest.
const clipped = controls.filter((el) => {
  const cs = getComputedStyle(el);
  if (!['hidden', 'clip'].includes(cs.overflowY) && !['hidden', 'clip'].includes(cs.overflowX)) return false;
  if (el.closest('.atlas-node-labels')) return false;
  return el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
});
check('200% text: no control clips its own text', clipped.length === 0, clipped.slice(0, 8).map((el) => `${describe(el)} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`).join('; '));

const head = document.querySelector('.masthead-inner');
if (narrow) {
  const menu = $('btn-mobile-menu');
  check('200% text: the menu button stays on screen', visible(menu) && menu.getBoundingClientRect().right <= pageWidth + 1, menu.getBoundingClientRect().right);
  menu.click();
  await sleep(120);
  const links = $('nav-links-menu');
  const lr = links.getBoundingClientRect();
  check('200% text: the open menu fits the width', lr.right <= pageWidth + 1 && lr.left >= -1, `${lr.left}-${lr.right}`);
  const canScroll = links.scrollHeight <= links.clientHeight || ['auto', 'scroll'].includes(getComputedStyle(links).overflowY);
  check('200% text: the open menu can be scrolled', canScroll);
  menu.click();
  await sleep(60);
}
const actions = [...head.querySelectorAll('.nav-actions > *')].filter(visible);
check('200% text: the masthead actions stay on screen', actions.every(onScreenX), actions.filter((el) => !onScreenX(el)).map(describe).join());
const headRect = head.getBoundingClientRect();
const headKids = [...head.children].filter(visible);
const overlaps = headKids.some((a, i) => headKids.slice(i + 1).some((b) => { const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect(); return ra.right > rb.left + 1 && ra.left < rb.right - 1 && ra.bottom > rb.top + 1 && ra.top < rb.bottom - 1; }));
check('200% text: masthead parts do not overlap', !overlaps, headKids.map((el) => { const r = el.getBoundingClientRect(); return `${describe(el)} ${Math.round(r.left)}-${Math.round(r.right)}`; }).join(' | '));

// The stage and the panels hold their content.
const legend = [...document.querySelectorAll('.atlas-legend-item')];
check('200% text: legend items hold their names', legend.every((el) => el.scrollWidth <= el.clientWidth + 2), legend.filter((el) => el.scrollWidth > el.clientWidth + 2).map((el) => `${el.scrollWidth}/${el.clientWidth}`).join());
const kpis = [...document.querySelectorAll('.kpi')];
check('200% text: KPI figures fit their cells', kpis.every((el) => el.scrollWidth <= el.clientWidth + 2), kpis.filter((el) => el.scrollWidth > el.clientWidth + 2).map((el) => el.querySelector('dt').textContent).join());
const tabsBar = document.querySelector('.analyzer-results-card .results-tab-bar');
check('200% text: report tabs can still be reached', getComputedStyle(tabsBar).overflowX === 'auto' || tabsBar.scrollWidth <= tabsBar.clientWidth, getComputedStyle(tabsBar).overflowX);
check('200% text: the score stays inside its ring', (() => { const ring = document.querySelector('.mini-score-ring').getBoundingClientRect(); const val = $('mini-score-val').getBoundingClientRect(); return val.left >= ring.left - 2 && val.right <= ring.right + 2; })(), `${$('mini-score-val').getBoundingClientRect().width} in ${document.querySelector('.mini-score-ring').getBoundingClientRect().width}`);

document.documentElement.style.fontSize = '';
await sleep(200);

// --- Forced colours -------------------------------------------------------------------------
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
await sleep(200);
const supported = window.matchMedia('(forced-colors: active)').matches;
check('forced colours can be tested here', supported);
if (supported) {
  const fill = document.querySelector('.meter-fill');
  check('forced colours: score bars keep their fill', getComputedStyle(fill).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(fill).backgroundColor !== getComputedStyle(fill.parentElement).backgroundColor, `${getComputedStyle(fill).backgroundColor} on ${getComputedStyle(fill.parentElement).backgroundColor}`);
  const band = document.querySelector('.band-fill');
  check('forced colours: snapshot bars keep their fill', band && getComputedStyle(band).backgroundColor !== getComputedStyle(band.parentElement).backgroundColor, band && getComputedStyle(band).backgroundColor);
  const selectedLegend = document.querySelector('.atlas-legend-item.is-selected');
  const plainLegend = document.querySelector('.atlas-legend-item:not(.is-selected)');
  const cueOf = (el) => { const cs = getComputedStyle(el); return `${cs.borderTopWidth} ${cs.outlineStyle} ${cs.borderTopColor}`; };
  check('forced colours: the selected legend item stands out', cueOf(selectedLegend) !== cueOf(plainLegend), `${cueOf(selectedLegend)} vs ${cueOf(plainLegend)}`);
  const activeTab = document.querySelector('.results-tab-btn[aria-selected="true"]');
  const otherTab = document.querySelector('.results-tab-btn[aria-selected="false"]');
  const tabCue = (el) => { const cs = getComputedStyle(el); return `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.outlineStyle}`; };
  check('forced colours: the selected tab stands out', tabCue(activeTab) !== tabCue(otherTab), `${tabCue(activeTab)} vs ${tabCue(otherTab)}`);
  const swatches = [...document.querySelectorAll('.atlas-legend-item .legend-swatch')];
  check('forced colours: cluster silhouettes stay visible', swatches.every((s) => { const cs = getComputedStyle(s); return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0; }), swatches.map((s) => getComputedStyle(s).backgroundColor).join());
  const activeFilter = document.querySelector('.btn-filter-pill.active');
  const plainFilter = document.querySelector('.btn-filter-pill:not(.active)');
  const filterCue = (el) => { const cs = getComputedStyle(el); return `${cs.backgroundColor} ${cs.borderTopStyle} ${cs.outlineStyle}`; };
  check('forced colours: the active filter stands out', filterCue(activeFilter) !== filterCue(plainFilter), `${filterCue(activeFilter)} vs ${filterCue(plainFilter)}`);
}
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
await sleep(100);

// --- The operating system's motion preference --------------------------------------------------
applyMotionSetting('system', { persist: false });
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await sleep(150);
check('System follows the OS when it asks for less motion', appState.motionMode === 'reduced' && document.body.getAttribute('data-motion') === 'reduced', appState.motionMode);
check('the label says so', /calm/i.test($('motion-mode-label').textContent), $('motion-mode-label').textContent);
const atlas = careerAtlas;
if (atlas) {
  atlas.requestRender();
  for (let i = 0; i < 40 && atlas.schedulerState !== 'at-rest' && !atlas.pauseReasons.size; i++) await sleep(50);
  const f0 = atlas.renderer.info.render.frame;
  await sleep(700);
  check('the Atlas is still under reduced motion', atlas.renderer.info.render.frame === f0 && !atlas.frameTimer && atlas.ambientMix === 0, atlas.schedulerState);
}
const infinite = document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && a.playState === 'running');
check('nothing loops under reduced motion', infinite.length === 0, infinite.map((a) => a.animationName).join());
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await sleep(150);
check('System follows it back', appState.motionMode === 'full', appState.motionMode);
applyMotionSetting('calm', { persist: false });
check('Calm holds whatever the OS says', appState.motionMode === 'reduced');
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await sleep(60);
await __cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await sleep(60);
check('and is not changed by it', appState.motionSetting === 'calm' && appState.motionMode === 'reduced');
applyMotionSetting('system', { persist: false });
await __cdp('Emulation.setEmulatedMedia', { media: '', features: [] });

return { checks };
