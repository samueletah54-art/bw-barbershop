/* =====================================================================
   BW BARBER SHOP · page behaviour (design only)
   Nav panel and hide-on-scroll, ticker text, reviews, hours tables, socials,
   barber facts, gallery lightbox, map on request, FR/EN title. Then, after the
   page has painted, it loads the motion layer (GSAP, ScrollTrigger, Lenis).
   It never touches the booking, payment or database code in js/app.js.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.BW_CONFIG || {};
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function lang() { return doc.getAttribute('data-lang') === 'en' ? 'en' : 'fr'; }

  /* ---------- Page title + description follow the language ---------- */
  var META = {
    fr: { title: 'BW Barber Shop · Coiffeur à Emombo, Yaoundé', desc: 'BW Barber Shop, coiffeur à Emombo Auberge, Yaoundé. Dégradés, coupes afro, coupe enfant dès 500 FCFA. Réservez en ligne. Ouverture le lundi 16 novembre 2026 à 9h.' },
    en: { title: 'BW Barber Shop · Barber in Emombo, Yaoundé', desc: 'BW Barber Shop, barber at Emombo Auberge, Yaoundé. Fades, afro cuts, children’s cuts from 500 FCFA. Book online. Opening Monday 16 November 2026 at 9 AM.' },
  };
  function applyMeta() {
    var m = META[lang()], d = $('meta[name="description"]'), t = $('meta[property="og:title"]');
    document.title = m.title;
    if (d) d.setAttribute('content', m.desc);
    if (t) t.setAttribute('content', m.title);
  }

  /* ---------- Header: solid after the top, hides on scroll down, returns on scroll up ---------- */
  function initHeader() {
    var hdr = $('#site-header'), toggle = $('.nav-toggle'), panel = $('#nav-panel'), last = window.scrollY, ticking = false;
    function setOpen(open) { toggle.setAttribute('aria-expanded', String(open)); panel.hidden = !open; if (open) hdr.classList.remove('is-hidden'); }
    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 860) setOpen(false); });
    function update() {
      var y = window.scrollY, bar = $('.callbar');
      hdr.classList.toggle('is-solid', y > 24);
      if (panel.hidden) {
        if (y > last + 6 && y > 160) hdr.classList.add('is-hidden');
        else if (y < last - 6 || y < 160) hdr.classList.remove('is-hidden');
      }
      if (bar) bar.classList.toggle('is-in', y > 120);
      last = y; ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Ticker: every copy repeats the live opening text ---------- */
  function initTicker() {
    var src = $('#status-text'); if (!src) return;
    function copy() { $$('.tk').forEach(function (n) { n.textContent = src.textContent; }); }
    new MutationObserver(copy).observe(src, { childList: true, characterData: true, subtree: true });
    copy();
  }

  /* ---------- Hours tables (board aside and Infos): today in gold, config hours once confirmed ---------- */
  function hh(min) { var h = Math.floor(min / 60), m = min % 60; return lang() === 'fr' ? h + 'h' + (m ? ('0' + m).slice(-2) : '') : (((h % 12) || 12) + (m ? ':' + ('0' + m).slice(-2) : '') + (h < 12 ? ' AM' : ' PM')); }
  function mins(hm) { var p = hm.split(':'); return +p[0] * 60 + (+p[1] || 0); }
  function renderHours() {
    var H = C.HOURS || {};
    var now = new Date(Date.now() + (C.TZ_OFFSET_MIN || 60) * 60000), dow = now.getUTCDay() || 7;
    $$('.hours tr').forEach(function (tr) {
      var d = +tr.getAttribute('data-dow');
      tr.classList.toggle('is-today', d === dow);
      if (H.confirmed) {
        var open = (H.days || []).indexOf(d) > -1, td = $('td', tr);
        td.textContent = open ? hh(mins(H.open)) + ' – ' + hh(mins(H.close)) : (lang() === 'fr' ? 'Fermé' : 'Closed');
      }
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
    list.textContent = ''; note.textContent = '';
    var L = lang();
    for (var i = 0; i < 3; i++) {
      var r = real[i];
      if (!r && !preview) break;
      var li = el('li', 'review' + (r ? '' : ' is-todo'));
      li.appendChild(el('q', '', r ? (r[L] || r.fr || r.en) : (L === 'fr' ? 'TODO : avis client réel à ajouter (texte, prénom, accord du client).' : 'TODO: add a real customer review (text, first name, the customer’s permission).')));
      li.appendChild(el('cite', '', r ? r.name : 'TODO : Prénom N.'));
      list.appendChild(li);
    }
    if (!real.length) note.textContent = L === 'fr' ? 'Aperçu de la mise en page (?preview=avis). Rien n’est publié tant que REVIEWS est vide dans js/config.js.' : 'Layout preview (?preview=avis). Nothing is published while REVIEWS is empty in js/config.js.';
  }

  /* ---------- Barber facts: speciality and years, only when the owner has given them ---------- */
  function renderBarber() {
    var B = C.BARBER || {}, dl = $('#barber-facts'), L = lang();
    if (!dl) return;
    dl.textContent = '';
    function add(label, value) { var d = el('div'); d.appendChild(el('dt', '', label)); d.appendChild(el('dd', '', value)); dl.appendChild(d); }
    if (B.speciality) add(L === 'fr' ? 'Spécialité' : 'Speciality', B.speciality);
    if (B.years) add(L === 'fr' ? 'Années de métier' : 'Years in the trade', String(B.years));
    dl.hidden = !dl.children.length;
  }

  /* ---------- Social links: shown only when the real URL exists ---------- */
  function initSocial() {
    var S = C.SOCIAL || {};
    [['instagram', '#soc-ig'], ['facebook', '#soc-fb']].forEach(function (p) {
      var url = S[p[0]], a = $(p[1]);
      if (a && url && /^https:\/\//.test(url)) { a.href = url; a.hidden = false; }
    });
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

  /* ---------- Gallery lightbox (native <dialog>: Esc closes, focus is handled) ---------- */
  function initLightbox() {
    var dlg = $('#lightbox'), img = $('#lb-img'), shots = $$('#gallery .shot[data-full]'), idx = 0;
    if (!dlg || !dlg.showModal) return;
    function show(i) { idx = (i + shots.length) % shots.length; img.src = shots[idx].getAttribute('data-full'); img.alt = shots[idx].getAttribute('data-alt') || ''; }
    shots.forEach(function (s, i) { s.addEventListener('click', function () { show(i); dlg.showModal(); }); });
    $('#lb-close').addEventListener('click', function () { dlg.close(); });
    $('#lb-prev').addEventListener('click', function () { show(idx - 1); });
    $('#lb-next').addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  }

  /* ---------- Motion layer: loaded after the page has painted, never for reduced motion ---------- */
  function loadScript(src) { return new Promise(function (ok) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s); }); }
  function startMotion() {
    if (reduce) return;
    Promise.all([loadScript('js/vendor/gsap.min.js'), loadScript('js/vendor/lenis.min.js')])
      .then(function () { return loadScript('js/vendor/ScrollTrigger.min.js'); })
      .then(function () { return loadScript('js/motion.js'); });
  }

  /* ---------- Phone: a small framed photo on each price row, when the cut's photo exists ---------- */
  function initThumbs() {
    var photos = C.CUT_PHOTOS || {};
    $$('#board .row').forEach(function (row) {
      var src = photos[row.getAttribute('data-formule')], t = $('.row-thumb', row);
      if (!src || !t) return;
      var im = new Image(); im.src = src; im.alt = ''; im.width = 64; im.height = 64; im.loading = 'lazy'; t.appendChild(im);
    });
  }

  function init() {
    initThumbs(); initHeader(); initTicker(); initSocial(); initMap(); initLightbox();
    renderReviews(); renderHours(); renderBarber(); applyMeta();
    new MutationObserver(function () { applyMeta(); renderReviews(); renderHours(); renderBarber(); }).observe(doc, { attributes: true, attributeFilter: ['data-lang'] });
    if (/[?&]lang=en\b/.test(location.search)) { var en = $('[data-set-lang="en"]'); if (en) en.click(); }
    if (document.readyState === 'complete') (window.requestIdleCallback || setTimeout)(startMotion);
    else window.addEventListener('load', function () { (window.requestIdleCallback || setTimeout)(startMotion); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
