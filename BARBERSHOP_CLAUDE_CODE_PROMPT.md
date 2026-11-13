# Barbershop Website — Claude Code Prompt

Before you paste:
1. Fill in everything in [brackets] under "The shop".
2. Put your files in the repo's /assets folder: hero video (hero.mp4), logo, photos of cuts,
   shop and barbers, the shop's QR code (qr.png) if it has one, and the design screenshots.
3. Don't use the .m3u8 video link: it's someone else's Mux stream and it expires around
   Nov 20, 2026. Use your own footage or a free Pexels clip.

Then paste everything below the line into Claude Code.

---

You are a senior front-end engineer and designer. Build the best barbershop website I have
ever shipped: premium, fast, mobile-first, and built to turn visitors into bookings.

## The shop (fill in before starting; ask me for anything missing)
- Name: [SHOP NAME]
- City / address: [ADDRESS, Yaoundé, Cameroon]
- WhatsApp booking number: [+237 ...]
- Opening hours: [e.g. Mon–Sat 8:00–20:00, Sun 12:00–18:00]
- Services and prices in FCFA: [e.g. Haircut 2,000 · Fade 3,000 · Beard trim 1,500 · Kids 1,500]
- Socials: Instagram [link], Facebook [link], TikTok [link], X [link]

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel.
- No database and no paid services. Content lives in /data/*.json so I can edit
  prices, services, gallery and hours without touching code.
- If this Next.js version has an AGENTS.md or breaking changes, read the docs in
  node_modules/next/dist/docs/ first.

## Assets in this repo
- /assets: hero video, logo, photos of cuts, shop and barbers, QR code, plus screenshots of
  designs I like. Move the photos and video to /public and optimise them (WebP images; the
  video compressed to under 3 MB MP4 with a poster image).
- The screenshots are DESIGN REFERENCES ONLY:
  - Dark glass panel with a blue-to-orange gradient button → style for cards and buttons.
  - Framer "WhatsApp Order Form" → build my own WhatsApp booking form in code (below).
  - Facebook / X / Instagram / LinkedIn white icons → footer and contact social links.
Do not copy any third-party code, video or assets.

## Design
- Dark, premium, masculine-but-warm: near-black background, off-white text, one bold
  accent (gold or the blue→orange gradient from the reference), big confident headings,
  a sharp serif or condensed display font paired with a clean sans (Google Fonts via next/font).
- Full-screen hero with the looping, muted, autoplaying video (playsInline), a dark overlay,
  the shop name, one line of copy and two buttons: "Book on WhatsApp" and "See prices".
  On slow connections or reduced-motion, show the poster image instead.
- Subtle scroll reveals and hover lifts (150–250ms). Respect prefers-reduced-motion.
- Copy sounds like a real local barber talking, not AI marketing. No "elevate",
  "unleash", "seamless". Short, confident, a bit of personality.

## Sections (single page with anchors, plus separate /book and /qr pages)
1. Hero (video)
2. Services and prices: cards from /data/services.json, each with a "Book this" button
3. Gallery: grid of cuts with a lightbox and filters (fades, braids, beard, kids)
4. Meet the barbers: photo, name, speciality, "Book with [name]"
5. Why us: 3–4 honest points (hygiene, on time, walk-ins welcome, etc.)
6. Reviews: real ones from /data/reviews.json; hide the section if empty. Never invent reviews.
7. Hours and location: today's hours highlighted, open/closed badge, embedded Google Map,
   "Get directions" button
8. Contact and footer: phone, WhatsApp, QR code, social icons, copyright

## WhatsApp booking form (my own version of the Framer plugin)
Fields: name, phone, service (dropdown from services.json, shows price), barber
(optional), preferred date, preferred time, notes (optional).
- Validate inputs and show friendly errors.
- On submit, build a neat message and open:
  https://wa.me/<number>?text=<encoded message>
  Example message:
  "Hi [SHOP NAME], I'd like to book:
   Name: … | Phone: … | Service: Fade (3,000 FCFA) | Barber: … | Date: … | Time: … | Notes: …"
- The "Book this" buttons on service cards and barber cards pre-fill the form.
- Plus a floating WhatsApp button on every page.

## QR code
- If there is a QR code image in /assets (e.g. qr.png or qr.svg), use it as the shop's
  official QR code: show it in the Contact section and on a printable /qr page.
  Decode it first and tell me what link it points to, so I can confirm it's correct.
- If there is no QR code in /assets, generate one at build time as an SVG (use the free
  `qrcode` npm package) that links to the live site's /book page. Keep the URL in
  /data/site.json so I can change it later.
- Style it on-brand: dark modules on a light rounded card, the shop logo in the centre,
  with error correction set to "H" so it still scans with the logo on top.
- Create a printable /qr page (A4 and A5) for the shop counter and mirror:
  "Scan to book your next cut", the QR code, the WhatsApp number, hours and socials.
  Hide the site header and footer when printing.
- Add a "Download QR code" button (SVG and PNG) for printing flyers and stickers.
- Test that it scans with a phone camera before finishing.

## Quality bar
- Mobile first at 360px; works on cheap Android phones and slow 3G.
- Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices and SEO.
- Accessible: semantic HTML, alt text, keyboard support, visible focus, AA contrast.
- SEO: title, description, Open Graph image, LocalBusiness / HairSalon structured data with
  address, hours, phone and price range; sitemap and robots.
- Favicon and app icons from my logo. Custom 404.

## How to work
1. Read everything in /assets, then show me a short plan (sections, components, data
   files, colours and fonts) and list any missing shop details. Wait for my OK.
2. Build in small steps with clear git commits. After each step run lint, typecheck and
   build, and fix errors before moving on.
3. Finish with a README in plain English: how to change prices, hours, photos, the QR code
   link and the WhatsApp number, and how to deploy to Vercel.
