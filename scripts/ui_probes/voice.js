// Regression probe: dictation and spoken briefing. SpeechRecognition and speechSynthesis are stubbed,
// so this runs without a microphone and repeats exactly; the panel and its controls are real.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,375 --no-shots --eval-file scripts/ui_probes/voice.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const orb = $('voice-orb-btn');
const drawer = $('voice-assistant-drawer');
const press = (el) => (innerWidth < 768 ? __real.tapEl(el) : __real.clickEl(el));

// --- The panel really opens ------------------------------------------------------------
check('the panel starts closed', !visible(drawer) && orb.getAttribute('aria-expanded') === 'false');
check('nothing is listening at load', appState.voice.recognition === null);
await press(orb);
await sleep(120);
check('the button opens the panel, visibly', visible(drawer) && drawer.getBoundingClientRect().height > 100, getComputedStyle(drawer).display);
check('the button reports it', orb.getAttribute('aria-expanded') === 'true');
const box = drawer.getBoundingClientRect();
check('the panel fits the screen', box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, `${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.right)},${Math.round(box.bottom)} of ${innerWidth}x${innerHeight}`);
const canScroll = getComputedStyle(drawer).overflowY === 'auto';
check('its contents can be reached', drawer.scrollHeight <= drawer.clientHeight || canScroll);
check('focus moves into it', drawer.contains(document.activeElement), document.activeElement?.id);
await __real.key('Escape');
await sleep(60);
check('Escape closes it', !visible(drawer) && orb.getAttribute('aria-expanded') === 'false');
check('and returns focus', document.activeElement === orb, document.activeElement?.id);
orb.click();
await sleep(40);
$('voice-drawer-close-btn').click();
await sleep(40);
check('the close button closes it and returns focus', !visible(drawer) && document.activeElement === orb);

// --- Dictation, with a stub standing in for the browser's recognizer ---------------------
const instances = [];
class FakeRecognition {
  constructor() { instances.push(this); this.running = false; }
  start() { if (this.running) throw new DOMException('already started', 'InvalidStateError'); this.running = true; this.onstart && this.onstart(); }
  stop() { this.running = false; this.onend && this.onend(); }
}
const realSR = window.SpeechRecognition;
const realWebkit = window.webkitSpeechRecognition;
window.SpeechRecognition = FakeRecognition;
window.webkitSpeechRecognition = FakeRecognition;
appState.voice.recognition = null;
appState.voice.status = 'idle';
appState.voice.sttSupport = 'supported';
$('voice-record-btn').disabled = false;

orb.click();
await sleep(40);
const startsBefore = instances.length;
check('opening the panel does not start the microphone', instances.length === startsBefore && appState.voice.status !== 'listening');
$('voice-record-btn').click();
await sleep(30);
check('starting is explicit and shows on the panel', appState.voice.status === 'listening' && /listening/i.test($('voice-status-badge').textContent), $('voice-status-badge').textContent);
check('the button offers to stop', $('voice-record-btn-text').textContent === 'Stop listening', $('voice-record-btn-text').textContent);
check('the status says audio may leave', /speech service/.test($('voice-live-status-desc').textContent), $('voice-live-status-desc').textContent);
check('the level bars animate on the right element', $('voice-pulse-surface').classList.contains('listening'));
check('listening shows on the button too', orb.classList.contains('listening'));
const rec = instances[instances.length - 1];
rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'Backend engineer' }], { isFinal: true })] });
check('words reach the text box', $('voice-transcript-preview').value === 'Backend engineer', $('voice-transcript-preview').value);
check('insert becomes available', !$('voice-apply-btn').disabled);
check('the source is stated', /speech recognition/i.test($('voice-source-indicator').textContent), $('voice-source-indicator').textContent);

// Closing the panel must stop the microphone.
$('voice-drawer-close-btn').click();
await sleep(30);
check('closing the panel stops listening', rec.running === false && appState.voice.status !== 'listening', appState.voice.status);
check('and the visible state with it', !orb.classList.contains('listening'));

// Toggling the orb closed must too.
orb.click();
await sleep(20);
$('voice-record-btn').click();
await sleep(20);
orb.click();
await sleep(20);
check('closing from the floating button also stops listening', rec.running === false && !visible(drawer));

// Errors
orb.click();
await sleep(20);
for (const [code, phrase] of [['not-allowed', /refused/], ['no-speech', /No speech/], ['audio-capture', /No microphone/], ['network', /network/], ['something-new', /stopped/i]]) {
  $('voice-record-btn').click();
  await sleep(10);
  rec.onerror({ error: code });
  rec.running = false;
  await sleep(10);
  check(`${code}: explained`, phrase.test($('voice-live-status-desc').textContent), $('voice-live-status-desc').textContent);
  check(`${code}: back to a usable state`, $('voice-record-btn-text').textContent === 'Start listening' && !orb.classList.contains('listening'));
}

