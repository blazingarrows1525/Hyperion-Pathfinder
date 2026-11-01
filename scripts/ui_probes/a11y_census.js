// Accessibility census of the loaded page: control names, headings, landmarks, tabindex.
// node scripts/ui_audit.mjs --no-shots --eval-file scripts/ui_probes/a11y_census.js

const nameOf = (el) => {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const lb = el.getAttribute('aria-labelledby');
  if (lb) {
    const t = lb.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (t) return t;
  }
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l && l.textContent.trim()) return l.textContent.trim();
  }
  const wrap = el.closest('label');
  if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
  if (el.title && el.title.trim()) return el.title.trim();
  const t = (el.textContent || '').trim();
  if (t && !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return t;
  const img = el.querySelector && el.querySelector('img[alt]');
  if (img && img.alt) return img.alt;
  return '';
};
const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList[0] ? '.' + el.classList[0] : ''}`;
const visible = (el) => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]');
};
const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="tab"], [role="button"], [role="switch"], [role="radio"], [tabindex]:not([tabindex="-1"])';
const controls = [...new Set(document.querySelectorAll(sel))];
const unnamed = controls.filter((el) => !nameOf(el)).map(describe);
const placeholderOnly = controls.filter((el) => ['INPUT', 'TEXTAREA'].includes(el.tagName) && !nameOf(el) && el.placeholder).map(describe);
const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => +h.tagName[1]);
const skips = [];
for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) skips.push(`h${headings[i - 1]}->h${headings[i]}`);
const focusableInHidden = [...document.querySelectorAll('[aria-hidden="true"]')]
  .flatMap((n) => [...n.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')])
  .filter((el) => !el.disabled && visible(el)).map(describe);
return {
  lang: document.documentElement.lang || '(none)',
  title: document.title,
  controls: controls.length,
  visibleControls: controls.filter(visible).length,
  disabledControls: controls.filter((el) => el.disabled || el.getAttribute('aria-disabled') === 'true').map(describe),
  unnamed,
  placeholderOnly,
  positiveTabindex: [...document.querySelectorAll('[tabindex]')].filter((el) => +el.getAttribute('tabindex') > 0).map(describe),
  imagesWithoutAlt: [...document.querySelectorAll('img:not([alt])')].map(describe),
  h1: headings.filter((h) => h === 1).length,
  headingSkips: [...new Set(skips)],
  landmarks: { header: document.querySelectorAll('header').length, nav: document.querySelectorAll('nav').length, main: document.querySelectorAll('main').length, footer: document.querySelectorAll('footer').length },
  focusableInAriaHidden: focusableInHidden,
  skipLink: !!document.querySelector('a[href^="#"].skip-link, .skip-link'),
};
