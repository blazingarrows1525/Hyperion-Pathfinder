// Career Atlas render scheduler: the scheduler's state, the reasons keeping it running and the
// frames rendered at rest. Full motion gets a bounded ambient window after load or interaction,
// then settles and renders nothing; Calm renders only while an explicit action eases; offscreen
// renders nothing. Frame counts under headless SwiftShader measure loop activity, not FPS:
// compositing can drop to a few frames a second right after a scroll. Needs ?debug3d:
//   node scripts/ui_audit.mjs --url "http://127.0.0.1:8010/?debug3d" --widths 1440 --no-shots --eval-file scripts/ui_probes/atlas_frames.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const a = window.careerAtlas;
if (!a) return 'window.careerAtlas missing (load with ?debug3d)';
const frames = () => a.renderer.info.render.frame;
const snapshot = () => ({ state: a.schedulerState, reasons: [...a.frameReasons] });
const atRest = async (ms) => {
  const f0 = frames();
  await sleep(ms);
  return { frames: frames() - f0, ...snapshot() };
};
// Time until the scheduler stops asking for frames.
const settle = async () => {
  const t0 = performance.now();
  while (a.schedulerState !== 'ready-idle' && performance.now() - t0 < 30000) await sleep(100);
  return Math.round(performance.now() - t0);
};
document.documentElement.style.scrollBehavior = 'auto';
document.getElementById('spatial-canvas-wrapper').scrollIntoView({ block: 'center' });
applyMotionSetting('full', { persist: false });
await sleep(1000);

const out = {};
a.armAmbient();
await sleep(300);
out.fullAmbient = snapshot();
out.fullSettleMs = await settle();
out.fullAtRest3s = await atRest(3000);

const f0 = frames();
document.getElementById('btn-3d-zoom-in').click();
out.fullZoomSettleMs = await settle();
out.fullZoomFrames = frames() - f0;
out.fullAtRestAgain3s = await atRest(3000);

applyMotionSetting('calm', { persist: false });
await settle();
out.calmAtRest3s = await atRest(3000);
const f1 = frames();
document.getElementById('btn-3d-zoom-out').click();
out.calmZoomSettleMs = await settle();
out.calmZoomFrames = frames() - f1;
out.calmAtRestAgain3s = await atRest(3000);

applyMotionSetting('full', { persist: false });
window.scrollTo(0, document.documentElement.scrollHeight / 2);
await sleep(1500);
out.offscreen2s = await atRest(2000);
const info = a.renderer.info;
out.renderer = { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, pixelRatio: a.renderer.getPixelRatio(), canvases: document.querySelectorAll('canvas').length };
return out;
