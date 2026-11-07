// Live inventory of every actionable control, with its real listeners and an activation test.
// For each control: section, accessible name, state, size, how it is wired (own listener, a listener
// on an ancestor, an inline handler, or native behaviour), and whether activating it changes anything
// observable (DOM, attributes, focus, URL, scroll position or a network request).
// Add ?census=demo to run the illustrative demo first, which brings the results controls into the DOM.
//   node scripts/ui_audit.mjs --url "http://127.0.0.1:8010/?census=demo" --widths 1440 --no-shots --eval-file scripts/ui_probes/control_census.js

// The command-line API is only present before the first await, so capture it now.
const listenersOf = getEventListeners;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const params = new URLSearchParams(location.search);
window.confirm = () => true;
window.alert = () => {};
// Keep the test page on the page: no new tabs, and downloads are only counted.
window.open = () => null;
let downloads = 0;
const realAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click() {
  if (this.hasAttribute('download')) { downloads++; return undefined; }
  return realAnchorClick.call(this);
};
let requests = 0;
const realFetch = window.fetch;
window.fetch = (...args) => { requests++; return realFetch(...args); };

if (params.get('census') === 'demo') {
  enableDemoAndRun();
  for (let i = 0; i < 120 && !(appState.reportData && appState.reportData.overall_score); i++) await sleep(250);
  await sleep(600);
}

const SELECTOR = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, label[for], [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
const nameOf = (el) => {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const by = el.getAttribute('aria-labelledby');
  if (by) {
    const t = by.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (t) return t.replace(/\s+/g, ' ');
  }
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l && l.textContent.trim()) return l.textContent.trim().replace(/\s+/g, ' ');
  }
  const wrap = el.closest('label');
  if (wrap && wrap.textContent.trim()) return wrap.textContent.trim().replace(/\s+/g, ' ');
  const t = (el.textContent || '').trim();
  if (t && !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return t.replace(/\s+/g, ' ');
  if (el.title && el.title.trim()) return el.title.trim();
  return '';
};
const stableId = (el) => {
  if (el.id) return `#${el.id}`;
  const cls = el.classList[0] ? `.${el.classList[0]}` : '';
  const data = [...el.attributes].filter((a) => a.name.startsWith('data-') && a.value.length < 30).slice(0, 1).map((a) => `[${a.name}="${a.value}"]`).join('');
  return `${el.tagName.toLowerCase()}${cls}${data}`;
};
const sectionOf = (el) => {
  const owner = el.closest('section[id], header[id], footer[id], [role="dialog"][id], nav[id]') || el.closest('header, footer, nav, [role="dialog"], section');
  return owner ? (owner.id || owner.getAttribute('aria-label') || owner.tagName.toLowerCase()) : 'page';
};
const visibleNow = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  for (let n = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  }
  return !el.closest('[hidden]');
};
const ACTIVATION = ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'keydown', 'change', 'input', 'toggle', 'touchstart'];
const wiring = (el) => {
  const own = Object.keys(listenersOf(el)).filter((t) => ACTIVATION.includes(t));
  const inline = ['onclick', 'onchange', 'oninput', 'onkeydown'].filter((a) => el.hasAttribute(a)).map((a) => el.getAttribute(a).split('(')[0].trim());
  const delegated = [];
  for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const types = Object.keys(listenersOf(n)).filter((t) => t === 'click' || t === 'change' || t === 'input');
    if (types.length) { delegated.push(`${stableId(n)}:${types.join('+')}`); break; }
  }
  const documentClick = Object.keys(listenersOf(document)).includes('click');
  const native = el.tagName === 'A' ? 'anchor' : ['INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'LABEL'].includes(el.tagName) ? el.tagName.toLowerCase() : '';
  return { own, inline, delegated, documentClick, native };
};

