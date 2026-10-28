"""Parse programms.edu.urfu.ru catalog HTML into content/programs.json."""
import json, re, sys, html
from collections import Counter
from html.parser import HTMLParser

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.inst=None; self.row=None; self.cell=None; self.href=None; self.in_h=False; self.htext=''
    def handle_starttag(self, t, a):
        a=dict(a)
        if t in ('h2','h3','h4','caption'): self.in_h=True; self.htext=''
        if t=='tr': self.row=[]; self.href=None
        if t in ('td','th') and self.row is not None: self.cell=''
        if t=='a' and self.cell is not None and a.get('href'): self.href=self.href or a['href']
    def handle_endtag(self, t):
        if t in ('h2','h3','h4','caption') and self.in_h:
            self.in_h=False; s=self.htext.strip()
            if s: self.inst=s
        if t in ('td','th') and self.cell is not None: self.row.append(re.sub(r'\s+',' ',self.cell).strip()); self.cell=None
        if t=='tr' and self.row is not None:
            if len(self.row)>=5 and self.row[1] and not self.row[1].startswith('Образовательная'):
                self.rows.append(dict(institute=self.inst, name=self.row[1], direction=self.row[2], field=self.row[3], level=self.row[4], url=self.href))
            self.row=None
    def handle_data(self, d):
        if self.in_h: self.htext+=d
        if self.cell is not None: self.cell+=d

src, out = sys.argv[1], sys.argv[2]
p=P(); p.feed(open(src,encoding='utf-8').read())
rows=p.rows
for r in rows:
    m=re.match(r'([\d.]+)\s+(.*)', r['direction']); r['code'], r['direction_name'] = (m.group(1), m.group(2)) if m else (None, r['direction'])
    if r['url'] and r['url'].startswith('/'): r['url']='https://programms.edu.urfu.ru'+r['url']
json.dump(rows, open(out,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
print('rows', len(rows))
print(Counter(r['level'] for r in rows).most_common())
print(Counter(r['institute'] for r in rows).most_common())
dup=Counter((r['name'],r['direction']) for r in rows); print('same name+direction listed >1:', sum(1 for v in dup.values() if v>1))
print('distinct program names', len(set(r['name'] for r in rows)))
print(rows[0])
