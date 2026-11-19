// Калькулятор срока: отсчёт со следующего дня после получения, перенос на рабочий день.
(function (root) {
  var FIX = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[1,23],[2,8],[4,1],[4,9],[5,12],[10,4]]; // [месяц с 0, день]
  var cache = {};
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function key(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function wk(d) { var w = d.getDay(); return w === 0 || w === 6; }
  function offSet(y) {
    if (cache[y]) return cache[y];
    var s = {};
    FIX.forEach(function (f) { var d = new Date(y, f[0], f[1], 12); s[key(d)] = 1; });
    return (cache[y] = s);
  }
  function isOff(d) { return wk(d) || !!offSet(d.getFullYear())[key(d)]; }
  function calc(received, n) {
    var last = add(received, n), end = last, shifted = false;
    while (isOff(end)) { end = add(end, 1); shifted = true; }
    return { first: add(received, 1), last: last, end: end, shifted: shifted };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { calc: calc }; return; }
  var go = document.getElementById('go'); if (!go) return;
  var fmt = function (d) { return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  go.addEventListener('click', function () {
    var v = document.getElementById('r').value, out = document.getElementById('out');
    out.hidden = false;
    if (!v) { out.textContent = 'Укажите дату получения копии.'; return; }
    var p = v.split('-'), r = new Date(+p[0], +p[1] - 1, +p[2], 12), n = +document.getElementById('t').value, x = calc(r, n);
    out.textContent = 'Первый день срока: ' + fmt(x.first) + '. ' + n + '-й день: ' + fmt(x.last) + '. ' +
      (x.shifted ? 'Он выпадает на нерабочий день, поэтому последний день подачи: ' : 'Последний день подачи: ') + fmt(x.end) +
      '. Почтой документ нужно сдать до 24:00 этого дня. Расчёт ориентировочный и не учитывает переносы выходных по решению Правительства: реальный срок может оказаться позже, но рассчитывать на это нельзя. Подавайте не позже указанной даты и проверьте производственный календарь.';
    document.dispatchEvent(new Event('calc:used'));
  });
})(this);
