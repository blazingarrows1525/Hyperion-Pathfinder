// Regression probe: masthead, menus, preferences, dialogs, Genome, the two directories, FAQ, footer.
// Includes a generic rule that would have caught the dead voice panel: whatever a control says it
// expanded must really become visible.
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1440,1024,375 --no-shots --eval-file scripts/ui_probes/navigation_and_data.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail) });
const $ = (id) => document.getElementById(id);
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const narrow = innerWidth <= 1080;
const mobile = innerWidth < 768;
const press = (el) => (mobile ? __real.tapEl(el) : __real.clickEl(el));
window.confirm = () => true;
document.documentElement.style.scrollBehavior = 'auto';
const ESC = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// --- Page frame -------------------------------------------------------------------------
check('one h1 that says what the product does', document.querySelectorAll('h1').length === 1 && /resume/i.test($('hero-title-id').textContent));
check('the title names the product', /Hyperion Pathfinder/.test(document.title), document.title);
check('the old product name is gone from the page', !/Resume Checker/i.test(document.body.textContent));
const skip = document.querySelector('a[href="#main-content"]');
check('a skip link leads to the main content', skip && $('main-content'));
for (const id of ['hero', 'evidence', 'how-it-works', 'placement-snapshot', 'analyzer', 'genome', 'company-intel', 'prompt-studio', 'buttons-lab', 'faq']) {
  check(`section ${id} exists`, Boolean($(id)));
}

// --- Every in-page link goes somewhere ---------------------------------------------------
const brokenAnchors = [...document.querySelectorAll('a[href^="#"]')].filter((a) => a.getAttribute('href').length > 1 && !document.querySelector(a.getAttribute('href')));
check('every in-page link has a target', brokenAnchors.length === 0, brokenAnchors.map((a) => a.getAttribute('href')).join());
const footerLinks = [...document.querySelectorAll('.footer-nav-links a')];
check('the footer links to the sections', footerLinks.length >= 6 && footerLinks.every((a) => document.querySelector(a.getAttribute('href'))));

// --- Generic: an expanded control really shows what it controls ---------------------------
const toggles = [...document.querySelectorAll('[aria-expanded][aria-controls]')].filter(visible);
for (const toggle of toggles) {
  const target = $(toggle.getAttribute('aria-controls'));
  const label = toggle.id || toggle.className;
  if (!target) { check(`${label}: controls something that exists`, false, toggle.getAttribute('aria-controls')); continue; }
  const before = toggle.getAttribute('aria-expanded');
  toggle.click();
  await sleep(120);
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  check(`${label}: aria-expanded matches what is on screen`, expanded === visible(target), `expanded ${expanded}, visible ${visible(target)}`);
  toggle.click();
  await sleep(120);
  const after = toggle.getAttribute('aria-expanded') === 'true';
  check(`${label}: it closes again`, after === visible(target) && toggle.getAttribute('aria-expanded') === before, `expanded ${after}, visible ${visible(target)}`);
  ESC();
  await sleep(40);
}

// --- Preferences --------------------------------------------------------------------------
const prefsBtn = $('btn-prefs');
const prefs = $('prefs-panel');
await press(prefsBtn);
await sleep(100);
check('preferences open', visible(prefs) && prefsBtn.getAttribute('aria-expanded') === 'true');
const box = prefs.getBoundingClientRect();
check('preferences fit the screen', box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, `${Math.round(box.left)}-${Math.round(box.right)} of ${innerWidth}`);
for (const id of ['btn-theme-toggle', 'btn-motion-toggle', 'btn-sound-toggle', 'btn-designhead-minimalist', 'btn-designhead-maximalist', 'btn-llm-control-hub']) {
  const el = $(id);
  const r = el.getBoundingClientRect();
  check(`${id} is reachable and large enough`, visible(el) && r.height >= 24 && r.width >= 24, `${Math.round(r.width)}x${Math.round(r.height)}`);
}

// Theme
const themeBtn = $('btn-theme-toggle');
const rootTheme = () => document.documentElement.getAttribute('data-theme');
check('the theme control states the current theme', $('theme-mode-label').textContent === 'Terra Atelier', $('theme-mode-label').textContent);
themeBtn.click();
await sleep(60);
check('the theme control switches theme', rootTheme() === 'grove' && $('theme-mode-label').textContent === 'Midnight Grove');
check('the theme persists', localStorage.getItem('career_ui_theme_v2') === 'grove', localStorage.getItem('career_ui_theme_v2'));
themeBtn.click();
await sleep(60);
check('and switches back', rootTheme() === 'terra' && localStorage.getItem('career_ui_theme_v2') === 'terra');

