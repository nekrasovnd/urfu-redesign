// Contrast audit of every prototype page in all three colour schemes (light, dark, high contrast),
// desktop and phone, with axe-core. Text over photos axe cannot judge — those come back as «incomplete»
// and are listed separately for a look. Usage: node contrast.mjs [baseUrl]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] || 'http://localhost:4322').replace(/\/$/, '');
const AXE = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const PAGES = ['/', '/admission/match/', '/programs/', '/programs/software-engineering/', '/study/schedule/', '/study/hub/', '/news/', '/news/60431/', '/events/', '/institutes/', '/institutes/irit-rtf/', '/life/campus/', '/sveden/'];
const THEMES = { light: { theme: 'light' }, dark: { theme: 'dark' }, contrast: { theme: 'contrast' } };
const VIEWS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true } };

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let failures = 0;
for (const [tname, a11y] of Object.entries(THEMES)) for (const [vname, vp] of Object.entries(VIEWS)) for (const path of PAGES) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(s => { try { localStorage.setItem('urfu-a11y', s); localStorage.setItem('urfu-proto', 'full'); } catch {} }, JSON.stringify(a11y));
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  // Open every disclosure so hidden content is checked too.
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => (d.open = true)));
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: ['color-contrast', 'link-in-text-block'], resultTypes: ['violations', 'incomplete'] });
    const pick = list => list.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} — ${(n.any[0]?.message || '').replace(/\s+/g, ' ').slice(0, 140)}`));
    return { bad: pick(r.violations), unsure: r.incomplete.flatMap(v => v.nodes).length };
  });
  if (res.bad.length) { failures += res.bad.length; console.log(`✗ ${tname}/${vname} ${path}\n   ` + res.bad.slice(0, 8).join('\n   ')); }
  else console.log(`✓ ${tname}/${vname} ${path}  (over images, to eyeball: ${res.unsure})`);
  await page.close();
}
await browser.close();
console.log(failures ? `\n${failures} contrast problems` : '\nno contrast problems');
process.exitCode = failures ? 1 : 0;
