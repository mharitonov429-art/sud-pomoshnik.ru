// Яндекс.Метрика загружается только после согласия посетителя (кнопка «Принять»).
(function () {
  var KEY = 'sp_consent_analytics', ID = 114270102;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function load() {
    if (window.__spYm) return; window.__spYm = 1;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + ID, 'ym');
    window.ym(ID, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }
  function hide() { var b = document.getElementById('consent'); if (b) b.remove(); }
  function show() {
    if (document.getElementById('consent')) return;
    var b = document.createElement('section'); b.id = 'consent'; b.setAttribute('aria-label', 'Согласие на cookie');
    b.innerHTML = '<div><p>Сайт использует Яндекс.Метрику (cookie, запись действий на странице «Вебвизор») для статистики. Счётчик включается только с вашего согласия. <a href="/politika/">Политика</a> · <a href="/soglasie/">Согласие</a></p><button type="button" class="y">Принять</button><button type="button" class="n">Отклонить</button></div>';
    b.querySelector('.y').onclick = function () { set('yes'); hide(); load(); };
    b.querySelector('.n').onclick = function () { set('no'); hide(); };
    document.body.appendChild(b);
  }
  var v = get();
  if (v === 'yes') load(); else if (v !== 'no') show();
  var l = document.getElementById('cookie-settings');
  if (l) l.addEventListener('click', function (e) { e.preventDefault(); show(); });
})();
