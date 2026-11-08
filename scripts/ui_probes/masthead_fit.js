// Masthead fit: the section links sit between the wordmark and the actions with a clear gap
// at every width, and the tagline is never clipped. Run across the breakpoints:
//   node scripts/ui_audit.mjs --url http://127.0.0.1:8010/ --widths 1024,1180,1181,1279,1280,1399,1400,1440,1920 --no-shots --eval-file scripts/ui_probes/masthead_fit.js

const r = (el) => el.getBoundingClientRect();
const items = [...document.querySelectorAll('#nav-links-menu > li')].map(r).filter((b) => b.width > 0);
const word = r(document.querySelector('.wordmark'));
const actions = r(document.querySelector('.nav-actions'));
const tag = document.querySelector('.brand-tag');
const menuBtn = document.querySelector('.btn-mobile-menu');
const linksShown = items.length > 0;
return {
  links: linksShown,
  menuButton: menuBtn ? getComputedStyle(menuBtn).display !== 'none' : null,
  gapLeft: linksShown ? Math.round(items[0].left - word.right) : null,
  gapRight: linksShown ? Math.round(actions.left - items[items.length - 1].right) : null,
  actionsInside: Math.round(actions.right) <= document.documentElement.clientWidth,
  tagClipped: tag && getComputedStyle(tag).display !== 'none' ? tag.scrollWidth > tag.clientWidth : 'hidden',
  prefsLabel: getComputedStyle(document.querySelector('.btn-prefs-label')).display !== 'none',
  statusText: document.getElementById('status-label-text').getBoundingClientRect().width > 1,
};
