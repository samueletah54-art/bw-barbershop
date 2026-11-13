# BW Barber Shop · hand-off

Site for BW Barber Shop, Emombo Auberge, Yaoundé. Opening Monday 16 November 2026, 9:00.
Static pages + two small serverless functions. No framework, no build step, no tracking.

## What works today (without any account setup)

- One page, in this order: header (logo, menu, FR/EN, **Réserver**), **hero** (thin gold opening strip at the very top; full-screen shop photo under a 60% black layer; huge white left-aligned headline; three price chips; gold Réserver + outline WhatsApp), **01 Tarifs** (the price sheet as a menu board, every row books that formule), **02 Le barbier**, **03 Galerie**, **04 Avis** (hidden until real reviews exist), **05 Réserver**, **06 Infos** (map on request, Itinéraire, click-to-call, hours table, conditions, privacy), footer with the giant B&W lettering.
- The site is dark (`#0B0B0B`); light sections only where they add contrast (Tarifs, Réserver). Gold `#D4A72C` is used for the opening strip, Réserver buttons and small accents. The hero was redesigned from a written brief (no new screenshot was in the repo); display font Big Shoulders, text font Instrument Sans.
- Phone: sticky bottom bar with **Réserver**, a WhatsApp icon and a call icon (44 px+ targets). WhatsApp opens with "Bonjour BW Barber Shop, je veux réserver une coupe." (EN: "Hello BW Barber Shop, I want to book a cut.").
- Motion: scroll reveals (fade + 16 px rise, staggered), hover states on buttons, chips, menu rows, images. All off under `prefers-reduced-motion`.
- **Booking in 4 steps** (formule, day and time, details, confirmation). **Right now it runs in WhatsApp mode**: the visitor gets a summary and a one-tap "Envoyer sur WhatsApp" button with the message already written. Nothing is saved and no payment is taken, because no database is connected yet.
- `/admin`, `404.html`, `robots.txt`, `sitemap.xml` (with hreflang), JSON-LD (`HairSalon` + `BarberShop`, prices, phone, hours), Open Graph image.
- Useful URLs: `/?lang=en` opens the English version (this is the hreflang target). `/?preview=avis` shows the empty layout of the reviews section so you can see it without publishing anything.

## What needs an account (nothing below is done yet)

| Feature | Needs | Until then |
|---|---|---|
| Real availability, taken slots, `/admin` | Supabase project | Slots are indicative; booking goes by WhatsApp |
| Deposit by MTN MoMo / Orange Money | Approved Notch Pay account + Vercel env vars | Step 4 is "Confirmer par WhatsApp" |
| Email to the barber on each paid booking | Resend account (free) | The booking shows on `/admin` |

Nothing was created in anyone's Supabase, Notch Pay or Resend account. The existing Supabase project in the organisation ("Examina Global") belongs to another product and was deliberately **not** used.

## Every TODO (all live in `js/config.js` unless noted)

Run `npm run check` any time: it lists them and verifies that prices, durations, deposit and hours agree across `config.js`, `index.html`, the JSON-LD and `supabase/schema.sql`.

