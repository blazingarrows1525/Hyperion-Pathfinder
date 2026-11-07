// Regression probe: the Career Atlas render schedule, input, context loss, teardown and 2D fallback.
// Frame counts under software WebGL measure loop activity, not GPU speed.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/atlas_lifecycle.js

const listenersOf = getEventListeners; // only available before the first await
const countListeners = (target, type) => (listenersOf(target)[type] || []).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const mobile = innerWidth < 768;

document.documentElement.style.scrollBehavior = 'auto';
const stage = $('spatial-canvas-wrapper');
const toStage = async () => { stage.scrollIntoView({ block: 'center' }); await sleep(250); };
await toStage();
applyMotionSetting('full', { persist: false });

let atlas = careerAtlas;
const frames = () => atlas.renderer.info.render.frame;
const framesDuring = async (ms) => { const f = frames(); await sleep(ms); return frames() - f; };
const settle = async (limit = 22000) => {
  const t0 = performance.now();
  while (atlas.schedulerState !== 'at-rest' && performance.now() - t0 < limit) await sleep(60);
  return Math.round(performance.now() - t0);
};
const endAmbient = async () => { atlas.ambientUntil = 0; return settle(); };

if (!atlas) return { checks: [{ name: 'the atlas started', ok: false, detail: 'careerAtlas is null' }] };
check('one canvas and one renderer', document.querySelectorAll('canvas').length === 1 && atlas.renderer.domElement === $('spatial-hero-canvas'));
check('the renderer caps its pixel ratio', atlas.renderer.getPixelRatio() <= 1.5, atlas.renderer.getPixelRatio());

// --- Scheduling ------------------------------------------------------------------
// Let the easing from scrolling into view finish, so the window below measures only ambient frames.
await endAmbient();
atlas.armAmbient();
await sleep(300);
let both = 0;
let samples = 0;
const sampler = setInterval(() => { samples++; if (atlas.frame && atlas.frameTimer) both++; }, 3);
const ambientFrames = await framesDuring(3000);
clearInterval(sampler);
check('never a frame and a timer pending together', both === 0, `${both} of ${samples} samples`);
check('ambient motion stays at or under its cadence', ambientFrames <= (atlas.lowDetail ? 24 : 30) * 3 + 6, `${ambientFrames} frames in 3 s`);
check('ambient motion is running in Full', ambientFrames > 5, ambientFrames);
check('ambient motion names itself', atlas.frameReasons.has('ambient-drift'), [...atlas.frameReasons].join());

// Direct input cancels a delayed frame and asks for one now.
for (let i = 0; i < 400 && !atlas.frameTimer; i++) await sleep(2);
const hadTimer = Boolean(atlas.frameTimer);
atlas.zoomBy(0.98);
check('input replaces a pending timer with an immediate frame', hadTimer && !atlas.frameTimer && Boolean(atlas.frame), `timer before ${hadTimer}; now timer ${atlas.frameTimer} frame ${atlas.frame}`);
atlas.resetCamera();

// The scene comes to rest.
const settledIn = await endAmbient();
check('the scene comes to rest when the window closes', atlas.schedulerState === 'at-rest', `${atlas.schedulerState} after ${settledIn} ms`);
check('the reasons are empty at rest', atlas.frameReasons.size === 0, [...atlas.frameReasons].join());
check('nothing renders at rest', (await framesDuring(2500)) === 0);

// The bounded window closes by itself.
check('the ambient window is bounded', ATLAS_AMBIENT_MS > 0 && ATLAS_AMBIENT_MS <= 15000, ATLAS_AMBIENT_MS);

// A direct change at rest renders, then rests again.
atlas.zoomBy(0.9);
check('a change at rest asks for a frame', Boolean(atlas.frame));
await endAmbient();
check('and rests again', atlas.schedulerState === 'at-rest');
atlas.resetCamera();
await endAmbient();