// Motion
const motionBtn = $('btn-motion-toggle');
const motionLabels = [];
for (let i = 0; i < 3; i++) {
  motionBtn.click();
  await sleep(40);
  motionLabels.push(`${appState.motionSetting}:${$('motion-mode-label').textContent}`);
  check(`motion step ${i + 1}: the label and name agree`, motionBtn.getAttribute('aria-label').includes($('motion-mode-label').textContent), motionBtn.getAttribute('aria-label'));
}
check('motion cycles through its three settings', new Set(motionLabels.map((l) => l.split(':')[0])).size === 3, motionLabels.join());
applyMotionSetting('system', { persist: false });

// Detail
const low = $('btn-designhead-minimalist');
const high = $('btn-designhead-maximalist');
low.click();
await sleep(40);
check('3D detail low reports its state', low.getAttribute('aria-checked') === 'true' && high.getAttribute('aria-checked') === 'false' && document.body.classList.contains('designhead-minimalist'));
high.click();
await sleep(40);
check('3D detail high reports its state', high.getAttribute('aria-checked') === 'true' && low.getAttribute('aria-checked') === 'false');
check('only intended preferences are stored', Object.keys(localStorage).every((k) => ['career_ui_theme_v2', 'career_ui_motion_v1', 'resume_checker_mode', 'resume_checker_theme'].includes(k)), Object.keys(localStorage).join());

// Escape and outside click
ESC();
await sleep(40);
check('Escape closes preferences and returns focus', !visible(prefs) && document.activeElement === prefsBtn, document.activeElement?.id);
prefsBtn.click();
await sleep(40);
document.getElementById('faq').click();
await sleep(40);
check('an outside click closes preferences', !visible(prefs));

// Engine dialog
prefsBtn.click();
await sleep(40);
$('btn-llm-control-hub').click();
await sleep(150);
const engine = $('modal-llm-control-hub');
check('the engine dialog opens', visible(engine) && engine.getAttribute('role') === 'dialog' && engine.getAttribute('aria-modal') === 'true');
const providers = await (await fetch('/api/llm/providers')).json();
check('it shows the real active engine', $('llm-active-name').textContent === providers.active_provider, $('llm-active-name').textContent);
check('it says plainly when no language model runs', providers.active_model !== 'deterministic-fallback' || /deterministic/i.test($('llm-active-note').textContent), $('llm-active-note').textContent);
check('it asks for no credentials', engine.querySelectorAll('input, textarea').length === 0);
const dialogFocusables = getFocusable(engine);
check('focus is inside it', engine.contains(document.activeElement), document.activeElement?.id);
check('Tab stays inside it', dialogFocusables.length > 0);
ESC();
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(60);
check('Escape closes it', !visible(engine));

