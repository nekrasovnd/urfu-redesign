// Passing scores and budget places from the official admissions site of ИРИТ-РтФ (priem-rtf.urfu.ru):
// every programme page carries passingScore and budgetSeatsCount. Output: content/passing.json,
// shaped for several years per programme so a 3-year average works once more years are published.
import fs from 'node:fs';

const BASE = 'https://priem-rtf.urfu.ru';
const UA = { 'User-Agent': 'urfu-redesign-student-project' };
const xml = await (await fetch(BASE + '/sitemap-0.xml', { headers: UA })).text();
const slugs = [...xml.matchAll(/\/program\/([^/<]+)\//g)].map(m => m[1]);
const out = [];
for (const slug of [...new Set(slugs)]) {
  try {
    const d = await (await fetch(`${BASE}/page-data/program/${slug}/page-data.json`, { headers: UA })).json();
    const p = d.result.data.strapiProgrammy;
    if (!p || p.level !== 'bachelor' && p.level !== 'specialist') continue;
    if (!p.passingScore) continue;
    out.push({
      code: p.code, name: p.name, institute: 'ИРИТ-РтФ', url: `${BASE}/program/${slug}/`,
      budget: p.budgetSeatsCount ?? null, contract: p.contractSeatsCount ?? null,
      // The site does not say which admission year the score is from: stored as «last», not as a year.
      passing: { last: p.passingScore },
    });
  } catch (e) { console.log('skip', slug, e.message); }
}
out.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name, 'ru'));
fs.writeFileSync(new URL('../content/passing.json', import.meta.url), JSON.stringify({
  _source: `${BASE} — страницы программ (поля passingScore, budgetSeatsCount), выгружено ${new Date().toISOString().slice(0, 10)}`,
  _note: 'Проходной балл прошлого приёма по данным сайта приёмной комиссии ИРИТ-РтФ; год на сайте не указан. Остальные институты открыто проходные не публикуют. Формат рассчитан на несколько лет: passing { "2024": …, "2025": …, "2026": … } — тогда ориентир на 2027 = среднее.',
  programs: out,
}, null, 1));
console.log(out.length, 'programmes'); console.log(out.map(p => `${p.code} ${p.passing.last} (${p.budget} бюдж.) ${p.name}`).join('\n'));
