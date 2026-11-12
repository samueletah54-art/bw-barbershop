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
    gsap.from($$('.row', board), { opacity: 0, x: phone ? -16 : -40, duration: 0.6, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: board, start: 'top 85%', once: true } });
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
    gsap.set(star, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.8, opacity: 0 });
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
    board.addEventListener('pointerleave', function () { current = null; shown = false; gsap.to(star, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power3.in', overwrite: 'auto' }); });
  }

  /* ---------- Footer logo: bars rise when it scrolls into view ---------- */
  var pl = $('.plogo');
  if (pl) { if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { pl.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.35 }); io.observe(pl); } else pl.classList.add('is-in'); }

  /* ---------- Scroll progress: a gold hairline across the top ---------- */
  var bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

  /* ---------- Section titles: a curtain lifts while the title rises ---------- */
  $$('.sec-title').forEach(function (t) {
    gsap.fromTo(t, { clipPath: 'inset(-20% -5% 110% -5%)', yPercent: 22 }, { clipPath: 'inset(-20% -5% -20% -5%)', yPercent: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: t, start: 'top 90%', once: true } });
  });

  /* ---------- Jackson: each letter climbs out of its own mask ---------- */
  var bt = $('#barbier-title');
  if (bt && !bt.querySelector('.ch')) {
    var word = bt.textContent, letters = [];
    bt.setAttribute('aria-label', word); bt.textContent = '';
    word.split('').forEach(function (c) {
      var m = document.createElement('span'), i = document.createElement('span');
      m.className = 'ch'; m.setAttribute('aria-hidden', 'true'); i.textContent = c;
      m.appendChild(i); bt.appendChild(m); letters.push(i);
    });
    gsap.from(letters, { yPercent: 115, rotate: phone ? 0 : 6, duration: 1, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: bt, start: 'top 88%', once: true } });
  }

  /* ---------- The barber's photo is drawn from the top down ---------- */
  var bframe = $('#barber-frame');
  if (bframe) gsap.fromTo(bframe, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: bframe, start: 'top 85%', once: true } });

  /* ---------- Gallery: photos settle from a zoom as each one is wiped in ---------- */
  if (wipes.length) gsap.from($$('.shot-wipe .bw, .shot-wipe .colour'), { scale: 1.25, duration: 1.6, ease: 'power3.out', stagger: 0.06, clearProps: 'transform', scrollTrigger: { trigger: '#gallery', start: 'top 80%', once: true } });

  /* ---------- Opening hours: the days appear one after the other ---------- */
  var hrs = $$('.hours tr');
  if (hrs.length) gsap.from(hrs, { opacity: 0, x: -14, duration: 0.6, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: '.hours', start: 'top 88%', once: true } });

  /* ---------- Band: a loop that speeds up, and turns round, with the scroll ---------- */
  var track = $('.band-track');
  if (track) {
    var loop = gsap.to(track, { xPercent: -50, duration: phone ? 22 : 36, ease: 'none', repeat: -1 });
    var dir = 1;
    ST.create({ start: 0, end: 'max', onUpdate: function (self) {
      if (self.direction) dir = self.direction;
      var boost = Math.min(Math.abs(self.getVelocity()) / 250, 8);
      gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.25, ease: 'power2.out', overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.2, ease: 'power2.out', delay: 0.25, overwrite: false });
    } });
  }

  /* ---------- Top ticker: leans into the scroll too ---------- */
  var tick = $('.ticker');
  if (tick && tick.getAnimations) {
    var ta = tick.getAnimations()[0], rate = { v: 1 };
    if (ta) ST.create({ start: 0, end: 'max', onUpdate: function (self) {
      var target = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 5);
      gsap.to(rate, { v: target, duration: 0.2, overwrite: true, onUpdate: function () { ta.playbackRate = rate.v; } });
      gsap.to(rate, { v: 1, duration: 1, delay: 0.2, overwrite: false, onUpdate: function () { ta.playbackRate = rate.v; } });
    } });
  }

  /* ---------- Hero: scroll cue, scroll-out and depth under the pointer (desktop) ---------- */
  var hero = $('.hero');
  if (hero && !phone) {
    var cue = document.createElement('div');
    cue.className = 'cue'; cue.setAttribute('aria-hidden', 'true');
    var cueText = document.createElement('span');
    [['fr', 'Défiler'], ['en', 'Scroll']].forEach(function (l) {
      var s = document.createElement('span'); s.lang = l[0]; s.textContent = l[1]; cueText.appendChild(s);
    });
    cue.appendChild(cueText); cue.appendChild(document.createElement('i'));
    hero.appendChild(cue);
    gsap.to(cue, { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '12% top', scrub: true } });
    gsap.to('.hero-inner', { yPercent: -10, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 25%', scrub: true } });
  }
  if (hero && fine) {
    var hbg = $('.hero-bg');
    gsap.set(hbg, { scale: 1.07 });
    var hx = gsap.quickTo(hbg, 'x', { duration: 1.2, ease: 'power3.out' }), hy = gsap.quickTo(hbg, 'y', { duration: 1.2, ease: 'power3.out' });
    hero.addEventListener('pointermove', function (e) { hx((e.clientX / window.innerWidth - 0.5) * -26); hy((e.clientY / window.innerHeight - 0.5) * -18); });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
