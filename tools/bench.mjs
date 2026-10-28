// Benchmark of Russian university websites: screenshots (desktop + mobile), main navigation,
// feature markers and page weight. Output: research/benchmark/{shots/*.jpg, data.json}.
// Usage: node bench.mjs [id,id…]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const OUT = path.resolve('../research/benchmark');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const SITES = [
  ['new', 'Прототип «Конструктив»', 'https://nekrasovnd.github.io/urfu-redesign/'],
  ['urfu', 'УрФУ', 'https://urfu.ru/ru/'],
  ['hse', 'НИУ ВШЭ', 'https://www.hse.ru/'],
  ['msu', 'МГУ', 'https://www.msu.ru/'],
  ['spbu', 'СПбГУ', 'https://spbu.ru/'],
  ['itmo', 'ИТМО', 'https://itmo.ru/'],
  ['mipt', 'МФТИ', 'https://mipt.ru/'],
  ['bmstu', 'МГТУ им. Баумана', 'https://bmstu.ru/'],
  ['misis', 'МИСИС', 'https://misis.ru/'],
  ['mephi', 'НИЯУ МИФИ', 'https://mephi.ru/'],
  ['spbstu', 'СПбПУ', 'https://www.spbstu.ru/'],
  ['skoltech', 'Сколтех', 'https://www.skoltech.ru/'],
  ['kpfu', 'КФУ', 'https://kpfu.ru/'],
  ['nsu', 'НГУ', 'https://www.nsu.ru/'],
  ['tpu', 'ТПУ', 'https://tpu.ru/'],
  ['tsu', 'ТГУ', 'https://www.tsu.ru/'],
  ['utmn', 'ТюмГУ', 'https://www.utmn.ru/'],
  ['dvfu', 'ДВФУ', 'https://www.dvfu.ru/'],
  ['sfu', 'СФУ', 'https://www.sfu-kras.ru/'],
  ['susu', 'ЮУрГУ', 'https://www.susu.ru/'],
  ['ranepa', 'РАНХиГС', 'https://www.ranepa.ru/'],
  ['innopolis', 'Иннополис', 'https://innopolis.university/'],
  ['csu', 'ЧелГУ', 'https://www.csu.ru/'],
  ['sechenov', 'Сеченовский', 'https://www.sechenov.ru/'],
];

const FEATURES = {
  low_vision: /верси[яи] для слабовидящих|для слабовидящих|специальные возможности/i,
  sveden: /сведения об образовательной организации/i,
  en: /\bEN\b|English|ENG\b/,
  apply_cta: /подать документы|подать заявление|поступить/i,
  ege_calc: /калькулятор|по баллам|подбор/i,
  audiences: /абитуриент/i,
  tour: /виртуальн|3d-тур|панорам/i,
  chat: /чат-бот|чат бот|задать вопрос|онлайн-консультант/i,
  events: /афиша|мероприятия|события/i,
  numbers: /в цифрах|\d[\d\s]{2,}\s*(студент|программ|лаборатор)/i,
  news: /новост/i,
  login: /личный кабинет|войти|вход/i,
  max_vk: /vk\.com|vk\.ru|max\.ru|t\.me/i,
};

const only = process.argv[2]?.split(',');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--lang=ru-RU'] });
const results = fs.existsSync(path.join(OUT, 'data.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'data.json'), 'utf8')) : {};

async function visit([id, name, url]) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ru-RU,ru;q=0.9' });
  let bytes = 0, requests = 0;
  page.on('response', async r => { requests++; const l = +r.headers()['content-length'] || 0; bytes += l; });
  await page.setViewport({ width: 1440, height: 900 });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async e => {
    // Busy pages never go idle: take what has rendered.
    if (!/timeout/i.test(e.message)) throw e;
  });
  const loadMs = Date.now() - t0;
  await new Promise(r => setTimeout(r, 1500));
  // Close obvious cookie banners so they do not cover the screenshot.
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button, a')) {
      if (/^(принять|согласен|хорошо|понятно|ok|accept)/i.test(b.textContent.trim()) && b.offsetParent) { b.click(); break; }
    }
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS, `${id}-desktop.jpg`), type: 'jpeg', quality: 62 });
  const fullH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(fullH, 7000) });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SHOTS, `${id}-full.jpg`), type: 'jpeg', quality: 50, fullPage: false });

  const info = await page.evaluate(F => {
    const text = document.body.innerText;
    const html = document.documentElement.outerHTML;
    const header = document.querySelector('header') || document.body;
    const navLinks = [...header.querySelectorAll('nav a, header a')]
      .map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(t => t && t.length < 40);
    const footer = document.querySelector('footer');
    const features = Object.fromEntries(Object.entries(F).map(([k, src]) => [k, new RegExp(src[0], src[1]).test(text + ' ' + html.slice(0, 400000))]));
    const h = [...document.querySelectorAll('h1, h2')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25);
    return {
      title: document.title,
      nav: [...new Set(navLinks)].slice(0, 60),
      headings: h,
      footerLinks: footer ? footer.querySelectorAll('a').length : 0,
      totalLinks: document.querySelectorAll('a').length,
      words: text.split(/\s+/).length,
      height: document.documentElement.scrollHeight,
      fonts: [...new Set([...document.querySelectorAll('h1,h2,body,a,p')].slice(0, 200).map(e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '')))].slice(0, 6),
      features,
    };
  }, Object.fromEntries(Object.entries(FEATURES).map(([k, r]) => [k, [r.source, r.flags]])));

  // Mobile
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(SHOTS, `${id}-mobile.jpg`), type: 'jpeg', quality: 62 });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  await page.close();
  return { id, name, url, loadMs, requests, kb: Math.round(bytes / 1024), mobileOverflow, ...info };
}

// Skip sites already captured unless named explicitly; four at a time.
const queue = SITES.filter(s => only ? only.includes(s[0]) : !results[s[0]] || results[s[0]].error);
async function worker() {
  for (let s; (s = queue.shift());) {
    try { results[s[0]] = await visit(s); console.log('ok', s[0], results[s[0]].loadMs + 'ms', results[s[0]].requests + ' req'); }
    catch (e) { results[s[0]] = { id: s[0], name: s[1], url: s[2], error: String(e.message).slice(0, 160) }; console.log('fail', s[0], e.message.slice(0, 100)); }
    fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(results, null, 1));
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await browser.close();
