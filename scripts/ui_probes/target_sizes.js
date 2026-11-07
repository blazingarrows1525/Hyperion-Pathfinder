// Pointer target sizes of visible controls (WCAG 2.2 SC 2.5.8): the minimum is 24 x 24 CSS px, with
// exceptions for inline links in text and targets with enough spacing; the brief aims for 44 x 44
// where practical. Reports controls under each threshold and whether a spacing exception applies.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 375,1440 --no-shots --eval-file scripts/ui_probes/target_sizes.js

const SELECTOR = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, label.table-filter, label.persona-chip, label.demo-switch, [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="slider"], [tabindex]:not([tabindex="-1"])';
// An input inside one of these labels is reached through the label, which is the real target.
const insideTargetLabel = (el) => el.tagName === 'INPUT' && el.closest('label.table-filter, label.persona-chip, label.demo-switch');
// Spans of running text, and containers that only scroll: their size is not a choice. The light
// control's pointer target is its 140 px well; the small puck inside is its keyboard stop.
const isTextOrRegion = (el) => el.matches('mark.doc-markup-span, .recruiters-table-wrapper, [role="region"], [role="tabpanel"], pre, #main-content, #neu-light-puck');
const visible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  for (let n = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
  }
  return true;
};
const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
const controls = [...new Set(document.querySelectorAll(SELECTOR))].filter(visible).filter((el) => !insideTargetLabel(el) && !isTextOrRegion(el));
const boxes = controls.map((el) => ({ el, r: el.getBoundingClientRect() }));
// Inline links inside running text are exempt; so is a target whose 24 px circle (centred on it)
// reaches no other target.
const inlineLink = (el) => el.tagName === 'A' && el.parentElement && getComputedStyle(el).display === 'inline'
  && el.parentElement.textContent.trim().length > el.textContent.trim().length + 20;
const spaced = ({ el, r }) => {
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return boxes.every((other) => {
    if (other.el === el || other.el.contains(el) || el.contains(other.el)) return true;
    const nx = Math.max(other.r.left, Math.min(cx, other.r.right));
    const ny = Math.max(other.r.top, Math.min(cy, other.r.bottom));
    return Math.hypot(nx - cx, ny - cy) >= 12;
  });
};
const under24 = [];
const under44 = [];
boxes.forEach((b) => {
  const { el, r } = b;
  const size = `${Math.round(r.width)}x${Math.round(r.height)}`;
  if (r.width < 24 || r.height < 24) {
    under24.push({ el: describe(el), size, name: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), exception: inlineLink(el) ? 'inline-link' : spaced(b) ? 'spacing' : '' });
  } else if (r.width < 44 || r.height < 44) {
    under44.push(`${describe(el)} ${size}`);
  }
});
const phone = innerWidth <= 640;
const under24Failing = under24.filter((x) => !x.exception);
const checks = [
  { name: 'no target under 24 px without a WCAG exception', ok: under24Failing.length === 0, detail: under24Failing.map((x) => `${x.el} ${x.size}`).join('; ') },
];
if (phone) {
  // 40 px is accepted for the remove button inside the file pill, where 44 would crowd the file name.
  const small = [...under24.filter((x) => x.exception !== 'inline-link').map((x) => `${x.el} ${x.size}`), ...under44].filter((x) => !x.includes('btn-clear-file'));
  checks.push({ name: 'on a phone, every control reaches 44 px', ok: small.length === 0, detail: small.join('; ') });
}
return { controls: boxes.length, under24Count: under24.length, under24Failing: under24Failing.length, under24, under44Count: under44.length, under44: under44.slice(0, 80), checks };
