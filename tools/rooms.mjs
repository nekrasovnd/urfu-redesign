// Room prefixes → addresses, derived from the open schedule API instead of from memory.
// Takes groups across institutes, reads two weeks of their schedule and counts (prefix, address) pairs.
// Output: research/rooms.json. Usage: node rooms.mjs
import fs from 'node:fs';

const API = 'https://urfu.ru/api/v2/schedule';
const get = async u => { const r = await fetch(API + u, { headers: { 'User-Agent': 'urfu-redesign-student-project' } }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
// Group name prefixes seen across institutes (one search returns up to ~100 groups).
const SEARCH = ['РИ', 'МЕН', 'ЭН', 'ХТ', 'ФТ', 'НМТ', 'СТ', 'ЭУ', 'ГУ', 'ФО', 'ОО', 'ФК', 'ИМ', 'УП', 'ЭО', 'РЕ', 'ЭМ', 'ПИ', 'МЭ', 'ЛУ', 'ЖУ', 'ПСЕ', 'АСМ', 'ХИ', 'ФК'];
const groups = new Map();
for (const s of SEARCH) {
  try { for (const g of (await get(`/groups?search=${encodeURIComponent(s + '-')}`)).slice(0, 14)) groups.set(g.id, g.title); } catch {}
}
console.log('groups', groups.size);
const pairs = new Map(); // prefix|location → count
const pe = new Map();    // physical education: room|location → count
const prefixOf = t => (t.match(/^[^\d\s]+?(?=-?\d)/) || [t])[0].replace(/-$/, '').toUpperCase();
let done = 0;
for (const [id] of groups) {
  try {
    const d = await get(`/groups/${id}/schedule?date_gte=2026-10-26&date_lte=2026-11-08`);
    for (const e of d.events || []) {
      if (!e.auditoryTitle) continue;
      const loc = (e.auditoryLocation || '').trim();
      if (/^https?:/.test(loc)) continue;
      const k = prefixOf(e.auditoryTitle) + '|' + loc;
      pairs.set(k, (pairs.get(k) || 0) + 1);
      if (/физическ/i.test(e.title)) { const p = e.auditoryTitle + '|' + loc; pe.set(p, (pe.get(p) || 0) + 1); }
    }
  } catch {}
  if (++done % 40 === 0) console.log('…', done);
}
const sort = m => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [a, b] = k.split('|'); return { key: a, location: b, n }; });
const out = { _source: `Открытое API расписания urfu.ru, ${groups.size} групп, 26.10–08.11.2026, собрано ${new Date().toISOString().slice(0, 10)}`, prefixes: sort(pairs), physical_education: sort(pe) };
fs.writeFileSync(new URL('../research/rooms.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(out.prefixes.slice(0, 60).map(x => `${x.key.padEnd(6)} ${String(x.n).padStart(4)}  ${x.location}`).join('\n'));
console.log('\nPE:\n' + out.physical_education.slice(0, 25).map(x => `${x.key.padEnd(12)} ${String(x.n).padStart(4)}  ${x.location}`).join('\n'));