// --- Calm and reduced motion -------------------------------------------------------
atlas.armAmbient();
for (let i = 0; i < 400 && !atlas.frameTimer; i++) await sleep(2);
const timerBeforeCalm = Boolean(atlas.frameTimer);
applyMotionSetting('calm', { persist: false });
check('switching to Calm cancels a pending timer', timerBeforeCalm && !atlas.frameTimer, `before ${timerBeforeCalm}`);
await settle();
check('Calm is still', (await framesDuring(2000)) === 0);
const calmZoomStart = frames();
atlas.zoomBy(0.9);
await settle(3000);
check('in Calm a change renders only what it needs', frames() - calmZoomStart <= 4 && atlas.schedulerState === 'at-rest', frames() - calmZoomStart);
check('and nothing further', (await framesDuring(1000)) === 0);
atlas.resetCamera();
await settle(3000);
const y0 = atlas.nodes[0].mesh.position.y;
await sleep(200);
check('no bob or drift in Calm', atlas.nodes[0].mesh.position.y === y0 && atlas.ambientMix === 0);
applyMotionSetting('full', { persist: false });
check('switching back to Full starts exactly one schedule', Boolean(atlas.frame) !== Boolean(atlas.frameTimer), `frame ${atlas.frame} timer ${atlas.frameTimer}`);

// --- Offscreen and hidden ----------------------------------------------------------
window.scrollTo(0, document.documentElement.scrollHeight / 2);
await sleep(500);
check('offscreen pauses', atlas.pauseReasons.has('offscreen') && !atlas.frame && !atlas.frameTimer, atlas.schedulerState);
check('offscreen renders nothing', (await framesDuring(1200)) === 0);
atlas.requestRender();
check('a request while offscreen stays paused', !atlas.frame);
await toStage();
check('back in view resumes', !atlas.pauseReasons.has('offscreen') && (atlas.frame || atlas.frameTimer), atlas.schedulerState);
check('with one schedule', !(atlas.frame && atlas.frameTimer));

const hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
document.dispatchEvent(new Event('visibilitychange'));
check('a hidden tab pauses', atlas.pauseReasons.has('document-hidden') && !atlas.frame && !atlas.frameTimer, atlas.schedulerState);
check('a hidden tab renders nothing', (await framesDuring(800)) === 0);
delete document.hidden;
Object.defineProperty(Document.prototype, 'hidden', hiddenDescriptor);
document.dispatchEvent(new Event('visibilitychange'));
check('a visible tab resumes', !atlas.pauseReasons.has('document-hidden') && (atlas.frame || atlas.frameTimer));
await endAmbient();

// --- Modes -------------------------------------------------------------------------
const modeBtn = (mode) => document.querySelector(`.btn-3d-mode[data-mode="${mode}"]`);
const canvas = $('spatial-hero-canvas');
check('Atlas leaves the page free to scroll on touch', getComputedStyle(canvas).touchAction !== 'none', getComputedStyle(canvas).touchAction);
modeBtn('orbit').click();
await sleep(60);
check('Orbit is pressed', modeBtn('orbit').getAttribute('aria-pressed') === 'true' && modeBtn('atlas').getAttribute('aria-pressed') === 'false');
check('Orbit takes the drag inside the canvas', getComputedStyle(canvas).touchAction === 'none', getComputedStyle(canvas).touchAction);
check('the drag hint shows in Orbit', visible($('spatial-drag-hint')));

// --- Pointer: real events ----------------------------------------------------------
const screenOf = (node) => {
  const rect = canvas.getBoundingClientRect();
  const v = atlas.projected.clone().set(node.pos.x, node.mesh.position.y, node.pos.z).project(atlas.camera);
  return [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
};
await endAmbient();
const initial = appState.genome.selectedArchetypeId;
const other = atlas.nodes.find((n) => n.id !== initial);
const [dx1, dy1] = screenOf(other);
const rotBefore = atlas.targetRot.y;
await __real.drag(dx1, dy1, dx1 + 90, dy1 + 10);
await sleep(150);
check('a drag in Orbit rotates', atlas.targetRot.y !== rotBefore, `${rotBefore} -> ${atlas.targetRot.y}`);
check('releasing a drag ends it', atlas.dragging === false);
check('a drag that starts on a node does not select it', appState.genome.selectedArchetypeId === initial, appState.genome.selectedArchetypeId);
atlas.canvas.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
check('losing pointer capture is handled', atlas.dragging === false);
$('btn-3d-reset-cam-stage').click();
await endAmbient();
modeBtn('atlas').click();
await sleep(60);
await endAmbient();
for (let i = 0; i < 80 && (atlas.rot.y !== 0 || atlas.rot.x !== 0 || atlas.schedulerState !== 'at-rest'); i++) await sleep(50);

check('Atlas mode does not capture a drag', (() => { canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 100, clientY: 100, bubbles: true })); return atlas.dragging === false; })());