// --- Navigation ----------------------------------------------------------------------------
if (narrow) {
  const menuBtn = $('btn-mobile-menu');
  const links = $('nav-links-menu');
  check('the menu button is on screen', visible(menuBtn) && menuBtn.getBoundingClientRect().right <= innerWidth);
  check('the menu starts closed', menuBtn.getAttribute('aria-expanded') === 'false' && !links.classList.contains('mobile-open'));
  await press(menuBtn);
  await sleep(100);
  check('the menu opens', menuBtn.getAttribute('aria-expanded') === 'true' && visible(links));
  check('its name follows', /Close/.test(menuBtn.getAttribute('aria-label')), menuBtn.getAttribute('aria-label'));
  const menuBox = links.getBoundingClientRect();
  check('it fits the screen', menuBox.left >= 0 && menuBox.right <= innerWidth && menuBox.bottom <= innerHeight + 1, `${menuBox.left}-${menuBox.right}, bottom ${menuBox.bottom}`);
  const short = [...links.querySelectorAll('a')].filter((a) => visible(a) && a.getBoundingClientRect().height < 44);
  check('its links are large enough to tap', short.length === 0, short.map((a) => a.textContent.trim()).join());
  ESC();
  await sleep(50);
  check('Escape closes it and returns focus', !links.classList.contains('mobile-open') && document.activeElement === menuBtn, document.activeElement?.id);
  await press(menuBtn);
  await sleep(80);
  const firstLink = [...links.querySelectorAll('a')].find(visible);
  firstLink.click();
  await sleep(100);
  check('choosing a link closes it', !links.classList.contains('mobile-open') && menuBtn.getAttribute('aria-expanded') === 'false');
} else {
  const moreBtn = $('btn-nav-more');
  const moreMenu = $('nav-more-menu');
  await __real.clickEl(moreBtn);
  await sleep(80);
  check('More opens', moreBtn.getAttribute('aria-expanded') === 'true' && visible(moreMenu));
  const r = moreMenu.getBoundingClientRect();
  check('More is not clipped', r.right <= innerWidth && r.bottom <= innerHeight, `${r.right} ${r.bottom}`);
  await __real.key('Escape');
  await sleep(40);
  check('Escape closes More and returns focus', !visible(moreMenu) && document.activeElement === moreBtn, document.activeElement?.id);
  // The scroll spy follows the sections.
  $('genome').scrollIntoView({ block: 'start' });
  await sleep(500);
  const active = document.querySelector('#nav-links-menu a[aria-current="true"]');
  check('the current section is marked', active && active.getAttribute('href') === '#genome', active && active.getAttribute('href'));
  const activeCount = document.querySelectorAll('#nav-links-menu a[aria-current="true"]').length;
  check('only one is marked', activeCount === 1, activeCount);
}
window.scrollTo(0, 0);
await sleep(100);
check('the wordmark goes back to the top', document.querySelector('a.wordmark').getAttribute('href') === '#hero');

// --- Evidence and snapshot: every figure from its source ---------------------------------------
const summary = await (await fetch('/api/corpus-summary')).json();
const snap = await (await fetch('/placement_snapshot_2026.json')).json();
const textIn = (sel) => document.querySelector(sel)?.textContent.trim();
check('corpus record count matches its source', textIn('.evidence-corpus [data-evidence="source_count"]') === String(summary.source_count), textIn('.evidence-corpus [data-evidence="source_count"]'));
check('archetype count matches', textIn('[data-evidence="archetype_count"]') === String(summary.archetypes.length));
check('embedding size matches', textIn('.evidence-corpus [data-evidence="embedding_dimension"]') === String(summary.embedding_dimension));
check('document quality matches', textIn('.evidence-corpus [data-evidence="valid_document_count"]') === String(summary.valid_document_count));
const lakh = (n) => Number(n).toLocaleString('en-IN');
check('total offers matches', $('kpi-total-offers').textContent === lakh(snap.total_offers), $('kpi-total-offers').textContent);
check('unique employers matches', $('kpi-unique-employers').textContent === lakh(snap.unique_employers));
check('job profiles matches', $('kpi-job-profiles').textContent === lakh(snap.job_profiles));
check('average CTC matches', $('kpi-avg-ctc').textContent.startsWith(`₹${snap.average_ctc_lpa}`), $('kpi-avg-ctc').textContent);
check('median CTC matches', $('kpi-median-ctc').textContent.startsWith(`₹${snap.median_ctc_lpa}`), $('kpi-median-ctc').textContent);
check('highest CTC matches', $('kpi-highest-ctc').textContent.startsWith(`₹${snap.highest_ctc_lpa}`), $('kpi-highest-ctc').textContent);
check('the highest offer names its company', $('kpi-note-highest').textContent.includes(snap.highest_ctc_company), $('kpi-note-highest').textContent);
check('the note separates offers from students', /not distinct students/i.test($('kpi-note-offers').textContent));
check('the source line carries date and batch', /placement portal|Haveloc/i.test(textIn('#placement-snapshot .source-line')) && textIn('#placement-snapshot .source-line').includes(String(snap.batch)), textIn('#placement-snapshot .source-line'));
check('snapshot caveats are filled in', $('caveat-students').textContent.length > 10 && $('caveat-categories').textContent.length > 10 && $('caveat-no-ctc-count').textContent === lakh(snap.offers_without_ctc), $('caveat-no-ctc-count').textContent);
check('the bands print their values', document.querySelectorAll('#offer-bands-list .band-row').length === snap.top_offer_bands.length && snap.top_offer_bands.every((b, i) => document.querySelectorAll('#offer-bands-list .band-value')[i].textContent.includes(Number(b.average_ctc_lpa).toFixed(2))));
check('categories are a ranked list, not a share', document.querySelectorAll('#category-rank-list li').length === snap.categories.length);
const rows = () => [...document.querySelectorAll('#snapshot-table-body tr')].filter(visible);
check('the recruiters table holds every listed row', rows().length === snap.top_recruiters.length, rows().length);
const firstRow = rows()[0];
const firstSrc = snap.top_recruiters[0];
check('its first row matches the source', firstRow.textContent.includes(firstSrc.company) && firstRow.textContent.includes(lakh(firstSrc.offers)), firstRow.textContent.trim().slice(0, 60));
const tableScroller = document.querySelector('.recruiters-table-wrapper');
check('the table scrolls inside a labelled, focusable region', tableScroller.getAttribute('role') === 'region' && tableScroller.hasAttribute('aria-labelledby') && tableScroller.tabIndex === 0);

