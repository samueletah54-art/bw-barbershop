// POST /api/create-payment  { booking_id, token, channel: 'mtn' | 'orange' }
// Creates the Notch Pay payment with the SERVER-SIDE key and pushes the prompt to the phone.
// The amount always comes from the database row, never from the browser.
import { json, readJson, env, UUID } from './_lib/http.js';
import { dbReady, getBooking, patchBooking, releaseExpired } from './_lib/db.js';
import { initPayment, chargeMobile, notchConfigured } from './_lib/notchpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (env('PAYMENTS_ENABLED') !== 'true') return json(res, 503, { error: 'payments_disabled' });
  if (!dbReady() || !notchConfigured()) return json(res, 503, { error: 'not_configured' });

  const { booking_id, token, channel } = await readJson(req);
  if (!UUID.test(booking_id || '') || !UUID.test(token || '') || !['mtn', 'orange'].includes(channel)) {
    return json(res, 400, { error: 'bad_request' });
  }

  try {
    const b = await getBooking(booking_id, token);
    if (!b) return json(res, 404, { error: 'booking_not_found' });
    if (b.mode !== 'online') return json(res, 400, { error: 'not_an_online_booking' });
    if (['paid', 'confirmed', 'done'].includes(b.status)) return json(res, 200, { ok: true, already_paid: true });
    if (b.status !== 'pending' || new Date(b.hold_until) < new Date()) {
      await releaseExpired();
      return json(res, 410, { error: 'booking_expired' });
    }
    if (b.payment_attempts >= 5) return json(res, 429, { error: 'too_many_attempts' });

    const attempt = b.payment_attempts + 1;
    const site = env('SITE_URL', `https://${req.headers.host}`);
    let ref;
    try {
      ref = await initPayment({
        amount: b.deposit_xaf,
        reference: `bw-${b.id.slice(0, 8)}-${attempt}`,
        name: b.name,
        phone: `+237${b.phone}`,
        description: `Acompte BW Barber Shop ${b.date} ${b.start_time.slice(0, 5)}`,
        callback: `${site}/#reserver`,
      });
      await patchBooking(b.id, { payment_ref: ref, payment_status: 'initiated', payment_attempts: attempt }, ['pending']);
      await chargeMobile(ref, `+237${b.phone}`);
      await patchBooking(b.id, { payment_status: 'prompt_sent' }, ['pending']);
    } catch (e) {
      console.error('[create-payment] provider error', e.status || '', e.message);
      await patchBooking(b.id, { payment_status: 'error', payment_attempts: attempt }, ['pending']).catch(() => {});
      return json(res, 502, { error: 'provider_error' });
    }
    return json(res, 200, { ok: true, reference: ref });
  } catch (e) {
    console.error('[create-payment]', e.message);
    return json(res, 500, { error: 'server_error' });
  }
}