// Every node can be selected by a real click on its solid, and everything follows.
for (const node of atlas.nodes) {
  const [x, y] = screenOf(node);
  const hit = document.elementFromPoint(x, y);
  if (hit !== canvas) {
    check(`cluster ${node.id}: the solid is not covered`, false, hit && (hit.id || hit.className));
    continue;
  }
  await __real.click(x, y);
  await sleep(90);
  const legend = document.querySelector(`.atlas-legend-item[data-archetype-id="${node.id}"]`);
  const tab = document.querySelector(`.archetype-tab[data-arch-id="${node.id}"]`);
  check(`cluster ${node.id}: a click selects it`, appState.genome.selectedArchetypeId === node.id && atlas.selectedId === node.id, appState.genome.selectedArchetypeId);
  check(`cluster ${node.id}: the legend follows`, legend.getAttribute('aria-pressed') === 'true' && legend.classList.contains('is-selected'));
  check(`cluster ${node.id}: the Genome follows`, tab && tab.getAttribute('aria-selected') === 'true');
  check(`cluster ${node.id}: the tooltip names it`, visible($('canvas-3d-tooltip')) && $('tooltip-node-title').textContent === node.label, $('tooltip-node-title').textContent);
  const tip = $('canvas-3d-tooltip').getBoundingClientRect();
  const wrap = stage.getBoundingClientRect();
  check(`cluster ${node.id}: the tooltip stays in the stage`, tip.left >= wrap.left && tip.right <= wrap.right && tip.top >= wrap.top && tip.bottom <= wrap.bottom, `${Math.round(tip.left)},${Math.round(tip.top)} ${Math.round(tip.right)},${Math.round(tip.bottom)}`);
  const bar = stage.querySelector('.atlas-toolbar').getBoundingClientRect();
  check(`cluster ${node.id}: the tooltip clears the toolbar`, tip.bottom <= bar.top || tip.top >= bar.bottom, `${tip.top}-${tip.bottom} vs ${bar.top}-${bar.bottom}`);
}
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
check('Escape hides the tooltip', !visible($('canvas-3d-tooltip')));
check('Escape changes nothing else', appState.genome.selectedArchetypeId === atlas.nodes[atlas.nodes.length - 1].id);

// --- Legend: real keyboard -----------------------------------------------------------
const legendItems = [...document.querySelectorAll('.atlas-legend-item')];
check('all five clusters are in the legend', legendItems.length === 5);
check('legend items are buttons', legendItems.every((el) => el.tagName === 'BUTTON' && el.type === 'button'));
for (const item of legendItems) {
  item.focus();
  await __real.key('Enter');
  await sleep(40);
  const id = Number(item.dataset.archetypeId);
  check(`legend ${id}: Enter selects without leaving the stage`, appState.genome.selectedArchetypeId === id && item.getAttribute('aria-pressed') === 'true' && location.hash !== '#genome');
  check(`legend ${id}: it is announced`, $('atlas-status').textContent.includes(`Selected ${item.querySelector('.legend-name').textContent}`), $('atlas-status').textContent);
  check(`legend ${id}: the highlight previews on focus`, atlas.previewId === id, atlas.previewId);
}
legendItems[0].blur();
check('a link to the Genome remains', Boolean(document.querySelector('.atlas-legend a[href="#genome"]')));

