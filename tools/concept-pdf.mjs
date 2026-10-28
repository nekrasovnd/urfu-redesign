// Builds the concept PDF: shoots the design-system specimen, then prints design/concept/concept.html.
// Usage: node concept-pdf.mjs  →  design/concept/Конструктив — редизайн сайта УрФУ.pdf (+ page previews)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('..');
const CONCEPT = path.join(ROOT, 'design/concept/concept.html');
const SHOTS = path.join(ROOT, 'design/concept/shots');
const OUT = path.join(ROOT, 'design/concept/Конструктив — редизайн сайта УрФУ.pdf');
const PREVIEW = path.join(ROOT, 'design/concept/preview');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--hide-scrollbars'] });

// 1. Components from the specimen page (cards + actions section).
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: 1.5 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(pathToFileURL(path.join(ROOT, 'design/system/index.html')).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('#cards');
  await el.screenshot({ path: path.join(SHOTS, 'ds-components.png') });
  await page.close();
}

// 2. The PDF itself.
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await page.goto(pathToFileURL(CONCEPT).href, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);

// Author details live in an untracked file so the public repository keeps placeholders.
const authorFile = path.join(ROOT, 'design/concept/author.local.json');
if (fs.existsSync(authorFile)) {
  const author = JSON.parse(fs.readFileSync(authorFile, 'utf8'));
  await page.evaluate(a => {
    document.querySelectorAll('[data-author]').forEach(el => {
      const v = a[el.dataset.author];
      if (v) { el.textContent = v; el.classList.remove('fill'); el.style.removeProperty('color'); }
    });
  }, author);
} else console.warn('author.local.json not found — PDF keeps placeholders');
await page.pdf({ path: OUT, printBackground: true, preferCSSPageSize: true });

// 3. PNG previews of every page for a quick visual check.
fs.mkdirSync(PREVIEW, { recursive: true });
await page.emulateMediaType('print');
await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
const slides = await page.$$('.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(PREVIEW, `page-${String(i + 1).padStart(2, '0')}.png`) });
await browser.close();
console.log('pdf:', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(1), 'MB,', slides.length, 'pages');
