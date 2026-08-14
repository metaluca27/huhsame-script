// 곁별 — 화면 전환 + 입력 + 조립
var state = { me: null, people: [] };
var pendingCal = 'solar';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var t = document.getElementById('screen-' + id);
  if (t) t.classList.add('active');
  window.scrollTo(0, 0);
}

var WUXING_ORDER = ['wood','fire','earth','metal','water'];
var WUXING_KO = { wood:'나무', fire:'불', earth:'흙', metal:'쇠', water:'물' };

function spiritSymbolSVG(symbol) {
  var paths = {
    drop:  '<path fill="#fff" d="M12 2.5C12 2.5 5 11 5 15.5A7 7 0 0 0 19 15.5C19 11 12 2.5 12 2.5z"/>',
    flame: '<path fill="#fff" d="M13 2c.6 3-1.3 4.6-2.8 6.2C8.8 9.7 7 11.4 7 14a6 6 0 0 0 12 0c0-2.3-1.2-3.7-2.3-5-.4 1-1.2 1.6-2 1.6 1-2.3.3-5.6-1.7-8.6z"/>',
    sprout:'<path fill="#fff" d="M12 2c-3.3 0-6 2.5-6 5.6 0 .5.1 1 .2 1.5C4.4 9.8 3 11.5 3 13.6 3 16.3 5.3 18 8 18h3v4h2v-4h1c2.8 0 5-1.8 5-4.4 0-2-1.3-3.7-3.2-4.4.1-.5.2-1 .2-1.6C16 4.5 15.3 2 12 2z"/>',
    mount: '<path fill="#fff" d="M2 20L9 7l3.5 6.5L15 9l7 11H2z"/>',
    gem:   '<path fill="#fff" d="M7 3h10l4 6-9 12L3 9l4-6z"/>'
  };
  return '<svg viewBox="0 0 24 24">' + (paths[symbol] || '') + '</svg>';
}

function distributionNote(dist) {
  var max = null, min = null;
  WUXING_ORDER.forEach(function (k) {
    if (max === null || dist[k] > dist[max]) max = k;
    if (min === null || dist[k] < dist[min]) min = k;
  });
  return '내 사주엔 ' + WUXING_KO[max] + '(이/가) 많고 ' + WUXING_KO[min] + '(이/가) 적어요.';
}

function renderMe() {
  var me = state.me;
  var sp = SPIRITS[me.wuxing];
  var badge = '<div class="spirit-badge" style="background:linear-gradient(155deg,' + sp.color1 + ',' + sp.color2 + ')">' + spiritSymbolSVG(sp.symbol) + '</div>';
  var dist = me.distribution;
  var chips = WUXING_ORDER.map(function (k) {
    return '<span class="dist-item">' + WUXING_KO[k] + ' ' + dist[k] + '</span>';
  }).join('');
  document.getElementById('me-card').innerHTML =
    '<div class="spirit-card">' + badge +
    '<div class="spirit-name">' + me.typeName + '</div>' +
    '<div class="spirit-sub">' + sp.el + '(' + sp.hanja + ') 정령 · ' + sp.tagline + '</div>' +
    '<div class="dist">' + chips + '</div>' +
    '<p class="dist-note">' + distributionNote(dist) + '</p></div>';
}

function readMeInput() {
  return {
    name: (document.getElementById('me-name').value || '나').trim(),
    year: parseInt(document.getElementById('me-year').value, 10),
    month: parseInt(document.getElementById('me-month').value, 10),
    day: parseInt(document.getElementById('me-day').value, 10),
    calendar: pendingCal
  };
}

function initEvents() {
  document.querySelectorAll('#me-cal .seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#me-cal .seg-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      pendingCal = b.getAttribute('data-cal');
    });
  });
  document.getElementById('btn-me').addEventListener('click', function () {
    var input = readMeInput();
    if (!input.year || !input.month || !input.day) { alert('생년월일을 다 넣어주세요'); return; }
    var saju = computeSaju(input);
    var sp = SPIRITS[saju.dayWuxing];
    state.me = {
      name: input.name, birth: input, wuxing: saju.dayWuxing, season: saju.season,
      typeName: typeName(saju.dayWuxing, saju.season), distribution: saju.distribution,
      color1: sp.color1, color2: sp.color2
    };
    renderMe();
    showScreen('me');
    saveState(state.me, state.people);
  });
  document.getElementById('btn-to-add').addEventListener('click', function () { showScreen('add'); });
}

function boot() {
  var saved = loadState();
  if (saved.me) { state.me = saved.me; state.people = saved.list || []; }
  initEvents();
}
document.addEventListener('DOMContentLoaded', boot);
