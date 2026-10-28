// Takes screenshots of the live prototype for the concept PDF (design/concept/shots/).
// Usage: node shoot.mjs [baseUrl]   — default: the GitHub Pages site.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] || 'https://nekrasovnd.github.io/urfu-redesign').replace(/\/$/, '');
const OUT = path.resolve('../design/concept/shots');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// [file, path, viewport, options]
const SHOTS = [
  ['home', '/', DESKTOP],
  ['home-full', '/', DESKTOP, { full: true }],
  ['home-mobile', '/', MOBILE],
  ['home-megamenu', '/', DESKTOP, { act: async p => { await p.click('[data-mm-trigger="admission"]'); } }],
  ['home-search', '/', DESKTOP, { act: async p => { await p.click('[data-search-open]'); await p.type('#cmdk-q', 'програм'); } }],
  ['home-student', '/', DESKTOP, { scrollTo: '.hero', act: async p => { await p.click('[data-role="student"]'); } }],
  ['mobile-menu', '/', MOBILE, { act: async p => { await p.click('[data-menu-toggle]'); } }],
  ['match', '/admission/match/', DESKTOP],
  ['match-mobile', '/admission/match/', MOBILE, { scrollTo: '.results-bar' }],
  ['programs', '/programs/', DESKTOP],
  ['program', '/programs/software-engineering/', DESKTOP],
  ['program-exams', '/programs/software-engineering/', DESKTOP, { scrollTo: '#exams', act: async p => { for (const [id, v] of [['pc-0', '82'], ['pc-1', '76'], ['po-0', '80']]) await p.type('#' + id, v); } }],
  ['schedule', '/study/schedule/', DESKTOP],
  ['header-services', '/', DESKTOP, { act: async p => { await p.click('[data-mm-trigger="services"]'); } }],
  ['header-a11y', '/', DESKTOP, { act: async p => { await p.click('[data-mm-trigger="a11y"]'); } }],
  ['sveden', '/sveden/', DESKTOP],
  ['schedule-mobile', '/study/schedule/', MOBILE, { scrollTo: '.sch-bar' }],
  ['hub', '/study/hub/', DESKTOP],
  ['news', '/news/', DESKTOP],
  ['article', '/news/60431/', DESKTOP],
  ['events', '/events/', DESKTOP],
  ['events-cal', '/events/', DESKTOP, { act: async p => { await p.click('[data-ev-view="cal"]'); } }],
  ['institute', '/institutes/irit-rtf/', DESKTOP],
  ['campus', '/life/campus/', DESKTOP],
  ['campus-mobile', '/life/campus/', MOBILE],
  ['notfound', '/admission/cost/', DESKTOP],
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const only = process.env.ONLY?.split(',');
for (const [name, url, vp, opt = {}] of SHOTS) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  if (opt.scrollTo) await page.evaluate(sel => { const el = document.querySelector(sel); if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 8); }, opt.scrollTo);
  if (opt.full) { // lazy images below the fold would stay grey in a full-page shot
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(i => (i.loading = 'eager')));
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 }).catch(() => {});
  }
  if (opt.act) await opt.act(page);
  // Header hides on scroll down; keep it visible for the shots.
  await page.evaluate(() => document.querySelector('[data-header]')?.classList.remove('is-hidden'));
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!opt.full });
  await page.close();
  console.log('shot', name);
}
await browser.close();
