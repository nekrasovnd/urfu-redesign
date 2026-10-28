// Copies the logo set from design/logo into public/logo so pages can reference /logo/*.svg.
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('../design/logo');
const dst = path.resolve('public/logo');
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.svg'))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
fs.copyFileSync(path.join(src, 'favicon.svg'), path.resolve('public/favicon.svg'));
console.log('synced logo set →', dst);
