/* =====================================================================
   B&W BARBER · CONFIG
   The ONE place the owner's facts live. The site, the booking flow and
   the admin page all read this object. Anything marked TODO is a guess
   or an unknown: confirm it with the barber, then edit it here.
   ===================================================================== */
window.BW_CONFIG = {

  /* ---------- Confirmed facts ---------- */
  NAME: 'B&W Barber',
  PLACE: 'Emombo Auberge',
  CITY: 'Yaoundé',
  PHONE_E164: '+237690868831',
  PHONE_LOCAL: '690 86 88 31',
  WHATSAPP: '237690868831',
  OPENING_DATE: '2026-11-16',          // Monday 16 November 2026, first day
  TZ_OFFSET_MIN: 60,                   // Cameroon is UTC+1, no daylight saving

  /* ---------- TODO(owner): unknown, defaults are placeholders ---------- */
  // Only "from 9:00" is confirmed. Closing time and open days are NOT.
  HOURS: {
    // false = the public site says only "from 9:00" and never claims "closed".
    // Set to true once close + days below are confirmed: the site then shows the full
    // hours and the live "Ouvert aujourd'hui · 9h–19h" / "Fermé" status.
    confirmed: false,                  // TODO(owner)
    open: '09:00',
    close: '19:00',                    // TODO(owner): confirm closing time
    days: [1, 2, 3, 4, 5, 6],          // TODO(owner): confirm days. 1 = Monday … 7 = Sunday
  },

  // Social pages. Empty = the link is hidden. TODO(owner): add the real URLs.
  SOCIAL: { instagram: '', facebook: '' },   // e.g. 'https://www.instagram.com/…'

  // Customer reviews. Empty = the whole "Avis" section stays hidden (nothing is invented).
  // Add REAL ones only, with the customer's permission: { name: 'Prénom N.', fr: '…', en: '…' }.
  // Preview the empty layout without publishing it: open the site with ?preview=avis
  REVIEWS: [],                         // TODO(owner)

  // Exact landmark near the shop ("en face de…", "derrière…"). Empty = hidden.
  LANDMARK: { fr: '', en: '' },        // TODO(owner)

  // One real sentence from the barber, in his own words. Empty = hidden.
  // Do NOT invent one, and do NOT invent his years of experience.
  BARBER_QUOTE: { fr: '', en: '' },    // TODO(owner)

  // Confirm the spelling on his ID: "Camanda" or "Camada".
  BARBER: { legalName: 'Camanda Jackson', nickname: 'Rudiger' },   // TODO(owner)

  /* ---------- Price sheet (FCFA), straight from the official sheet ----------
     Durations are DEFAULTS. TODO(owner): confirm each one.
     Keep supabase/schema.sql in step with this list (npm run check verifies it). */
  FORMULES: [
    { id: 'classique', n: 1, price: 1000, duration: 30,
      fr: { name: 'Classique', includes: 'Coupe simple + finition' },
      en: { name: 'Classic',   includes: 'Simple cut + finish' } },
    { id: 'soignee',   n: 2, price: 2000, duration: 45,
      fr: { name: 'Soignée',   includes: 'Coupe + black' },
      en: { name: 'Neat',      includes: 'Cut + black' } },
    { id: 'premium',   n: 3, price: 3000, duration: 60,
      fr: { name: 'Premium',   includes: 'Coupe + black + soin de visage' },
      en: { name: 'Premium',   includes: 'Cut + black + facial care' } },
    { id: 'couleur',   n: 4, price: 5000, duration: 90,
      fr: { name: 'Couleur',   includes: 'Coupe + teinture' },
      en: { name: 'Colour',    includes: 'Cut + dye' } },
    { id: 'pedicure',  n: 5, price: 2500, duration: 45,
      fr: { name: 'Pédicure',  includes: 'Pédicure' },
      en: { name: 'Pedicure',  includes: 'Pedicure' } },
    { id: 'enfant',    n: null, price: 500, duration: 20,
      fr: { name: 'Enfant',    includes: 'Coupe enfant + finition' },
      en: { name: 'Child',     includes: 'Child’s cut + finish' } },
  ],

  /* ---------- Booking rules ---------- */
  DEPOSIT_XAF: 500,                    // TODO(owner): acompte per booking, editable
  SLOT_STEP_MIN: 30,                   // start times every 30 min
  LEAD_MIN: 15,                        // no booking starting in under 15 min
  HORIZON_DAYS: 14,                    // calendar shows the next 14 days
  HOLD_ONLINE_MIN: 15,                 // unpaid online booking frees its slot after 15 min
  HOLD_WHATSAPP_MIN: 120,              // WhatsApp request holds the slot 2 h until the barber answers

  /* ---------- Switches ---------- */
  // false = step 4 becomes "Confirmer par WhatsApp". The site works fully in this mode.
  // Turn on only after Notch Pay is approved AND the Vercel env vars are set (see HANDOFF.md).
  PAYMENTS_ENABLED: false,

  // Public Supabase values (the anon key is meant to be public; RLS protects the data).
  // Empty = no database: the booking flow still works and sends the request by WhatsApp.
  SUPABASE_URL: '',                    // https://xxxx.supabase.co
  SUPABASE_ANON_KEY: '',
};
