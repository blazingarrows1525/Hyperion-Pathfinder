// Pointer target sizes of visible controls (WCAG 2.2 SC 2.5.8): the minimum is 24 x 24 CSS px, with
// exceptions for inline links in text and targets with enough spacing; the brief aims for 44 x 44
// where practical. Reports controls under each threshold and whether a spacing exception applies.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 375,1440 --no-shots --eval-file scripts/ui_probes/target_sizes.js

const SELECTOR = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="radio"], [tabindex]:not([tabindex="-1"])';
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
const controls = [...new Set(document.querySelectorAll(SELECTOR))].filter(visible);
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
return { controls: boxes.length, under24Count: under24.length, under24Failing: under24.filter((x) => !x.exception).length, under24, under44Count: under44.length, under44: under44.slice(0, 60) };
