// Load timing, paint entries, CLS, long tasks, requests and Career Atlas renderer counts.
// Needs ?debug3d for the atlas block: node scripts/ui_audit.mjs --url http://127.0.0.1:8000/?debug3d --no-shots --eval-file scripts/ui_probes/load_performance.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const buffered = (type) => new Promise((resolve) => {
  const out = [];
  try {
    const po = new PerformanceObserver((list) => out.push(...list.getEntries()));
    po.observe({ type, buffered: true });
    setTimeout(() => { po.disconnect(); resolve(out); }, 300);
  } catch (e) { resolve(null); }
});
const nav = performance.getEntriesByType('navigation')[0];
const res = performance.getEntriesByType('resource');
const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
const lcp = await buffered('largest-contentful-paint');
const cls = await buffered('layout-shift');
const longTasks = await buffered('longtask');
const a = window.careerAtlas;
const frame = () => (a && a.renderer && a.renderer.info ? a.renderer.info.render.frame : null);
window.scrollTo(0, 0);
await sleep(600);
const f0 = frame();
await sleep(3000);
const f1 = frame();
const zoom = document.getElementById('btn-3d-zoom-in');
if (zoom) zoom.click();
await sleep(2500);
const f2 = frame();
const info = a && a.renderer ? a.renderer.info : null;
return {
  domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
  loadMs: Math.round(nav.loadEventEnd),
  paints,
  lcpMs: lcp && lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null,
  lcpElement: lcp && lcp.length && lcp[lcp.length - 1].element ? lcp[lcp.length - 1].element.tagName.toLowerCase() + (lcp[lcp.length - 1].element.id ? '#' + lcp[lcp.length - 1].element.id : '') : null,
  cls: cls ? +cls.filter((e) => !e.hadRecentInput).reduce((s, e) => s + e.value, 0).toFixed(4) : null,
  longTasks: longTasks ? longTasks.length : null,
  longTaskTotalMs: longTasks ? Math.round(longTasks.reduce((s, t) => s + t.duration, 0)) : null,
  requests: res.length + 1,
  resources: res.map((r) => `${r.initiatorType} ${r.name.replace(location.origin, '')} ${Math.round(r.transferSize / 1024)}KB ${Math.round(r.duration)}ms`),
  heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  canvases: document.querySelectorAll('canvas').length,
  atlas: a ? {
    idleFrames3s: f1 - f0,
    zoomFrames: f2 - f1,
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    pauseReasons: [...a.pauseReasons],
    pixelRatio: a.renderer.getPixelRatio(),
  } : '(window.careerAtlas missing: load with ?debug3d)',
};
