// Builds the refreshed UrFU logo set into design/logo/.
// Sign geometry is hand-built on a 1:2 slope grid; wordmarks are outlined from Golos Text,
// so the SVGs do not depend on installed fonts (important for the Figma import).
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const OUT = path.resolve('../design/logo');
fs.mkdirSync(OUT, { recursive: true });

const font = w => opentype.loadSync(`fonts/Golos_Text_wght_${w}.woff`);
const F = { 400: font(400), 600: font(600), 700: font(700) };

const COLORS = {
  color: { sign: '#E50046', text: '#1D1D1B' },
  ink: { sign: '#1D1D1B', text: '#1D1D1B' },
  white: { sign: '#FFFFFF', text: '#FFFFFF' },
  dark: { sign: '#E50046', text: '#FFFFFF' },   // brand book «полноцветное на тёмном»: red sign stays red
};

// ---------- Sign «У-долина» ----------
// Units: sign box 82 × 118. A Latin U (Ural, University) whose right stem runs on down and turns
// into a hook — a handwritten Cyrillic «у». Stems are 20 wide; the U bowl is centred at (41, 40),
// radii 21/41, so its bottom sits at 81 ≈ cap height 84. The hook is centred at (50, 84), radii 12/32,
// and ends with a vertical cut at x = 24.
// The stem tops are cut towards the centre at the 1:2 slope of the interface diagonals: two slopes
// and a valley between them — the Urals. Extended, the cuts meet at (49; 24.5) above the bowl.
// `d` is the whole sign as one contour; `parts` split it for animation (the hook slides in along the slope).
export const SIGN = {
  w: 82, h: 118,
  d: 'M0 0L20 10V40A21 21 0 0 0 62 40V18L82 8V84A32 32 0 0 1 50 116H24V96H50A12 12 0 0 0 62 84V75.21A41 41 0 0 1 0 40Z',
  parts: {
    body: 'M0 0L20 10V40A21 21 0 0 0 62 40H70V68.98A41 41 0 0 1 0 40Z',
    hook: 'M62 18L82 8V84A32 32 0 0 1 50 116H24V96H50A12 12 0 0 0 62 84Z',
  },
};

const signPaths = (fill, dx = 0, dy = 0, k = 1) => {
  const t = (dx || dy || k !== 1) ? ` transform="translate(${r(dx)} ${r(dy)})${k !== 1 ? ` scale(${r(k, 4)})` : ''}"` : '';
  return `<path fill="${fill}"${t} d="${SIGN.d}"/>`;
};

const r = (n, d = 2) => +n.toFixed(d);

// Text helpers: returns { d, width } with the first glyph's side bearing removed,
// so the visible ink starts exactly at x.
function text(str, f, size, x, baseline) {
  const p = f.getPath(str, 0, 0, size, { kerning: true });
  const bb = p.getBoundingBox();
  const shifted = f.getPath(str, x - bb.x1, baseline, size, { kerning: true });
  return { d: shifted.toPathData(2), width: bb.x2 - bb.x1, x2: x + (bb.x2 - bb.x1) };
}

function svg(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}

// ---------- Metrics ----------
// Upper block: three lines whose cap-top..last-baseline span equals the sign height.
const CAP = 0.7, XH = 0.53;              // Golos Text cap height / x-height per em
const LEAD = 1.1;                        // line pitch in em
const s = SIGN.h / (CAP + 2 * LEAD);     // ≈ 40.69 units
const gapX = 0.5 * s;                    // sign → text, ≈ half an em (≈ 1 x-height)
const textX = SIGN.w + gapX;
const base = [CAP * s, CAP * s + LEAD * s, SIGN.h];

function upperBlock(lines, fill) {
  let maxX = 0;
  const paths = lines.map((ln, i) => {
    const t = text(ln, F[600], s, textX, base[i]);
    maxX = Math.max(maxX, t.x2);
    return `<path d="${t.d}"/>`;
  });
  return { body: `<g fill="${fill}">${paths.join('')}</g>`, maxX };
}

const variants = (name, build) => {
  for (const [v, c] of Object.entries(COLORS)) {
    const { w, h, body, title } = build(c);
    fs.writeFileSync(path.join(OUT, `${name}-${v}.svg`), svg(w, h, body, title));
  }
};

// 1. Short lockup (знак + «Уральский федеральный университет»)
variants('urfu-short-ru', c => {
  const u = upperBlock(['Уральский', 'федеральный', 'университет'], c.text);
  return { w: u.maxX, h: SIGN.h + 0.22 * s, body: signPaths(c.sign) + u.body, title: 'Уральский федеральный университет' };
});

