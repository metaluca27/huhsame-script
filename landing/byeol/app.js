// 곁별 — 화면 전환 + 입력 + 조립
var state = { me: null, people: [] };
var pendingCal = 'solar';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var t = document.getElementById('screen-' + id);
  if (t) t.classList.add('active');
  window.scrollTo(0, 0);
  if (id !== 'map' && window.stopByeolFloat) window.stopByeolFloat();
}

var WUXING_ORDER = ['wood','fire','earth','metal','water'];
var WUXING_KO = { wood:'나무', fire:'불', earth:'흙', metal:'쇠', water:'물' };
var addCal = 'solar';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

// 실제 달력에 존재하는 날짜인지 검사 (양력은 round-trip으로 2/31 등 차단)
function isRealDate(y, m, d, calendar) {
  if (!(y >= 1900 && y <= 2099) || m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (calendar === 'solar') {
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  return d <= 30; // 음력: 기본 범위만 확인, 세부는 computeSaju try/catch에 위임
}

function spiritCharSVG(wuxingKey) {
  var chars = {
    water: '<svg viewBox="0 0 100 108"><defs><radialGradient id="gw" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#bfeeff"/><stop offset="55%" stop-color="#5cc0f2"/><stop offset="100%" stop-color="#2b8fd6"/></radialGradient></defs><path d="M50 16C50 16 24 48 24 68a26 26 0 0 0 52 0C76 48 50 16 50 16Z" fill="url(#gw)"/><ellipse cx="40" cy="44" rx="8" ry="12" fill="#ffffff" opacity=".55" transform="rotate(-18 40 44)"/><g fill="#1d3347"><ellipse cx="42" cy="64" rx="3.2" ry="4.2"/><ellipse cx="58" cy="64" rx="3.2" ry="4.2"/></g><circle cx="34" cy="72" r="4.5" fill="#ff8fa3" opacity=".5"/><circle cx="66" cy="72" r="4.5" fill="#ff8fa3" opacity=".5"/><path d="M44 72q6 5 12 0" stroke="#1d3347" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    fire: '<svg viewBox="0 0 100 108"><defs><radialGradient id="gf" cx="45%" cy="35%" r="75%"><stop offset="0" stop-color="#ffe3b0"/><stop offset="50%" stop-color="#ff9a5c"/><stop offset="100%" stop-color="#f4623d"/></radialGradient></defs><path d="M54 14c3 14-10 18-13 32-2 10 4 22 13 22a22 22 0 0 0 22-24c0-9-8-13-10-21-4 8-7 0-12-13-1 6-1 4 0 0Z" fill="url(#gf)"/><path d="M54 16c2 12-9 16-11 28-2 9 3 18 11 18a18 18 0 0 0 18-20c0-8-6-11-8-17-3 7-7 1-10-9Z" fill="url(#gf)"/><ellipse cx="42" cy="42" rx="6" ry="10" fill="#fff" opacity=".5" transform="rotate(-15 42 42)"/><g fill="#7a2c18"><ellipse cx="44" cy="60" rx="3" ry="4"/><ellipse cx="58" cy="60" rx="3" ry="4"/></g><circle cx="37" cy="67" r="4" fill="#ff6f6f" opacity=".45"/><circle cx="65" cy="67" r="4" fill="#ff6f6f" opacity=".45"/><path d="M46 67q5 5 10 0" stroke="#7a2c18" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    wood: '<svg viewBox="0 0 100 108"><defs><radialGradient id="gt" cx="45%" cy="32%" r="75%"><stop offset="0" stop-color="#d4ffcf"/><stop offset="55%" stop-color="#6fd97f"/><stop offset="100%" stop-color="#33ab52"/></radialGradient></defs><path d="M50 26q-11-16-2-22 9 7 2 22Z" fill="#4fc466"/><path d="M50 28q9-9 16-3-3 10-16 3Z" fill="#68d67c"/><circle cx="50" cy="60" r="27" fill="url(#gt)"/><ellipse cx="40" cy="46" rx="8" ry="11" fill="#fff" opacity=".5" transform="rotate(-18 40 46)"/><g fill="#1f5a2b"><ellipse cx="42" cy="60" rx="3.2" ry="4.2"/><ellipse cx="58" cy="60" rx="3.2" ry="4.2"/></g><circle cx="34" cy="68" r="4.5" fill="#ff8fa3" opacity=".5"/><circle cx="66" cy="68" r="4.5" fill="#ff8fa3" opacity=".5"/><path d="M44 68q6 5 12 0" stroke="#1f5a2b" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    earth: '<svg viewBox="0 0 100 108"><defs><radialGradient id="ge" cx="45%" cy="32%" r="78%"><stop offset="0" stop-color="#ffeeb8"/><stop offset="55%" stop-color="#f3c85f"/><stop offset="100%" stop-color="#d99f34"/></radialGradient></defs><path d="M22 66a28 26 0 0 1 56 0c0 8-4 14-10 14H32c-6 0-10-6-10-14Z" fill="url(#ge)"/><ellipse cx="50" cy="52" rx="30" ry="24" fill="url(#ge)"/><ellipse cx="40" cy="42" rx="8" ry="11" fill="#fff" opacity=".5" transform="rotate(-18 40 42)"/><g fill="#6e4d15"><ellipse cx="42" cy="56" rx="3.2" ry="4.2"/><ellipse cx="58" cy="56" rx="3.2" ry="4.2"/></g><circle cx="34" cy="64" r="4.5" fill="#ff8fa3" opacity=".5"/><circle cx="66" cy="64" r="4.5" fill="#ff8fa3" opacity=".5"/><path d="M44 64q6 5 12 0" stroke="#6e4d15" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    metal: '<svg viewBox="0 0 100 108"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="55%" stop-color="#dbe4f2"/><stop offset="100%" stop-color="#a9b8d4"/></linearGradient></defs><rect x="24" y="34" width="52" height="52" rx="16" fill="url(#gm)" transform="rotate(6 50 60)"/><ellipse cx="40" cy="46" rx="7" ry="11" fill="#fff" opacity=".7" transform="rotate(-18 40 46)"/><g fill="#3e4d6b"><ellipse cx="42" cy="60" rx="3.2" ry="4.2"/><ellipse cx="58" cy="60" rx="3.2" ry="4.2"/></g><circle cx="34" cy="68" r="4.5" fill="#ff8fa3" opacity=".45"/><circle cx="66" cy="68" r="4.5" fill="#ff8fa3" opacity=".45"/><path d="M44 68q6 5 12 0" stroke="#3e4d6b" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>'
  };
  return chars[wuxingKey] || '';
}

function distributionNote(dist) {
  var max = null, min = null;
  WUXING_ORDER.forEach(function (k) {
    if (max === null || dist[k] > dist[max]) max = k;
    if (min === null || dist[k] < dist[min]) min = k;
  });
  if (dist[max] === dist[min]) return '오행이 골고루 퍼져 있어요.';
  return '내 사주엔 ' + WUXING_KO[max] + '(이/가) 많고 ' + WUXING_KO[min] + '(이/가) 적어요.';
}

function renderMe() {
  var me = state.me;
  var sp = SPIRITS[me.wuxing];
  var badge = '<div class="spirit-char">' + spiritCharSVG(me.wuxing) + '</div>';
  var dist = me.distribution;
  var chips = WUXING_ORDER.map(function (k) {
    return '<span class="dist-item">' + WUXING_KO[k] + ' ' + dist[k] + '</span>';
  }).join('');
  document.getElementById('me-card').innerHTML =
    '<div class="spirit-card">' + badge +
    '<div class="spirit-name">' + me.typeName + '</div>' +
    '<div class="spirit-sub">' + sp.el + '(' + sp.hanja + ') 정령 · ' + sp.tagline + '</div>' +
    '<div class="dist">' + chips + '</div>' +
    '<p class="dist-note">' + distributionNote(dist) + '</p>' +
    '<p class="me-personality">' + sp.desc + '</p>' +
    '<p class="me-strength">✨ 강점: ' + sp.strength + '</p></div>';
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
  if (!isRealDate(input.year, input.month, input.day, input.calendar)) { alert('그런 날짜는 없어요. 생년월일을 다시 확인해주세요'); return; }
  var person;
  try {
    person = makePerson(input, state.me.wuxing);
  } catch (e) {
    alert('생년월일을 다시 확인해주세요');
    return;
  }
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
    if (!isRealDate(input.year, input.month, input.day, input.calendar)) { alert('그런 날짜는 없어요. 생년월일을 다시 확인해주세요'); return; }
    var saju;
    try {
      saju = computeSaju(input);
    } catch (e) {
      alert('생년월일을 다시 확인해주세요');
      return;
    }
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
  document.getElementById('btn-to-map').addEventListener('click', function () { renderMap(); renderRanking(); renderMapNote(); showScreen('map'); });
  document.getElementById('btn-back-add').addEventListener('click', function () { renderPeopleList(); showScreen('add'); });
  document.getElementById('btn-me-reset').addEventListener('click', function () { showScreen('intro'); });
}

var MEDALS = ['🥇','🥈','🥉'];

// A. 지도 해설: 관계 카운트 + 내 오행 기반 한 줄 풀이
function mapNote() {
  var people = state.people;
  if (!people.length) return '';
  var c = countByRelation(people);
  var lines = [];
  if (c.danbi >= 2) lines.push('🍀 단비(귀인)가 ' + c.danbi + '명 — 곁이 든든한 지도예요.');
  else if (c.danbi === 1) lines.push('🍀 단비(귀인)가 한 명 있어요 — 귀한 인연이에요.');
  else lines.push('아직 단비(귀인)는 없지만, 곁의 사람들이 서로를 채워줘요.');
  var me = state.me.wuxing, boon = null;
  WUXING_ORDER.forEach(function (x) { if (SHENG[x] === me) boon = x; });
  if (boon) lines.push('나는 ' + WUXING_KO[me] + '(' + SPIRITS[me].hanja + ') 기운이라, 나를 채워주는 ' + WUXING_KO[boon] + ' 기운 친구가 특히 귀해요.');
  return lines.join('<br>');
}
function renderMapNote() {
  var el = document.getElementById('map-note');
  if (el) el.innerHTML = mapNote();
}

function renderRanking() {
  var ranked = sortByChemi(state.people);
  var box = document.getElementById('rank-list');
  box.innerHTML = ranked.map(function (p, i) {
    return '<div class="rk" data-id="' + p.id + '">' +
      '<span class="rk-medal">' + (MEDALS[i] || (i+1)) + '</span>' +
      '<span class="rk-dot" style="background:linear-gradient(155deg,' + p.color1 + ',' + p.color2 + ')"></span>' +
      '<div class="rk-body"><span class="rk-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="rk-desc">' + p.desc + '</span></div>' +
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
  box.innerHTML = '<div class="detail-char">' + spiritCharSVG(p.wuxing) + '</div>' +
    '<h4>' + escapeHtml(p.name) + ' · ' + p.typeName + '</h4>' +
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
  if (saved.me) {
    renderMe();
    showScreen('me');
  }
}
document.addEventListener('DOMContentLoaded', boot);
