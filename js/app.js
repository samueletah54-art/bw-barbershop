/* =====================================================================
   BW BARBER SHOP · public site
   Reads window.BW_CONFIG (js/config.js). No libraries, no tracking.
   Sections: 1 helpers · 2 i18n · 3 database · 4 opening status
             5 booking state · 6 booking steps · 7 payment · 8 boot
   ===================================================================== */
(function () {
  'use strict';

  var C = window.BW_CONFIG;
  var root = document.documentElement;
  var lang = 'fr';

  /* ---------------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMin(hm) { var p = String(hm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function xaf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Cameroon has no daylight saving: "now in Yaoundé" is UTC + 60 min.
  function nowLocal() {
    var d = new Date(Date.now() + C.TZ_OFFSET_MIN * 60000);
    return { date: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function dayMs(date) { return Date.parse(date + 'T00:00:00Z'); }
  function addDays(date, n) { var d = new Date(dayMs(date) + n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function daysBetween(a, b) { return Math.round((dayMs(b) - dayMs(a)) / 86400000); }
  function isoDow(date) { var d = new Date(dayMs(date)).getUTCDay(); return d === 0 ? 7 : d; }
  function locale() { return lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function fmtDate(date, opts) {
    opts.timeZone = 'UTC';
    return new Intl.DateTimeFormat(locale(), opts).format(new Date(dayMs(date) + 43200000)).replace('.', '');
  }
  function hoursConfirmed() { return C.HOURS.confirmed === true; }
  // 9h / 9h30 in French, 9 AM / 9:30 AM in English
  function fmtHour(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (lang === 'fr') return h + 'h' + (m ? pad(m) : '');
    return ((h % 12) || 12) + (m ? ':' + pad(m) : '') + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function fmtSlot(hm) { var m = toMin(hm); return lang === 'fr' ? pad(Math.floor(m / 60)) + 'h' + pad(m % 60) : fromMin(m); }
  function formule(id) { for (var i = 0; i < C.FORMULES.length; i++) if (C.FORMULES[i].id === id) return C.FORMULES[i]; return null; }
  function fName(f) { return f[lang].name; }

  // Cameroon mobile numbers: 9 digits starting with 6. Accepts +237, 237, spaces, dots, dashes.
  function normPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('237') === 0) d = d.slice(3);
    return d;
  }
  function phoneOk(d) { return /^6\d{8}$/.test(d); }
  function phoneShow(d) { return d.length === 9 ? d.slice(0, 1) + ' ' + d.slice(1, 3) + ' ' + d.slice(3, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7) : d; }
  function operatorOf(d) {
    if (/^69/.test(d) || /^65[5-9]/.test(d)) return 'orange';
    if (/^6[78]/.test(d) || /^65[0-4]/.test(d)) return 'mtn';
    return null;
  }

  /* ---------------------------------------------------------------
     2. i18n for text built by script (static HTML carries both languages)
     --------------------------------------------------------------- */
  var T = {
    fr: {
      steps: ['Formule', 'Jour et heure', 'Vos infos', 'Acompte'],
      steps_wa: ['Formule', 'Jour et heure', 'Vos infos', 'Confirmer'],
      step_of: 'Étape {n} sur 4',
      t1: 'Quelle formule ?', t2: 'Quel jour, quelle heure ?', t3: 'Vos informations', t4: 'Vérifiez et confirmez',
      min: 'min', fcfa: 'FCFA',
      next: 'Continuer', back: 'Retour', edit: 'Modifier',
      err_formule: 'Choisissez une formule pour continuer.',
      err_date: 'Choisissez un jour.', err_time: 'Choisissez une heure.',
      pick_day: 'Choisissez un jour pour voir les heures libres.',
      day: 'Jour', hour: 'Heure', closed: 'fermé',
      slot_taken_label: 'pris',
      slots_note: 'Les heures barrées sont déjà prises. Durée de cette formule : {d} min.',
      slots_unverified: 'Les disponibilités sont indicatives : le salon confirme votre créneau sur WhatsApp.',
      full_t: 'Ce jour est complet.', full_b: 'Toutes les heures sont prises pour cette formule.',
      full_next: 'Voir le prochain jour libre', full_none: 'Aucun jour libre dans les 14 prochains jours. Écrivez-nous sur WhatsApp.',
      load_err_t: 'Impossible de charger les heures libres.', load_err_b: 'Vérifiez votre connexion, puis réessayez.', retry: 'Réessayer',
      name: 'Nom', name_hint: 'Le nom donné au salon.', phone: 'Téléphone', phone_hint: 'Numéro camerounais, par exemple 690 86 88 31.',
      note: 'Note pour le barbier (facultatif)', note_hint: 'Une coupe précise, une demande particulière.',
      err_name: 'Entrez votre nom (2 lettres au moins).',
      err_phone_empty: 'Entrez votre numéro, par exemple 690 86 88 31.',
      err_phone: 'Numéro invalide : il faut 9 chiffres commençant par 6, par exemple 690 86 88 31.',
      sum_formule: 'Formule', sum_day: 'Jour', sum_time: 'Heure', sum_name: 'Nom', sum_phone: 'Téléphone', sum_price: 'Prix de la coupe', sum_deposit: 'Acompte à payer maintenant', sum_rest: 'Reste à payer au salon',
      pay_how: 'Payer avec', mtn: 'MTN MoMo', orange: 'Orange Money',
      pay_btn: 'Payer l’acompte de {a} FCFA',
      pay_help: 'Vous recevez une demande de paiement sur votre téléphone. Votre créneau est gardé 15 minutes.',
      wa_info_t: 'Confirmation par WhatsApp',
      wa_info_b: 'Le paiement en ligne n’est pas encore ouvert. Vous envoyez votre demande au salon sur WhatsApp, et il vous répond pour confirmer. Aucun paiement n’est demandé ici.',
      wa_btn: 'Confirmer par WhatsApp',
      saving: 'Enregistrement…',
      await_t: 'Validez le paiement sur votre téléphone…',
      await_b: 'Une demande de {op} de {a} FCFA a été envoyée au {phone}. Entrez votre code secret pour payer. Créneau gardé encore',
      cancel_pay: 'Annuler et changer de mode de paiement',
      fail_t: 'Le paiement n’a pas abouti.',
      fail_b: 'Rien n’a été débité si vous n’avez pas validé. Vous pouvez réessayer, ou confirmer par WhatsApp.',
      expired_t: 'Le délai est dépassé.', expired_b: 'Le créneau a été libéré. Choisissez à nouveau une heure.',
      again: 'Choisir une autre heure',
      taken_now_t: 'Ce créneau vient d’être pris.', taken_now_b: 'Quelqu’un a réservé à l’instant. Choisissez une autre heure.',
      limit_t: 'Trop de demandes en attente avec ce numéro.', limit_b: 'Terminez ou attendez la fin d’une réservation en cours, ou écrivez-nous sur WhatsApp.',
      generic_err_t: 'La réservation n’a pas pu être enregistrée.', generic_err_b: 'Réessayez dans un instant. Si cela continue, écrivez-nous sur WhatsApp.',
      offline_t: 'Vous êtes hors ligne.', offline_b: 'La réservation reprendra dès que le réseau revient. Vos choix sont gardés.',
      done_t: 'Réservation confirmée.',
      done_b: 'Acompte reçu. Le salon vous attend le {d} à {h}. Montrez ce récapitulatif ou donnez votre nom à l’arrivée.',
      req_t: 'Dernière étape : envoyez votre demande.',
      req_b: 'Appuyez sur le bouton vert ci-dessous pour envoyer votre demande au salon sur WhatsApp. Votre créneau est gardé {h} h. Il n’est confirmé que lorsque le salon vous répond.',
      req_b_nodb: 'Appuyez sur le bouton ci-dessous pour envoyer votre demande au salon sur WhatsApp. Le salon vérifie le créneau et vous répond pour confirmer.',
      wa_send: 'Envoyer sur WhatsApp', wa_shop: 'Écrire au salon sur WhatsApp',
      ics: 'Ajouter à mon calendrier', ics_prov: 'Ajouter à mon calendrier (provisoire)',
      ref: 'Référence', new_booking: 'Nouvelle réservation',
      resumed: 'Nous avons retrouvé votre réservation en cours.',
      wa_hello: 'Bonjour BW Barber Shop, je voudrais réserver :',
      wa_note: 'Note',
      cal_title: 'BW Barber Shop · {f}',
      // opening status
      st_future: 'Ouverture {d} à {h}, dans {n} jours', st_tomorrow: 'Ouverture demain à {h}', st_today_before: 'Ouverture aujourd’hui à {h}',
      st_open: 'Ouvert aujourd’hui · {r}', st_open_from: 'Ouvert dès {h}', st_opens_today: 'Ouvre aujourd’hui à {h}',
      st_closed_now: 'Fermé · rouvre {d} à {h}', st_closed_day: 'Fermé aujourd’hui · rouvre {d} à {h}',
      to: 'au', and: 'et',
    },
    en: {
      steps: ['Service', 'Day and time', 'Your details', 'Deposit'],
      steps_wa: ['Service', 'Day and time', 'Your details', 'Confirm'],
      step_of: 'Step {n} of 4',
      t1: 'Which service?', t2: 'Which day, which time?', t3: 'Your details', t4: 'Check and confirm',
      min: 'min', fcfa: 'FCFA',
      next: 'Continue', back: 'Back', edit: 'Edit',
      err_formule: 'Choose a service to continue.',
      err_date: 'Choose a day.', err_time: 'Choose a time.',
      pick_day: 'Choose a day to see the free times.',
      day: 'Day', hour: 'Time', closed: 'closed',
      slot_taken_label: 'taken',
      slots_note: 'Struck-through times are already taken. Length of this service: {d} min.',
      slots_unverified: 'Availability is indicative: the shop confirms your slot on WhatsApp.',
      full_t: 'This day is full.', full_b: 'Every time is taken for this service.',
      full_next: 'See the next free day', full_none: 'No free day in the next 14 days. Message us on WhatsApp.',
      load_err_t: 'Could not load the free times.', load_err_b: 'Check your connection, then try again.', retry: 'Try again',
      name: 'Name', name_hint: 'The name to give at the shop.', phone: 'Phone', phone_hint: 'Cameroon number, for example 690 86 88 31.',
      note: 'Note for the barber (optional)', note_hint: 'A specific cut, a special request.',
      err_name: 'Enter your name (at least 2 letters).',
      err_phone_empty: 'Enter your number, for example 690 86 88 31.',
      err_phone: 'Invalid number: it needs 9 digits starting with 6, for example 690 86 88 31.',
      sum_formule: 'Service', sum_day: 'Day', sum_time: 'Time', sum_name: 'Name', sum_phone: 'Phone', sum_price: 'Price of the cut', sum_deposit: 'Deposit to pay now', sum_rest: 'Left to pay at the shop',
      pay_how: 'Pay with', mtn: 'MTN MoMo', orange: 'Orange Money',
      pay_btn: 'Pay the {a} FCFA deposit',
      pay_help: 'You get a payment request on your phone. Your slot is held for 15 minutes.',
      wa_info_t: 'Confirm by WhatsApp',
      wa_info_b: 'Online payment is not open yet. You send your request to the shop on WhatsApp and they reply to confirm. No payment is asked here.',
      wa_btn: 'Confirm by WhatsApp',
      saving: 'Saving…',
      await_t: 'Approve the payment on your phone…',
      await_b: 'A {op} request for {a} FCFA was sent to {phone}. Enter your secret code to pay. Slot held for another',
      cancel_pay: 'Cancel and change payment method',
      fail_t: 'The payment did not go through.',
      fail_b: 'Nothing was charged if you did not approve it. You can try again, or confirm by WhatsApp.',
      expired_t: 'Time ran out.', expired_b: 'The slot was released. Please pick a time again.',
      again: 'Pick another time',
      taken_now_t: 'That slot was just taken.', taken_now_b: 'Someone booked a moment ago. Pick another time.',
      limit_t: 'Too many pending requests with this number.', limit_b: 'Finish or wait for a booking in progress, or message us on WhatsApp.',
      generic_err_t: 'The booking could not be saved.', generic_err_b: 'Try again in a moment. If it keeps happening, message us on WhatsApp.',
      offline_t: 'You are offline.', offline_b: 'Booking resumes when the network is back. Your choices are kept.',
      done_t: 'Booking confirmed.',
      done_b: 'Deposit received. The shop expects you on {d} at {h}. Show this summary or give your name on arrival.',
      req_t: 'Last step: send your request.',
      req_b: 'Tap the button below to send your request to the shop on WhatsApp. Your slot is held for {h} h. It is only confirmed when the shop replies.',
      req_b_nodb: 'Tap the button below to send your request to the shop on WhatsApp. The shop checks the slot and replies to confirm.',
      wa_send: 'Send on WhatsApp', wa_shop: 'Message the shop on WhatsApp',
      ics: 'Add to my calendar', ics_prov: 'Add to my calendar (provisional)',
      ref: 'Reference', new_booking: 'New booking',
      resumed: 'We found your booking in progress.',
      wa_hello: 'Hello BW Barber Shop, I would like to book:',
      wa_note: 'Note',
      cal_title: 'BW Barber Shop · {f}',
      st_future: 'Opening {d} at {h}, in {n} days', st_tomorrow: 'Opening tomorrow at {h}', st_today_before: 'Opening today at {h}',
      st_open: 'Open today · {r}', st_open_from: 'Open from {h}', st_opens_today: 'Opens today at {h}',
      st_closed_now: 'Closed · reopens {d} at {h}', st_closed_day: 'Closed today · reopens {d} at {h}',
      to: 'to', and: 'and',
    },
  };
  function t(key, vars) {
    var s = (T[lang] && T[lang][key] != null) ? T[lang][key] : T.fr[key];
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  /* ---------------------------------------------------------------
     3. DATABASE (Supabase REST, anon key, RLS does the protecting)
     --------------------------------------------------------------- */
  var DB = {
    on: !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY),
    rpc: function (name, body) {
      return fetch(C.SUPABASE_URL + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY },
        body: JSON.stringify(body || {}),
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (data) {
          if (!r.ok) { var e = new Error((data && data.message) || ('http_' + r.status)); e.status = r.status; throw e; }
          return data;
        });
      }, function () { var e = new Error('offline'); e.offline = true; throw e; });
    },
  };

  // When the database is on, its settings win over config.js (so the owner can change
  // hours and deposit in one place without touching code).
  function loadRemoteConfig() {
    if (!DB.on) return Promise.resolve();
    return DB.rpc('get_public_config', {}).then(function (cfg) {
      if (!cfg || !cfg.settings) return;
      var s = cfg.settings;
      C.HOURS.open = fromMin(s.open_min); C.HOURS.close = fromMin(s.close_min); C.HOURS.days = s.open_days;
      C.DEPOSIT_XAF = s.deposit_xaf; C.SLOT_STEP_MIN = s.slot_step_min; C.HOLD_ONLINE_MIN = s.hold_online_min; C.HOLD_WHATSAPP_MIN = s.hold_whatsapp_min;
      (cfg.formules || []).forEach(function (r) { var f = formule(r.id); if (f) { f.price = r.price_xaf; f.duration = r.duration_min; } });
    }).catch(function () { /* keep config.js values */ });
  }

  /* ---------------------------------------------------------------
     4. OPENING STATUS, HOURS, LANDMARK, QUOTE
     --------------------------------------------------------------- */
  function dayRange(days) {
    var names = days.map(function (d) { return fmtDate(addDays('2026-11-16', d - 1), { weekday: 'long' }); });
    var contiguous = days.every(function (d, i) { return i === 0 || d === days[i - 1] + 1; });
    if (names.length > 2 && contiguous) return names[0] + ' ' + t('to') + ' ' + names[names.length - 1];
    return names.join(', ');
  }
  function nextOpenDay(from) {
    for (var i = 1; i <= 8; i++) { var d = addDays(from, i); if (C.HOURS.days.indexOf(isoDow(d)) > -1) return d; }
    return addDays(from, 1);
  }
  function statusText() {
    var now = nowLocal(), o = toMin(C.HOURS.open), c = toMin(C.HOURS.close);
    var openH = fmtHour(o);
    if (now.date < C.OPENING_DATE) {
      var n = daysBetween(now.date, C.OPENING_DATE);
      if (n === 1) return { text: t('st_tomorrow', { h: openH }), state: 'soon' };
      return { text: t('st_future', { d: fmtDate(C.OPENING_DATE, { weekday: 'long', day: 'numeric', month: 'long' }), h: openH, n: n }), state: 'soon' };
    }
    if (now.date === C.OPENING_DATE && now.min < o) return { text: t('st_today_before', { h: openH }), state: 'soon' };
    // Hours are unconfirmed: never claim "closed". Say what we know.
    if (!hoursConfirmed()) return { text: t('st_open_from', { h: openH }), state: 'open' };
    var openToday = C.HOURS.days.indexOf(isoDow(now.date)) > -1;
    if (openToday && now.min >= o && now.min < c) return { text: t('st_open', { r: openH + '–' + fmtHour(c) }), state: 'open' };
    if (openToday && now.min < o) return { text: t('st_opens_today', { h: openH }), state: 'closed' };
    var nd = nextOpenDay(now.date);
    var label = daysBetween(now.date, nd) === 1 ? (lang === 'fr' ? 'demain' : 'tomorrow') : fmtDate(nd, { weekday: 'long' });
    return { text: t(openToday ? 'st_closed_now' : 'st_closed_day', { d: label, h: openH }), state: 'closed' };
  }
  function renderStatus() {
    var el = $('#status-text'), box = $('#status');
    if (!el) return;
    var s = statusText();
    el.textContent = s.text;
    box.setAttribute('data-state', s.state);
  }
  function renderInfo() {
    var dd = $('#hours-dd');
    if (dd) {
      var o = fmtHour(toMin(C.HOURS.open));
      var main = hoursConfirmed() ? (dayRange(C.HOURS.days) + ', ' + o + '–' + fmtHour(toMin(C.HOURS.close))) : (lang === 'fr' ? 'Dès ' : 'From ') + o;
      var sub = hoursConfirmed() ? '' : (lang === 'fr' ? 'Ouverture le lundi 16 novembre 2026. Horaires complets bientôt.' : 'Opening Monday 16 November 2026. Full hours coming soon.');
      dd.innerHTML = esc(main) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    }
    var lm = $('#landmark');
    if (lm) { var txt = C.LANDMARK[lang] || C.LANDMARK.fr; lm.textContent = txt; lm.hidden = !txt; }
    var q = $('#barber-quote');
    if (q) { var qt = C.BARBER_QUOTE[lang] || C.BARBER_QUOTE.fr; q.textContent = qt; q.hidden = !qt; }
    var dep = $('#deposit-term');
    if (dep) dep.hidden = !C.PAYMENTS_ENABLED;
  }

  /* ---------------------------------------------------------------
     5. BOOKING STATE
     --------------------------------------------------------------- */
  var box = null;
  var S = null;
  var payTimer = null, countTimer = null;

  function fresh() {
    return {
      step: 1, view: 'form', formule: null, date: null, time: null,
      name: '', phone: '', note: '', channel: null,
      taken: null, takenStatus: 'idle', errors: {}, banner: null,
      booking: null, saving: false, payInfo: null, focus: null, scroll: false, resumed: false,
    };
  }
  function resetBooking() { stopTimers(); clearSaved(); S = fresh(); }
  function stopTimers() { if (payTimer) clearTimeout(payTimer); if (countTimer) clearInterval(countTimer); payTimer = countTimer = null; }

  var SAVE_KEY = 'bw-booking';
  function save() { try { sessionStorage.setItem(SAVE_KEY, JSON.stringify({ booking: S.booking, formule: S.formule, date: S.date, time: S.time, name: S.name, phone: S.phone, note: S.note, channel: S.channel, mode: S.payInfo && S.payInfo.mode })); } catch (e) {} }
  function clearSaved() { try { sessionStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function loadSaved() { try { return JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }

  function hours() { return C.HOURS; }
  function bookingDays() {
    var now = nowLocal(), start = now.date < C.OPENING_DATE ? C.OPENING_DATE : now.date, out = [];
    for (var i = 0; i < C.HORIZON_DAYS; i++) {
      var d = addDays(start, i);
      out.push({ date: d, closed: hours().days.indexOf(isoDow(d)) < 0 });
    }
    return out;
  }
  function slotsFor(date, f) {
    var o = toMin(hours().open), c = toMin(hours().close), step = C.SLOT_STEP_MIN, now = nowLocal(), list = [];
    for (var s = o; s + f.duration <= c; s += step) {
      if (date === now.date && s < now.min + C.LEAD_MIN) continue;
      var e = s + f.duration;
      var clash = (S.taken || []).some(function (tk) { return tk.date === date && s < toMin(tk.end_time) && e > toMin(tk.start_time); });
      list.push({ start: fromMin(s), taken: clash });
    }
    return list;
  }
  function loadTaken() {
    if (!DB.on) { S.taken = []; S.takenStatus = 'ok'; return Promise.resolve(); }
    S.takenStatus = 'loading'; render();
    var days = bookingDays();
    return DB.rpc('get_taken', { p_from: days[0].date, p_to: days[days.length - 1].date }).then(function (rows) {
      S.taken = rows || []; S.takenStatus = 'ok';
    }).catch(function (e) { S.takenStatus = 'error'; S.takenOffline = !!e.offline; }).then(function () { render(); });
  }

  /* ---------------------------------------------------------------
     6. BOOKING STEPS
     --------------------------------------------------------------- */
  function notice(title, body, extra) {
    return '<div class="notice' + (extra ? ' ' + extra : '') + '" role="alert"><strong>' + esc(title) + '</strong>' + (body ? esc(body) : '') + '</div>';
  }
  function progress() {
    var names = C.PAYMENTS_ENABLED ? t('steps') : T[lang].steps_wa;
    var li = names.map(function (n, i) {
      var k = i + 1, cur = k === S.step, done = k < S.step;
      var inner = done ? '<button type="button" data-act="goto" data-step="' + k + '">' + (k) + '. ' + esc(n) + '</button>' : (k + '. ' + esc(n));
      return '<li' + (cur ? ' aria-current="step"' : '') + (done ? ' data-done="true"' : '') + '>' + inner + '</li>';
    }).join('');
    return '<p class="sr" aria-live="polite">' + esc(t('step_of', { n: S.step })) + '</p><ol class="progress" aria-label="' + esc(t('step_of', { n: S.step })) + '">' + li + '</ol>';
  }
  function err(id, msg) { return '<p class="err" id="' + id + '" role="alert">' + esc(msg) + '</p>'; }

  function step1() {
    var rows = C.FORMULES.map(function (f) {
      var id = 'f-' + f.id, sub = f[lang].includes + ' · ' + f.duration + ' ' + t('min');
      return '<input class="vh" type="radio" name="formule" id="' + id + '" value="' + f.id + '"' + (S.formule === f.id ? ' checked' : '') + '>' +
        '<label class="choice" for="' + id + '"><span><span class="c-name">' + (f.n ? f.n + ' · ' : '') + esc(fName(f)) + '</span><span class="c-sub">' + esc(sub) + '</span></span><span class="c-price">' + xaf(f.price) + ' ' + t('fcfa') + '</span></label>';
    }).join('');
    return '<h3 class="step-title" tabindex="-1" data-focus="title">' + esc(t('t1')) + '</h3>' +
      '<fieldset><legend class="sr">' + esc(t('t1')) + '</legend><div class="choices">' + rows + '</div></fieldset>' +
      (S.errors.formule ? err('err-formule', t('err_formule')) : '') +
      '<div class="nav-row"><button type="button" class="btn btn-dark" data-act="next" data-focus="next">' + esc(t('next')) + '</button></div>';
  }

  function step2() {
    var f = formule(S.formule), days = bookingDays();
    /* Month view: one month at a time with arrows. Same radio inputs as before, so choosing a day works exactly as it did. */
    var keys = [];
    days.forEach(function (d) { var k = d.date.slice(0, 7); if (keys.indexOf(k) < 0) keys.push(k); });
    if (S.month == null) S.month = Math.max(0, keys.indexOf((S.date || days[0].date).slice(0, 7)));
    S.month = Math.min(Math.max(S.month, 0), keys.length - 1);
    var mk = keys[S.month], byDate = {};
    days.forEach(function (d) { byDate[d.date] = d; });
    var first = mk + '-01', parts = first.split('-'), y = +parts[0], mo = +parts[1];
    var dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    function dowIdx(n2) { return (new Date(Date.UTC(y, mo - 1, n2)).getUTCDay() + 6) % 7; }
    var fa = 1; while (fa < dim && !byDate[mk + '-' + (fa < 10 ? '0' + fa : fa)]) fa++;
    var startN = Math.max(1, fa - dowIdx(fa)), lead = startN === 1 ? dowIdx(1) : 0;   // skip whole weeks before the first open day
    var dow = '';
    for (var w = 0; w < 7; w++) dow += '<span class="dow">' + esc(fmtDate('2026-11-' + (16 + w), { weekday: 'short' })) + '</span>';
    var dayHtml = dow + new Array(lead + 1).join('<span></span>');
    for (var n = startN; n <= dim; n++) {
      var ds = mk + '-' + (n < 10 ? '0' + n : n), d = byDate[ds];
      if (!d) { dayHtml += '<span class="day-off" aria-hidden="true">' + n + '</span>'; continue; }
      var id = 'd-' + d.date;
      dayHtml += '<input class="vh" type="radio" name="date" id="' + id + '" value="' + d.date + '"' + (S.date === d.date ? ' checked' : '') + (d.closed ? ' disabled' : '') + '>' +
        '<label class="day" for="' + id + '"><span class="sr">' + esc(fmtDate(d.date, { weekday: 'long', month: 'long' })) + (d.closed ? ' · ' + esc(t('closed')) : '') + '</span><b aria-hidden="true">' + n + '</b></label>';
    }
    var arrows = lang === 'fr' ? ['Mois précédent', 'Mois suivant'] : ['Previous month', 'Next month'];
    var monthHead = '<div class="month-head"><button type="button" class="month-btn" data-act="month" data-dir="-1" aria-label="' + arrows[0] + '"' + (S.month === 0 ? ' disabled' : '') + '>‹</button>' +
      '<p class="month-name" aria-live="polite">' + esc(fmtDate(first, { month: 'long', year: 'numeric' })) + '</p>' +
      '<button type="button" class="month-btn" data-act="month" data-dir="1" aria-label="' + arrows[1] + '"' + (S.month === keys.length - 1 ? ' disabled' : '') + '>›</button></div>';

    var slotHtml;
    if (!S.date) {
      slotHtml = '<p class="slots-note">' + esc(t('pick_day')) + '</p>';
    } else if (S.takenStatus === 'loading' || S.takenStatus === 'idle') {
      slotHtml = '<div class="slots" aria-busy="true" aria-label="…">' + new Array(10).join('<div class="skeleton"></div>') + '</div>';
    } else if (S.takenStatus === 'error') {
      slotHtml = notice(t('load_err_t'), t('load_err_b')) + '<button type="button" class="btn btn-dark" data-act="reload-taken">' + esc(t('retry')) + '</button>';
    } else {
      var slots = slotsFor(S.date, f), free = slots.filter(function (s) { return !s.taken; });
      if (!free.length) {
        var nxt = nextFreeDay(f);
        slotHtml = notice(t('full_t'), t('full_b'), 'is-info') + (nxt ? '<button type="button" class="btn btn-dark" data-act="next-free" data-date="' + nxt + '">' + esc(t('full_next')) + '</button>' : '<p class="slots-note">' + esc(t('full_none')) + '</p>');
      } else {
        slotHtml = '<fieldset><legend class="sr">' + esc(t('hour')) + '</legend><div class="slots">' + slots.map(function (s) {
          var id = 's-' + s.start.replace(':', '');
          return '<input class="vh" type="radio" name="time" id="' + id + '" value="' + s.start + '"' + (S.time === s.start && !s.taken ? ' checked' : '') + (s.taken ? ' disabled' : '') + '>' +
            '<label class="slot" for="' + id + '">' + esc(fmtSlot(s.start)) + (s.taken ? '<span class="sr"> (' + esc(t('slot_taken_label')) + ')</span>' : '') + '</label>';
        }).join('') + '</div></fieldset><p class="slots-note">' + esc(t('slots_note', { d: f.duration })) + (DB.on ? '' : ' ' + esc(t('slots_unverified'))) + '</p>';
      }
    }
    return '<h3 class="step-title" tabindex="-1" data-focus="title">' + esc(t('t2')) + '</h3>' +
      '<p class="step-sub">' + esc(fName(f)) + ' · ' + xaf(f.price) + ' ' + t('fcfa') + '</p>' +
      '<fieldset><legend class="sr">' + esc(t('day')) + '</legend>' + monthHead + '<div class="days is-month">' + dayHtml + '</div></fieldset>' +
      '<div id="slots-area">' + slotHtml + '</div>' +
      (S.errors.date ? err('err-date', t('err_date')) : '') + (S.errors.time ? err('err-time', t('err_time')) : '') +
      (S.banner ? S.banner : '') +
      '<div class="nav-row"><button type="button" class="btn btn-dark" data-act="next" data-focus="next">' + esc(t('next')) + '</button><button type="button" class="link-btn" data-act="back">' + esc(t('back')) + '</button></div>';
  }
  function nextFreeDay(f) {
    var days = bookingDays(), saved = S.date, found = null;
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      if (d.closed || d.date <= S.date) continue;
      S.date = d.date;
      if (slotsFor(d.date, f).some(function (s) { return !s.taken; })) { found = d.date; break; }
    }
    S.date = saved;
    return found;
  }

  function field(id, label, hint, value, attrs, textarea) {
    var invalid = S.errors[id];
    var control = textarea
      ? '<textarea id="' + id + '" name="' + id + '" maxlength="200" ' + attrs + (invalid ? ' aria-invalid="true" aria-describedby="hint-' + id + ' err-' + id + '"' : ' aria-describedby="hint-' + id + '"') + '>' + esc(value) + '</textarea>'
      : '<input id="' + id + '" name="' + id + '" value="' + esc(value) + '" ' + attrs + (invalid ? ' aria-invalid="true" aria-describedby="hint-' + id + ' err-' + id + '"' : ' aria-describedby="hint-' + id + '"') + '>';
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><span class="hint" id="hint-' + id + '">' + esc(hint) + '</span>' + control + '<div id="slot-err-' + id + '">' + (invalid ? err('err-' + id, invalid) : '') + '</div></div>';
  }
  function step3() {
    return '<h3 class="step-title" tabindex="-1" data-focus="title">' + esc(t('t3')) + '</h3>' +
      '<form novalidate data-form="details">' +
      field('name', t('name'), t('name_hint'), S.name, 'type="text" autocomplete="name" autocapitalize="words" required') +
      field('phone', t('phone'), t('phone_hint'), S.phone, 'type="tel" inputmode="tel" autocomplete="tel-national" required') +
      field('note', t('note'), t('note_hint'), S.note, 'rows="3"', true) +
      '<div class="nav-row"><button type="submit" class="btn btn-dark" data-act="next">' + esc(t('next')) + '</button><button type="button" class="link-btn" data-act="back">' + esc(t('back')) + '</button></div></form>';
  }

  function summary(includeDeposit) {
    var f = formule(S.formule);
    var rows = [
      [t('sum_formule'), (f.n ? f.n + ' · ' : '') + fName(f)],
      [t('sum_day'), fmtDate(S.date, { weekday: 'long', day: 'numeric', month: 'long' })],
      [t('sum_time'), fmtSlot(S.time)],
      [t('sum_name'), S.name],
      [t('sum_phone'), phoneShow(normPhone(S.phone))],
      [t('sum_price'), xaf(f.price) + ' ' + t('fcfa')],
    ];
    if (includeDeposit) { rows.push([t('sum_deposit'), xaf(C.DEPOSIT_XAF) + ' ' + t('fcfa')]); rows.push([t('sum_rest'), xaf(Math.max(0, f.price - C.DEPOSIT_XAF)) + ' ' + t('fcfa')]); }
    if (S.booking && S.booking.id) rows.push([t('ref'), String(S.booking.id).slice(0, 8).toUpperCase()]);
    return '<dl class="summary">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
  }

  function step4() {
    var f = formule(S.formule), op = S.channel || operatorOf(normPhone(S.phone)) || 'mtn';
    var head = '<h3 class="step-title" tabindex="-1" data-focus="title">' + esc(t('t4')) + '</h3>';
    var back = '<button type="button" class="link-btn" data-act="goto" data-step="3">' + esc(t('edit')) + '</button>';
    var banner = S.banner || '';
    if (C.PAYMENTS_ENABLED) {
      var methods = ['mtn', 'orange'].map(function (m) {
        return '<input class="vh" type="radio" name="channel" id="ch-' + m + '" value="' + m + '"' + (op === m ? ' checked' : '') + '><label class="choice" for="ch-' + m + '"><span class="c-name">' + esc(t(m)) + '</span></label>';
      }).join('');
      return head + summary(true) + banner +
        '<fieldset><legend class="legend">' + esc(t('pay_how')) + '</legend><div class="pay-methods">' + methods + '</div></fieldset>' +
        '<p class="slots-note help">' + esc(t('pay_help')) + '</p>' +
        '<div class="nav-row tight"><button type="button" class="btn btn-gold" data-act="pay"' + (S.saving ? ' disabled' : '') + '>' + esc(S.saving ? t('saving') : t('pay_btn', { a: xaf(C.DEPOSIT_XAF) })) + '</button>' + back + '</div>';
    }
    return head + summary(false) + banner + notice(t('wa_info_t'), t('wa_info_b'), 'is-info') +
      '<div class="nav-row tight"><button type="button" class="btn btn-gold" data-act="confirm-wa"' + (S.saving ? ' disabled' : '') + '>' + esc(S.saving ? t('saving') : t('wa_btn')) + '</button>' + back + '</div>';
  }

  /* ---- final / payment views ---- */
  function waText() {
    var f = formule(S.formule);
    var lines = [t('wa_hello'), '- ' + fName(f) + ' (' + xaf(f.price) + ' ' + t('fcfa') + ')', '- ' + fmtDate(S.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + fmtSlot(S.time), '- ' + S.name + ', ' + phoneShow(normPhone(S.phone))];
    if (S.note) lines.push('- ' + t('wa_note') + ' : ' + S.note);
    if (S.booking && S.booking.id) lines.push(t('ref') + ' : ' + String(S.booking.id).slice(0, 8).toUpperCase());
    return lines.join('\n');
  }
  function waLink(text) { return 'https://wa.me/' + C.WHATSAPP + '?text=' + encodeURIComponent(text); }
  function icsUrl() {
    var f = formule(S.formule), s = toMin(S.time), e = s + f.duration;
    function stamp(min) { var p = S.date.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 0, min - C.TZ_OFFSET_MIN)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BW Barber Shop//FR', 'BEGIN:VEVENT',
      'UID:' + ((S.booking && S.booking.id) || (S.date + S.time)) + '@bw-barber', 'DTSTAMP:' + stamp(nowLocal().min).slice(0, 8) + 'T000000Z',
      'DTSTART:' + stamp(s), 'DTEND:' + stamp(e), 'SUMMARY:' + t('cal_title', { f: fName(f) }),
      'LOCATION:Emombo Auberge\\, Yaoundé', 'DESCRIPTION:' + 'BW Barber Shop · ' + C.PHONE_E164,
      'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:BW Barber Shop', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  }

  function viewDone() {
    return '<div class="final"><h3 tabindex="-1" data-focus="title">' + esc(t('done_t')) + '</h3><p>' + esc(t('done_b', { d: fmtDate(S.date, { weekday: 'long', day: 'numeric', month: 'long' }), h: fmtSlot(S.time) })) + '</p>' +
      summary(false) +
      '<div class="actions"><a class="btn btn-dark" href="' + icsUrl() + '" download="rendez-vous-bw-barber.ics">' + esc(t('ics')) + '</a><a class="btn btn-ghost" target="_blank" rel="noopener" href="' + esc(waLink(waText())) + '">' + esc(t('wa_shop')) + '</a></div>' +
      '<div class="nav-row"><button type="button" class="link-btn" data-act="new">' + esc(t('new_booking')) + '</button></div></div>';
  }
  function viewRequested() {
    var body = DB.on ? t('req_b', { h: Math.round(C.HOLD_WHATSAPP_MIN / 60) }) : t('req_b_nodb');
    return '<div class="final"><h3 tabindex="-1" data-focus="title">' + esc(t('req_t')) + '</h3><p>' + esc(body) + '</p>' + summary(false) +
      '<div class="actions"><a class="btn btn-gold" target="_blank" rel="noopener" href="' + esc(waLink(waText())) + '">' + esc(t('wa_send')) + '</a><a class="btn btn-ghost" href="' + icsUrl() + '" download="rendez-vous-bw-barber.ics">' + esc(t('ics_prov')) + '</a></div>' +
      '<div class="nav-row"><button type="button" class="link-btn" data-act="new">' + esc(t('new_booking')) + '</button></div></div>';
  }
  function viewAwait() {
    var op = S.channel || operatorOf(normPhone(S.phone)) || 'mtn';
    return '<div class="final"><h3 tabindex="-1" data-focus="title"><span class="pulse" aria-hidden="true"></span>' + esc(t('await_t')) + '</h3>' +
      '<p role="status">' + esc(t('await_b', { op: t(op), a: xaf(C.DEPOSIT_XAF), phone: phoneShow(normPhone(S.phone)) })) + ' <strong class="num" id="hold-left">--:--</strong>.</p>' +
      summary(true) + '<div class="nav-row"><button type="button" class="link-btn" data-act="cancel-pay">' + esc(t('cancel_pay')) + '</button></div></div>';
  }
  function viewFailed() {
    var expired = S.payInfo && S.payInfo.expired;
    return '<div class="final"><h3 tabindex="-1" data-focus="title">' + esc(t(expired ? 'expired_t' : 'fail_t')) + '</h3><p>' + esc(t(expired ? 'expired_b' : 'fail_b')) + (S.payInfo && S.payInfo.message ? ' (' + esc(S.payInfo.message) + ')' : '') + '</p>' +
      '<div class="actions">' + (expired ? '<button type="button" class="btn btn-dark" data-act="restart-time">' + esc(t('again')) + '</button>' :
        '<button type="button" class="btn btn-gold" data-act="pay">' + esc(t('retry')) + '</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="' + esc(waLink(waText())) + '">' + esc(t('wa_btn')) + '</a>') + '</div>' +
      (expired ? '' : '<div class="nav-row"><button type="button" class="link-btn" data-act="cancel-pay">' + esc(t('cancel_pay')) + '</button></div>') + '</div>';
  }

  function render() {
    if (!box || !S) return;
    var html = '';
    if (!navigator.onLine) html += notice(t('offline_t'), t('offline_b'), 'is-info');
    if (S.resumed) html += '<p class="slots-note help">' + esc(t('resumed')) + '</p>';
    if (S.view === 'done') html += viewDone();
    else if (S.view === 'requested') html += viewRequested();
    else if (S.view === 'await') html += viewAwait();
    else if (S.view === 'failed') html += viewFailed();
    else html += progress() + [null, step1, step2, step3, step4][S.step]();
    box.innerHTML = html;
    if (S.view === 'await') startCountdown();
    if (S.focus) {
      var el = box.querySelector('[data-focus="' + S.focus + '"]');
      if (el) { el.focus(); }
      S.focus = null;
    }
  }
  function go(step, focus) { S.step = step; S.errors = {}; S.banner = null; S.focus = focus || 'title'; render(); }

  /* ---- validation ---- */
  function fieldError(id) {
    if (id === 'name') return S.name.trim().length >= 2 ? '' : t('err_name');
    if (id === 'phone') { var d = normPhone(S.phone); if (!S.phone.trim()) return t('err_phone_empty'); return phoneOk(d) ? '' : t('err_phone'); }
    return '';
  }
  function showFieldError(id) {
    var msg = fieldError(id), el = $('#' + id, box), slot = $('#slot-err-' + id, box);
    if (!el || !slot) return msg;
    if (msg) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'hint-' + id + ' err-' + id); slot.innerHTML = err('err-' + id, msg); }
    else { el.removeAttribute('aria-invalid'); el.setAttribute('aria-describedby', 'hint-' + id); slot.innerHTML = ''; }
    return msg;
  }

  function onNext() {
    if (S.step === 1) {
      if (!S.formule) { S.errors = { formule: true }; S.focus = null; render(); var r = $('input[name="formule"]', box); if (r) r.focus(); return; }
      S.time = null; go(2);
      if (S.takenStatus !== 'ok') loadTaken(); else loadTaken();
    } else if (S.step === 2) {
      var errs = {};
      if (!S.date) errs.date = true; else if (!S.time) errs.time = true;
      if (errs.date || errs.time) { S.errors = errs; S.focus = null; render(); return; }
      go(3);
    } else if (S.step === 3) {
      var e1 = fieldError('name'), e2 = fieldError('phone');
      if (e1 || e2) { S.errors = { name: e1, phone: e2 }; S.focus = null; render(); var bad = $(e1 ? '#name' : '#phone', box); if (bad) bad.focus(); return; }
      S.channel = operatorOf(normPhone(S.phone));
      go(4);
    }
  }

  /* ---------------------------------------------------------------
     7. SAVING A BOOKING + PAYMENT
     --------------------------------------------------------------- */
  function createBooking(mode) {
    if (S.booking && S.booking.id && S.booking.mode === mode && S.booking.status === 'pending' && new Date(S.booking.hold_until) > new Date()) return Promise.resolve(S.booking);
    return DB.rpc('create_booking', {
      p_formule: S.formule, p_date: S.date, p_start: S.time, p_name: S.name.trim(), p_phone: normPhone(S.phone), p_note: S.note.trim(), p_mode: mode,
    }).then(function (row) {
      var r = Array.isArray(row) ? row[0] : row;
      S.booking = { id: r.id, token: r.token, status: r.status, hold_until: r.hold_until, deposit_xaf: r.deposit_xaf, mode: mode };
      if (r.deposit_xaf) C.DEPOSIT_XAF = r.deposit_xaf;
      save();
      return S.booking;
    });
  }
  function handleSaveError(e) {
    S.saving = false;
    if (e && /slot_taken/.test(e.message || '')) {
      S.step = 2; S.time = null; S.errors = {}; S.banner = notice(t('taken_now_t'), t('taken_now_b')); S.focus = 'title'; render(); loadTaken();
    } else if (e && /too_many_requests/.test(e.message || '')) {
      S.banner = notice(t('limit_t'), t('limit_b')); S.focus = null; render();
    } else {
      S.banner = notice(t(e && e.offline ? 'offline_t' : 'generic_err_t'), t(e && e.offline ? 'offline_b' : 'generic_err_b'));
      S.focus = null; render();
    }
  }

  function confirmWhatsApp() {
    if (S.saving) return;
    if (!DB.on) { S.view = 'requested'; S.focus = 'title'; render(); return; }
    S.saving = true; S.banner = null; render();
    createBooking('whatsapp').then(function () { S.saving = false; S.view = 'requested'; S.focus = 'title'; save(); render(); }).catch(handleSaveError);
  }

  function api(path, opts) {
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || ('http_' + r.status)); e.status = r.status; throw e; } return d; }); },
      function () { var e = new Error('offline'); e.offline = true; throw e; });
  }
  function startPayment() {
    if (S.saving) return;
    var ch = ($('input[name="channel"]:checked', box) || {}).value || S.channel || operatorOf(normPhone(S.phone)) || 'mtn';
    S.channel = ch; S.saving = true; S.banner = null; if (S.view === 'form') render();
    createBooking('online').then(function (b) {
      return api('/api/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: b.id, token: b.token, channel: ch }) });
    }).then(function () {
      S.saving = false; S.view = 'await'; S.payInfo = { mode: 'online' }; S.focus = 'title'; save(); render(); pollPayment();
    }).catch(function (e) {
      if (e && /slot_taken/.test(e.message || '')) return handleSaveError(e);
      S.saving = false;
      if (e && e.offline) return handleSaveError(e);
      S.view = 'failed'; S.payInfo = { message: e && e.message !== 'provider_error' ? e.message : '' }; S.focus = 'title'; render();
    });
  }
  function pollPayment() {
    if (payTimer) clearTimeout(payTimer);
    if (S.view !== 'await' || !S.booking) return;
    api('/api/payment-status?id=' + encodeURIComponent(S.booking.id) + '&token=' + encodeURIComponent(S.booking.token)).then(function (d) {
      if (S.view !== 'await') return;
      if (d.hold_until) S.booking.hold_until = d.hold_until;
      if (d.status === 'paid' || d.status === 'confirmed') { stopTimers(); S.view = 'done'; S.focus = 'title'; clearSaved(); render(); }
      else if (d.status === 'failed') { stopTimers(); S.view = 'failed'; S.payInfo = {}; S.focus = 'title'; render(); }
      else if (d.status === 'cancelled' || d.status === 'expired') { stopTimers(); S.view = 'failed'; S.payInfo = { expired: true }; S.focus = 'title'; render(); }
      else payTimer = setTimeout(pollPayment, 4000);
    }).catch(function () { if (S.view === 'await') payTimer = setTimeout(pollPayment, 6000); });
  }
  function startCountdown() {
    if (countTimer) clearInterval(countTimer);
    function tick() {
      var el = $('#hold-left'); if (!el || !S.booking) return;
      var left = Math.max(0, Math.round((new Date(S.booking.hold_until) - Date.now()) / 1000));
      el.textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
    }
    tick(); countTimer = setInterval(tick, 1000);
  }

  /* ---- events (one listener, delegated) ---- */
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'next' && b.type === 'submit') return; // handled by submit
    if (act === 'next') onNext();
    else if (act === 'back') go(S.step - 1);
    else if (act === 'goto') go(+b.getAttribute('data-step'));
    else if (act === 'reload-taken') loadTaken();
    else if (act === 'month') { S.month = (S.month || 0) + (+b.getAttribute('data-dir')); render(); }
    else if (act === 'next-free') { S.date = b.getAttribute('data-date'); S.month = null; S.time = null; render(); }
    else if (act === 'confirm-wa') confirmWhatsApp();
    else if (act === 'pay') startPayment();
    else if (act === 'cancel-pay') { stopTimers(); S.view = 'form'; S.step = 4; S.booking = null; clearSaved(); S.focus = 'title'; render(); }
    else if (act === 'restart-time') { stopTimers(); S.view = 'form'; S.step = 2; S.time = null; S.booking = null; clearSaved(); S.focus = 'title'; render(); loadTaken(); }
    else if (act === 'new') { resetBooking(); S.focus = 'title'; render(); }
  }
  function onChange(e) {
    var el = e.target;
    if (el.name === 'formule') { S.formule = el.value; S.errors = {}; var er = $('#err-formule', box); if (er) er.remove(); }
    else if (el.name === 'date') { S.date = el.value; S.time = null; S.errors = {}; render(); }
    else if (el.name === 'time') { S.time = el.value; S.errors = {}; var e2 = $('#err-time', box); if (e2) e2.remove(); }
    else if (el.name === 'channel') { S.channel = el.value; }
  }
  function onInput(e) {
    var el = e.target;
    if (el.id === 'name') S.name = el.value; else if (el.id === 'phone') S.phone = el.value; else if (el.id === 'note') S.note = el.value;
  }
  function onFocusOut(e) { var el = e.target; if (el.id === 'name' || el.id === 'phone') showFieldError(el.id); }
  function onSubmit(e) { e.preventDefault(); onNext(); }

  /* ---------------------------------------------------------------
     8. BOOT
     --------------------------------------------------------------- */
  function setLang(l) {
    lang = l; root.setAttribute('data-lang', l); root.setAttribute('lang', l);
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === l)); });
    $$('[data-wa]').forEach(function (a) { a.href = 'https://wa.me/' + C.WHATSAPP + '?text=' + encodeURIComponent(l === 'fr' ? 'Bonjour BW Barber Shop, je veux réserver une coupe.' : 'Hello BW Barber Shop, I want to book a cut.'); });
    try { localStorage.setItem('bw-lang', l); } catch (e) {}
    renderStatus(); renderInfo(); if (S) render();
  }

  function resume() {
    var sv = loadSaved();
    if (!sv || !sv.booking || !sv.booking.id || !formule(sv.formule)) return;
    if (new Date(sv.booking.hold_until) < new Date() && sv.booking.mode === 'online') { clearSaved(); return; }
    S.booking = sv.booking; S.formule = sv.formule; S.date = sv.date; S.time = sv.time; S.name = sv.name; S.phone = sv.phone; S.note = sv.note || ''; S.channel = sv.channel; S.resumed = true;
    if (sv.booking.mode === 'online') { S.view = 'await'; S.payInfo = { mode: 'online' }; render(); pollPayment(); }
    else { S.view = 'requested'; render(); }
  }

  function boot() {
    box = $('#booking');
    S = fresh();

    $$('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang')); }); });

    if (box) {
      box.addEventListener('click', onClick); box.addEventListener('change', onChange); box.addEventListener('input', onInput);
      box.addEventListener('focusout', onFocusOut); box.addEventListener('submit', onSubmit);
      document.addEventListener('click', function (e) {
        var row = e.target.closest('[data-formule]');
        if (row) { if (S.view !== 'form') resetBooking(); S.formule = row.getAttribute('data-formule'); S.step = 1; S.errors = {}; S.focus = 'next'; render(); }
        else if (e.target.closest('[data-book]') && S.view === 'form') { S.focus = 'title'; render(); }
      });
      window.addEventListener('online', function () { render(); if (S.takenStatus === 'error') loadTaken(); });
      window.addEventListener('offline', render);
    }

    if ('IntersectionObserver' in window && box) {
      var bar = $('.callbar'), sec = $('#reserver');
      if (bar && sec) new IntersectionObserver(function (en) { bar.hidden = en[0].isIntersecting && en[0].intersectionRatio > 0.35; }, { threshold: [0, 0.35, 1] }).observe(sec);
    }

    var saved = null; try { saved = localStorage.getItem('bw-lang'); } catch (e) {}
    setLang(saved === 'en' ? 'en' : 'fr');
    render();
    loadRemoteConfig().then(function () { renderStatus(); renderInfo(); render(); resume(); });
    setInterval(renderStatus, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
