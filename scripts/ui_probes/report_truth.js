// Checks that the score ring, the rubric meters and the tailoring view always show what the
// structured report contains: after the illustrative demo, and after recalculating the demo draft
// against the backend. Run against a deterministic server:
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440 --no-shots --eval-file scripts/ui_probes/report_truth.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const METERS = ['skills', 'projects', 'domain', 'metrics', 'structure'];
const view = () => {
  const meters = Object.fromEntries(METERS.map((k) => {
    const m = (document.getElementById(`meter-val-${k}`)?.textContent || '').match(/([\d.]+|—)\s*\/\s*(\d+)/);
    return [k, m ? m[1] : null];
  }));
  return {
    ring: document.getElementById('mini-score-val')?.textContent.trim(),
    meters,
    meterSum: +Object.values(meters).reduce((s, v) => s + (Number.isFinite(+v) ? +v : 0), 0).toFixed(1),
    details: METERS.map((k) => document.getElementById(`meter-detail-${k}`)?.textContent || ''),
    spans: document.querySelectorAll('[data-markup-id]').length,
    provenance: document.getElementById('provenance-tag')?.textContent.trim(),
  };
};
const out = { initial: view() };

enableDemoAndRun();
for (let i = 0; i < 120 && !(appState.reportData && appState.reportData.overall_score); i++) await sleep(250);
await sleep(800);
document.getElementById('tab-btn-tailoring')?.click();
await sleep(500);
out.demo = { ...view(), reportScore: appState.reportData?.overall_score };

document.getElementById('btn-recalculate-draft')?.click();
const before = appState.resumeDraft.currentRevisionId;
for (let i = 0; i < 60; i++) {
  await sleep(250);
  if (!document.getElementById('btn-recalculate-draft')?.disabled && appState.analyzer.extractedScore !== 86) break;
}
await sleep(600);
out.recalculated = { ...view(), revisionBefore: before, revisionAfter: appState.resumeDraft.currentRevisionId, extractedScore: appState.analyzer.extractedScore };
document.getElementById('tab-btn-report')?.click();
return out;
