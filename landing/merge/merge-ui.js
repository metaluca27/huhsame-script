// landing/merge/merge-ui.js — 화면 전환·HUD·결과·닉네임 랭킹·공유. 전역 MergeUI.
(function () {
  'use strict';
  var C = MergeCore;
  var RANK_URL = 'https://small-recipe-9345.atlia0318.workers.dev/merge/rank';
  var BEST_KEY = 'attic-merge-best', NAME_KEY = 'attic-merge-name', SOUND_KEY = 'attic-merge-sound';
  var SHARE_URL = 'https://vaulted-bus-346411.web.app/merge';
  var LINES = {
    4: ['루나: 별 하나 붙이고 왔어요 ✨', '루나: 저 만들어 주셨네요, 고마워요', '루나: 조용히 응원할게요'],
    5: ['루카: 오 나 나왔다!', '루카: 여기서부터 진짜 시작이에요', '루카: 다음 단계도 가보죠?'],
    6: ['황금 루카: 반짝반짝, 눈 부시죠', '황금 루카: 금은 녹지 않아요', '황금 루카: 후광 값은 따로예요'],
    7: ['불꽃 루카: 뜨거우니까 조심', '불꽃 루카: 태워버릴게요', '불꽃 루카: 열정 200%'],
    8: ['우주 루카: 별자리 읽어드릴까요', '우주 루카: 여긴 중력이 약해요', '우주 루카: 은하수 타고 왔어요'],
    9: ['천사 루카: 날개 조심하세요', '천사 루카: 축복 드려요', '천사 루카: 위에서 다 보고 있어요'],
    10: ['전설 루카: ...전설이 되었군요', '전설 루카: 여기까지 온 사람 몇 없어요', '전설 루카: 다음은 없어요. 둘을 만나게 해보세요'],
  };
  var RURIC_OVER = ['루릭: ...쌓는 게 그게 뭐임', '루릭: 다시. 이번엔 생각하고', '루릭: 집중 안 함?', '루릭: 나쁘지 않았음. 다시 해'];

  function $(id) { return document.getElementById(id); }
  function show(name) { ['start', 'play', 'result', 'rank'].forEach(function (s) { $('screen-' + s).classList.toggle('show', s === name); }); }
  function loadBest() { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }
  function loadName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function saveName(v) { try { localStorage.setItem(NAME_KEY, v); } catch (e) {} }
  function loadSound() { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; } }
  function saveSound(on) { try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) {} }

  var game = null, soundOn = loadSound(), lastSummary = null, popupTimer = 0, rankScreenFrom = 'start';

  function fitCanvas() {
    var cv = $('game');
    var maxW = Math.min(window.innerWidth, 480), maxH = window.innerHeight - 64; // HUD 높이 제외
    var scale = Math.min(maxW / MergeGame.W, maxH / MergeGame.H);
    cv.style.width = Math.floor(MergeGame.W * scale) + 'px'; cv.style.height = Math.floor(MergeGame.H * scale) + 'px';
  }

  function renderBest() { $('best-line').textContent = loadBest() > 0 ? '최고 점수: ' + loadBest().toLocaleString() : '최고 점수: -'; }

  function charPopup(stageIdx) {
    var lines = LINES[stageIdx]; if (!lines) return;
    $('char-popup-img').src = C.STAGES[stageIdx].img;
    $('char-popup-text').textContent = C.STAGES[stageIdx].name + ' 등장! ' + lines[Math.floor(Math.random() * lines.length)];
    $('char-popup').classList.add('show'); clearTimeout(popupTimer);
    popupTimer = setTimeout(function () { $('char-popup').classList.remove('show'); }, 1400);
  }

  function startGame() {
    if (game) game.destroy();
    show('play'); fitCanvas();
    $('hud-score').textContent = '0'; $('hud-combo').textContent = ''; $('fever-frame').classList.remove('on');
    $('screen-play').classList.remove('danger');
    game = MergeGame.create($('game'), {
      onScore: function (score, combo) {
        $('hud-score').textContent = score.toLocaleString();
        $('hud-combo').textContent = combo >= 2 ? combo + '콤보 ×' + C.comboMultiplier(combo) : '';
        $('fever-frame').classList.toggle('on', combo >= 5);
      },
      onNewStage: charPopup,
      onDanger: function (d) { $('screen-play').classList.toggle('danger', d); },
      onGameOver: showResult,
      onDrop: function () {},
    });
    game.setSound(soundOn); game.start();
  }

  function showResult(summary) {
    lastSummary = summary;
    $('fever-frame').classList.remove('on');
    var isRecord = summary.score > loadBest(); if (isRecord) saveBest(summary.score);
    $('result-score').textContent = summary.score.toLocaleString() + '점';
    $('result-combo').textContent = '최고 ' + summary.maxCombo + '콤보 · 합체 ' + summary.merges + '번' + (isRecord ? ' · 신기록!' : '');
    $('result-line').textContent = RURIC_OVER[Math.floor(Math.random() * RURIC_OVER.length)];
    var box = $('result-discovered'); box.innerHTML = '';
    C.STAGES.forEach(function (s, i) { var im = document.createElement('img'); im.src = s.img; im.alt = s.name; im.className = summary.discovered[i] ? 'got' : 'no'; box.appendChild(im); });
    $('rank-result').textContent = ''; $('rank-form').classList.remove('show'); $('rank-form').classList.remove('done');
    $('btn-rank-submit').disabled = false;
    $('rank-name').value = loadName();
    show('result'); renderBest();
    checkRankable(summary);
  }

  function checkRankable(summary) {
    $('rank-result').textContent = '순위 확인 중...';
    fetch(RANK_URL).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error('bad');
      var top = j.top || [], cutoff = top.length < 100 ? 0 : top[top.length - 1].score;
      if (summary.score > cutoff && summary.score > 0) { $('rank-result').textContent = '전체 100위 안이에요! 이름을 남겨요'; $('rank-form').classList.add('show'); }
      else $('rank-result').textContent = summary.score > 0 ? '100위까지 ' + (cutoff + 1 - summary.score).toLocaleString() + '점 남았어요' : '한 번이라도 합쳐야 랭킹에 올라가요';
    }).catch(function () { $('rank-result').textContent = '랭킹 서버가 잠깐 쉬는 중이에요'; });
  }

  function submitRank() {
    var name = $('rank-name').value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (name.length < 1 || name.length > 10) { $('rank-result').textContent = '이름은 1~10자로요'; return; }
    saveName(name); $('btn-rank-submit').disabled = true; $('rank-result').textContent = '등록 중...';
    var s = lastSummary;
    fetch(RANK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, score: s.score, combo: s.maxCombo, merges: s.merges, stages: s.stages }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok && j.ranked) { $('rank-result').textContent = '🏆 전체 ' + j.rank + '위! 푸름이가 기록했어요'; $('rank-form').classList.add('done'); }
        else if (j.ok) { $('rank-result').textContent = '아쉽게 100위 밖이에요 (' + j.cutoff + '점부터)'; $('rank-form').classList.remove('show'); }
        else { $('rank-result').textContent = '등록 실패: ' + (j.error === 'too_fast' ? '잠깐 뒤에 다시' : j.error); $('btn-rank-submit').disabled = false; }
      })
      .catch(function () { $('rank-result').textContent = '랭킹 서버가 잠깐 쉬는 중이에요. 다시 눌러보세요'; $('btn-rank-submit').disabled = false; });
  }

  function openRank(from) {
    rankScreenFrom = from; show('rank');
    var list = $('rank-list'); list.innerHTML = ''; $('rank-status').textContent = '불러오는 중...';
    var me = loadName();
    fetch(RANK_URL).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error('bad');
      $('rank-status').textContent = j.top.length ? '' : '아직 아무도 없어요. 첫 번째가 되어봐요';
      j.top.forEach(function (e, i) {
        var li = document.createElement('li'); if (e.name === me) li.className = 'me';
        li.innerHTML = '<span class="r">' + (i + 1) + '</span><span class="n"></span><span class="s">' + e.score.toLocaleString() + '</span><span class="c">' + e.combo + '콤보</span>';
        li.querySelector('.n').textContent = e.name; list.appendChild(li);
      });
    }).catch(function () { $('rank-status').textContent = '랭킹 서버가 잠깐 쉬는 중이에요'; });
  }

  function share() {
    var text = '다락방 머지에서 ' + (lastSummary ? lastSummary.score.toLocaleString() : 0) + '점 냈다! 전설 루카 만들 수 있어?';
    var b = $('btn-share');
    if (navigator.share) { navigator.share({ title: '다락방 머지', text: text, url: SHARE_URL }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(text + ' ' + SHARE_URL).then(function () { b.textContent = '복사됨!'; setTimeout(function () { b.textContent = '공유하기'; }, 1500); }); } catch (e) {}
  }

  function boot() {
    renderBest(); $('btn-sound').textContent = soundOn ? '🔊' : '🔇';
    $('btn-start').addEventListener('click', startGame);
    $('btn-retry').addEventListener('click', startGame);
    $('btn-rank-start').addEventListener('click', function () { openRank('start'); });
    $('btn-rank-result').addEventListener('click', function () { openRank('result'); });
    $('btn-rank-close').addEventListener('click', function () { show(rankScreenFrom); });
    $('btn-rank-submit').addEventListener('click', submitRank);
    $('rank-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitRank(); });
    $('btn-share').addEventListener('click', share);
    $('btn-sound').addEventListener('click', function () { soundOn = !soundOn; saveSound(soundOn); $('btn-sound').textContent = soundOn ? '🔊' : '🔇'; if (game) game.setSound(soundOn); });
    window.addEventListener('resize', fitCanvas);
    show('start');
  }
  window.MergeUI = { boot: boot, _game: function () { return game; } };
})();