// --- Evidence mode -------------------------------------------------------------------
selectArchetype(1);
modeBtn('evidence').click();
await sleep(80);
check('Evidence shows the card', visible($('atlas-evidence-card')));
check('the card is a live region', $('atlas-evidence-card').getAttribute('aria-live') === 'polite');
const c1 = getArchetypeCorpusCount(archetypesDatabase.find((a) => a.id === 1));
check('the card gives the real count', $('atlas-evidence-card').textContent.includes(`${c1.count} resumes`), $('atlas-evidence-card').textContent.slice(0, 80));
check('curated skills are labelled curated', /curated/i.test($('atlas-evidence-card').textContent));
selectArchetype(3);
await sleep(40);
check('the card follows the selection', $('atlas-evidence-card').textContent.includes(archetypesDatabase.find((a) => a.id === 3).name) || $('atlas-evidence-card').textContent.includes(getArchetypeLabel(archetypesDatabase.find((a) => a.id === 3))));
modeBtn('atlas').click();
await sleep(40);
check('leaving Evidence hides the card', !visible($('atlas-evidence-card')));
await endAmbient();

// --- Zoom limits ---------------------------------------------------------------------
const zoomIn = $('btn-3d-zoom-in');
const zoomOut = $('btn-3d-zoom-out');
zoomIn.focus();
for (let i = 0; i < 20 && !zoomIn.disabled; i++) zoomIn.click();
check('zoom in stops at its limit', zoomIn.disabled && atlas.targetZoom === ATLAS_ZOOM_MIN, atlas.targetZoom);
check('focus moves off the disabled button', document.activeElement === zoomOut, document.activeElement?.id);
for (let i = 0; i < 20 && !zoomOut.disabled; i++) zoomOut.click();
check('zoom out stops at its limit', zoomOut.disabled && atlas.targetZoom === ATLAS_ZOOM_MAX, atlas.targetZoom);
check('focus moves off that one too', document.activeElement === zoomIn, document.activeElement?.id);
$('btn-3d-reset-cam-stage').click();
check('reset restores the framing', atlas.targetZoom === 1 && !zoomIn.disabled && !zoomOut.disabled);
check('zoom buttons have names', zoomIn.getAttribute('aria-label') === 'Zoom in' && zoomOut.getAttribute('aria-label') === 'Zoom out');

// --- Theme and detail ----------------------------------------------------------------
const hexOf = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim().toLowerCase();
const rendererBefore = atlas.renderer;
const nodeColor = () => `#${atlas.nodes[1].mat.color.getHexString()}`;
setTheme('grove', { persist: false });
await sleep(120);
check('a theme change keeps the renderer', atlas.renderer === rendererBefore);
check('solids take the Grove colours', nodeColor() === hexOf('--arch-1-color') || nodeColor() === hexOf('--color-orchid'), `${nodeColor()} vs ${hexOf('--color-orchid')}`);
setTheme('terra', { persist: false });
await sleep(120);
check('solids return to the Terra colours', nodeColor() === hexOf('--color-orchid'), `${nodeColor()} vs ${hexOf('--color-orchid')}`);
const dotsHigh = atlas.dotOwners.length;
setDesignheadMode('minimalist', false);
await sleep(100);
check('low detail lowers the pixel ratio', atlas.renderer.getPixelRatio() === 1, atlas.renderer.getPixelRatio());
check('low detail draws fewer dots', mobile ? atlas.dotOwners.length <= dotsHigh : atlas.dotOwners.length < dotsHigh, `${dotsHigh} -> ${atlas.dotOwners.length}`);
setDesignheadMode('maximalist', false);
await sleep(100);
await endAmbient();

// --- Data truth ----------------------------------------------------------------------
const summary = appState.corpusSummary;
check('counts add up to the corpus', atlas.nodes.reduce((s, n) => s + n.count, 0) === summary.total_indexed_vectors, summary.total_indexed_vectors);
const bySize = [...atlas.nodes].sort((a, b) => a.count - b.count);
check('solid size follows the count', bySize.every((n, i) => i === 0 || n.radius >= bySize[i - 1].radius), bySize.map((n) => `${n.count}:${n.radius.toFixed(1)}`).join());
check('no personal data in the scene data', atlas.nodes.every((n) => Object.keys(getAtlasNodeData()[0]).every((k) => ['id', 'label', 'count', 'pct'].includes(k))));
check('dots are labelled illustrative', /dots are not individual records/i.test($('canvas-engine-text').textContent), $('canvas-engine-text').textContent);
check('spokes are explained', /membership, not similarity/i.test($('canvas-engine-text').textContent));
check('no links between clusters remain', !atlas.beamMeshes && !atlas.flowParticles && !atlas.ambientParticles);

