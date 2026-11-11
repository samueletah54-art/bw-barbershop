// Notch Pay client (MTN MoMo + Orange Money, XAF).
//
// UNVERIFIED AGAINST THE LIVE API: the Notch Pay docs host was unreachable while this was
// written, so the paths and field names below follow Notch Pay's public documentation as
// recalled and cross-checked by search, not by a live call. Before going live, run
//   npm run smoke:notchpay
// with a TEST key (see HANDOFF.md). Everything that depends on a response shape reads it
// defensively, and a payment is only marked paid after we RE-FETCH it from Notch Pay.
import { env } from './http.js';
import crypto from 'node:crypto';

const base = () => env('NOTCHPAY_BASE', 'https://api.notchpay.co').replace(/\/$/, '');
export const notchConfigured = () => Boolean(env('NOTCHPAY_API_KEY'));

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: env('NOTCHPAY_API_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const e = new Error((data && (data.message || data.error)) || `notchpay ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

const refOf = (r) => r?.transaction?.reference ?? r?.reference ?? r?.data?.reference ?? null;

// 1. create the payment
export async function initPayment({ amount, reference, name, phone, description, callback }) {
  const r = await call('/payments', {
    method: 'POST',
    body: { amount, currency: 'XAF', reference, description, callback, customer: { name, phone } },
  });
  const ref = refOf(r);
  if (!ref) throw new Error('notchpay: no payment reference returned');
  return ref;
}

// 2. push the MoMo / Orange Money prompt to the customer's phone
export async function chargeMobile(ref, phone) {
  return call(`/payments/${encodeURIComponent(ref)}`, { method: 'POST', body: { channel: 'cm.mobile', data: { phone } } });
}

// 3. read the payment back from Notch Pay. This is the source of truth.
export async function fetchPayment(ref) {
  const r = await call(`/payments/${encodeURIComponent(ref)}`);
  const trx = r?.transaction ?? r?.data ?? r;
  return {
    status: mapStatus(trx?.status),
    raw: trx?.status ?? null,
    amount: trx?.amount != null ? Number(trx.amount) : null,
    currency: trx?.currency ?? null,
  };
}

export function mapStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'complete' || v === 'completed' || v === 'success' || v === 'successful') return 'paid';
  if (['failed', 'canceled', 'cancelled', 'rejected', 'expired', 'abandoned', 'declined'].includes(v)) return 'failed';
  return 'pending';
}

// Webhook signature: HMAC-SHA256 of the RAW body with the webhook hash key, header x-notch-signature.
// The docs did not state hex vs base64 in the pages we could reach, so both are accepted.
export function verifySignature(rawBody, header) {
  const secret = env('NOTCHPAY_HASH_KEY');
  if (!secret || !header) return false;
  const mac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const given = String(header).trim().replace(/^sha256=/i, '');
  for (const expected of [mac.toString('hex'), mac.toString('base64')]) {
    const a = Buffer.from(expected), b = Buffer.from(given);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

// Find the payment reference in whichever shape the webhook body has.
export function referenceFromWebhook(p) {
  return p?.data?.reference ?? p?.data?.transaction?.reference ?? p?.transaction?.reference ?? p?.reference ?? null;
}
