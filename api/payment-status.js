// GET /api/payment-status?id=…&token=…
// Polled by the booking page while the customer approves the prompt on their phone.
// Asks Notch Pay directly, so it works even if the webhook is late or missing.
import { json, env, UUID } from './_lib/http.js';
import { dbReady, getBooking, patchBooking, releaseExpired } from './_lib/db.js';
import { fetchPayment, notchConfigured } from './_lib/notchpay.js';
import { settlePaid } from './_lib/settle.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  if (!dbReady()) return json(res, 503, { error: 'not_configured' });
  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('id'), token = url.searchParams.get('token');
  if (!UUID.test(id || '') || !UUID.test(token || '')) return json(res, 400, { error: 'bad_request' });

  try {
    let b = await getBooking(id, token);
    if (!b) return json(res, 404, { error: 'booking_not_found' });
    if (['paid', 'confirmed', 'done'].includes(b.status)) return json(res, 200, { status: 'paid' });

    if (b.payment_ref && notchConfigured() && env('PAYMENTS_ENABLED') === 'true') {
      const p = await fetchPayment(b.payment_ref).catch((e) => { console.error('[status] fetch', e.message); return null; });
      if (p && p.status === 'paid') {
        if (p.amount != null && p.amount < b.deposit_xaf) return json(res, 200, { status: 'failed' });  // underpaid: never confirm
        const s = await settlePaid(b);
        return json(res, 200, { status: s.status });
      }
      if (p && p.status === 'failed' && b.status === 'pending') {
        await patchBooking(b.id, { payment_status: 'failed' }, ['pending']);
        return json(res, 200, { status: 'failed' });
      }
    }

    if (b.status === 'pending' && new Date(b.hold_until) < new Date()) {
      await releaseExpired();
      return json(res, 200, { status: 'expired' });
    }
    if (b.status === 'cancelled') return json(res, 200, { status: 'expired' });
    return json(res, 200, { status: b.payment_status === 'failed' ? 'failed' : 'pending', hold_until: b.hold_until });
  } catch (e) {
    console.error('[payment-status]', e.message);
    return json(res, 500, { error: 'server_error' });
  }
}
