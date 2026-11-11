// Server-side access to Supabase with the SERVICE ROLE key (bypasses RLS).
// This file only ever runs on Vercel. The key lives in Vercel env vars, never in the browser.
import { UUID, env } from './http.js';

const base = () => env('SUPABASE_URL').replace(/\/$/, '');
const key = () => env('SUPABASE_SERVICE_ROLE_KEY');

export const dbReady = () => Boolean(base() && key());

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`supabase ${res.status}: ${text.slice(0, 200)}`);
  return data;
}

// A booking is only readable with BOTH its id and its secret token.
export async function getBooking(id, token) {
  if (!UUID.test(id || '') || !UUID.test(token || '')) return null;
  const rows = await rest(`bookings?id=eq.${id}&token=eq.${token}&select=*`);
  return rows[0] || null;
}

export async function getBookingByRef(ref) {
  if (!/^[\w.\-]{3,80}$/.test(ref || '')) return null;
  const rows = await rest(`bookings?payment_ref=eq.${encodeURIComponent(ref)}&select=*`);
  return rows[0] || null;
}

// Update, optionally only when the row is still in one of `onlyStatus`. Returns updated rows.
export async function patchBooking(id, patch, onlyStatus) {
  if (!UUID.test(id)) throw new Error('bad id');
  const filter = onlyStatus ? `&status=in.(${onlyStatus.join(',')})` : '';
  return rest(`bookings?id=eq.${id}${filter}`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
}

// Active bookings overlapping a time range on a day (to detect a lost slot).
export async function overlapping(date, startTime, endTime, exceptId) {
  const rows = await rest(`bookings?date=eq.${date}&id=neq.${exceptId}&status=in.(pending,paid,confirmed,done,no_show)&select=id,status,hold_until,start_time,end_time`);
  const m = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return rows.filter((r) =>
    (r.status !== 'pending' || new Date(r.hold_until) > new Date()) &&
    m(startTime) < m(r.end_time) && m(endTime) > m(r.start_time));
}

export async function releaseExpired() {
  try { await rest('rpc/release_expired', { method: 'POST', body: {} }); } catch { /* best effort */ }
}
