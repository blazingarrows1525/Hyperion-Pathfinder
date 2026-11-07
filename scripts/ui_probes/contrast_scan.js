// WCAG 2.2 text contrast on the rendered page: every visible element with its own text,
// against its composited background. 4.5:1, or 3:1 for large text (>= 24px, or >= 18.66px bold).
// Gradients are judged by their worst colour stop, and gradient-filled text
// (background-clip: text) by its worst stop against the background behind it. Text over an
// image is counted as "unknown" rather than guessed.
// Add ?scan=demo to the URL to run the illustrative demo first and scan each results tab.
//   node scripts/ui_audit.mjs --url "http://127.0.0.1:8010/?scan=demo" --widths 1440 --no-shots --theme afterglow-night --eval-file scripts/ui_probes/contrast_scan.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parse = (c) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
};
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const lum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const stops = (image) => (image.match(/rgba?\([^)]+\)/g) || []).map(parse);
// Candidate backgrounds behind `el`: the composited solid layers, plus that base with each
// gradient stop on top. Returns null when an image sits behind the text.
const backgrounds = (el) => {
  const layers = [];
  const gradientStops = [];
  for (let n = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      if (/url\(/.test(cs.backgroundImage)) return null;
      const s = stops(cs.backgroundImage).filter(Boolean);
      // An opaque gradient covers everything beneath it: its stops are the backgrounds.
      if (s.length && s.every((c) => c.a >= 1)) {
        return s.map((stop) => layers.reduceRight((acc, layer) => over(layer, acc), stop));
      }
      gradientStops.push(...s.filter((c) => c.a > 0));
    }
    const c = parse(cs.backgroundColor);
    if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
  }
  let base = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
  return [base, ...gradientStops.map((s) => over(s, base))];
};
const gradientText = (cs) => (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text')
  && cs.backgroundImage && cs.backgroundImage !== 'none';
// Partial opacity blends text and its background with whatever is behind the translucent group.
const translucency = (el) => {
  let alpha = 1;
  let top = null;
  for (let n = el; n; n = n.parentElement) {
    const o = +getComputedStyle(n).opacity;
    if (o < 1) { alpha *= o; top = n; }
  }
  return { alpha, top };
};
const visible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  for (let n = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
  }
  return true;
};
const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList[0] ? '.' + el.classList[0] : ''}`;

const scan = (label) => {
  // Measure the settled state: Chrome defers animations of offscreen elements, so a pane's
  // fade-in can still be at opacity 0. Infinite loops are left alone.
  document.getAnimations().forEach((a) => {
    if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
  });
  const failures = [];
  let checked = 0;
  let unknown = 0;
  document.querySelectorAll('body *').forEach((el) => {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName) || el.closest('canvas, svg')) return;
    if (el.disabled || el.closest('[disabled], [aria-disabled="true"]')) return; // WCAG exempts inactive controls
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    const filled = gradientText(cs);
    const bgs = backgrounds(filled ? el.parentElement : el);
    if (!bgs) { unknown++; return; }
    const fgs = filled ? stops(cs.backgroundImage) : [parse(cs.color)];
    if (!fgs.length || fgs.some((c) => !c)) return;
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    const { alpha, top } = translucency(el);
    const backdrop = alpha < 1 ? (backgrounds(top.parentElement) || [])[0] : null;
    if (alpha < 1 && !backdrop) { unknown++; return; }
    let worst = null;
    for (const fg of fgs) {
      for (const bg of bgs) {
        let f = fg.a < 1 ? over(fg, bg) : fg;
        let b = bg;
        if (backdrop) { f = over({ ...f, a: alpha }, backdrop); b = over({ ...b, a: alpha }, backdrop); }
        const value = ratio(f, b);
        if (!worst || value < worst.value) worst = { value, fg: f, bg: b };
      }
    }
    checked++;
    if (worst.value < need) {
      failures.push({ el: describe(el), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), ratio: +worst.value.toFixed(2), need, fg: hex(worst.fg), bg: hex(worst.bg) });
    }
  });
  return { label, checked, unknown, failCount: failures.length, failures: failures.slice(0, 40) };
};

const theme = document.documentElement.getAttribute('data-theme');
const results = [scan('page')];
if (new URLSearchParams(location.search).get('scan') === 'demo') {
  enableDemoAndRun();
  for (let i = 0; i < 120 && !(appState.reportData && appState.reportData.overall_score); i++) await sleep(250);
  await sleep(800);
  for (const tab of ['tab-btn-report', 'tab-btn-persona', 'tab-btn-tailoring', 'tab-btn-coach']) {
    document.getElementById(tab)?.click();
    await sleep(500);
    results.push(scan(tab));
  }
}
return { theme, results };
