// npm run qr
// Builds the shop's QR code from QR_URL in js/config.js:
//   images/qr.svg  (dark modules on a light rounded card, logo in the centre, error correction H)
//   images/qr.png  (1200 px, for flyers and stickers; needs Chromium via Playwright)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), ctx);
const url = ctx.window.BW_CONFIG.QR_URL;
if (!/^https:\/\//.test(url || '')) { console.error('QR_URL in js/config.js must start with https://'); process.exit(1); }

const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const n = qr.modules.size, data = qr.modules.data;
const QUIET = 4, PLATE = 9;                      // quiet zone and logo plate, in modules
const total = n + QUIET * 2, c = Math.floor(n / 2), lo = c - (PLATE - 1) / 2, hi = c + (PLATE - 1) / 2;
const inPlate = (x, y) => x >= lo && x <= hi && y >= lo && y <= hi;

let d = '';                                      // one path, horizontal runs merged
for (let y = 0; y < n; y++) {
  let x = 0;
  while (x < n) {
    if (data[y * n + x] && !inPlate(x, y)) {
      let w = 1; while (x + w < n && data[y * n + x + w] && !inPlate(x + w, y)) w++;
      d += `M${x + QUIET} ${y + QUIET}h${w}v1h-${w}z`; x += w;
    } else x++;
  }
}
const mark = fs.readFileSync(path.join(root, 'images/mark.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const mh = PLATE - 2, mw = mh * 641 / 869, mx = QUIET + lo + (PLATE - mw) / 2, my = QUIET + lo + 1;
const logo = mark.replace(/^<svg[^>]*>/, `<svg x="${mx}" y="${my}" width="${mw}" height="${mh}" viewBox="0 0 641 869">`).replace(/<title>.*?<\/title>/, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 10}" height="${total * 10}" role="img" aria-label="QR code: ${url}"><title>Scan to book at BW Barber Shop</title><rect width="${total}" height="${total}" rx="3" fill="#F4F1EA"/><path d="${d}" fill="#0B0B0B"/><rect x="${QUIET + lo - 0.3}" y="${QUIET + lo - 0.3}" width="${PLATE + 0.6}" height="${PLATE + 0.6}" rx="1.2" fill="#F4F1EA"/>${logo}</svg>`;
fs.writeFileSync(path.join(root, 'images/qr.svg'), svg);
console.log(`✓ images/qr.svg  ${url}  (version ${qr.version}, ${n}×${n}, level H)`);

try {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  await pg.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="1200" height="1200" style="display:block">`);
  await pg.screenshot({ path: path.join(root, 'images/qr.png'), omitBackground: true, clip: { x: 0, y: 0, width: 1200, height: 1200 } });
  await b.close(); console.log('✓ images/qr.png  1200×1200');
} catch (e) { console.warn('! images/qr.png not rebuilt (Playwright/Chromium missing):', e.message); }
