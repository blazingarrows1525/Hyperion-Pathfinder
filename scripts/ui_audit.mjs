// Dependency-free UI audit harness: drives headless Chrome/Edge over the DevTools
// protocol to capture section screenshots and check horizontal overflow per viewport.
//
//   node scripts/ui_audit.mjs --out docs/terra-atelier/after [--url http://127.0.0.1:8000/]
//        [--widths 360,375,1440] [--sections hero,analyzer] [--no-shots] [--theme grove]
//        [--reduced-motion] [--eval "js run in the page before measuring"] [--tag name]
//        [--eval-file scripts/ui_probes/<probe>.js]
//
// --eval may return a Promise; it runs after load (and after --theme). --eval-file reads
// the same kind of body from a file (see scripts/ui_probes/). --tag names the screenshot
// files <section>.<tag>.jpg so several states can share one folder.
//
// Writes <out>/<width>/<section>.jpg and <out>/audit.json (overflow, console errors,
// failed requests, static DOM checks). Requires the backend to be running.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const URL_ = opt('url', 'http://127.0.0.1:8000/');
const OUT = resolve(opt('out', 'ui-audit-out'));
const SHOTS = !flag('no-shots');
const THEME = opt('theme', '');
const REDUCED = flag('reduced-motion');
const EVAL_FILE = opt('eval-file', '');
const EVAL = EVAL_FILE ? readFileSync(EVAL_FILE, 'utf8') : opt('eval', '');
const TAG = opt('tag', '');
const VIEWPORTS = {
  320: 640, 360: 780, 375: 812, 390: 844, 414: 896, 430: 932, 768: 1024, 800: 900,
  980: 900, 1024: 768, 1280: 800, 1440: 900, 1920: 1080,
};
const WIDTHS = opt('widths', '375,1440').split(',').map(Number);
const SECTIONS = opt('sections', 'hero,placement-snapshot,analyzer,genome,company-intel,prompt-studio,faq').split(',');

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const browserPath = BROWSERS.find(existsSync);
if (!browserPath) throw new Error('No Chrome/Edge executable found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Port 0 lets the browser pick a free port, so concurrent runs cannot collide.
const profile = mkdtempSync(join(tmpdir(), 'ui-audit-'));
const proc = spawn(browserPath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\s+/)[0];
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* browser still starting */ }
    await sleep(200);
  }
  throw new Error('DevTools endpoint did not come up');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method) {
    listeners.forEach((fn) => fn(msg));
  }
});
ws.addEventListener('close', () => {
  pending.forEach(({ rej }) => rej(new Error('The browser closed the DevTools connection')));
  pending.clear();
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  // includeCommandLineAPI exposes getEventListeners() to probes (scripts/ui_probes/control_census.js).
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, includeCommandLineAPI: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
  return r.result.value;
};

const consoleErrors = [];
const failedRequests = [];
listeners.push((msg) => {
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description?.split('\n')[0] || 'exception');
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  } else if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) {
    failedRequests.push(msg.params.errorText);
  } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
    failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
  }
});

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
if (REDUCED) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
}

async function load(width, height) {
  const mobile = width < 768;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  const loaded = new Promise((r) => {
    const fn = (msg) => { if (msg.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(fn), 1); r(); } };
    listeners.push(fn);
  });
  await send('Page.navigate', { url: URL_ });
  await loaded;
  if (THEME) {
    await evaluate(`(window.setTheme ? setTheme(${JSON.stringify(THEME)}) : document.documentElement.setAttribute('data-theme', ${JSON.stringify(THEME)}), true)`);
  }
  await sleep(2500);
  let evalResult = null;
  if (EVAL) {
    evalResult = await evaluate(`(async () => { ${EVAL}\n })()`);
    await sleep(800);
  }
  return evalResult;
}

const STATIC_CHECKS = `(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const untyped = [...document.querySelectorAll('button:not([type])')].length;
  const missing = [];
  document.querySelectorAll('[onclick],[onchange],[oninput],[onkeydown],[onsubmit]').forEach((el) => {
    for (const attr of ['onclick', 'onchange', 'oninput', 'onkeydown', 'onsubmit']) {
      const code = el.getAttribute(attr);
      if (!code) continue;
      const m = code.match(/^\\s*([A-Za-z_$][\\w$]*)\\s*\\(/);
      if (m && typeof window[m[1]] !== 'function') missing.push(m[1]);
    }
  });
  return { duplicateIds: dupes, untypedButtons: untyped, missingHandlers: [...new Set(missing)],
           sections: [...document.querySelectorAll('section[id], header[id], footer[id]')].map((s) => s.id),
           theme: document.documentElement.getAttribute('data-theme') || '(none)',
           canvases: document.querySelectorAll('canvas').length };
})()`;

const OVERFLOW = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.visibility === 'hidden') return;
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) {
        const ps = getComputedStyle(p);
        if (/(hidden|auto|scroll|clip)/.test(ps.overflowX)) { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped) offenders.push(\`\${el.tagName.toLowerCase()}\${el.id ? '#' + el.id : ''}\${el.classList[0] ? '.' + el.classList[0] : ''} [\${Math.round(r.left)}..\${Math.round(r.right)}]\`);
    }
  });
  return { scrollWidth: de.scrollWidth, clientWidth: vw, overflow: de.scrollWidth > vw, offenders: offenders.slice(0, 12) };
})()`;

const report = { url: URL_, browser: browserPath, theme: THEME || 'default', reducedMotion: REDUCED, viewports: {} };
mkdirSync(OUT, { recursive: true });
try {
  for (const width of WIDTHS) {
    const height = VIEWPORTS[width] || 900;
    consoleErrors.length = 0;
    failedRequests.length = 0;
    const evalResult = await load(width, height);
    const entry = { height, static: await evaluate(STATIC_CHECKS), overflow: await evaluate(OVERFLOW), shots: [] };
    if (evalResult !== null && evalResult !== undefined) entry.evalResult = evalResult;
    if (SHOTS) {
      mkdirSync(join(OUT, String(width)), { recursive: true });
      for (const id of SECTIONS) {
        const found = await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) return false;
          document.documentElement.style.scrollBehavior = 'auto';
          if (${JSON.stringify(id)} === 'hero') window.scrollTo(0, 0); else el.scrollIntoView({ block: 'start' });
          return true; })()`);
        if (!found) { entry.shots.push(`${id}: missing`); continue; }
        await sleep(900);
        const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
        const file = `${id}${TAG ? `.${TAG}` : ''}.jpg`;
        writeFileSync(join(OUT, String(width), file), Buffer.from(shot.data, 'base64'));
        entry.shots.push(`${width}/${file}`);
      }
    }
    entry.consoleErrors = [...new Set(consoleErrors)];
    entry.failedRequests = [...new Set(failedRequests)];
    report.viewports[width] = entry;
    const o = entry.overflow;
    console.log(`${width}x${height}: scrollWidth=${o.scrollWidth} clientWidth=${o.clientWidth} overflow=${o.overflow}`
      + ` errors=${entry.consoleErrors.length} failed=${entry.failedRequests.length}`);
  }
} finally {
  writeFileSync(join(OUT, TAG ? `audit.${TAG}.json` : 'audit.json'), JSON.stringify(report, null, 2));
  ws.close();
  proc.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile still locked */ }
}