const controls = [...new Set(document.querySelectorAll(SELECTOR))];
const records = controls.map((el) => {
  const r = el.getBoundingClientRect();
  return {
    el,
    id: stableId(el),
    section: sectionOf(el),
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || '',
    role: el.getAttribute('role') || '',
    name: nameOf(el).slice(0, 80),
    visible: visibleNow(el),
    disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
    state: ['aria-expanded', 'aria-pressed', 'aria-selected', 'aria-checked', 'aria-current'].filter((a) => el.hasAttribute(a)).map((a) => `${a}=${el.getAttribute(a)}`).join(' '),
    width: Math.round(r.width),
    height: Math.round(r.height),
    wiring: wiring(el),
    dataAttrs: [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name, a.value]),
  };
});

// Activation test: click each visible, enabled button-like control once and watch for an effect.
const mutations = { count: 0 };
const observer = new MutationObserver((list) => { mutations.count += list.length; });
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
const canvasFree = (el) => !el.closest('canvas');
const liveTwin = (rec) => {
  if (rec.el.isConnected) return rec.el;
  const data = rec.dataAttrs.map(([k, v]) => `[${k}="${CSS.escape(v)}"]`).join('');
  return rec.dataAttrs.length ? document.querySelector(`${rec.tag}${data}`) : null;
};
const clickable = (rec) => rec.visible && !rec.disabled && canvasFree(rec.el)
  && (rec.tag === 'button' || rec.tag === 'summary' || rec.role === 'button' || rec.role === 'tab' || rec.role === 'switch' || rec.role === 'radio'
    || (rec.tag === 'a' && (rec.el.getAttribute('href') || '').startsWith('#')));
const tidy = () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.querySelectorAll('.modal-backdrop.open, .modal-backdrop.active').forEach((b) => { try { closeModal(b.id); } catch (e) { /* not a managed modal */ } });
};
for (const rec of records) {
  if (!clickable(rec)) { rec.activation = rec.visible ? 'not-clicked' : 'hidden'; continue; }
  await sleep(40);
  const before = { m: mutations.count, r: requests, d: downloads, focus: document.activeElement, hash: location.hash, x: scrollX, y: scrollY };
  rec.el = liveTwin(rec) || rec.el;
  if (!rec.el.isConnected) { rec.activation = 'replaced'; continue; }
  try {
    rec.el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    await sleep(30);
    before.m = mutations.count; before.y = scrollY; before.x = scrollX;
    rec.el.click();
  } catch (err) {
    rec.activation = `threw: ${String(err).slice(0, 80)}`;
    continue;
  }
  await sleep(260);
  const effects = [];
  if (mutations.count > before.m) effects.push('dom');
  if (requests > before.r) effects.push('request');
  if (downloads > before.d) effects.push('download');
  if (document.activeElement !== before.focus) effects.push('focus');
  if (location.hash !== before.hash) effects.push('hash');
  if (Math.abs(scrollY - before.y) > 2) effects.push('scroll');
  rec.activation = effects.length ? effects.join('+') : 'NO-EFFECT';
  tidy();
  await sleep(60);
}
observer.disconnect();
window.fetch = realFetch;
HTMLAnchorElement.prototype.click = realAnchorClick;

const out = records.map(({ el, dataAttrs, ...rest }) => rest);
const summary = {
  total: out.length,
  visible: out.filter((r) => r.visible).length,
  hidden: out.filter((r) => !r.visible).length,
  disabled: out.filter((r) => r.disabled).length,
  clicked: out.filter((r) => r.activation && !['hidden', 'not-clicked'].includes(r.activation)).length,
  noEffect: out.filter((r) => r.activation === 'NO-EFFECT').map((r) => `${r.section} ${r.id} "${r.name}"`),
  threw: out.filter((r) => String(r.activation).startsWith('threw')).map((r) => `${r.id} ${r.activation}`),
  unnamed: out.filter((r) => !r.name).map((r) => `${r.section} ${r.id}`),
  unwired: out.filter((r) => r.tag === 'button' && !r.wiring.own.length && !r.wiring.inline.length && !r.wiring.delegated.length).map((r) => `${r.section} ${r.id} "${r.name}"`),
};
return { summary, controls: out };
