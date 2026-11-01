// Frames the Career Atlas renders at rest in Full and Calm motion, and offscreen.
// Needs ?debug3d: node scripts/ui_audit.mjs --url http://127.0.0.1:8000/?debug3d --widths 1440 --no-shots --eval-file scripts/ui_probes/atlas_frames.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const a = window.careerAtlas;
if (!a) return 'window.careerAtlas missing (load with ?debug3d)';
const frames = () => a.renderer.info.render.frame;
document.documentElement.style.scrollBehavior = 'auto';
document.getElementById('spatial-canvas-wrapper').scrollIntoView({ block: 'center' });
await sleep(1000);
const out = {};
for (const [label, mode] of [['full', 'full'], ['calm', 'calm'], ['fullAgain', 'full']]) {
  applyMotionSetting(mode, { persist: false });
  await sleep(1500);
  const f0 = frames();
  await sleep(3000);
  out[label] = { framesIn3s: frames() - f0, reducedMotion: a.reducedMotion, pauseReasons: [...a.pauseReasons] };
}
window.scrollTo(0, document.documentElement.scrollHeight / 2);
await sleep(1500);
const g0 = frames();
await sleep(2000);
out.offscreenFull = { framesIn2s: frames() - g0, pauseReasons: [...a.pauseReasons] };
const info = a.renderer.info;
out.renderer = { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, pixelRatio: a.renderer.getPixelRatio(), canvases: document.querySelectorAll('canvas').length };
return out;
