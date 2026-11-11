// Tells the barber about a paid booking.
//
// Chosen approach (simplest reliable first, see HANDOFF.md):
//   1. Email through Resend (free tier) when RESEND_API_KEY and BARBER_EMAIL are set.
//      The email contains a tap-to-send WhatsApp link to greet the client.
//   2. Always: the booking appears on /admin (auto-refreshes every 30 s).
// If email is not configured, the function logs and carries on. It never blocks a payment.
import { env } from './http.js';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const when = (b) => {
  const d = new Date(`${b.date}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${b.start_time.slice(0, 2)}h${b.start_time.slice(3, 5)}`;
};
const phone = (p) => `${p[0]} ${p.slice(1, 3)} ${p.slice(3, 5)} ${p.slice(5, 7)} ${p.slice(7)}`;

export async function notifyBarber(kind, b, formuleName) {
  const subject = {
    paid: `Nouvelle réservation payée : ${b.name}, ${when(b)}`,
    lost: `À REMBOURSER : paiement reçu mais créneau perdu (${b.name})`,
  }[kind] || 'BW Barber Shop';
  const greet = `Bonjour ${b.name}, votre rendez-vous chez BW Barber Shop est confirmé : ${when(b)}. À bientôt !`;
  const lines = kind === 'lost'
    ? [`${b.name} (${phone(b.phone)}) a payé ${b.deposit_xaf} FCFA après l'expiration de sa réservation, et le créneau ${when(b)} est déjà pris.`, 'Remboursez-le depuis le tableau de bord Notch Pay, ou proposez-lui un autre créneau.']
    : [`${b.name}, ${phone(b.phone)}`, `${formuleName || b.formule}, ${when(b)}`, `Acompte reçu : ${b.deposit_xaf} FCFA`, b.note ? `Note : ${b.note}` : '', '', `Prévenir le client sur WhatsApp : https://wa.me/237${b.phone}?text=${encodeURIComponent(greet)}`];
  const text = lines.filter((l) => l !== '').join('\n');

  const key = env('RESEND_API_KEY'), to = env('BARBER_EMAIL');
  if (!key || !to) { console.log('[notify] email not configured:', subject); return { sent: false }; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('NOTIFY_FROM', 'BW Barber Shop <onboarding@resend.dev>'), to: [to], subject, text }),
    });
    if (!res.ok) console.error('[notify] resend', res.status, (await res.text()).slice(0, 200));
    return { sent: res.ok };
  } catch (e) {
    console.error('[notify] failed', e.message);
    return { sent: false };
  }
}
