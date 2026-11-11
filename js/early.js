/* Runs first, in the head. Marks the page as scripted and, unless the visitor asked for
   reduced motion, allows the hidden "before reveal" states. If the motion layer has not
   started within 5 seconds, those states are removed again so nothing stays invisible. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    d.classList.add('js-motion');
    setTimeout(function () { if (!window.__bwMotion) d.classList.remove('js-motion'); }, 5000);
  }
})();
