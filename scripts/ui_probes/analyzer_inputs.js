// Regression probe: the resume picker and job description field, driven with real input events.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/analyzer_inputs.js
// Returns { checks: [{ name, ok, detail }] }. tests/test_ui_browser.py fails on any check that is not ok.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const dropzone = $('resume-dropzone');
const input = $('resume-file-input');
const mobile = innerWidth < 768;
const press = (el) => (mobile ? __real.tapEl(el) : __real.clickEl(el));

document.documentElement.style.scrollBehavior = 'auto';
await __cdp('Page.setInterceptFileChooserDialog', { enabled: true });
const choosers = () => __cdpEvents.filter((e) => e.method === 'Page.fileChooserOpened').length;
const opensChooser = async (action) => {
  const before = choosers();
  await action();
  for (let i = 0; i < 25 && choosers() === before; i++) await sleep(80);
  return choosers() > before;
};

// --- Pointer and touch ------------------------------------------------------
dropzone.scrollIntoView({ block: 'center', behavior: 'auto' });
await sleep(120);
const [cx, cy] = __real.centerOf(dropzone);
check('the centre of the dropzone hit-tests to the file input', document.elementFromPoint(cx, cy) === input, document.elementFromPoint(cx, cy)?.tagName);
check(`${mobile ? 'tapping' : 'clicking'} the dropzone opens the file chooser`, await opensChooser(() => press(dropzone)));
const label = document.querySelector('label[for="resume-file-input"]');
check('clicking the visible label opens the file chooser', await opensChooser(() => __real.clickEl(label)));

// --- Keyboard ---------------------------------------------------------------
check('the dropzone wrapper is no longer a tab stop', !dropzone.hasAttribute('tabindex') && dropzone.getAttribute('role') !== 'button');
input.focus();
check('the input can take focus', document.activeElement === input);
const outline = getComputedStyle(dropzone).outlineStyle;
check('focus shows a ring on the dropzone', outline !== 'none', outline);
check('Enter opens the file chooser', await opensChooser(() => __real.key('Enter')));
input.focus();
check('Space opens the file chooser', await opensChooser(() => __real.key('Space')));

// --- Names and descriptions -------------------------------------------------
const described = (input.getAttribute('aria-describedby') || '').split(/\s+/);
check('the input is described by its limits and its error', described.includes('resume-file-hint') && described.includes('file-error-msg'), described.join(' '));
check('the input has no competing aria-label', !input.hasAttribute('aria-label'));
check('"required" is text, not only a colour or asterisk', /required/i.test(label.textContent));

await __cdp('Page.setInterceptFileChooserDialog', { enabled: false });

// --- Validation -------------------------------------------------------------
const choose = (file) => {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};
const errorText = (id) => ($(id).classList.contains('visible') ? $(id).textContent : '');
const pdf = (name, bytes = 2048) => new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });

choose(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
check('a non-PDF is refused beside the field', /not a PDF/i.test(errorText('file-error-msg')), errorText('file-error-msg'));
check('the refused file marks the input invalid', input.getAttribute('aria-invalid') === 'true');
check('nothing was attached', appState.analyzer.selectedFile === null);
check('the input is reset, so the same file can be chosen again', input.value === '');

choose(new File([], 'empty.pdf', { type: 'application/pdf' }));
check('an empty PDF is refused', /empty/i.test(errorText('file-error-msg')), errorText('file-error-msg'));

choose(pdf('huge.pdf', 10 * 1024 * 1024 + 1));
check('a PDF over 10 MB is refused with its size', /10\.0 MB|over the 10 MB/.test(errorText('file-error-msg')), errorText('file-error-msg'));

choose(pdf('good.pdf'));
check('a valid PDF clears the error', errorText('file-error-msg') === '' && !input.hasAttribute('aria-invalid'));
check('a valid PDF shows its name and size', /good\.pdf \(2 KB\)/.test($('selected-filename').textContent), $('selected-filename').textContent);
check('the pill is visible', getComputedStyle($('selected-file-pill')).display !== 'none');

choose(new File(['x'], 'notes.txt', { type: 'text/plain' }));
check('a later bad file keeps the good one and says so', appState.analyzer.selectedFile?.name === 'good.pdf' && /good\.pdf is still attached/.test(errorText('file-error-msg')), errorText('file-error-msg'));

// The remove button sits inside the dropzone, above the input.
const clearBtn = $('clear-file-btn');
clearBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
await sleep(100);
const [bx, by] = __real.centerOf(clearBtn);
check('the remove button receives the pointer, not the input', clearBtn.contains(document.elementFromPoint(bx, by)), document.elementFromPoint(bx, by)?.tagName);
await press(clearBtn);
await sleep(100);
check('remove clears the selection', appState.analyzer.selectedFile === null && getComputedStyle($('selected-file-pill')).display === 'none');
check('remove returns focus to the file input', document.activeElement === input, document.activeElement?.id);

// --- Job description --------------------------------------------------------
const jd = $('jd-textarea');
const setJd = (value) => { jd.value = value; jd.dispatchEvent(new Event('input', { bubbles: true })); };
$('btn-analyze-submit').scrollIntoView({ block: 'center', behavior: 'auto' });
setJd('');
$('btn-analyze-submit').click();
await sleep(60);
check('a run with nothing filled in reports the missing file', /resume PDF/i.test(errorText('file-error-msg')), errorText('file-error-msg'));
check('and the missing job description', /job description/i.test(errorText('jd-error-msg')), errorText('jd-error-msg'));
check('and moves focus to the first problem', document.activeElement === input, document.activeElement?.id);
check('and sends nothing', appState.analyzer.status !== 'submitting' && appState.analyzer.status !== 'streaming');

setJd('x'.repeat(20000));
check('20,000 characters is allowed', errorText('jd-error-msg') === '', errorText('jd-error-msg'));
check('the counter shows the limit', $('jd-char-count').textContent === '20,000 of 20,000 characters', $('jd-char-count').textContent);
setJd('x'.repeat(20001));
check('20,001 characters is refused beside the field', /20,000 character limit/.test(errorText('jd-error-msg')), errorText('jd-error-msg'));
check('the textarea is marked invalid', jd.getAttribute('aria-invalid') === 'true');
setJd('ह'.repeat(4000));
check('text that encodes too long for one request is refused', /too many symbols/.test(errorText('jd-error-msg')), errorText('jd-error-msg'));

setJd('Backend engineer');
check('a normal job description clears the error', errorText('jd-error-msg') === '' && !jd.hasAttribute('aria-invalid'));
$('btn-clear-jd').click();
check('clear empties the field and resets the counter', jd.value === '' && $('jd-char-count').textContent === '0 of 20,000 characters', $('jd-char-count').textContent);
check('clear returns focus to the field', document.activeElement === jd);

window.confirm = () => true;
const preset = document.querySelector('.btn-preset-chip[data-preset="google"]');
preset.click();
check('a sample fills the textarea', jd.value.length > 50, jd.value.length);
check('a sample updates the counter', $('jd-char-count').textContent.startsWith(jd.value.length.toLocaleString()), $('jd-char-count').textContent);
check('a sample reaches the state', appState.analyzer.jobDescription === jd.value);

return { checks };