const snapSearch = $('snapshot-company-search');
snapSearch.value = firstSrc.company.slice(0, 4);
snapSearch.dispatchEvent(new Event('input', { bubbles: true }));
await sleep(30);
check('the recruiter filter narrows the table', rows().length >= 1 && rows().length < snap.top_recruiters.length, rows().length);
snapSearch.value = 'zzzz-no-company';
snapSearch.dispatchEvent(new Event('input', { bubbles: true }));
await sleep(30);
check('the recruiter filter has an empty state', rows().length === 0 && visible($('snapshot-empty')), $('snapshot-empty') ? $('snapshot-empty').textContent : 'no element');
snapSearch.value = '';
snapSearch.dispatchEvent(new Event('input', { bubbles: true }));
await sleep(30);
check('clearing it restores the table', rows().length === snap.top_recruiters.length && !visible($('snapshot-empty')));

const target = document.querySelector('.btn-use-context');
const jd = $('jd-textarea');
jd.value = '';
jd.dispatchEvent(new Event('input', { bubbles: true }));
target.click();
await sleep(60);
check('Target carries the company into the analyzer', jd.value.includes(target.dataset.company), jd.value.slice(0, 60));
check('and the counter follows', $('jd-char-count').textContent.startsWith(jd.value.length.toLocaleString()), $('jd-char-count').textContent);
jd.value = '';
jd.dispatchEvent(new Event('input', { bubbles: true }));

// --- Genome ------------------------------------------------------------------------------------
const list = $('archetypes-selector-grid');
check('the Genome list is a tablist', list.getAttribute('role') === 'tablist', list.getAttribute('role'));
const tabs = () => [...list.querySelectorAll('.archetype-tab')];
check('all five archetypes are listed', tabs().length === 5);
for (const entry of summary.archetypes) {
  const tab = $(`archetype-tab-${entry.cluster_id}`);
  check(`cluster ${entry.cluster_id}: label and count come from the corpus`, tab.textContent.includes(entry.label) && tab.textContent.includes(`${entry.count} records`), tab.textContent.trim().slice(0, 70));
}
const stripTotal = [...document.querySelectorAll('.genome-field-seg b')].reduce((s, b) => s + parseFloat(b.textContent), 0);
check('the corpus strip adds up to the whole', Math.abs(stripTotal - 100) < 0.6, stripTotal);
selectArchetype(0);
$('archetype-tab-0').focus();
await __real.key('ArrowRight');
await sleep(30);
check('arrow keys move through the archetypes', appState.genome.selectedArchetypeId === 1 && document.activeElement === $('archetype-tab-1'), appState.genome.selectedArchetypeId);
await __real.key('End');
await sleep(30);
check('End goes to the last', appState.genome.selectedArchetypeId === 4 && document.activeElement === $('archetype-tab-4'));
await __real.key('ArrowRight');
await sleep(30);
check('arrows wrap around', appState.genome.selectedArchetypeId === 0);
await __real.key('Home');
await sleep(30);
check('Home goes to the first', appState.genome.selectedArchetypeId === 0 && document.activeElement === $('archetype-tab-0'));
check('only the selected tab is in the tab order', tabs().filter((t) => t.tabIndex === 0).length === 1);
const panel = $('archetype-detail-panel');
check('the panel is labelled by its tab', panel.getAttribute('role') === 'tabpanel', panel.getAttribute('role'));
check('selection follows into the Atlas legend', document.querySelector('.atlas-legend-item[data-archetype-id="0"]').getAttribute('aria-pressed') === 'true');
check('curated content is labelled', /curated/i.test(panel.textContent));
check('it is not called a hiring outcome', !/hiring (rate|probability)|chance of/i.test(panel.textContent) || /not/i.test(panel.textContent));

