// landing/ssukssuk/ssuk-ui.js — 화면 전환·HUD·도감 카드 팝업·결과·도감. 전역 SsukUI.
(function () {
  'use strict';
  var C = SsukCore, S = SsukStore;

  function $(id) { return document.getElementById(id); }
  function show(name) { ['start', 'play', 'result', 'book'].forEach(function (s) { $('screen-' + s).classList.toggle('show', s === name); }); }

  var game = null, soundOn = S.soundOn(), bookFrom = 'start', cardOpen = false, cardQueue = [];

  function fitCanvas() {
    var cv = $('game');
    var maxW = Math.min(window.innerWidth, 480), maxH = window.innerHeight - 64;
    var scale = Math.min(maxW / SsukGame.W, maxH / SsukGame.H);
    var cssW = Math.floor(SsukGame.W * scale), cssH = Math.floor(SsukGame.H * scale);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  }

  function renderBest() { $('best-line').textContent = S.best() > 0 ? '최고 점수: ' + S.best().toLocaleString() : '최고 점수: -'; }

  // 처음 모은 단계면 게임을 멈추고 도감 카드를 보여줌. 이미 모은 단계면 아무것도 안 함.
  function maybeShowCard(stageIdx) {
    if (!S.addCard(stageIdx)) return;
    cardQueue.push(stageIdx);
    if (!cardOpen) showNextCard();
  }
  function showNextCard() {
    var stageIdx = cardQueue.shift();
    var s = C.STAGES[stageIdx];
    $('card-tag').textContent = (stageIdx + 1) + '단계 발견!';
    $('card-img').src = s.img; $('card-img').alt = s.name;
    $('card-name').textContent = s.emoji + ' ' + s.name;
    $('card-text').textContent = s.card;
    if (game) game.pause();
    cardOpen = true; $('card-pop').classList.add('show');
  }
  function closeCard() {
    if (!cardOpen) return;
    if (cardQueue.length) { showNextCard(); return; }
    cardOpen = false; $('card-pop').classList.remove('show');
    if (game) game.resume();
  }
  function dropCards() { cardQueue = []; cardOpen = false; $('card-pop').classList.remove('show'); }

  function startGame() {
    dropCards();
    if (game) game.destroy();
    show('play'); fitCanvas();
    $('hud-score').textContent = '0'; $('hud-combo').textContent = ''; $('fever-frame').classList.remove('on');
    $('screen-play').classList.remove('danger');
    game = SsukGame.create($('game'), {
      onScore: function (score, combo) {
        $('hud-score').textContent = score.toLocaleString();
        $('hud-combo').textContent = combo >= 2 ? combo + '콤보 ×' + C.comboMultiplier(combo) : '';
        $('fever-frame').classList.toggle('on', combo >= 5);
      },
      onNewStage: maybeShowCard,
      onNext: function (i) { $('hud-next').src = C.STAGES[i].img; $('hud-next').title = C.STAGES[i].name; },
      onDanger: function (d) { $('screen-play').classList.toggle('danger', d); },
      onGameOver: showResult,
      onDrop: function () {},
    });
    game.setSound(soundOn); game.start();
    maybeShowCard(0);
  }

  function showResult(summary) {
    dropCards();
    $('fever-frame').classList.remove('on');
    var isRecord = summary.score > S.best(); if (isRecord) S.saveBest(summary.score);
    var top = C.highestStage(summary.discovered), st = C.STAGES[top];
    $('result-reached-img').src = st.img; $('result-reached-img').alt = st.name;
    $('result-reached-text').textContent = '당신의 아이디어는 \'' + st.emoji + ' ' + st.name + '\'까지 자랐어요!';
    $('result-score').textContent = summary.score.toLocaleString() + '점';
    $('result-sub').textContent = '최고 ' + summary.maxCombo + '콤보 · 도감 ' + S.cards().length + '/11' + (isRecord ? ' · 신기록!' : '');
    show('result'); renderBest();
  }

  function openBook(from) {
    bookFrom = from;
    var got = S.cards(), grid = $('book-grid'); grid.innerHTML = '';
    $('book-count').textContent = got.length + '/11';
    C.STAGES.forEach(function (s, i) {
      var have = got.indexOf(i) !== -1;
      var div = document.createElement('div'); div.className = 'book-item' + (have ? '' : ' locked');
      var im = document.createElement('img'); im.src = s.img; im.alt = have ? s.name : '?';
      var b = document.createElement('b'); b.textContent = (i + 1) + '. ' + (have ? s.emoji + ' ' + s.name : '???');
      var sp = document.createElement('span'); sp.textContent = have ? s.card : '아직 못 만들었어요';
      div.appendChild(im); div.appendChild(b); div.appendChild(sp); grid.appendChild(div);
    });
    show('book');
  }

  function boot() {
    renderBest(); $('btn-sound').textContent = soundOn ? '🔊' : '🔇';
    $('btn-start').addEventListener('click', startGame);
    $('btn-retry').addEventListener('click', startGame);
    $('btn-home').addEventListener('click', function () { show('start'); renderBest(); });
    $('btn-book-start').addEventListener('click', function () { openBook('start'); });
    $('btn-book-result').addEventListener('click', function () { openBook('result'); });
    $('btn-book-close').addEventListener('click', function () { show(bookFrom); });
    $('card-pop').addEventListener('click', closeCard);
    document.addEventListener('keydown', function (e) { if (cardOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) closeCard(); });
    $('btn-sound').addEventListener('click', function () { soundOn = !soundOn; S.saveSound(soundOn); $('btn-sound').textContent = soundOn ? '🔊' : '🔇'; if (game) game.setSound(soundOn); });
    window.addEventListener('resize', fitCanvas);
    show('start');
  }
  window.SsukUI = { boot: boot, _game: function () { return game; } };
})();
