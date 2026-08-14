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
var addCal = 'solar';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

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

function renderPeopleList() {
  var box = document.getElementById('people-list');
  if (!state.people.length) { box.innerHTML = '<p class="hint">아직 아무도 없어요. 위에서 추가해봐요.</p>'; return; }
  box.innerHTML = state.people.map(function (p) {
    return '<div class="pl-item">' +
      '<span class="pl-dot" style="background:linear-gradient(155deg,' + p.color1 + ',' + p.color2 + ')"></span>' +
      '<span class="pl-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="pl-rel">' + p.emoji + ' ' + p.label + ' · ' + p.score + '</span>' +
      '<button class="pl-del" data-id="' + p.id + '">×</button></div>';
  }).join('');
  box.querySelectorAll('.pl-del').forEach(function (b) {
    b.addEventListener('click', function () {
      state.people = state.people.filter(function (x) { return x.id !== b.getAttribute('data-id'); });
      saveState(state.me, state.people);
      renderPeopleList();
    });
  });
}

function addPersonFromInput() {
  var input = {
    name: (document.getElementById('add-name').value || '이름 없음').trim(),
    year: parseInt(document.getElementById('add-year').value, 10),
    month: parseInt(document.getElementById('add-month').value, 10),
    day: parseInt(document.getElementById('add-day').value, 10),
    calendar: addCal
  };
  if (!input.year || !input.month || !input.day) { alert('생년월일을 다 넣어주세요'); return; }
  var person = makePerson(input, state.me.wuxing);
  state.people.push(person);
  saveState(state.me, state.people);
  ['add-name','add-year','add-month','add-day'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderPeopleList();
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
  document.querySelectorAll('#add-cal .seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#add-cal .seg-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active'); addCal = b.getAttribute('data-cal');
    });
  });
  document.getElementById('btn-add').addEventListener('click', addPersonFromInput);
  document.getElementById('btn-to-add').addEventListener('click', function () { renderPeopleList(); showScreen('add'); });
  document.getElementById('btn-to-map').addEventListener('click', function () { renderMap(); renderRanking(); showScreen('map'); });
  document.getElementById('btn-back-add').addEventListener('click', function () { renderPeopleList(); showScreen('add'); });
}

var MEDALS = ['🥇','🥈','🥉'];

function renderRanking() {
  var ranked = sortByChemi(state.people);
  var box = document.getElementById('rank-list');
  box.innerHTML = ranked.map(function (p, i) {
    return '<div class="rk" data-id="' + p.id + '">' +
      '<span class="rk-medal">' + (MEDALS[i] || (i+1)) + '</span>' +
      '<span class="rk-dot" style="background:linear-gradient(155deg,' + p.color1 + ',' + p.color2 + ')"></span>' +
      '<span class="rk-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="rk-meta">' + p.emoji + ' ' + p.label + '<br>케미 ' + p.score + '</span></div>';
  }).join('');
  box.querySelectorAll('.rk').forEach(function (row) {
    row.addEventListener('click', function () { showPersonDetail(row.getAttribute('data-id')); });
  });
}

function showPersonDetail(id) {
  var p = state.people.find(function (x) { return x.id === id; });
  if (!p) return;
  var box = document.getElementById('person-detail');
  box.className = 'detail-open';
  box.innerHTML = '<h4>' + escapeHtml(p.name) + ' · ' + p.typeName + '</h4>' +
    '<div class="spirit-sub">' + p.emoji + ' ' + p.label + ' · 케미 ' + p.score + '</div>' +
    '<p class="d-rel">' + p.desc + '</p>' +
    '<p class="d-caution">⚠ ' + p.caution + '</p>' +
    '<button class="d-close">닫기</button>';
  box.querySelector('.d-close').addEventListener('click', function () { box.className = 'detail-hidden'; });
}

function boot() {
  var saved = loadState();
  if (saved.me) { state.me = saved.me; state.people = saved.list || []; }
  initEvents();
}
document.addEventListener('DOMContentLoaded', boot);