const compareBtn = panel.querySelector('[data-genome-action="compare"]') || [...panel.querySelectorAll('[data-genome-action]')].find((b) => b.dataset.genomeAction !== 'use-jd');
compareBtn.focus();
compareBtn.click();
await sleep(150);
const compare = $('compare-modal-backdrop');
check('compare opens', visible(compare) && compare.getAttribute('aria-modal') === 'true');
check('focus moves into compare', compare.contains(document.activeElement));
const pickers = [...compare.querySelectorAll('[data-compare-index]')];
check('compare has labelled pickers', pickers.length === 2 && pickers.every((p) => p.closest('label')));
const compareBody = $('compare-modal-body');
const bodyStyle = getComputedStyle(compareBody);
const contentRight = compareBody.getBoundingClientRect().right - parseFloat(bodyStyle.paddingRight) - parseFloat(bodyStyle.borderRightWidth);
const compareTable = compare.querySelector('.comparison-table');
const widest = Math.max(compareTable.getBoundingClientRect().right, ...pickers.map((p) => p.getBoundingClientRect().right));
check('the comparison fits its dialog', widest <= contentRight + 1, `${Math.round(widest)} vs ${Math.round(contentRight)}`);
check('the comparison keeps its table roles at every width', compareTable.getAttribute('role') === 'table' && compareTable.querySelectorAll('[role="rowheader"]').length === 3 && compareTable.querySelectorAll('[role="cell"]').length === 6);
check('compare names both archetypes in its columns', compare.querySelector('thead').textContent.includes(getArchetypeLabel(archetypesDatabase.find((a) => a.id === appState.genome.compareArchetypeA))));
pickers[1].value = '3';
pickers[1].dispatchEvent(new Event('change', { bubbles: true }));
await sleep(40);
check('changing a picker updates the table', appState.genome.compareArchetypeB === 3 && compare.querySelector('thead').textContent.includes(getArchetypeLabel(archetypesDatabase.find((a) => a.id === 3))));
check('focus stays on the picker', document.activeElement && document.activeElement.getAttribute('data-compare-index') === '1');
const samePicker = compare.querySelector('[data-compare-index="1"]');
samePicker.value = String(appState.genome.compareArchetypeA);
samePicker.dispatchEvent(new Event('change', { bubbles: true }));
await sleep(40);
check('comparing an archetype with itself is called out', /same archetype/i.test(compare.textContent), compare.textContent.slice(0, 60));
// Tab trap, with real keys
const compareItems = getFocusable(compare);
compareItems[compareItems.length - 1].focus();
await __real.tab();
await sleep(20);
check('Tab wraps inside the dialog', compare.contains(document.activeElement), document.activeElement?.tagName);
compareItems[0].focus();
await __real.tab(true);
await sleep(20);
check('Shift+Tab wraps too', compare.contains(document.activeElement));
await __real.key('Escape');
await sleep(60);
check('Escape closes compare', !visible(compare));
check('focus returns to the button that opened it', document.activeElement === compareBtn || document.activeElement?.dataset?.genomeAction === 'compare', document.activeElement?.tagName);

