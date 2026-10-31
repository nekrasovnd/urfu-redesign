// Prefixes root-relative links in the built HTML with BASE_PATH (GitHub Pages project sites
// are served from /<repo>/). Pages and data use plain "/path" links so the site also works at
// a domain root; this pass is a no-op when BASE_PATH is "/" or unset.
import fs from 'node:fs';
import path from 'node:path';

const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
if (!base) process.exit(0);

const dist = path.resolve('dist');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p);
  }
})(dist);

// href/src/srcset/action="/x" but not "//host" and not already under the base.
const attr = /\b(href|src|srcset|action|data-src)="\/(?!\/)([^"]*)"/g;
let changed = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  // srcset holds several URLs: prefix each «/x 640w» entry, not only the first.
  const html2 = html.replace(/srcset="([^"]*)"/g, (m, v) => 'srcset="' + v.split(',').map(part => {
    const t = part.trim();
    if (!t.startsWith('/') || t.startsWith('//') || t.startsWith(base + '/')) return t;
    changed++;
    return base + t;
  }).join(', ') + '"');
  const out = html2.replace(attr, (m, name, rest) => {
    if (name === 'srcset') return m; // handled above (data-srcset too)
    if (('/' + rest).startsWith(base + '/') || '/' + rest === base) return m;
    changed++;
    return `${name}="${base}/${rest}"`;
  });
  if (out !== html) fs.writeFileSync(f, out);
}
console.log(`postbuild-base: ${changed} links prefixed with ${base} in ${files.length} pages`);
