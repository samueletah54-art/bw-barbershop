/* /qr page: print buttons (A4 / A5) and the hours + social lines, read from js/config.js. */
(function () {
  var C = window.BW_CONFIG || {}, doc = document.documentElement;
  var en = /^en/i.test(new URLSearchParams(location.search).get('lang') || '');
  if (en) doc.setAttribute('data-ui', 'en');

  // hours: only claim full hours once the owner has confirmed them in config.js
  var H = C.HOURS, el = document.querySelector('#hours span');
  if (H && H.confirmed && el) {
    var names = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], d = H.days.slice().sort(), run = d.length > 1 && d[d.length - 1] - d[0] === d.length - 1;
    var days = run ? names[d[0]] + '–' + names[d[d.length - 1]] : d.map(function (n) { return names[n]; }).join(', ');
    el.textContent = days + ' ' + H.open.replace(':00', 'h') + '–' + H.close.replace(':00', 'h');
  }

  // social handles, shown only when set
  var S = C.SOCIAL || {}, box = document.getElementById('social'), parts = [];
  ['instagram', 'facebook'].forEach(function (k) {
    if (/^https:\/\//.test(S[k] || '')) parts.push(S[k].replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''));
  });
  if (parts.length && box) { box.textContent = parts.join('  ·  '); box.hidden = false; }

  // print: set the paper size, then open the print dialog
  var style = document.createElement('style'); document.head.appendChild(style);
  function size(s) { doc.setAttribute('data-size', s); style.textContent = '@page{size:' + s + ' portrait;margin:0}'; }
  size('A4');
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { size(b.getAttribute('data-print')); window.print(); });
  });
})();