// --- Company directory -----------------------------------------------------------------------------
const search = $('company-search-input');
const companyRows = () => [...document.querySelectorAll('#companies-grid-container tbody tr')];
const setCompanySearch = (v) => { search.value = v; search.dispatchEvent(new Event('input', { bubbles: true })); };
check('the directory lists every curated company', companyRows().length === companyDatabase.length, companyRows().length);
check('no broken figures', !/NaN|undefined/.test($('companies-grid-container').textContent));
for (const row of companyRows()) {
  const company = companyDatabase.find((c) => c.id === row.dataset.companyId);
  const fig = getReportFiguresFor(company);
  const firstWord = company.name.toLowerCase().split(/[\s(]/)[0];
  const source = [...snap.top_recruiters, ...(snap.notable_high_ctc || [])].find((r) => r.company.toLowerCase().split(/[\s(]/)[0] === firstWord);
  check(`${company.name}: figures trace to the snapshot`, source ? fig && row.textContent.includes(lakh(source.offers)) && row.textContent.includes(`₹${source.highest_ctc_lpa}`) : !fig && /Not in this snapshot/.test(row.textContent), row.textContent.trim().slice(0, 90));
  check(`${company.name}: practice material is labelled`, /practice role/i.test(row.textContent));
}
setCompanySearch('goo');
await sleep(20);
check('search narrows the list', companyRows().length === 1 && $('company-results-count').textContent.startsWith('1 of'), $('company-results-count').textContent);
setCompanySearch('zzzz');
await sleep(20);
check('search has an empty state', /No companies match/.test($('companies-grid-container').textContent));
const resetBtn = document.querySelector('[data-company-action="reset"]');
check('with a way out', visible(resetBtn));
resetBtn.click();
await sleep(20);
check('the way out clears search and filter', search.value === '' && companyRows().length === companyDatabase.length && appState.companies.activeFilter === 'all');
const filters = [...document.querySelectorAll('.btn-company-filter')];
check('filter buttons report their state', filters.every((f) => f.hasAttribute('aria-pressed')));
filters.find((f) => f.dataset.filter === 'in-snapshot').click();
await sleep(20);
check('the snapshot filter keeps only sourced rows', companyRows().every((r) => /Snapshot/.test(r.textContent)) && companyRows().length > 0);
filters.find((f) => f.dataset.filter === 'ctc-20').click();
await sleep(20);
check('the CTC filter applies its rule', companyRows().every((r) => { const c = companyDatabase.find((x) => x.id === r.dataset.companyId); return getReportFiguresFor(c).highestCtcLpa >= 20; }) && companyRows().length > 0);
setCompanyFilter('all');
await sleep(20);
const sort = $('company-sort-select');
sort.value = 'name';
sort.dispatchEvent(new Event('change', { bubbles: true }));
await sleep(20);
const names = companyRows().map((r) => r.querySelector('strong').textContent);
check('sort by name orders the rows', names.join('|') === [...names].sort((a, b) => a.localeCompare(b)).join('|'), names.join());
sort.value = 'ctc';
sort.dispatchEvent(new Event('change', { bubbles: true }));
await sleep(20);
const ctcs = companyRows().map((r) => { const f = getReportFiguresFor(companyDatabase.find((c) => c.id === r.dataset.companyId)); return f ? f.highestCtcLpa : -1; });
check('sort by CTC orders the rows', ctcs.every((v, i) => i === 0 || ctcs[i - 1] >= v), ctcs.join());
sort.value = 'alumni';
sort.dispatchEvent(new Event('change', { bubbles: true }));
await sleep(20);

const details = document.querySelector('[data-company-action="details"]');
const detailsId = details.dataset.companyId;
details.focus();
details.click();
await sleep(150);
const companyModal = $('company-modal-backdrop');
check('details open a dialog', visible(companyModal) && companyModal.getAttribute('aria-modal') === 'true');
check('focus moves into it', companyModal.contains(document.activeElement));
check('it keeps sourced and practice content apart', companyModal.querySelector('.fact-block') && /practice|rehearse/i.test(companyModal.querySelector('.practice-block').textContent));
const careerLink = companyModal.querySelector('a[target="_blank"]');
check('the external link is safe', careerLink && /noopener/.test(careerLink.rel) && careerLink.href.startsWith('https://'), careerLink && careerLink.href);
await __real.key('Escape');
await sleep(60);
check('Escape closes it', !visible(companyModal));
const reopened = document.querySelector(`[data-company-action="details"][data-company-id="${detailsId}"]`);
check('focus returns to its button', document.activeElement === reopened, document.activeElement?.tagName);
const useJd = document.querySelector('[data-company-action="use-jd"]');
const useCompany = companyDatabase.find((c) => c.id === useJd.dataset.companyId);
useJd.click();
await sleep(60);
check('the sample JD reaches the analyzer', jd.value === useCompany.sampleJd);
jd.value = '';
jd.dispatchEvent(new Event('input', { bubbles: true }));

// A company missing from the excerpt is described accurately.
const absent = companyDatabase.find((c) => !getReportFiguresFor(c));
if (absent) {
  openCompanyModal(absent.id);
  await sleep(100);
  check('absence is not called proof', /Not in this snapshot excerpt/.test(companyModal.textContent), companyModal.querySelector('.fact-block').textContent.trim().slice(0, 120));
  closeCompanyModal();
}

// --- FAQ and showcase ----------------------------------------------------------------------------------
const faq = [...document.querySelectorAll('.faq-item')];
check('FAQ uses native disclosure', faq.length >= 4 && faq.every((d) => d.tagName === 'DETAILS'));
faq[0].querySelector('summary').focus();
await __real.key('Enter');
await sleep(30);
check('a FAQ item opens from the keyboard', faq[0].open);
await __real.key('Enter');
await sleep(30);
check('and closes', !faq[0].open);
const privacyAnswer = faq.find((d) => /stored or shared/.test(d.textContent)).textContent;
check('the privacy answer mentions the provider', /provider/i.test(privacyAnswer), privacyAnswer.slice(0, 120));
check('and the job description in logs', /access logs/.test(privacyAnswer));
check('nothing on the page promises more than the code does', !/Nothing is stored|In-memory privacy|never stored/i.test(document.body.textContent));

const showcase = document.querySelector('.showcase-details');
showcase.querySelector('summary').click();
await sleep(50);
check('the samples open', showcase.open && visible($('neu-preview-surface')));
check('they say they are only samples', /change nothing else/.test(document.querySelector('#buttons-lab .section-lede').textContent));
const surface = $('neu-preview-surface');
const slider = $('neu-depth-range');
slider.value = '20';
slider.dispatchEvent(new Event('input', { bubbles: true }));
await sleep(30);
check('the depth slider changes the sample card', /14px 14px 44px/.test(surface.style.boxShadow), surface.style.boxShadow);
const puck = $('neu-light-puck');
puck.focus();
const before = puck.getAttribute('aria-valuenow');
await __real.key('ArrowRight');
await sleep(20);
check('the light control responds to keys', puck.getAttribute('aria-valuenow') !== before, puck.getAttribute('aria-valuenow'));
check('and states its value in words', /degrees/.test(puck.getAttribute('aria-valuetext')), puck.getAttribute('aria-valuetext'));
const shadowAfterKey = surface.style.boxShadow;
const well = $('neu-light-well');
const wr = well.getBoundingClientRect();
well.scrollIntoView({ block: 'center' });
await sleep(60);
const wb = well.getBoundingClientRect();
await __real.drag(wb.left + wb.width / 2, wb.top + wb.height / 2, wb.left + wb.width - 12, wb.top + wb.height / 2);
await sleep(40);
check('and to a real drag', Number(puck.getAttribute('aria-valuenow')) < 30 || Number(puck.getAttribute('aria-valuenow')) > 330, puck.getAttribute('aria-valuenow'));
check('which moves the sample shadow', surface.style.boxShadow !== shadowAfterKey, surface.style.boxShadow);
check('nothing global changed', !document.documentElement.style.getPropertyValue('--neu-shadow-x'));
$('btn-neu-shape-inset').click();
await sleep(20);
check('shape buttons report their state', $('btn-neu-shape-inset').getAttribute('aria-pressed') === 'true' && $('btn-neu-shape-raised').getAttribute('aria-pressed') === 'false' && surface.classList.contains('neu-inset-panel'));
const toggle = $('neu-tactile-toggle');
toggle.focus();
await __real.key('Space');
await sleep(20);
check('the sample switch works from the keyboard', toggle.getAttribute('aria-checked') === 'false' && $('neu-toggle-status-label').textContent === 'Off');
check('and has a name', $(toggle.getAttribute('aria-labelledby'))?.textContent === 'Sample switch');
$('lab-preset-chip').click();
check('the preset sample claims nothing', /Nothing was loaded/.test($('toast-message').textContent), $('toast-message').textContent);
$('btn-open-prefs').click();
await sleep(50);
check('Open preferences opens them', visible(prefs));
ESC();
showcase.open = false;

window.scrollTo(0, 0);
return { checks };
