/* =====================================================================
   B&W BARBER · page behaviour (design only)
   Nav panel, scroll reveals, section numbers, reviews, hours table,
   map-on-request, social links, FR/EN page title. It never touches the
   booking, payment or database code in js/app.js.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.BW_CONFIG || {};
  var doc = document.documentElement;
  doc.classList.add('ui');

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function lang() { return doc.getAttribute('data-lang') === 'en' ? 'en' : 'fr'; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Page title + description follow the language ---------- */
  var META = {
    fr: { title: 'B&W Barber · Coiffeur à Emombo, Yaoundé', desc: 'B&W Barber, coiffeur à Emombo Auberge, Yaoundé. Dégradés, coupes afro, coupe enfant dès 500 FCFA. Réservez en ligne. Ouverture le lundi 16 novembre 2026 à 9h.' },
    en: { title: 'B&W Barber · Barber in Emombo, Yaoundé', desc: 'B&W Barber, barber at Emombo Auberge, Yaoundé. Fades, afro cuts, children’s cuts from 500 FCFA. Book online. Opening Monday 16 November 2026 at 9 AM.' },
  };
  function applyMeta() {
    var m = META[lang()], d = $('meta[name="description"]');
    document.title = m.title;
    if (d) d.setAttribute('content', m.desc);
    var t = $('meta[property="og:title"]'); if (t) t.setAttribute('content', m.title);
  }

  /* ---------- Mobile menu ---------- */
  function initNav() {
    var hdr = $('#site-header'), toggle = $('.nav-toggle'), panel = $('#nav-panel');
    function setOpen(open) { toggle.setAttribute('aria-expanded', String(open)); panel.hidden = !open; }
    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 860) setOpen(false); });
    function onScroll() { hdr.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- Scroll reveal (fade + rise), once per element ---------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (n) { n.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Section numbers follow what is actually visible ---------- */
  function numberSections() {
    $$('[data-sec]').filter(function (s) { return !s.hidden; }).forEach(function (s, i) {
      var n = $('.sec-no', s); if (n) n.textContent = (i < 9 ? '0' : '') + (i + 1);
    });
  }

  /* ---------- Reviews: only real ones, never invented ---------- */
  function renderReviews() {
    var sec = $('#avis'), list = $('#reviews'), note = $('#avis-note');
    var real = (C.REVIEWS || []).filter(function (r) { return r && r.name && (r.fr || r.en); }).slice(0, 3);
    var preview = /[?&]preview=avis\b/.test(location.search);
    var show = real.length > 0 || preview;
    sec.hidden = !show; $('#nav-avis').hidden = !show; $('#panel-avis').hidden = !show;
    if (!show) return;
    list.textContent = '';
    note.textContent = '';
    var L = lang();
    for (var i = 0; i < 3; i++) {
      var r = real[i];
      if (!r && !preview) break;
      var li = el('li', 'review' + (r ? '' : ' is-todo'));
      li.setAttribute('data-reveal', ''); li.style.setProperty('--i', i); li.classList.add('is-in');
      var q = el('q', '', r ? (r[L] || r.fr || r.en) : (L === 'fr' ? 'TODO : avis client réel à ajouter (texte, prénom, accord du client).' : 'TODO: add a real customer review (text, first name, the customer’s permission).'));
      var c = el('cite', '', r ? r.name : 'TODO : Prénom N.');
      li.appendChild(q); li.appendChild(c); list.appendChild(li);
    }
    if (!real.length) note.textContent = L === 'fr' ? 'Aperçu de la mise en page (?preview=avis). Rien n’est publié tant que REVIEWS est vide dans js/config.js.' : 'Layout preview (?preview=avis). Nothing is published while REVIEWS is empty in js/config.js.';
  }

  /* ---------- Hours table: shows config hours once they are confirmed ---------- */
  function hh(min) { var h = Math.floor(min / 60), m = min % 60; return lang() === 'fr' ? h + 'h' + (m ? ('0' + m).slice(-2) : '') : (((h % 12) || 12) + (m ? ':' + ('0' + m).slice(-2) : '') + (h < 12 ? ' AM' : ' PM')); }
  function mins(hm) { var p = hm.split(':'); return +p[0] * 60 + (+p[1] || 0); }
  function renderHours() {
    var rows = $$('#hours-table tr'), H = C.HOURS || {};
    var now = new Date(Date.now() + (C.TZ_OFFSET_MIN || 60) * 60000), dow = now.getUTCDay() || 7;
    rows.forEach(function (tr) {
      var d = +tr.getAttribute('data-dow');
      tr.classList.toggle('is-today', d === dow);
      if (H.confirmed) {
        var open = (H.days || []).indexOf(d) > -1, td = $('td', tr);
        td.textContent = open ? hh(mins(H.open)) + '–' + hh(mins(H.close)) : (lang() === 'fr' ? 'Fermé' : 'Closed');
      }
    });
  }

  /* ---------- Social links: shown only when the real URL exists ---------- */
  function initSocial() {
    var S = C.SOCIAL || {}, any = false;
    [['instagram', '#soc-ig'], ['facebook', '#soc-fb']].forEach(function (p) {
      var url = S[p[0]], a = $(p[1]);
      if (url && /^https:\/\//.test(url)) { a.href = url; a.hidden = false; any = true; }
    });
    $('#socials').hidden = !any;
  }

  /* ---------- Map: loads only when asked (faster, and no Google cookies until then) ---------- */
  function initMap() {
    var box = $('#map'), btn = $('#map-load');
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-src'); f.loading = 'lazy'; f.title = 'Emombo Auberge, Yaoundé';
      f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      box.textContent = ''; box.appendChild(f);
    });
  }

  function init() {
    initNav(); initReveal(); initSocial(); initMap();
    renderReviews(); numberSections(); renderHours(); applyMeta();
    // Re-render the pieces built by script when the visitor switches language
    new MutationObserver(function () { applyMeta(); renderReviews(); renderHours(); }).observe(doc, { attributes: true, attributeFilter: ['data-lang'] });
    // hreflang target: /?lang=en opens the English version
    if (/[?&]lang=en\b/.test(location.search)) { var en = $('[data-set-lang="en"]'); if (en) en.click(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
