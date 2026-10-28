// Static search index for the ⌘K palette, built from the real content at build time.
import { sections, programs, institutes, schedule, sitemap } from '../data/site';

export function GET() {
  const items: { t: string; s: string; g: string; h: string; k?: string }[] = [];

  for (const sec of sections) {
    items.push({ t: sec.label, s: 'Раздел', g: 'Страницы', h: sec.href });
    for (const c of sec.children) items.push({ t: c.label, s: sec.label, g: 'Страницы', h: c.href });
  }
  items.push({ t: 'Контакты', s: 'Об университете', g: 'Страницы', h: '/contacts' });
  for (const r of sitemap.roles) items.push({ t: `Для роли: ${r.label.toLowerCase()}`, s: 'Быстрые действия', g: 'Страницы', h: r.landing });

  for (const p of programs) {
    if (p.level === 'Аспирантура') continue;
    const h = p.name === 'Программная инженерия' && p.code === '09.03.04' ? '/programs/software-engineering'
      : `/programs?q=${encodeURIComponent(p.name)}${p.level === 'Магистратура' ? '&level=master' : ''}`;
    items.push({ t: p.name, s: [p.code, p.level, p.institute].filter(Boolean).join(' · '), g: 'Программы', h, k: p.direction });
  }
  for (const i of institutes) items.push({ t: i.name, s: `${i.abbr} · ${i.address}`, g: 'Институты', h: i.abbr === 'ИРИТ-РтФ' ? '/institutes/irit-rtf' : '/institutes', k: i.abbr });
  items.push({ t: 'Кампус и карта', s: 'Где аудитория: Р, ГУК, I…', g: 'Страницы', h: '/life/campus' });

  items.push({ t: schedule.group.title, s: `${schedule.group.institute} · ${schedule.group.course} курс`, g: 'Группы расписания', h: '/study/schedule' });

  const services = [
    ['Личный кабинет студента', 'https://istudent.urfu.ru/'], ['Библиотека', 'https://lib.urfu.ru/'],
    ['Wi-Fi в УрФУ', '/study/hub'], ['Справка об обучении', '/study/documents'], ['Стипендии', '/study/scholarships'],
  ];
  for (const [t, h] of services) items.push({ t, s: 'Сервис', g: 'Сервисы', h });

  // Internal links get the deploy base (/ locally, /<repo>/ on GitHub Pages).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  for (const it of items) if (it.h.startsWith('/')) it.h = base + it.h;

  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