// 2. Full lockup (+ «имени первого Президента России Б.Н. Ельцина»)
variants('urfu-full-ru', c => {
  const u = upperBlock(['Уральский', 'федеральный', 'университет'], c.text);
  const sl = 0.4 * s;
  const b1 = SIGN.h + XH * s + CAP * sl;
  const b2 = b1 + 1.3 * sl;
  const l1 = text('имени первого Президента', F[400], sl, textX, b1);
  const l2 = text('России Б.Н. Ельцина', F[400], sl, textX, b2);
  const w = Math.max(u.maxX, l1.x2, l2.x2);
  const h = b2 + 0.22 * sl; // room for the descender of «р»/«ц»
  return {
    w, h,
    body: signPaths(c.sign) + u.body + `<g fill="${c.text}"><path d="${l1.d}"/><path d="${l2.d}"/></g>`,
    title: 'Уральский федеральный университет имени первого Президента России Б.Н. Ельцина',
  };
});

// 3. English short lockup
variants('urfu-short-en', c => {
  const u = upperBlock(['Ural', 'Federal', 'University'], c.text);
  return { w: u.maxX, h: SIGN.h + 0.22 * s, body: signPaths(c.sign) + u.body, title: 'Ural Federal University' };
});

// 4. Abbreviation: the sign IS the first letter «У», followed by «рФУ» — together it reads «УрФУ».
//    Cap height = main stroke (0…84); the tail hangs like a descender; the gap is ordinary letter
//    spacing, measured from the top of the arm (the sign's widest point).
variants('urfu-abbr', c => {
  const size = 84 / CAP;
  const t = text('рФУ', F[700], size, SIGN.w + 0.05 * size, 84);
  const h = Math.max(SIGN.h, 84 + 0.24 * size);
  return { w: t.x2, h, body: signPaths(c.sign) + `<path fill="${c.text}" d="${t.d}"/>`, title: 'УрФУ' };
});

// 5. Sign only
variants('urfu-sign', c => ({ w: SIGN.w, h: SIGN.h, body: signPaths(c.sign), title: 'Знак УрФУ' }));

// 6. Favicon / app icon: square field, sign at 62 % of the height, centred.
function icon(size, bg, fg) {
  const k = (size * 0.62) / SIGN.h;
  const dx = (size - SIGN.w * k) / 2;
  const dy = (size - SIGN.h * k) / 2;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${bg}"/>` + signPaths(fg, dx, dy, k), 'УрФУ');
}
// Brand blue field, white sign — the brand book's «белое на фирменном синем»; red stays the sign colour on light backgrounds.
fs.writeFileSync(path.join(OUT, 'favicon.svg'), icon(32, '#174496', '#FFFFFF'));
fs.writeFileSync(path.join(OUT, 'app-icon.svg'), icon(512, '#174496', '#FFFFFF'));
fs.writeFileSync(path.join(OUT, 'app-icon-ink.svg'), icon(512, '#1D1D1B', '#E50046'));

// 7. Construction drawing for the brand guide
{
  const pad = 40, W = SIGN.w + pad * 2, H = SIGN.h + pad * 2;
  const grid = [];
  for (let x = 0; x <= SIGN.w + 8; x += 4) grid.push(`<line x1="${x}" y1="-8" x2="${x}" y2="${SIGN.h + 8}"/>`);
  for (let y = -8; y <= SIGN.h + 8; y += 4) grid.push(`<line x1="-8" y1="${y}" x2="${SIGN.w + 8}" y2="${y}"/>`);
  const guides = [
    // the stem cuts at 1:2, extended: they meet at the bottom of the «valley»
    '<line x1="-8" y1="-4" x2="49" y2="24.5"/>', '<line x1="98" y1="0" x2="49" y2="24.5"/>',
    '<circle cx="49" cy="24.5" r="2"/>',
    // bowl and hook centres and radii
    '<circle cx="41" cy="40" r="21"/>', '<circle cx="41" cy="40" r="41"/>',
    '<circle cx="50" cy="84" r="12"/>', '<circle cx="50" cy="84" r="32"/>',
    `<line x1="-8" y1="84" x2="${SIGN.w + 8}" y2="84"/>`,
  ];
  const body = `<g transform="translate(${pad} ${pad})">
<g stroke="#D6D4CE" stroke-width=".4">${grid.join('')}</g>
${signPaths('#E50046')}
<g stroke="#1D1D1B" stroke-width=".6" fill="none" stroke-dasharray="2 2">${guides.join('')}</g>
<g font-family="Golos Text, sans-serif" font-size="5" fill="#1D1D1B">
<text x="2" y="-10">20</text><text x="64" y="-10">20</text>
<text x="${SIGN.w + 6}" y="86">y = 84</text>
<text x="53" y="31">долина</text><text x="-34" y="4">1 : 2</text>
</g></g>`;
  fs.writeFileSync(path.join(OUT, 'construction.svg'), svg(W, H, `<rect width="${W}" height="${H}" fill="#F4F3EF"/>` + body, 'Построение знака УрФУ'));
}

fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify({
  sign: SIGN, emUnits: r(s), gapSignText: r(gapX), lineBaselines: base.map(b => r(b)),
  clearSpace: r(2 * XH * s), note: 'Units = sign units (sign height 118). Clear space = 2 x-heights of the upper block.',
}, null, 2));

console.log('logo set written to', OUT, fs.readdirSync(OUT).length, 'files');
