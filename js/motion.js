/* =====================================================================
   BW BARBER SHOP · motion layer (GSAP + ScrollTrigger + Lenis)
   Loaded by js/ui.js after the page has painted, and never for visitors who
   asked for reduced motion. Only transform, opacity and clip-path move.
   If anything here fails, js/early.js removes the hidden states and the page
   simply shows. Phones get the light version: reveals and the ticker, no
   smooth-scroll, parallax, magnetic buttons or cursor star.
   ===================================================================== */
(function () {
  'use strict';
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  window.__bwMotion = true;

  var C = window.BW_CONFIG || {};
  var phone = window.matchMedia('(max-width: 767px)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  /* ---------- Smooth page scroll (desktop pointer only; phones keep native momentum) ---------- */
  var lenis = null;
  if (window.Lenis && fine) {
    lenis = new window.Lenis({ lerp: 0.1 });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ST.update);
    // menu and footer links glide; booking links stay native so the form can take focus
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.nav-links a, .nav-panel a, .foot-grid nav a');
      if (!a) return;
      var id = a.getAttribute('href'), target = id && id.length > 1 ? document.querySelector(id) : null;
      if (!target || id === '#reserver') return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -(($('#site-header') || {}).offsetHeight || 80), duration: 1.2 });
    });
  }

  /* ---------- Scroll reveals: fade + rise, once ---------- */
  $$('[data-reveal]').forEach(function (n) {
    gsap.fromTo(n, { opacity: 0, y: phone ? 16 : 28 }, { opacity: 1, y: 0, duration: phone ? 0.7 : 1, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
  });

  /* ---------- Price board: rows slide in one by one, prices count up ---------- */
  var board = $('#board');
  if (board) {
    gsap.from($$('.row', board), { opacity: 0, x: phone ? -16 : -40, duration: 0.8, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: board, start: 'top 85%', once: true } });
    $$('.row-price .num', board).forEach(function (n) {
      var target = parseInt(n.textContent.replace(/\D/g, ''), 10), o = { v: 0 };
      if (!target) return;
      ST.create({ trigger: board, start: 'top 85%', once: true, onEnter: function () {
        gsap.to(o, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: function () { n.textContent = fmt(Math.round(o.v)); }, onComplete: function () { n.textContent = fmt(target); } });
      } });
    });
  }

  /* ---------- Gallery: each photo wipes in with clip-path ---------- */
  var wipes = $$('.shot-wipe');
  if (wipes.length) gsap.to(wipes, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut', stagger: 0.12, scrollTrigger: { trigger: '#gallery', start: 'top 80%', once: true } });

  /* ---------- Parallax on the big photographs (desktop only) ---------- */
  if (!phone) {
    var bimg = $('#barber-frame img');
    if (bimg) gsap.fromTo(bimg, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '#barber-frame', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.hero-bg', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Footer lettering slides sideways as the page ends ---------- */
  var fm = $('#foot-mark');
  if (fm) gsap.fromTo(fm, { x: 0 }, { x: function () { return -Math.max(0, fm.scrollWidth - document.documentElement.clientWidth + 32); }, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } });

  /* ---------- Magnetic main buttons (pointer devices) ---------- */
  if (fine) {
    $$('.hero .btn, .board-actions .btn, .barber-text .btn, .visit .actions .btn').forEach(function (b) {
      var xt = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), yt = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xt((e.clientX - (r.left + r.width / 2)) * 0.25); yt((e.clientY - (r.top + r.height / 2)) * 0.35); });
      b.addEventListener('pointerleave', function () { xt(0); yt(0); });
    });
  }

  /* ---------- Price board: the cut inside a gold four-point star that follows the cursor ---------- */
  var star = $('#star'), photo = $('#star-photo');
  if (fine && star && photo && board) {
    var placeholder = Array.prototype.slice.call(photo.childNodes).map(function (n) { return n.cloneNode(true); }), current = null, shown = false;
    gsap.set(star, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.6, opacity: 0 });
    var sx = gsap.quickTo(star, 'x', { duration: 0.55, ease: 'power3.out' }), sy = gsap.quickTo(star, 'y', { duration: 0.55, ease: 'power3.out' });
    function showFor(row) {
      var src = (C.CUT_PHOTOS || {})[row.getAttribute('data-formule')];
      if (src) { photo.textContent = ''; var im = new Image(); im.src = src; im.alt = ''; photo.appendChild(im); } else { photo.textContent = ''; placeholder.forEach(function (n) { photo.appendChild(n.cloneNode(true)); }); }
    }
    board.addEventListener('pointerenter', function (e) { gsap.set(star, { x: e.clientX, y: e.clientY }); });
    board.addEventListener('pointermove', function (e) {
      sx(e.clientX); sy(e.clientY);
      var row = e.target.closest('.row');
      if (!row) return;
      if (row !== current) { current = row; showFor(row); }
      if (!shown) { shown = true; gsap.to(star, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }); }
    });
    board.addEventListener('pointerleave', function () { current = null; shown = false; gsap.to(star, { opacity: 0, scale: 0.6, duration: 0.25, ease: 'power3.in', overwrite: 'auto' }); });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
