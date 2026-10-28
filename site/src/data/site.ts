// Typed access to the real content collected in ../content (audit of urfu.ru, Oct 2026).
import sitemap from '@content/sitemap.json';
import university from '@content/university.json';
import institutesJson from '@content/institutes.json';
import newsJson from '@content/news.json';
import eventsJson from '@content/events.json';
import scheduleJson from '@content/schedule.json';
import egeJson from '@content/ege_directions.json';
import programsJson from '@content/programs.json';

export { sitemap, university };

export type NavLink = { label: string; href: string; proto?: boolean; featured?: boolean; external?: boolean };
export type Section = { id: string; label: string; href: string; lead: string; children: NavLink[] };

export const sections = sitemap.main as Section[];
export const institutes = institutesJson.institutes;
export const news = newsJson.items;
export const events = eventsJson.items;
export const schedule = scheduleJson;
export const directions = egeJson.directions;

// Programs: the catalogue lists «бакалавриат» and «базовое высшее» as separate rows for the same
// programme (196 duplicates). For navigation and search we keep one row per name + level group.
const LEVEL_GROUP: Record<string, string> = {
  'бакалавриат': 'Бакалавриат', 'базовое высшее образование': 'Бакалавриат',
  'специалитет': 'Специалитет',
  'магистратура': 'Магистратура', 'специализированное высшее образование': 'Магистратура',
  'аспирантура': 'Аспирантура',
};

const INSTITUTE_ABBR: [RegExp, string][] = [
  [/естественных наук/i, 'ИЕНиМ'], [/новых материалов/i, 'ИНМТ'], [/радиоэлектроники/i, 'ИРИТ-РтФ'],
  [/строительства/i, 'ИСА'], [/открытого образования/i, 'ИТОО'], [/физической культуры/i, 'ИФКСиМП'],
  [/фундаментального/i, 'ИнФО'], [/экономики и управления/i, 'ИнЭУ'], [/гуманитарный/i, 'УГИ'],
  [/энергетический/i, 'УралЭНИН'], [/Физико-технологический/i, 'ФТИ'], [/Химико-технологический/i, 'ХТИ'],
  [/инженерная школа/i, 'УралПИШ'], [/Нижнетагильский/i, 'НТИ'], [/Каменске/i, 'Каменск-Уральский'],
  [/Верхняя Салда/i, 'Верхняя Салда'], [/Краснотурьинск/i, 'Краснотурьинск'],
];
export const instituteAbbr = (name: string) => INSTITUTE_ABBR.find(([re]) => re.test(name))?.[1] ?? name;

type RawProgram = { institute: string; name: string; code: string | null; direction_name: string; field: string; level: string; url: string | null };
const dirByCode = new Map(egeJson.directions.map(d => [d.code, d]));
const seen = new Set<string>();
export const programs = (programsJson as RawProgram[]).flatMap(p => {
  const level = LEVEL_GROUP[p.level] ?? p.level;
  const institute = instituteAbbr(p.institute);
  const key = `${p.name}|${level}|${institute}`;
  if (seen.has(key)) return [];
  seen.add(key);
  const ege = level === 'Бакалавриат' || level === 'Специалитет' ? dirByCode.get(p.code ?? '') : undefined;
  return [{
    name: p.name, code: p.code, direction: p.direction_name, level, institute, instituteFull: p.institute,
    field: p.field, url: p.url, cost: ege?.max_cost_rub ?? null,
    exams: ege ? { required: ege.required, choose: ege.choose_one } : null,
  }];
});

export const figures = university.figures;

export const fmtNum = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const day = (iso: string) => String(new Date(iso).getDate());
export const monthShort = (iso: string) => MONTHS[new Date(iso).getMonth()];
export const dateLong = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`; };
export const dateRange = (a: string, b?: string) => {
  if (!b) return dateLong(a);
  const da = new Date(a), db = new Date(b);
  return da.getMonth() === db.getMonth() ? `${da.getDate()}–${db.getDate()} ${MONTHS_FULL[db.getMonth()]}` : `${dateLong(a)} — ${dateLong(b)}`;
};

// Pages that exist in the competition prototype. Everything else in the new structure is planned but not built:
// the prototype guide (bottom-left) lists these, and in «только готовые» mode links elsewhere are hidden or dimmed.
export const protoPages: { href: string; label: string; type: string }[] = [
  { href: '/', label: 'Главная', type: 'Главная' },
  { href: '/admission/match', label: 'Подбор программы по баллам ЕГЭ', type: 'Инструмент' },
  { href: '/programs', label: 'Все программы', type: 'Каталог' },
  { href: '/programs/software-engineering', label: 'Программная инженерия', type: 'Карточка программы' },
  { href: '/study/schedule', label: 'Расписание', type: 'Данные' },
  { href: '/study/hub', label: 'Студенческие сервисы', type: 'Хаб' },
  { href: '/news', label: 'Новости', type: 'Лента' },
  { href: '/news/60431', label: 'Учёные создали карту потоков CO₂', type: 'Статья' },
  { href: '/events', label: 'Афиша', type: 'Календарь' },
  { href: '/institutes/irit-rtf', label: 'Институт ИРИТ-РтФ', type: 'Институт' },
  { href: '/life/campus', label: 'Кампус и карта', type: 'Карта' },
  { href: '/sveden', label: 'Сведения об образовательной организации', type: 'Обязательный раздел' },
];
export const builtRoutes = [...protoPages.map(p => p.href), ...news.map(n => `/news/${n.id}`)];
