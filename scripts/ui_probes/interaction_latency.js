// Lab measure of interaction latency with real input, through the Event Timing API (what INP is built
// from), plus where layout shift comes from. A lab number on this machine is not field data.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/interaction_latency.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const mobile = innerWidth < 768;
const press = (el) => (mobile ? __real.tapEl(el) : __real.clickEl(el));
document.documentElement.style.scrollBehavior = 'auto';
window.confirm = () => true;

// Layout shifts recorded since navigation, with what moved.
const shifts = await new Promise((resolve) => {
  const seen = [];
  const po = new PerformanceObserver((list) => seen.push(...list.getEntries()));
  po.observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => { po.disconnect(); resolve(seen); }, 200);
});
const describe = (node) => (node && node.nodeType === 1 ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.classList[0] ? `.${node.classList[0]}` : ''}` : (node ? node.nodeName : '?'));
const shiftReport = shifts.filter((s) => !s.hadRecentInput).map((s) => ({
  at: Math.round(s.startTime),
  value: +s.value.toFixed(4),
  sources: (s.sources || []).slice(0, 3).map((x) => describe(x.node)),
}));

// Interaction timing
const events = [];
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((e) => { if (e.interactionId) events.push(e); });
});
observer.observe({ type: 'event', durationThreshold: 16, buffered: false });

const results = [];
const measure = async (name, action) => {
  events.length = 0;
  await action();
  await sleep(260);
  observer.takeRecords().forEach((e) => { if (e.interactionId) events.push(e); });
  const worst = events.reduce((max, e) => Math.max(max, e.duration), 0);
  results.push({ name, ms: Math.round(worst), events: events.length });
};

const legendItem = document.querySelector('.atlas-legend-item[data-archetype-id="2"]');
await measure('select a cluster in the legend', () => press(legendItem));
await measure('select another cluster', () => press(document.querySelector('.atlas-legend-item[data-archetype-id="3"]')));
await measure('atlas mode button', () => press(document.querySelector('.btn-3d-mode[data-mode="orbit"]')));
await measure('atlas zoom', () => press($('btn-3d-zoom-in')));
await measure('open preferences', () => press($('btn-prefs')));
await measure('switch theme', () => press($('btn-theme-toggle')));
await measure('switch theme back', () => press($('btn-theme-toggle')));
await __real.key('Escape');
await sleep(60);
await measure('analyzer: choose a sample JD', () => press(document.querySelector('.btn-preset-chip[data-preset="google"]')));

$('jd-textarea').focus();
await measure('analyzer: type in the job description', async () => { await __real.type('more'); });
const search = $('company-search-input');
search.scrollIntoView({ block: 'center' });
await sleep(100);
search.focus();
await measure('company search: type', async () => { await __real.type('go'); });
await measure('company filter', () => press(document.querySelector('.btn-company-filter[data-filter="in-snapshot"]')));
await measure('company details dialog', () => press(document.querySelector('[data-company-action="details"]')));
await __real.key('Escape');
await sleep(60);
await measure('genome tab', () => press($('archetype-tab-3')));
await measure('prompt framework', () => press(document.querySelector('.framework-item-btn[data-framework-id="RHODES"]')));
const field = document.querySelector('.fw-field-input');
field.focus();
await measure('prompt field: type', async () => { await __real.type('abc'); });

// With a report on screen
enableDemoAndRun();
for (let i = 0; i < 60 && appState.analyzer.status !== 'complete'; i++) await sleep(250);
await measure('report tab: executive review', () => press($('tab-btn-persona')));
await measure('report tab: tailoring', () => press($('tab-btn-tailoring')));
await measure('open a markup', () => press(document.querySelector('.doc-markup-span.mark-yellow')));
await __real.key('Escape');
await sleep(60);
await measure('voice panel', () => press($('voice-orb-btn')));
await measure('voice panel closes', () => press($('voice-orb-btn')));
observer.disconnect();

const worst = results.reduce((a, b) => (a.ms >= b.ms ? a : b));
const sorted = [...results].map((r) => r.ms).sort((a, b) => a - b);
const p75 = sorted[Math.floor(sorted.length * 0.75)];
check('no measured interaction is over the 200 ms target', worst.ms <= 200, `${worst.name}: ${worst.ms} ms`);
const cls = shiftReport.reduce((s, x) => s + x.value, 0);
check('layout shift at load is under the 0.1 target', cls <= 0.1, cls.toFixed(4));

return { checks, worst, p75, results, cls: +cls.toFixed(4), shiftReport };
