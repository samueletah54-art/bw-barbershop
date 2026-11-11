// Tests for the payment functions. Supabase and Notch Pay are replaced by in-memory fakes,
// so this proves OUR logic (signature check, re-fetching, amounts, idempotence, expiry),
// not Notch Pay's real behaviour. See HANDOFF.md for the live smoke test.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
process.env.NOTCHPAY_API_KEY = 'pk_test_x';
process.env.NOTCHPAY_HASH_KEY = 'hash_secret';
process.env.PAYMENTS_ENABLED = 'true';
process.env.RESEND_API_KEY = 're_x';
process.env.BARBER_EMAIL = 'barber@example.com';

const ID = '11111111-2222-3333-4444-555555555555';
const OTHER = '99999999-2222-3333-4444-555555555555';
const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

let bookings, notch, emails, notchCalls;
const reset = () => {
  bookings = [{ id: ID, token: TOKEN, formule: 'soignee', date: '2026-11-18', start_time: '10:00:00', end_time: '10:45:00', name: 'Jean Fotso', phone: '677123456', note: null, status: 'pending', mode: 'online', deposit_xaf: 500, payment_ref: null, payment_status: null, payment_attempts: 0, hold_until: new Date(Date.now() + 10 * 60000).toISOString() }];
  notch = { payments: {} }; emails = []; notchCalls = [];
};

// ---- fake fetch ----
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url); const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  const ok = (data, status = 200) => ({ ok: status < 400, status, text: async () => (data === undefined ? '' : JSON.stringify(data)) });

  if (u.host === 'fake.supabase.co') {
    if (u.pathname === '/rest/v1/rpc/release_expired') { bookings.forEach((b) => { if (b.status === 'pending' && new Date(b.hold_until) < new Date()) b.status = 'cancelled'; }); return ok(0); }
    const q = Object.fromEntries(u.searchParams);
    const match = (b) => Object.entries(q).every(([k, v]) => {
      if (k === 'select') return true;
      const [op, val] = [v.split('.')[0], v.split('.').slice(1).join('.')];
      if (op === 'eq') return String(b[k]) === val;
      if (op === 'neq') return String(b[k]) !== val;
      if (op === 'in') return val.replace(/[()]/g, '').split(',').includes(b[k]);
      return true;
    });
    if (method === 'GET') return ok(bookings.filter(match).map((b) => ({ ...b })));
    if (method === 'PATCH') { const rows = bookings.filter(match); rows.forEach((b) => Object.assign(b, body)); return ok(rows.map((b) => ({ ...b }))); }
  }
  if (u.host === 'api.notchpay.co') {
    notchCalls.push(`${method} ${u.pathname}`);
    if (method === 'POST' && u.pathname === '/payments') { const ref = 'trx.' + body.reference; notch.payments[ref] = { status: 'pending', amount: body.amount, currency: body.currency }; return ok({ transaction: { reference: ref } }); }
    const m = u.pathname.match(/^\/payments\/(.+)$/);
    if (m && method === 'POST') return ok({ status: 'Accepted' });
    if (m && method === 'GET') { const p = notch.payments[decodeURIComponent(m[1])]; return p ? ok({ transaction: { status: p.status, amount: p.amount, currency: p.currency } }) : ok({ message: 'not found' }, 404); }
  }
  if (u.host === 'api.resend.com') { emails.push(body); return ok({ id: 'e1' }); }
  throw new Error('unexpected fetch ' + method + ' ' + url);
};

// ---- fake req/res ----
const mkReq = (method, { url = '/', body, headers = {}, raw } = {}) => {
  const r = raw !== undefined ? Readable.from([Buffer.from(raw)]) : new Readable({ read() { this.push(null); } });
  Object.assign(r, { method, url, headers: { host: 'bw.test', ...headers } });
  if (body !== undefined) r.body = body;
  return r;
};
const mkRes = () => { const r = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { this.out = s; } }; return r; };
const run = async (handler, req) => { const res = mkRes(); await handler(req, res); return { status: res.statusCode, json: res.out ? JSON.parse(res.out) : null }; };

const { default: createPayment } = await import('../api/create-payment.js');
const { default: paymentStatus } = await import('../api/payment-status.js');
const { default: webhook } = await import('../api/notchpay-webhook.js');
const sign = (raw) => crypto.createHmac('sha256', process.env.NOTCHPAY_HASH_KEY).update(raw).digest('hex');
const hook = (ref, extra = {}) => { const raw = JSON.stringify({ event: 'payment.complete', data: { reference: ref, ...extra } }); return { raw, headers: { 'x-notch-signature': sign(raw) } }; };

test('create-payment: charges the DB amount, never the browser amount', async () => {
  reset();
  const r = await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn', amount: 1 } }));
  assert.equal(r.status, 200);
  assert.equal(notch.payments['trx.bw-11111111-1'].amount, 500);
  assert.equal(notch.payments['trx.bw-11111111-1'].currency, 'XAF');
  assert.equal(bookings[0].payment_ref, 'trx.bw-11111111-1');
  assert.equal(bookings[0].payment_attempts, 1);
  assert.deepEqual(notchCalls, ['POST /payments', 'POST /payments/trx.bw-11111111-1']);
});

