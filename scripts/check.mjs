// npm run check
// Catches the mistakes that are easy to make when the owner edits prices or hours:
//   - the price list in index.html, the JSON-LD, js/config.js and supabase/schema.sql must agree
//   - every image referenced exists, every JS/CSS/HTML file referenced exists
//   - no TODO(owner) is hidden: they are listed so nothing is forgotten
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let problems = 0;
const bad = (m) => { console.error('✗ ' + m); problems++; };
const good = (m) => console.log('✓ ' + m);

// config.js
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('js/config.js'), ctx);
const C = ctx.window.BW_CONFIG;

// 1. prices: config vs index.html rows vs JSON-LD vs SQL seed
const html = read('index.html');
const menu = html.slice(html.indexOf('<ol class="board"'), html.indexOf('</ol>', html.indexOf('<ol class="board"')));
const rows = [...menu.matchAll(/data-formule="(\w+)"[\s\S]*?<span class="num"[^>]*>([\d&;nbsp\s]+)<\/span>/g)].map((m) => [m[1], Number(m[2].replace(/\D/g, ''))]);
const durs = [...menu.matchAll(/data-formule="(\w+)"[\s\S]*?<span class="dur">(\d+)<\/span>/g)].map((m) => [m[1], Number(m[2])]);
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const ldPrices = ld.makesOffer.map((o) => Number(o.price));
const sql = read('supabase/schema.sql');
const seed = [...sql.matchAll(/\('(\w+)',\s*\d+,\s*'[^']*',\s*'[^']*',\s*(\d+),\s*(\d+)\)/g)].map((m) => ({ id: m[1], price: Number(m[2]), duration: Number(m[3]) }));
C.FORMULES.forEach((f, i) => {
  const row = rows.find((r) => r[0] === f.id);
  if (!row) bad(`index.html has no price row for "${f.id}"`); else if (row[1] !== f.price) bad(`${f.id}: index.html shows ${row[1]}, config says ${f.price}`);
  if (ldPrices[i] !== f.price) bad(`${f.id}: JSON-LD says ${ldPrices[i]}, config says ${f.price}`);
  const s = seed.find((x) => x.id === f.id);
  if (!s) bad(`schema.sql has no seed for "${f.id}"`); else { if (s.price !== f.price) bad(`${f.id}: schema.sql price ${s.price} vs config ${f.price}`); if (s.duration !== f.duration) bad(`${f.id}: schema.sql duration ${s.duration} vs config ${f.duration}`); }
});
C.FORMULES.forEach((f) => { const d = durs.find((x) => x[0] === f.id); if (!d || d[1] !== f.duration) bad(`${f.id}: the board shows ${d ? d[1] : 'no'} min, config says ${f.duration}`); });
if (!problems) good('prices and durations agree in config.js, index.html, JSON-LD and schema.sql');

// 2. deposit + hours between config and SQL defaults
const num = (re) => Number((sql.match(re) || [])[1]);
if (num(/deposit_xaf\s+int\s+not null default (\d+)/) !== C.DEPOSIT_XAF) bad('deposit differs between config.js and schema.sql'); else good('deposit agrees');
const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
if (num(/open_min\s+int\s+not null default (\d+)/) !== toMin(C.HOURS.open) || num(/close_min\s+int\s+not null default (\d+)/) !== toMin(C.HOURS.close)) bad('opening hours differ between config.js and schema.sql'); else good('opening hours agree');

// 3. referenced local files exist
const refs = new Set();
for (const f of ['index.html', '404.html', 'admin/index.html']) {
  for (const m of read(f).replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:src|href|srcset|imagesrcset)="([^"#?]+)"/g)) {
    for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u && !/^(https?:|mailto:|tel:|data:|\/_vercel\/)/.test(u)) refs.add(path.join(path.dirname(f), u.replace(/^\//, f.startsWith('admin') || u.startsWith('/') ? '' : ''))); }
  }
}
let missing = 0;
for (const r of refs) { const p = path.join(root, path.normalize(r).replace(/^\//, '')); if (!fs.existsSync(p) && !fs.existsSync(path.join(root, r.replace(/^(admin\/)?/, '')))) { bad('missing file: ' + r); missing++; } }
if (!missing) good(`${refs.size} referenced files exist`);

// 4. images: explicit width/height on every <img>
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const noDims = imgs.filter((i) => !/width="\d+"/.test(i) || !/height="\d+"/.test(i));
if (noDims.length) bad(`${noDims.length} <img> without width/height (causes layout shift)`); else good(`all ${imgs.length} <img> have width and height`);

// 5. the open TODOs
const todos = [];
for (const f of ['js/config.js', 'index.html', 'supabase/schema.sql']) read(f).split('\n').forEach((l, i) => { if (/TODO\(/.test(l)) todos.push(`${f}:${i + 1}  ${l.trim().slice(0, 110)}`); });
console.log(`\n${todos.length} open TODOs:`); todos.forEach((t) => console.log('  • ' + t));

if (C.PAYMENTS_ENABLED && !(C.SUPABASE_URL && C.SUPABASE_ANON_KEY)) bad('PAYMENTS_ENABLED is true but Supabase is not configured');
process.exit(problems ? 1 : 0);
