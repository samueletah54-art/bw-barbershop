/* Runs first, in the head: marks the page as scripted (so the FR/EN buttons show) and applies the
   saved or requested language before first paint, so there is no flash of the wrong language. */
(function () {
  var d = document.documentElement, lang = 'fr';
  d.classList.add('js');
  try {
    var q = new URLSearchParams(location.search).get('lang');
    lang = q === 'en' || q === 'fr' ? q : (localStorage.getItem('bw-lang') || 'fr');
  } catch (e) {}
  if (lang !== 'en') lang = 'fr';
  d.setAttribute('data-lang', lang);
  d.lang = lang;
})();