| # | TODO | Where | Default now |
|---|---|---|---|
| 1 | **Closing time** | `HOURS.close` and `shop_settings.close_min` | 19:00 (a guess) |
| 2 | **Open days** | `HOURS.days` and `shop_settings.open_days` | Mon to Sat (a guess) |
| 3 | When 1 and 2 are confirmed, set `HOURS.confirmed: true` | `HOURS.confirmed` | `false`: the site shows only "Dès 9h" and never claims "closed" |
| 4 | **Duration of each formule** | `FORMULES[].duration` and `formules.duration_min` | Classique 30, Soignée 45, Premium 60, Couleur 90, Pédicure 45, Enfant 20 |
| 5 | **Deposit amount** | `DEPOSIT_XAF` and `shop_settings.deposit_xaf` | 500 FCFA |
| 6 | **Landmark near the shop** | `LANDMARK.fr / .en` | empty: hidden |
| 7 | **One real sentence from Jackson** | `BARBER_QUOTE.fr / .en` | empty: hidden. Do not invent one, and no years of experience |
| 8 | **Barber's name** | `BARBER`, and the text in the "Le barbier" section of `index.html` | "Jackson" only (no first name, no nickname) |
| 9 | **The real logo file** (BW BARBER SHOP with the pole) | header in `index.html`, favicon in `images/` | A text stand-in with the gold "&" (the logo file was not in the upload) |
| 10 | Final domain | `canonical`, `og:url`, `og:image`, JSON-LD image in `index.html`; `robots.txt`; `sitemap.xml` | `bw-barbershop.vercel.app` |
| 11 | Opening hours in the JSON-LD | `index.html` | not included until 1 and 2 are confirmed |
| 12 | The barber's login email | `supabase/schema.sql`, `admins` table | none |
| 13 | **Real customer reviews** (with the customer's permission) | `REVIEWS` in `js/config.js`: `{ name: 'Prénom N.', fr: '…', en: '…' }`, up to 3 | empty: the whole Avis section and its menu links stay hidden. Nothing is invented |
| 14 | **Instagram and Facebook URLs** | `SOCIAL.instagram`, `SOCIAL.facebook` in `js/config.js` (must start with `https://`) | empty: the links are hidden |
| 15 | **Enable Vercel Analytics** (one click) | Vercel dashboard, project, Analytics tab, Enable | the page already loads `/_vercel/insights/script.js`; until enabled it returns 404 (a harmless console message, and it costs 4 points of the Best Practices score) |
| 16 | **Phone number** | confirmed: +237 690 86 88 31 (call and WhatsApp). Nothing to do. If the shop adds a landline, change `tel:` links in `index.html`, `PHONE_E164` in `js/config.js` and `telephone` in the JSON-LD | |
| 17 | **Hours table and JSON-LD hours** | `HOURS` in `js/config.js` (the table follows it once `confirmed: true`), and `openingHoursSpecification` in the JSON-LD in `index.html` | table shows "Dès 9h" and Sunday "À confirmer"; JSON-LD says Mon to Sat, 09:00 to 19:00 (a guess: fix it with TODOs 1 to 3) |
| 18 | The exact **landmark** shows under the address in Infos | `LANDMARK` | hidden |

When you change hours, deposit or durations after the database is live, change them in the Supabase table `shop_settings` / `formules` too (the site reads the database first when it is connected).

## Photos to request from the barber

Daylight, iPhone camera in **photo** mode (not video stills, which is why the current photos are only ~600 px wide):

1. 6 to 10 close-ups of **finished cuts**: side and back, one per formule if possible.
2. The **shop front with its sign**.
3. A **portrait of Jackson** (the current "Le barbier" photo is a video still).
4. Wide shot of the interior at full resolution, for the hero.

The gallery already has a designed "coming soon" tile, so the page is complete without them. The black letterbox bars the brief mentioned are not in these photos (a 4 px strip was trimmed from one).

## Turn on the database (Supabase)

1. Create a Supabase project for the shop (free tier). Suggested name: `bw-barbershop`.
2. SQL editor, paste `supabase/schema.sql`, Run. It is safe to run twice.
3. In the same editor add the barber's login: `insert into public.admins (email) values ('his-email@…');`
4. Authentication, Users, add that email with a password.
5. Project settings, API: copy the **Project URL** and the **anon public key** into `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/config.js`. Commit and push.
6. Copy the **service_role key** into Vercel (see below). It must never go in `config.js` or the repo.

How it is protected (tested, 34 checks): the public has no access to any table. It can only read the list of taken time ranges (no names, no phones) and call `create_booking`, which validates everything and can only create a *pending* booking. Only the barber (logged in, email in `admins`) can read bookings. Only the server can mark one *paid*.

## Turn on payments (Notch Pay + Vercel)

**The barber does this part, in his own name** (the account holds his money):

1. Create an account on Notch Pay (business dashboard) as a business, in Cameroon.
2. Complete the verification they ask for (identity document and business details). Approval can take days, so start now.
3. Make sure **Mobile Money Cameroon** (MTN and Orange, XAF) is enabled on the account.
4. Stay in **test mode** first. Copy the **test public key** (starts `pk_test…`).
5. In the dashboard, add a webhook pointing to `https://<the-site>/api/notchpay-webhook`. Copy the **webhook hash key** it gives you.
6. When tests pass, repeat with the **live** key and switch the account to live.

**Whoever manages Vercel** (Project, Settings, Environment Variables), for Production:

| Name | Value |
|---|---|
| `PAYMENTS_ENABLED` | `true` when ready (leave unset or `false` until then) |
| `NOTCHPAY_API_KEY` | the Notch Pay key from step 4 or 6 |
| `NOTCHPAY_HASH_KEY` | the webhook hash key from step 5 |
| `SUPABASE_URL` | the Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the Supabase service_role key |
| `SITE_URL` | `https://<the-site>` |
| `RESEND_API_KEY`, `BARBER_EMAIL` | optional: email on each paid booking |
| `NOTIFY_FROM` | optional, e.g. `BW Barber Shop <no-reply@your-domain>`; the default only works for testing |

Then set `PAYMENTS_ENABLED: true` in `js/config.js` (this switches step 4 from WhatsApp to MTN/Orange), push, redeploy.

### Before the first real payment (important)

The Notch Pay documentation site could not be reached while this was built, so `api/_lib/notchpay.js` follows the public docs from search results and **has not been run against Notch Pay**. Do this once:

```bash
NOTCHPAY_API_KEY=pk_test_xxx npm run smoke:notchpay
```

It creates a test payment and prints Notch Pay's real replies. Check that a reference comes back, that reading it back returns a status, and that the status words are what `mapStatus()` expects. Then pay a real 500 FCFA test booking from your own phone and check that it turns to **Payé** in `/admin`. Things most likely to need a small fix: the auth header name, the "charge mobile" call, and the webhook signature encoding (both hex and base64 are accepted already).

Safety built in regardless: the amount always comes from the database, a webhook is never trusted on its own (the payment is re-read from Notch Pay), an underpayment never confirms, and a payment that arrives after the 15-minute hold only confirms if nobody took the slot. If someone did, the barber gets an email titled **À REMBOURSER** and the booking shows a badge in `/admin`.

## Notifications: what was chosen

1. **`/admin`** (always): the list refreshes every 30 s and the tab title changes on a new paid booking.
2. **Email via Resend** (optional): one email per paid booking with a tap-to-send WhatsApp greeting for the client.
3. In WhatsApp mode the client's own message lands in the shop's WhatsApp.

No SMS or push, on purpose: simplest reliable first.

## The barber's day-to-day (`/admin`)

Sign in with his email and password. He sees today's and upcoming bookings by day, with **Terminé**, **Absent**, **Annuler**, **Confirmer** (for WhatsApp requests), WhatsApp and Call buttons. **Bloquer un jour** closes a day for bookings (holiday, power cut).

## Google Business Profile (do this, it matters most)

In Yaoundé, people find a barber on Google Maps before anywhere else. Create the shop's Google Business Profile (business.google.com), category "Barber shop", the Emombo Auberge address, phone +237 690 86 88 31, the opening hours once known, the photos above, and the website link. Add the same link in the Instagram and Facebook bios.

## Images and speed

Every photo ships as AVIF, WebP and JPG with `srcset`, explicit width and height, `decoding="async"`, and lazy loading below the fold (the hero photo is preloaded on screens 768 px and wider). The whole set is about 140 KB in AVIF. Fonts are self-hosted subsets, with the display font preloaded. The map is a button: Google's map (and its cookies) loads only if the visitor asks for it.

Lighthouse, mobile preset, local server: **Performance 100, Accessibility 100, Best Practices 96, SEO 100** (LCP 1.2 s, TBT 10 ms, CLS 0.02). Run it again on the live URL once Analytics is enabled.

## Tests and checks in this repo

- `npm run check`: consistency of prices, hours, deposit, files, image sizes; lists TODOs.
- `npm test`: 12 tests on the payment functions with Supabase and Notch Pay faked (signature, re-fetch, amounts, duplicates, late payment, lost slot).
- The SQL was run in a real Postgres engine with Supabase's roles faked: 34 checks (anonymous cannot read or write tables, validation, double booking, expiry, rate limit, blocked days, admin vs non-admin).
- The booking flow (31 checks) and `/admin` were driven in a real browser with the backend faked: all passing. axe-core found 0 accessibility violations on 10 views (desktop, tablet, phone, English, booking steps, open mobile menu, reviews preview, 404, admin). No horizontal overflow from 320 px to 1920 px.
- Not tested: a real Supabase project, real Notch Pay, a real phone on 3G.

## Known limits

- Closing time and open days are guesses until confirmed (see TODOs 1 to 3). The booking calendar already uses them.
- The logo is a text stand-in.
- Photos are low-resolution stills.
- A visitor who closes the tab during a payment can resume for the rest of the 15-minute hold in the same browser only.
- The English version is the same URL (`/?lang=en`), switched by script: the English title and description appear after the switch, but search engines index the French HTML. Separate `/en/` pages would be the next step if English search matters.
- The hero photo is a phone video still (1200 px wide) shown full-screen; the 60% black layer hides most of the softness, but a sharp daylight photo from the barber would improve it most. Phones get the portrait photo.
- Static screenshots cannot show animation, so the motion (reveals, ticker, hovers) is a reasonable reading of the reference, not a copy. A screen recording of the real page would let us match it exactly.
- On a phone the FR/EN switch sits inside the menu (the reference header has no room for it).

## Final redesign (Standfast-style) · what was done and what is still TODO

**Hallmark** is installed (`.claude/skills/hallmark/`, committed). Its linter passes except 3 gates (54, 63, 67) on the hero label "BARBIER · EMOMBO, YAOUNDÉ", which the owner's brief requires in gold capitals. Hallmark does not allow waivers on those gates, so the label is kept as an owner override (comment at the top of `css/styles.css`).

**Logo**: no files were found in `references/logos/`, so `images/logo.svg` is a typographic placeholder (Anton lettering, gold bar). TODO: drop the real logo into `references/logos/`, then replace `images/logo.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.jpg`.

**Price board** follows the Standfast layout (name, duration, price, FCFA only). The shop's own 6 formules replace the Standfast service names. Real prices: Enfant 500, Classique 1 000, Soignée 2 000. The other prices in `js/config.js` are estimates. TODO: confirm every price and duration.

**Pinterest mood board** (not published): shaving illustration → gold star frame idea; B&W silhouette in mirror → high-contrast B&W photo treatment; moustache/revolvers → condensed uppercase, tight headings; retro BARBER poster → giant footer lettering; STAY SHARP shaved head → short, direct copy.

**Motion per section** (`js/motion.js`, loaded after page load; off under reduced motion; light on phones): ticker marquee; nav hide/show; hero CSS line reveal + slow zoom + parallax; price rows slide in with count-up; cursor-follow gold star (desktop); gallery clip-path wipe and B&W→colour hover; barber parallax; footer lettering slide; magnetic buttons; phone bar slides in on scroll.

**TODO list**: cut photos in `images/cuts/` + `CUT_PHOTOS`; real reviews; confirmed hours and closing day; barber speciality, years, quote and name spelling; Instagram/Facebook URLs; landmark; enable Vercel Analytics in the dashboard; custom domain; Notch Pay account/keys; Supabase project + SQL + admin email. Hours in JSON-LD are guesses until confirmed.

## QR code and /qr print page

- **Link it opens:** `QR_URL` in `js/config.js` (now `https://bw-barbershop.vercel.app/book`). `/book` redirects to the booking form (`vercel.json`), so the printed QR keeps working even if the page layout changes.
- **Change the link** (for example when the real domain is set): edit `QR_URL`, run `npm run qr`, commit `images/qr.svg` and `images/qr.png`. `npm run check` fails if the image and `QR_URL` disagree.
- **Look:** dark modules on a cream rounded card, the shop mark in the centre, error correction level H. Decoded back to `QR_URL` from the SVG-rendered PNG and from A4 and A5 print renders (even at 40 dpi). **Still to do: scan the printed sheet once with a real phone camera.**
- **`/qr`** (`qr.html`): counter sign with "Scannez. Réservez votre prochaine coupe." plus the English line, the QR, WhatsApp number, hours and address. Buttons print A4 or A5 (header and buttons are hidden when printing) and download the SVG or PNG. Hours and social handles come from `js/config.js` (hours show "Dès 9h" until `HOURS.confirmed` is true). Not indexed by search engines.
- If the shop has its own official QR image, put it in `/assets/qr.png` and tell me: it gets decoded and its link checked before it replaces this one.