// --- Labels --------------------------------------------------------------------------
const labelLayer = stage.querySelector('.atlas-node-labels');
check('the label layer is decorative for assistive technology', labelLayer.getAttribute('aria-hidden') === 'true');
check('labels do not take the pointer', getComputedStyle(labelLayer).pointerEvents === 'none');
if (stage.clientWidth >= ATLAS_LABEL_MIN_WIDTH) {
  check('labels show on a wide stage', visible(labelLayer));
  const wrap = stage.getBoundingClientRect();
  const out = [...labelLayer.children].filter((el) => { const r = el.getBoundingClientRect(); return r.left < wrap.left - 1 || r.right > wrap.right + 1 || r.top < wrap.top - 1 || r.bottom > wrap.bottom + 1; });
  check('labels stay in the stage', out.length === 0, out.map((el) => el.textContent).join('; '));
} else {
  check('labels hide on a narrow stage', !visible(labelLayer));
}

// --- Context loss --------------------------------------------------------------------
const lose = atlas.renderer.getContext().getExtension('WEBGL_lose_context');
check('the context-loss test is available', Boolean(lose));
if (lose) {
  const memoryBefore = { ...atlas.renderer.info.memory };
  const listenersBefore = atlas.listeners.length;
  selectArchetype(2);
  lose.loseContext();
  await sleep(250);
  check('context loss pauses', atlas.pauseReasons.has('context-lost') && !atlas.frame && !atlas.frameTimer, atlas.schedulerState);
  check('context loss shows the 2D map', visible($('atlas-fallback')) && !visible(canvas));
  check('context loss is announced', /paused/i.test($('atlas-status').textContent), $('atlas-status').textContent);
  const fbNodes = [...document.querySelectorAll('#atlas-fallback .fb-node')];
  check('the 2D map has all five clusters as buttons', fbNodes.length === 5 && fbNodes.every((b) => b.tagName === 'BUTTON' && b.type === 'button'));
  check('the 2D map is not hidden from assistive technology', fbNodes.every((b) => !b.closest('[aria-hidden="true"]')));
  check('the 2D map shows names and counts', fbNodes.every((b) => /\d+ resumes/.test(b.textContent)), fbNodes[0].textContent.trim());
  check('the 2D map shows the selection', fbNodes.find((b) => b.dataset.archetypeId === '2').getAttribute('aria-pressed') === 'true');
  const fbTarget = fbNodes.find((b) => b.dataset.archetypeId === '4');
  fbTarget.focus();
  await __real.key('Enter');
  await sleep(50);
  check('the 2D map selects from the keyboard', appState.genome.selectedArchetypeId === 4 && fbTarget.getAttribute('aria-pressed') === 'true', appState.genome.selectedArchetypeId);
  check('the 2D map syncs the legend', document.querySelector('.atlas-legend-item[data-archetype-id="4"]').getAttribute('aria-pressed') === 'true');
  const wrapRect = stage.getBoundingClientRect();
  const clipped = fbNodes.filter((b) => { const r = b.getBoundingClientRect(); return r.left < wrapRect.left - 1 || r.right > wrapRect.right + 1 || r.top < wrapRect.top - 1 || r.bottom > wrapRect.bottom + 1; });
  check('the 2D buttons fit the stage', clipped.length === 0, clipped.map((b) => b.textContent.trim().slice(0, 20)).join('; '));
  const tooSmall = fbNodes.filter((b) => b.getBoundingClientRect().height < 44);
  check('the 2D buttons are large enough', tooSmall.length === 0, tooSmall.length);

  lose.restoreContext();
  await sleep(700);
  check('restoring returns to 3D', !visible($('atlas-fallback')) && visible(canvas));
  check('restoring resumes', !atlas.pauseReasons.has('context-lost'), atlas.schedulerState);
  check('restoring keeps the selection', atlas.selectedId === 4);
  check('restoring binds nothing twice', atlas.listeners.length === listenersBefore, `${listenersBefore} -> ${atlas.listeners.length}`);
  check('restoring builds one scene', atlas.pickables.length === 5 && stage.querySelectorAll('.atlas-node-labels').length === 1);
  await endAmbient();
  await sleep(100);
  const memoryAfter = atlas.renderer.info.memory;
  check('restoring leaves no extra GPU resources', memoryAfter.geometries <= memoryBefore.geometries && memoryAfter.textures <= memoryBefore.textures, `${JSON.stringify(memoryBefore)} -> ${JSON.stringify(memoryAfter)}`);
  check('restoring announces it', /back/i.test($('atlas-status').textContent), $('atlas-status').textContent);
}

