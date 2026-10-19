// landing/ssukssuk/ssuk-ui.js — 화면 전환·HUD·도감 카드 팝업·결과·도감. 전역 SsukUI.
(function () {
  'use strict';
  var C = SsukCore, S = SsukStore;

  function $(id) { return document.getElementById(id); }
  function show(name) { ['start', 'play', 'result', 'book'].forEach(function (s) { $('screen-' + s).classList.toggle('show', s === name); }); }

  var game = null, soundOn = S.soundOn(), bookFrom = 'start', cardOpen = false, cardQueue = [], cardShownAt = 0, comboTimer = 0, foundThisGame = [];

  function fitCanvas() {
    var cv = $('game');
    var maxW = Math.min(window.innerWidth, 480), maxH = window.innerHeight - 96;   // HUD 64 + 진행 띠 28 + 여유
    var scale = Math.min(maxW / SsukGame.W, maxH / SsukGame.H);
    var cssW = Math.floor(SsukGame.W * scale), cssH = Math.floor(SsukGame.H * scale);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  }

  function renderBest() { $('best-line').textContent = S.best() > 0 ? '최고 점수: ' + S.best().toLocaleString() : '최고 점수: -'; }

  // 11단계 진행 띠: 이번 판에 만난 단계는 켜고 나머지는 흐리게
  function buildChain() {
    var box = $('hud-chain'); box.innerHTML = '';
    C.STAGES.forEach(function (s) { var im = document.createElement('img'); im.src = s.img; im.alt = s.name; im.title = s.name; box.appendChild(im); });
  }
  function markFound(i) {
    if (foundThisGame[i]) return;
    foundThisGame[i] = true;
    var imgs = $('hud-chain').children; if (imgs[i]) imgs[i].classList.add('found');
  }
  function clearCombo() { clearTimeout(comboTimer); comboTimer = 0; $('hud-combo').textContent = ''; $('fever-frame').classList.remove('on'); }

  // 처음 만난 단계면 게임을 멈추고 도감 카드를 보여줌(앞 단계 중 아직 못 모은 카드도 순서대로 먼저). 이미 모은 단계면 아무것도 안 함.
  function maybeShowCard(stageIdx) {
    for (var j = 0; j <= stageIdx; j++) if (S.addCard(j)) cardQueue.push(j);
    if (!cardOpen && cardQueue.length) showNextCard();
  }
  function showNextCard() {
    var stageIdx = cardQueue.shift();
    var s = C.STAGES[stageIdx];
    $('card-tag').textContent = (stageIdx + 1) + '단계 발견!';
    $('card-img').src = s.img; $('card-img').alt = s.name;
    $('card-name').textContent = s.emoji + ' ' + s.name;
    $('card-text').textContent = s.card;
    if (game) game.pause();
    cardOpen = true; cardShownAt = performance.now();
    $('card-pop').classList.add('show'); $('card-box').focus();
  }
  function closeCard() {
    if (!cardOpen) return;
    if (performance.now() - cardShownAt < 700) return;   // 뜨자마자 실수로 닫히는 것 방지
    if (cardQueue.length) { showNextCard(); return; }
    cardOpen = false; $('card-pop').classList.remove('show');
    if (game) game.resume();
  }
  function dropCards() { cardQueue = []; cardOpen = false; $('card-pop').classList.remove('show'); }

  function startGame() {
    dropCards();
    if (game) game.destroy();
    show('play'); fitCanvas();
    foundThisGame = []; buildChain(); markFound(0);
    $('hud-score').textContent = '0'; clearCombo();
    $('screen-play').classList.remove('danger');
    game = SsukGame.create($('game'), {
      onScore: function (score, combo) {
        $('hud-score').textContent = score.toLocaleString();
        $('hud-combo').textContent = combo >= 2 ? combo + '콤보 ×' + C.comboMultiplier(combo) : '';
        $('fever-frame').classList.toggle('on', combo >= 5);
        clearTimeout(comboTimer); comboTimer = setTimeout(clearCombo, C.MERGE_CONFIG.comboWindowMs);
      },
      onNewStage: function (i) { markFound(i); maybeShowCard(i); },
      onNext: function (i) { markFound(i); $('hud-next').src = C.STAGES[i].img; $('hud-next').title = C.STAGES[i].name; setTimeout(function () { maybeShowCard(i); }, 0); },   // 1단계 카드(시작 직후)가 먼저 뜨도록 한 박자 뒤에
      onDanger: function (d) { $('screen-play').classList.toggle('danger', d); },
      onGameOver: showResult,
      onDrop: function () {},
    });
    game.setSound(soundOn); game.start();
    maybeShowCard(0);
  }

  function showResult(summary) {
    dropCards(); clearCombo();
    var finished = game;
    setTimeout(function () { if (finished && game === finished) { finished.destroy(); game = null; } }, 1500);   // 끝난 게임의 물리·그리기 정리(그 사이 새 게임이 시작됐으면 건드리지 않음)
    var isRecord = summary.score > S.best(); if (isRecord) S.saveBest(summary.score);
    var top = C.highestStage(summary.discovered), st = C.STAGES[top];
    $('result-reached-img').src = st.img; $('result-reached-img').alt = st.name;
    $('result-reached-text').textContent = top === 0 ? '아이디어가 싹을 틔웠어요! 같은 것끼리 붙여 보세요'
      : '당신의 아이디어는 \'' + st.emoji + ' ' + st.name + '\'까지 자랐어요!';
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
    $('btn-play-home').addEventListener('click', function () { this.blur(); dropCards(); clearCombo(); if (game) { game.destroy(); game = null; } show('start'); renderBest(); });
    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if (cardOpen) {
        if (k === 'Enter' || k === ' ' || k === 'Escape') { e.preventDefault(); closeCard(); }
        return;
      }
      if (!game || !$('screen-play').classList.contains('show')) return;
      if (k === 'ArrowLeft') { e.preventDefault(); game.nudge(-20); }
      else if (k === 'ArrowRight') { e.preventDefault(); game.nudge(20); }
      else if (k === ' ' || k === 'ArrowDown' || k === 'Enter') { e.preventDefault(); game.drop(); }
    });
    $('btn-sound').addEventListener('click', function () { this.blur(); soundOn = !soundOn; S.saveSound(soundOn); $('btn-sound').textContent = soundOn ? '🔊' : '🔇'; if (game) game.setSound(soundOn); });
    window.addEventListener('resize', fitCanvas);
    show('start');
  }
  window.SsukUI = { boot: boot, _game: function () { return game; } };
})();
