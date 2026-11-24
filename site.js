// Shared site behaviour.
(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Links are written as "…/index.html" so the site also works when opened
  // straight from disk. On the live site, turn them into clean URLs (/agents/).
  if (location.protocol !== 'file:') {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/(^|\/)index\.html$/.test(h)) {
        a.setAttribute('href', h.replace(/index\.html$/, '') || './');
      }
    });
  }
})();