// --- Dispose and re-init -------------------------------------------------------------
await endAmbient();
const baseline = { ...atlas.renderer.info.memory };
const canvasDown = countListeners(canvas, 'pointerdown');
const docKeys = countListeners(document, 'keydown');
const old = atlas;
cleanup3DScene();
check('dispose leaves nothing scheduled', old.disposed && !old.frame && !old.frameTimer && old.schedulerState === 'disposed');
check('dispose removes the canvas listeners', countListeners(canvas, 'pointerdown') === canvasDown - 1, `${canvasDown} -> ${countListeners(canvas, 'pointerdown')}`);
check('dispose removes the labels', stage.querySelectorAll('.atlas-node-labels').length === 0);
old.dispose();
check('dispose is safe to repeat', old.disposed);
for (let i = 0; i < 6; i++) {
  init3DScene();
  await sleep(i === 5 ? 500 : 60);
  if (i < 5) cleanup3DScene();
}
atlas = careerAtlas;
await endAmbient();
await sleep(100);
const memory = atlas.renderer.info.memory;
check('repeated init and dispose do not grow GPU resources', memory.geometries <= baseline.geometries && memory.textures <= baseline.textures, `${JSON.stringify(baseline)} -> ${JSON.stringify(memory)}`);
check('or listeners on the canvas', countListeners(canvas, 'pointerdown') === canvasDown, countListeners(canvas, 'pointerdown'));
check('or on the document', countListeners(document, 'keydown') === docKeys, `${docKeys} -> ${countListeners(document, 'keydown')}`);
check('or canvases', document.querySelectorAll('canvas').length === 1);
check('or label layers', stage.querySelectorAll('.atlas-node-labels').length === 1);
check('a second init is ignored', (() => { const before = careerAtlas; init3DScene(); return careerAtlas === before; })());
check('the new scene renders', (atlas.armAmbient(), await framesDuring(500)) > 0);
await endAmbient();

// --- Renderer failure ----------------------------------------------------------------
cleanup3DScene();
const realRenderer = THREE.WebGLRenderer;
THREE.WebGLRenderer = function FailingRenderer() { throw new Error('no renderer'); };
init3DScene();
THREE.WebGLRenderer = realRenderer;
check('a failed renderer falls back to 2D', careerAtlas === null && visible($('atlas-fallback')));
check('and binds nothing', countListeners(canvas, 'pointerdown') === 0, countListeners(canvas, 'pointerdown'));

// --- Low-power start -----------------------------------------------------------------
hideAtlasFallback();
Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 1 });
init3DScene();
check('a low-memory device starts in 2D', careerAtlas === null && visible($('atlas-fallback')));
const load3d = document.querySelector('#atlas-fallback .atlas-load-3d');
check('with the choice to load 3D', visible(load3d), $('atlas-fallback').textContent.slice(-80));
load3d.click();
await sleep(400);
delete navigator.deviceMemory;
check('the choice works', careerAtlas !== null && !visible($('atlas-fallback')) && visible(canvas));

// --- Keep the page usable for whatever runs next. ------------------------------------
window.scrollTo(0, 0);
return { checks };