// --- Inserting -------------------------------------------------------------------------------
const jd = $('jd-textarea');
const preview = $('voice-transcript-preview');
const typeText = (text) => { preview.value = text; preview.dispatchEvent(new Event('input', { bubbles: true })); };
$('voice-discard-btn').click();
check('clear empties the box', preview.value === '' && $('voice-apply-btn').disabled);
typeText('Typed text works too');
check('typing enables insert', !$('voice-apply-btn').disabled);
check('typed text says so', /Typed/.test($('voice-source-indicator').textContent), $('voice-source-indicator').textContent);
$('voice-dest-select').value = 'replace_jd';
jd.value = 'Old text';
$('voice-apply-btn').click();
await sleep(30);
check('replace puts it in the job description', jd.value === 'Typed text works too', jd.value);
check('the counter follows', $('jd-char-count').textContent.startsWith('20 of'), $('jd-char-count').textContent);
check('the panel closes and focus goes to the field', !visible(drawer) && document.activeElement === jd && orb.getAttribute('aria-expanded') === 'false');

orb.click();
await sleep(20);
typeText('More');
$('voice-dest-select').value = 'append_jd';
$('voice-apply-btn').click();
await sleep(30);
check('add puts it at the end', jd.value === 'Typed text works too\n\nMore', jd.value);

orb.click();
await sleep(20);
typeText('A question');
$('voice-dest-select').value = 'coach_message';
$('voice-apply-btn').click();
await sleep(50);
check('coach puts it in the question box', $('coach-query-input').value === 'A question' && visible($('pane-career-coach')));
check('it is not sent', /Press Ask/.test($('toast-message').textContent), $('toast-message').textContent);
$('coach-query-input').value = '';
$('tab-btn-report').click();

// Dictate button on the job description field
$('voice-dest-select').value = 'replace_jd';
$('btn-quick-dictate-jd').click();
await sleep(40);
check('Dictate opens the panel, so listening is visible', visible(drawer) && appState.voice.status === 'listening');
check('Dictate adds to the job description by default', $('voice-dest-select').value === 'append_jd');
$('voice-drawer-close-btn').click();
await sleep(30);

// --- No speech recognition at all ---------------------------------------------------------------
window.SpeechRecognition = undefined;
window.webkitSpeechRecognition = undefined;
appState.voice.recognition = null;
appState.voice.status = 'idle';
$('btn-quick-dictate-jd').click();
await sleep(30);
check('with no recognizer the panel still opens', visible(drawer));
check('and says typing works', /no speech recognition/i.test($('voice-live-status-desc').textContent), $('voice-live-status-desc').textContent);
typeText('Still works');
check('and typing still inserts', !$('voice-apply-btn').disabled);
$('voice-discard-btn').click();
$('voice-drawer-close-btn').click();
window.SpeechRecognition = realSR;
window.webkitSpeechRecognition = realWebkit;
await sleep(20);

// --- Spoken briefing -------------------------------------------------------------------------------
const spoken = [];
const realSpeak = window.speechSynthesis.speak;
const realCancel = window.speechSynthesis.cancel;
window.speechSynthesis.speak = function speak(u) { spoken.push(u.text); u.onstart && u.onstart(); };
window.speechSynthesis.cancel = function cancel() {};
appState.analyzer.extractedScore = null;
toggleSpokenBriefing();
check('with no report nothing is spoken', spoken.length === 0 && /No report yet/.test($('toast-message').textContent), $('toast-message').textContent);
updateScoreRingFromNumber(71);
toggleSpokenBriefing();
await sleep(20);
check('the briefing states the real score', spoken.length === 1 && /71 out of 100/.test(spoken[0]), spoken[0]);
check('and that it is not a hiring probability', /not a hiring probability/i.test(spoken[0]));
check('and invents no impression', !/concrete technical capability/.test(spoken[0]));
check('and uses the real tab name', /Resume Tailoring/.test(spoken[0]));
check('pause and stop become available', !$('voice-tts-pause-btn').disabled && !$('voice-tts-stop-btn').disabled);
check('icon-only controls are named', ['voice-tts-pause-btn', 'voice-tts-stop-btn', 'voice-discard-btn'].every((id) => $(id).getAttribute('aria-label')));
window.speechSynthesis.speak = realSpeak;
window.speechSynthesis.cancel = realCancel;
stopSpokenBriefing();
check('stop resets the labels', $('tts-play-label').textContent === 'Play briefing' && $('voice-tts-stop-btn').disabled, $('tts-play-label').textContent);
const fast = document.querySelector('.btn-tts-speed[data-rate="0.85"]');
fast.click();
check('speed reports its state', fast.getAttribute('aria-pressed') === 'true' && appState.voice.ttsRate === 0.85);

// --- Copy -----------------------------------------------------------------------------------------
const privacy = document.querySelector('.voice-privacy-note').textContent;
check('the privacy note makes no unverified promise', !/never stored/i.test(privacy) && /browser/.test(privacy), privacy.trim());

return { checks };
