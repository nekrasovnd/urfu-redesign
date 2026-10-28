"""Convert research/raw/ege_directions.psv (from calcege.my1.urfu.ru API) into content/ege_directions.json."""
import json, sys

def exams(s):
    return [dict(subject=a.split(':')[0], min=int(a.split(':')[1])) for a in s.split(',') if a]

src, out = sys.argv[1], sys.argv[2]
rows = []
for line in open(src, encoding='utf-8'):
    if not line.strip():
        continue
    code, name, cost, req, opt = line.rstrip('\n').split('|')
    level = {'03': 'бакалавриат', '05': 'специалитет'}.get(code.split('.')[1])
    rows.append(dict(code=code, name=name, level=level,
                     max_cost_rub=int(cost) if cost else None,
                     required=exams(req), choose_one=exams(opt)))

doc = dict(
    source='https://calcege.my1.urfu.ru/ (API /ege/calculate/), выгружено 2026-10-28',
    note='Минимальные баллы ЕГЭ (пороги), а не проходные. Стоимость — максимальная за год, руб.; null — не указана.',
    directions=rows)
json.dump(doc, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(rows), 'directions;', sum(r['max_cost_rub'] is None for r in rows), 'without cost')
