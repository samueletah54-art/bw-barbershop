// The one place a booking becomes "paid". Idempotent: the webhook and the status
// poll can both arrive, in any order, any number of times.
import { patchBooking, overlapping } from './db.js';
import { notifyBarber } from './notify.js';

const PAID = ['paid', 'confirmed', 'done'];

export async function settlePaid(b) {
  if (PAID.includes(b.status)) return { status: 'paid' };

  if (b.status === 'pending') {
    const rows = await patchBooking(b.id, { status: 'paid', payment_status: 'complete' }, ['pending']);
    if (rows.length) await notifyBarber('paid', rows[0]);   // only the first transition notifies
    return { status: 'paid' };
  }

  if (b.status === 'cancelled') {
    // The 15 min hold ran out before the money arrived. Revive the booking if nobody took the slot.
    const clash = await overlapping(b.date, b.start_time, b.end_time, b.id);
    if (clash.length === 0) {
      const rows = await patchBooking(b.id, { status: 'paid', payment_status: 'complete' }, ['cancelled']);
      if (rows.length) await notifyBarber('paid', rows[0]);
      return { status: 'paid' };
    }
    await patchBooking(b.id, { payment_status: 'paid_slot_lost' }, ['cancelled']);
    await notifyBarber('lost', b);                           // the barber must refund this one
    return { status: 'failed', lost: true };
  }
  return { status: 'failed' };
}
