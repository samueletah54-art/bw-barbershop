// npm run smoke:notchpay
// Run this ONCE with a Notch Pay TEST key before switching PAYMENTS_ENABLED on.
// It creates a test payment, then reads it back, and prints the raw shapes so you can
// confirm api/_lib/notchpay.js matches what Notch Pay really returns.
//
//   NOTCHPAY_API_KEY=pk_test_xxx node scripts/notchpay-smoke.mjs
//
// It does NOT push a prompt to any phone and does NOT use the live key.
const key = process.env.NOTCHPAY_API_KEY;
const base = (process.env.NOTCHPAY_BASE || 'https://api.notchpay.co').replace(/\/$/, '');
if (!key) { console.error('Set NOTCHPAY_API_KEY to your TEST key first.'); process.exit(1); }
if (!/test/i.test(key)) { console.error('Refusing to run: this does not look like a test key (expected "test" in it).'); process.exit(1); }

const call = async (p, o = {}) => {
  const r = await fetch(base + p, { ...o, headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/json' } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  console.log(`\n${o.method || 'GET'} ${p} -> ${r.status}\n`, JSON.stringify(j, null, 2).slice(0, 1200));
  return { ok: r.ok, j };
};

const init = await call('/payments', { method: 'POST', body: JSON.stringify({ amount: 500, currency: 'XAF', reference: 'bw-smoke-' + Date.now(), description: 'BW Barber Shop smoke test', customer: { name: 'Test Client', phone: '+237690000000' } }) });
const ref = init.j?.transaction?.reference ?? init.j?.reference;
console.log('\nreference we will store:', ref);
if (ref) await call('/payments/' + encodeURIComponent(ref));
console.log('\nCheck above: (1) a reference came back, (2) GET returns a status field, (3) status words are among complete/pending/failed/canceled/expired.');
