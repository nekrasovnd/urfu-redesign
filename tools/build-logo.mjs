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
};

// ---------- Sign «Точная У» ----------
// Units: sign box 92 × 118. Both strokes run at a 1:2 slope (26.57° from vertical) —
// the same angle the interface uses for its diagonals.
// Main stroke: 22 wide horizontally, flat top at y=0, turns into a calligraphic tail
// that ends with a vertical cut. The right arm («галочка») is 18 wide and stops at y=40,
// leaving the break the brandbook describes: the eye completes the «У» itself.
export const SIGN = {
  w: 92, h: 118,
  main: 'M0 0H22L64 84C68 92 62 118 38 118V110C50 110 52 102 46 92Z',
  arm: 'M74 0H92L72 40H54Z',
};

const signPaths = (fill, dx = 0, dy = 0, k = 1) => {
  const t = (dx || dy || k !== 1) ? ` transform="translate(${r(dx)} ${r(dy)})${k !== 1 ? ` scale(${r(k, 4)})` : ''}"` : '';
  return `<g fill="${fill}"${t}><path d="${SIGN.main}"/><path d="${SIGN.arm}"/></g>`;
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

// 4. Abbreviation: cap height = main stroke (0…84), the tail hangs like the descender of «р».
variants('urfu-abbr', c => {
  const size = 84 / CAP;
  const t = text('УрФУ', F[700], size, SIGN.w + 0.16 * size, 84);
  const h = Math.max(SIGN.h, 84 + 0.24 * size);
  return { w: t.x2, h, body: signPaths(c.sign) + `<path fill="${c.text}" d="${t.d}"/>`, title: 'УрФУ' };
});

// 5. Sign only
variants('urfu-sign', c => ({ w: SIGN.w, h: SIGN.h, body: signPaths(c.sign), title: 'Знак УрФУ' }));

// 6. Favicon / app icon: square field, sign at 62 % of the height, optically centred
//    (the arm is lighter than the tail, so the sign is nudged 3 % right).
function icon(size, bg, fg) {
  const k = (size * 0.62) / SIGN.h;
  const dx = (size - SIGN.w * k) / 2 + size * 0.03;
  const dy = (size - SIGN.h * k) / 2;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${bg}"/>` + signPaths(fg, dx, dy, k), 'УрФУ');
}
fs.writeFileSync(path.join(OUT, 'favicon.svg'), icon(32, '#E50046', '#FFFFFF'));
fs.writeFileSync(path.join(OUT, 'app-icon.svg'), icon(512, '#E50046', '#FFFFFF'));
fs.writeFileSync(path.join(OUT, 'app-icon-ink.svg'), icon(512, '#1D1D1B', '#E50046'));

// 7. Construction drawing for the brand guide
{
  const pad = 40, W = SIGN.w + pad * 2, H = SIGN.h + pad * 2;
  const grid = [];
  for (let x = 0; x <= SIGN.w + 8; x += 4) grid.push(`<line x1="${x}" y1="-8" x2="${x}" y2="${SIGN.h + 8}"/>`);
  for (let y = -8; y <= SIGN.h + 8; y += 4) grid.push(`<line x1="-8" y1="${y}" x2="${SIGN.w + 8}" y2="${y}"/>`);
  const guides = [
    // 1:2 slope guides through both strokes
    '<line x1="-6" y1="-12" x2="68" y2="136"/>', '<line x1="16" y1="-12" x2="90" y2="136"/>',
    '<line x1="80" y1="-12" x2="44" y2="60"/>', '<line x1="98" y1="-12" x2="62" y2="60"/>',
    // where the arm would meet the main stroke — the break
    '<circle cx="48" cy="52" r="3"/>',
  ];
  const body = `<g transform="translate(${pad} ${pad})">
<g stroke="#D6D4CE" stroke-width=".4">${grid.join('')}</g>
${signPaths('#E50046')}
<g stroke="#1D1D1B" stroke-width=".6" fill="none" stroke-dasharray="2 2">${guides.join('')}</g>
<g font-family="Golos Text, sans-serif" font-size="5" fill="#1D1D1B">
<text x="0" y="-14">22</text><text x="74" y="-14">18</text>
<text x="${SIGN.w + 6}" y="42">y = 40</text><text x="${SIGN.w + 6}" y="86">y = 84</text>
<text x="52" y="58">разрыв</text><text x="-34" y="60">1 : 2</text>
</g></g>`;
  fs.writeFileSync(path.join(OUT, 'construction.svg'), svg(W, H, `<rect width="${W}" height="${H}" fill="#F4F3EF"/>` + body, 'Построение знака УрФУ'));
}

fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify({
  sign: SIGN, emUnits: r(s), gapSignText: r(gapX), lineBaselines: base.map(b => r(b)),
  clearSpace: r(2 * XH * s), note: 'Units = sign units (sign height 118). Clear space = 2 x-heights of the upper block.',
}, null, 2));

console.log('logo set written to', OUT, fs.readdirSync(OUT).length, 'files');
