/* =====================================================================
   BW BARBER SHOP · /admin
   Supabase Auth (email + password) over plain fetch. Every read and write goes
   through Row Level Security: only an email listed in the `admins` table can
   see or change bookings. Customer text is only ever set with textContent.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.BW_CONFIG;
  var KEY = 'bw-admin-session';
  var session = null, timer = null, lastPaidIds = null;

  function $(s) { return document.querySelector(s); }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function show(id) { ['login', 'unconfigured', 'dash'].forEach(function (s) { $('#' + s).hidden = s !== id; }); $('#tools').hidden = id !== 'dash'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(Date.now() + C.TZ_OFFSET_MIN * 60000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function addDays(date, n) { var d = new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dayLabel(date) { return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.parse(date + 'T12:00:00Z'))); }
  function hm(t) { return t.slice(0, 2) + 'h' + t.slice(3, 5); }
  function phoneShow(p) { return p.slice(0, 1) + ' ' + p.slice(1, 3) + ' ' + p.slice(3, 5) + ' ' + p.slice(5, 7) + ' ' + p.slice(7); }
  function formuleName(id) { for (var i = 0; i < C.FORMULES.length; i++) if (C.FORMULES[i].id === id) return C.FORMULES[i].fr.name; return id; }
  function err(target, msg) { var t = $(target); t.textContent = ''; if (msg) t.appendChild(el('p', { class: 'err', role: 'alert', text: msg })); }

  /* ---------- Supabase over fetch ---------- */
  function sb(path, opts) {
    opts = opts || {};
    var headers = { apikey: C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    if (session) headers.Authorization = 'Bearer ' + session.access_token;
    if (opts.prefer) headers.Prefer = opts.prefer;
    return fetch(C.SUPABASE_URL + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined }).then(function (r) {
      return r.text().then(function (txt) {
        var data = txt ? JSON.parse(txt) : null;
        if (r.status === 401) { var e = new Error('expired'); e.code = 401; throw e; }
        if (!r.ok) throw new Error((data && (data.message || data.msg || data.error_description)) || ('http_' + r.status));
        return data;
      });
    });
  }
  function saveSession(s) { session = s; try { localStorage.setItem(KEY, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, email: s.user && s.user.email })); } catch (e) {} }
  function clearSession() { session = null; try { localStorage.removeItem(KEY); } catch (e) {} }
  function refresh() {
    var saved; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!saved || !saved.refresh_token) return Promise.reject(new Error('no session'));
    return sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: saved.refresh_token } }).then(saveSession);
  }
  function guarded(fn) { return fn().catch(function (e) { if (e.code === 401) return refresh().then(fn); throw e; }); }

  /* ---------- Data ---------- */
  var DONE_LABEL = { pending: 'En attente', paid: 'Payé', confirmed: 'Confirmé', done: 'Terminé', no_show: 'Absent', cancelled: 'Annulé' };

  function load() {
    var from = addDays(today(), -1), to = addDays(today(), 60);
    return guarded(function () { return sb('/rest/v1/rpc/release_expired', { method: 'POST', body: {} }).catch(function () {}); }).then(function () {
      return Promise.all([
        guarded(function () { return sb('/rest/v1/bookings?date=gte.' + from + '&date=lte.' + to + '&status=neq.cancelled&order=date.asc,start_time.asc&select=*'); }),
        guarded(function () { return sb('/rest/v1/blocked_slots?date=gte.' + today() + '&order=date.asc&select=*'); }),
      ]);
    }).then(function (r) { render(r[0], r[1]); err('#banner'); }).catch(function (e) {
      var b = $('#banner'); b.textContent = '';
      b.appendChild(el('p', { class: 'admin-banner', role: 'alert', text: e.code === 401 || e.message === 'no session' ? 'Session expirée. Reconnectez-vous.' : 'Impossible de charger : ' + e.message }));
      if (e.code === 401 || e.message === 'no session') { clearSession(); show('login'); }
    });
  }

  function setStatus(b, status) {
    return guarded(function () { return sb('/rest/v1/bookings?id=eq.' + b.id, { method: 'PATCH', body: { status: status }, prefer: 'return=minimal' }); }).then(load);
  }
  function wa(b, text) { return 'https://wa.me/237' + b.phone + '?text=' + encodeURIComponent(text); }

  function card(b) {
    var badge = [el('span', { class: 'badge is-' + b.status, text: DONE_LABEL[b.status] || b.status })];
    if (b.payment_status === 'paid_slot_lost') badge.push(el('span', { class: 'badge is-alert', text: 'À rembourser' }));
    if (b.status === 'pending') badge.push(el('span', { class: 'badge', text: b.mode === 'online' ? 'Paiement en attente' : 'Demande WhatsApp' }));
    var meta = formuleName(b.formule) + (b.deposit_xaf && (b.status === 'paid' || b.status === 'confirmed' || b.status === 'done') ? ', acompte ' + b.deposit_xaf + ' FCFA' : '');
    var actions = [];
    function btn(label, cls, fn) { actions.push(el('button', { type: 'button', class: 'btn ' + cls, text: label, onclick: fn })); }
    if (b.status === 'pending' && b.mode === 'whatsapp') btn('Confirmer', 'btn-dark', function () { setStatus(b, 'confirmed'); });
    if (b.status === 'paid' || b.status === 'confirmed') { btn('Terminé', 'btn-dark', function () { setStatus(b, 'done'); }); btn('Absent', 'btn-line', function () { setStatus(b, 'no_show'); }); }
    if (b.status === 'pending' || b.status === 'paid' || b.status === 'confirmed') btn('Annuler', 'btn-line', function () { if (window.confirm('Annuler le rendez-vous de ' + b.name + ' ?')) setStatus(b, 'cancelled'); });
    var hello = 'Bonjour ' + b.name + ', ';
    actions.push(el('a', { class: 'btn btn-line', href: wa(b, b.status === 'confirmed' || b.status === 'paid' ? hello + 'votre rendez-vous chez BW Barber Shop est confirmé : ' + dayLabel(b.date) + ' à ' + hm(b.start_time) + '. À bientôt !' : hello), target: '_blank', rel: 'noopener', text: 'WhatsApp' }));
    actions.push(el('a', { class: 'btn btn-line', href: 'tel:+237' + b.phone, text: 'Appeler' }));
    return el('article', { class: 'bk' }, [
      el('div', { class: 'bk-time' }, [hm(b.start_time), el('small', { text: 'jusqu’à ' + hm(b.end_time) })]),
      el('div', {}, [
        el('p', { class: 'bk-name' }, [b.name].concat(badge)),
        el('p', { class: 'bk-meta', text: meta + ' · ' + phoneShow(b.phone) }),
        b.note ? el('p', { class: 'bk-note', text: b.note }) : null,
        el('div', { class: 'bk-actions' }, actions),
      ]),
    ]);
  }

  function render(bookings, blocked) {
    // flash the tab title when a new paid booking arrives while the page is open
    var paidNow = bookings.filter(function (b) { return b.status === 'paid'; }).map(function (b) { return b.id; });
    if (lastPaidIds && paidNow.some(function (id) { return lastPaidIds.indexOf(id) < 0; })) document.title = '(Nouveau) Réservations · BW Barber Shop';
    lastPaidIds = paidNow;

    var list = $('#list'); list.textContent = '';
    if (!bookings.length) list.appendChild(el('p', { class: 'empty', text: 'Aucun rendez-vous à venir. Les nouvelles réservations apparaissent ici toutes seules.' }));
    var groups = {}, order = [];
    bookings.forEach(function (b) { if (!groups[b.date]) { groups[b.date] = []; order.push(b.date); } groups[b.date].push(b); });
    order.forEach(function (d) {
      var live = groups[d].filter(function (b) { return b.status !== 'cancelled'; }).length;
      var h = el('h2', {}, [dayLabel(d), el('small', { text: d === today() ? 'aujourd’hui · ' + live + ' rdv' : live + ' rdv' })]);
      list.appendChild(el('section', { class: 'day-group' }, [h].concat(groups[d].map(card))));
    });

    var ul = $('#blocked'); ul.textContent = '';
    if (!blocked.length) ul.appendChild(el('li', { class: 'muted', text: 'Aucun jour bloqué.' }));
    blocked.forEach(function (s) {
      ul.appendChild(el('li', {}, [
        el('span', { text: dayLabel(s.date) + (s.reason ? ' (' + s.reason + ')' : '') + (s.start_time ? ' ' + hm(s.start_time) + '–' + hm(s.end_time) : '') }),
        el('button', { type: 'button', class: 'link-btn', text: 'Débloquer', onclick: function () { guarded(function () { return sb('/rest/v1/blocked_slots?id=eq.' + s.id, { method: 'DELETE', prefer: 'return=minimal' }); }).then(load); } }),
      ]));
    });
  }

  /* ---------- Boot ---------- */
  function start() {
    $('#who').textContent = (session && session.user && session.user.email) || '';
    return guarded(function () { return sb('/rest/v1/rpc/is_admin', { method: 'POST', body: {} }); }).then(function (isAdmin) {
      if (!isAdmin) { clearSession(); show('login'); err('#login-err', 'Ce compte n’a pas accès aux réservations.'); return; }
      show('dash'); $('#block-date').min = today(); document.title = 'Réservations · BW Barber Shop';
      return load().then(function () { if (timer) clearInterval(timer); timer = setInterval(load, 30000); });
    });
  }

  function boot() {
    if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) { show('unconfigured'); return; }
    $('#login-form').addEventListener('submit', function (e) {
      e.preventDefault(); err('#login-err');
      var email = $('#email').value.trim(), password = $('#password').value;
      if (!email || !password) { err('#login-err', 'Entrez votre e-mail et votre mot de passe.'); return; }
      sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }).then(function (s) { saveSession(s); $('#password').value = ''; return start(); })
        .catch(function () { err('#login-err', 'E-mail ou mot de passe incorrect.'); });
    });
    $('#logout').addEventListener('click', function () { clearSession(); if (timer) clearInterval(timer); show('login'); });
    $('#refresh').addEventListener('click', load);
    $('#block-form').addEventListener('submit', function (e) {
      e.preventDefault(); err('#block-err');
      var d = $('#block-date').value;
      if (!d) { err('#block-err', 'Choisissez un jour.'); return; }
      guarded(function () { return sb('/rest/v1/blocked_slots', { method: 'POST', body: { date: d, reason: $('#block-reason').value.trim() || null }, prefer: 'return=minimal' }); })
        .then(function () { $('#block-date').value = ''; $('#block-reason').value = ''; return load(); })
        .catch(function (e2) { err('#block-err', 'Impossible de bloquer ce jour : ' + e2.message); });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && session) load(); });

    var saved; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (saved && saved.access_token) { session = { access_token: saved.access_token, refresh_token: saved.refresh_token, user: { email: saved.email } }; start().catch(function () { show('login'); }); }
    else show('login');
  }
  boot();
})();