test('create-payment: wrong token, bad channel, payments off, expired hold', async () => {
  reset();
  assert.equal((await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: OTHER, channel: 'mtn' } }))).status, 404);
  assert.equal((await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'visa' } }))).status, 400);
  assert.equal((await run(createPayment, mkReq('GET'))).status, 405);
  bookings[0].hold_until = new Date(Date.now() - 1000).toISOString();
  assert.equal((await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'orange' } }))).status, 410);
  reset(); process.env.PAYMENTS_ENABLED = 'false';
  assert.equal((await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }))).status, 503);
  process.env.PAYMENTS_ENABLED = 'true';
});

test('create-payment: caps retries at 5', async () => {
  reset(); bookings[0].payment_attempts = 5;
  assert.equal((await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }))).status, 429);
});

test('webhook: rejects missing / wrong signature, accepts base64 as well as hex', async () => {
  reset();
  const raw = JSON.stringify({ data: { reference: 'x' } });
  assert.equal((await run(webhook, mkReq('POST', { raw }))).status, 401);
  assert.equal((await run(webhook, mkReq('POST', { raw, headers: { 'x-notch-signature': 'deadbeef' } }))).status, 401);
  const b64 = crypto.createHmac('sha256', process.env.NOTCHPAY_HASH_KEY).update(raw).digest('base64');
  assert.equal((await run(webhook, mkReq('POST', { raw, headers: { 'x-notch-signature': b64 } }))).status, 200);
});

test('webhook: a signed but FALSE "complete" is ignored because we re-fetch from Notch Pay', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  const h = hook('trx.bw-11111111-1');           // Notch Pay still says "pending"
  await run(webhook, mkReq('POST', h));
  assert.equal(bookings[0].status, 'pending');
  assert.equal(emails.length, 0);
});

test('webhook: real completion marks paid once, emails once, even if delivered twice', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  notch.payments['trx.bw-11111111-1'].status = 'complete';
  const h = hook('trx.bw-11111111-1');
  assert.equal((await run(webhook, mkReq('POST', h))).status, 200);
  assert.equal((await run(webhook, mkReq('POST', h))).status, 200);
  assert.equal(bookings[0].status, 'paid');
  assert.equal(emails.length, 1);
  assert.match(emails[0].subject, /Jean Fotso/);
  assert.match(emails[0].text, /wa\.me\/237677123456/);
});

test('webhook: underpayment never confirms', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  Object.assign(notch.payments['trx.bw-11111111-1'], { status: 'complete', amount: 100 });
  await run(webhook, mkReq('POST', hook('trx.bw-11111111-1')));
  assert.equal(bookings[0].status, 'pending');
  assert.equal(bookings[0].payment_status, 'underpaid');
});

test('webhook: unknown reference is acknowledged, nothing changes', async () => {
  reset();
  const r = await run(webhook, mkReq('POST', hook('trx.someone-else')));
  assert.equal(r.status, 200); assert.equal(bookings[0].status, 'pending');
});

test('status poll: pending, then paid straight from Notch Pay without any webhook', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'orange' } }));
  const q = `/api/payment-status?id=${ID}&token=${TOKEN}`;
  assert.equal((await run(paymentStatus, mkReq('GET', { url: q }))).json.status, 'pending');
  notch.payments['trx.bw-11111111-1'].status = 'complete';
  assert.equal((await run(paymentStatus, mkReq('GET', { url: q }))).json.status, 'paid');
  assert.equal(bookings[0].status, 'paid');
  assert.equal(emails.length, 1);
});

test('status poll: failed, wrong token, expired', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  notch.payments['trx.bw-11111111-1'].status = 'canceled';
  assert.equal((await run(paymentStatus, mkReq('GET', { url: `/api/payment-status?id=${ID}&token=${TOKEN}` }))).json.status, 'failed');
  assert.equal((await run(paymentStatus, mkReq('GET', { url: `/api/payment-status?id=${ID}&token=${OTHER}` }))).status, 404);
  reset(); bookings[0].hold_until = new Date(Date.now() - 1000).toISOString();
  assert.equal((await run(paymentStatus, mkReq('GET', { url: `/api/payment-status?id=${ID}&token=${TOKEN}` }))).json.status, 'expired');
  assert.equal(bookings[0].status, 'cancelled');
});

test('late payment: slot still free -> booking is revived as paid', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  bookings[0].status = 'cancelled';                           // hold expired and was released
  notch.payments['trx.bw-11111111-1'].status = 'complete';
  await run(webhook, mkReq('POST', hook('trx.bw-11111111-1')));
  assert.equal(bookings[0].status, 'paid');
});

test('late payment: slot already taken -> NOT confirmed, barber is told to refund', async () => {
  reset(); await run(createPayment, mkReq('POST', { body: { booking_id: ID, token: TOKEN, channel: 'mtn' } }));
  bookings[0].status = 'cancelled';
  bookings.push({ id: OTHER, token: 'x', date: '2026-11-18', start_time: '10:00:00', end_time: '10:45:00', status: 'paid', hold_until: null });
  notch.payments['trx.bw-11111111-1'].status = 'complete';
  await run(webhook, mkReq('POST', hook('trx.bw-11111111-1')));
  assert.equal(bookings[0].status, 'cancelled');
  assert.equal(bookings[0].payment_status, 'paid_slot_lost');
  assert.match(emails[0].subject, /REMBOURSER/);
});
