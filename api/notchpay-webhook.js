// POST /api/notchpay-webhook
// Notch Pay calls this when a payment changes state.
// 1. Verify the HMAC signature of the RAW body (rejects anything not sent by Notch Pay).
// 2. Do NOT trust the payload: re-fetch the payment from Notch Pay and check status + amount.
// 3. Mark the booking paid (idempotent) and tell the barber.
import { json, readRaw } from './_lib/http.js';
import { dbReady, getBookingByRef, patchBooking } from './_lib/db.js';
import { verifySignature, referenceFromWebhook, fetchPayment, notchConfigured } from './_lib/notchpay.js';
import { settlePaid } from './_lib/settle.js';

// Vercel: give us the untouched body so the signature can be checked.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  const raw = await readRaw(req);

  if (!verifySignature(raw, req.headers['x-notch-signature'])) {
    console.warn('[webhook] bad or missing signature');
    return json(res, 401, { error: 'invalid_signature' });
  }
  if (!dbReady() || !notchConfigured()) return json(res, 503, { error: 'not_configured' });

  let payload = {};
  try { payload = JSON.parse(raw); } catch { return json(res, 400, { error: 'bad_json' }); }
  const ref = referenceFromWebhook(payload);
  if (!ref) return json(res, 200, { ok: true, ignored: 'no_reference' });

  try {
    const b = await getBookingByRef(ref);
    if (!b) return json(res, 200, { ok: true, ignored: 'unknown_reference' });   // not ours: acknowledge so Notch Pay stops retrying

    const p = await fetchPayment(ref);
    if (p.status === 'paid') {
      if (p.amount != null && p.amount < b.deposit_xaf) {
        console.error('[webhook] underpaid', ref, p.amount, b.deposit_xaf);
        await patchBooking(b.id, { payment_status: 'underpaid' }, ['pending', 'cancelled']);
        return json(res, 200, { ok: true, ignored: 'underpaid' });
      }
      await settlePaid(b);
    } else if (p.status === 'failed' && b.status === 'pending') {
      await patchBooking(b.id, { payment_status: 'failed' }, ['pending']);
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[webhook]', e.message);
    return json(res, 500, { error: 'server_error' });   // 5xx: Notch Pay will retry
  }
}
