/* BW Barber Shop · the only script on the page. Everything works without it (WhatsApp links are
   plain <a href>); this adds: the FR/EN switch, the live open/closed pill, English WhatsApp text. */
(function () {
  'use strict';
  var root = document.documentElement;
  var WA = 'https://wa.me/237690868831?text=';

  /* ---- language ---- */
  var EN_TITLE = 'Barber in Emombo, Yaoundé · Clean fade, no waiting | BW Barber Shop';
  var EN_DESC = 'BW Barber Shop, barber in Emombo, Yaoundé. Fades, afro cuts, kids’ cuts from 500 FCFA. Air-conditioned shop, proper barber chairs, no waiting. Book on WhatsApp.';
  var FR_TITLE = document.title;
  var metaDesc = document.querySelector('meta[name="description"]');
  var FR_DESC = metaDesc ? metaDesc.getAttribute('content') : '';

  function setLang(lang) {
    if (lang !== 'en') lang = 'fr';
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    document.title = lang === 'en' ? EN_TITLE : FR_TITLE;
    if (metaDesc) metaDesc.setAttribute('content', lang === 'en' ? EN_DESC : FR_DESC);
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    document.querySelectorAll('a[data-wa]').forEach(function (a) {
      var t = a.getAttribute('data-' + lang);
      if (t) a.href = WA + encodeURIComponent(t);
    });
    document.querySelectorAll('img[data-alt-en]').forEach(function (img) {
      if (!img.hasAttribute('data-alt-fr')) img.setAttribute('data-alt-fr', img.alt);
      img.alt = lang === 'en' ? img.getAttribute('data-alt-en') : img.getAttribute('data-alt-fr');
    });
    renderStatus();
    try { localStorage.setItem('bw-lang', lang); } catch (e) {}
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang')); });
  });

  /* ---- open / closed pill, Africa/Douala time (UTC+1, no daylight saving) ---- */
  var pill = document.getElementById('status');
  function douala() {
    var p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Douala', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
    return { dow: dow, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  function renderStatus() {
    if (!pill) return;
    var en = root.getAttribute('data-lang') === 'en';
    var open = Number(pill.getAttribute('data-open')), close = Number(pill.getAttribute('data-close'));
    var days = pill.getAttribute('data-days').split(',').map(Number);
    var now, text, state;
    try { now = douala(); } catch (e) { return; }   // no Intl timezone support: keep the static text
    var isDay = days.indexOf(now.dow) > -1;
    var h = function (n) { return n + 'h'; };
    if (isDay && now.min >= open * 60 && now.min < close * 60) {
      state = 'open';
      text = en ? 'Open now · closes at ' + close + ':00' : 'Ouvert maintenant · ferme à ' + h(close);
    } else {
      state = 'closed';
      var when = null;
      if (isDay && now.min < open * 60) when = en ? 'today' : 'aujourd’hui';
      else {
        for (var i = 1; i <= 7; i++) {
          var d = ((now.dow - 1 + i) % 7) + 1;
          if (days.indexOf(d) > -1) {
            when = i === 1 ? (en ? 'tomorrow' : 'demain')
              : (en ? ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d] : ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][d]);
            break;
          }
        }
      }
      text = en ? 'Closed · opens ' + when + ' ' + open + 'am' : 'Fermé · ouvre ' + when + ' ' + h(open);
    }
    pill.setAttribute('data-state', state);
    var t = pill.querySelector('.status-text');
    t.innerHTML = '';
    t.textContent = text;
  }
  setLang(root.getAttribute('data-lang'));
  setInterval(renderStatus, 60000);
})();
