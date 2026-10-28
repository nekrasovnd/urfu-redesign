// Marks links to pages that are not built in the prototype (data-unbuilt), so the «только готовые»
// mode can hide or dim them before first paint. «Built» means the page exists in dist/ — no separate list.
// Runs before postbuild-base.mjs, while links are still root-relative.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p);
  }
})(dist);

const isBuilt = href => {
  const p = href.split(/[?#]/)[0].replace(/\/+$/, '');
  if (!p) return true; // "/" or "/?q" — the homepage
  if (path.extname(p)) return fs.existsSync(path.join(dist, p)); // files: /logo/x.svg, /search-index.json
  return fs.existsSync(path.join(dist, p, 'index.html'));
};

const link = /<a\b(?![^>]*\bdata-unbuilt\b)([^>]*?)\bhref="(\/(?!\/)[^"]*)"/g;
let marked = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const out = html.replace(link, (m, attrs, href) => {
    if (isBuilt(href)) return m;
    marked++;
    return `<a data-unbuilt${attrs}href="${href}"`;
  });
  // List items whose only job is the unbuilt link, and menu lists left with nothing built: CSS hides them
  // without :has(), which is costly to re-match on large pages.
  const out2 = out
    .replace(/<li>(\s*<a data-unbuilt)/g, '<li data-unbuilt-item>$1')
    .replace(/<ul class="megamenu__list">([\s\S]*?)<\/ul>/g, (m, inner) => /<li>/.test(inner) ? m : m.replace('<ul class="megamenu__list">', '<ul class="megamenu__list" data-unbuilt-list>'));
  if (out2 !== html) fs.writeFileSync(f, out2);
}
console.log(`postbuild-proto: ${marked} links to unbuilt pages marked in ${files.length} pages`);
