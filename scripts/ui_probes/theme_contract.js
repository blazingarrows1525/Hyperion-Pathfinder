// Theme contract: legacy preferences migrate once, the pre-paint script resolves the same IDs as
// app.js, and switching themes recolours the Career Atlas in place without losing the report.
// Needs ?debug3d: node scripts/ui_audit.mjs --url "http://127.0.0.1:8010/?debug3d" --widths 1440 --no-shots --eval-file scripts/ui_probes/theme_contract.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = document.documentElement;
const keys = ['career_ui_theme_v2', 'resume_checker_theme'];
const snapshotStorage = () => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
const prepaint = [...document.querySelectorAll('head script:not([src])')].find((s) => s.textContent.includes('career_ui_theme_v2'));
const runPrepaint = () => { root.setAttribute('data-theme', 'terra'); new Function(prepaint.textContent)(); return root.getAttribute('data-theme'); };

const migration = [];
for (const [key, value] of [['career_ui_theme_v2', 'terra'], ['career_ui_theme_v2', 'grove'], ['resume_checker_theme', 'cyber'],
  ['resume_checker_theme', 'ceramic'], ['career_ui_theme_v2', 'bogus'], ['career_ui_theme_v2', '__proto__']]) {
  keys.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(key, value);
  const prepainted = runPrepaint();
  const resolved = getSavedTheme();
  migration.push({ stored: `${key}=${value}`, prepainted, resolved, after: snapshotStorage() });
}
keys.forEach((k) => localStorage.removeItem(k));
setTheme('terra', { persist: false });

enableDemoAndRun();
for (let i = 0; i < 120 && !(appState.reportData && appState.reportData.overall_score); i++) await sleep(250);
const atlas = window.careerAtlas;
const renderer = atlas && atlas.renderer;
const nodeColour = () => (atlas && atlas.nodes[0] ? '#' + atlas.nodes[0].mat.color.getHexString() : null);
const before = { theme: root.getAttribute('data-theme'), node: nodeColour(), ring: document.getElementById('mini-score-val').textContent, analysis: appState.reportData.analysis_id, canvas: getComputedStyle(root).getPropertyValue('--color-canvas').trim() };
document.getElementById('btn-theme-toggle').click();
await sleep(400);
const after = { theme: root.getAttribute('data-theme'), node: nodeColour(), ring: document.getElementById('mini-score-val').textContent, analysis: appState.reportData.analysis_id, canvas: getComputedStyle(root).getPropertyValue('--color-canvas').trim() };
const toggle = document.getElementById('btn-theme-toggle');
return {
  migration,
  switchInPlace: {
    before, after,
    sameRenderer: !!renderer && window.careerAtlas && window.careerAtlas.renderer === renderer,
    canvases: document.querySelectorAll('canvas').length,
    stored: localStorage.getItem('career_ui_theme_v2'),
    label: document.getElementById('theme-mode-label').textContent,
    ariaLabel: toggle.getAttribute('aria-label'),
    ariaPressed: toggle.getAttribute('aria-pressed'),
    colorScheme: getComputedStyle(root).colorScheme,
  },
};
