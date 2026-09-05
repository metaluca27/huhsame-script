// landing/merge/merge-game.js — 물리(Matter.js)·합체·게임오버·렌더·파티클·소리. 전역 MergeGame.
(function () {
  'use strict';
  var C = MergeCore, CFG = C.MERGE_CONFIG;
  var W = 400, H = 640, WALL = 20, INNER = W - WALL * 2; // 통 안쪽 폭 360
  var FLOOR_Y = H - WALL, DANGER_Y = 120, DROP_Y = 70;

  var images = C.STAGES.map(function (s) { var im = new Image(); im.src = s.img; return im; });
  var STAGE_COLORS = ['#f9d5d3', '#f4b6c2', '#8fa3c7', '#b28cff', '#8ec5ff', '#ffd27f', '#ffd700', '#ff6a2a', '#7c5cff', '#dff6ff', '#ffb3ff'];

  // ---- 소리 (Web Audio 합성, 파일 없음) ----
  var audioCtx = null, soundOn = true;
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(freq, dur, type, gain, delay) {
    if (!audioCtx || !soundOn) return;
    var t = audioCtx.currentTime + (delay || 0);
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur);
  }
  var SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17]; // C4 기준 온음계
  function sfxMerge(stage) { beep(261.63 * Math.pow(2, SCALE_STEPS[stage] / 12), 0.16, 'triangle', 0.16, 0); }
  function sfxCombo(combo) { beep(660 + Math.min(combo, 12) * 40, 0.08, 'square', 0.08, 0); }
  function sfxFever() { [660, 880, 1100].forEach(function (f, i) { beep(f, 0.12, 'square', 0.12, i * 0.08); }); }
  function sfxDanger() { beep(70, 0.25, 'sine', 0.2, 0); }
  function sfxOver() { [392, 330, 262].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.12, i * 0.18); }); }
  function sfxDrop() { beep(200, 0.05, 'sine', 0.08, 0); }

  function create(canvas, cb) {
    var ctx = canvas.getContext('2d');
    var M = Matter, engine = M.Engine.create({ gravity: { x: 0, y: 1.6 } });
    var world = engine.world;
    var state = { score: 0, combo: 0, maxCombo: 0, merges: 0, stages: new Array(11).fill(0),
                  discovered: new Array(11).fill(false), phase: 'ready' };
    var lastMergeAt = 0, dangerSince = 0, dangerOn = false, lockUntil = 0, lastDangerBeep = 0;
    var current = null, nextStage = 0, pointerX = W / 2, rafId = 0, lastT = 0;
    var particles = [], shake = 0, popups = [];
    var merging = {}; // body.id → true (같은 프레임 중복 합체 방지)

    var walls = [
      M.Bodies.rectangle(WALL / 2, H / 2, WALL, H, { isStatic: true }),
      M.Bodies.rectangle(W - WALL / 2, H / 2, WALL, H, { isStatic: true }),
      M.Bodies.rectangle(W / 2, H - WALL / 2, W, WALL, { isStatic: true }),
    ];
    M.Composite.add(world, walls);

    function makeBall(stage, x, y) {
      var r = C.radiusFor(stage, INNER);
      var b = M.Bodies.circle(x, y, r, { restitution: 0.15, friction: 0.05, frictionAir: 0.008, density: 0.002 });
      b.plugin.stage = stage; b.plugin.r = r; b.plugin.born = performance.now(); b.plugin.pop = 1.3;
      return b;
    }
    function rand() { return Math.random(); }
    function clampX(x, r) { return Math.max(WALL + r + 1, Math.min(W - WALL - r - 1, x)); }
    function spawnCurrent() {
      var stage = nextStage; nextStage = C.pickDropStage(rand());
      var r = C.radiusFor(stage, INNER);
      current = { stage: stage, r: r, x: clampX(pointerX, r) };
    }
    function drop() {
      var now = performance.now();
      if (state.phase !== 'playing' || !current || now < lockUntil) return;
      var b = makeBall(current.stage, current.x, DROP_Y);
      b.plugin.pop = 1; M.Composite.add(world, b);
      current = null; lockUntil = now + CFG.dropLockMs;
      sfxDrop(); cb.onDrop && cb.onDrop();
      setTimeout(function () { if (state.phase === 'playing') spawnCurrent(); }, CFG.dropLockMs);
    }

    function balls() { return M.Composite.allBodies(world).filter(function (b) { return !b.isStatic; }); }

    function merge(a, b) {
      var stage = a.plugin.stage, now = performance.now();
      merging[a.id] = merging[b.id] = true;
      var mx = (a.position.x + b.position.x) / 2, my = (a.position.y + b.position.y) / 2;
      M.Composite.remove(world, a); M.Composite.remove(world, b);
      state.combo = (now - lastMergeAt <= CFG.comboWindowMs) ? state.combo + 1 : 1;
      lastMergeAt = now; state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.merges++; state.stages[stage]++;
      var points;
      if (stage === 10) { points = CFG.legendBonus; burst(mx, my, 10, 90); shake = 14; }
      else {
        points = C.mergePoints(stage, state.combo);
        var nb = makeBall(stage + 1, mx, my); M.Body.setVelocity(nb, { x: 0, y: -2 }); M.Composite.add(world, nb);
        burst(mx, my, stage + 1, 18 + (stage + 1) * 5); shake = Math.min(12, 2 + stage);
        if (!state.discovered[stage + 1]) {
          state.discovered[stage + 1] = true;
          if (stage + 1 >= 4) { slowMo(700); cb.onNewStage && cb.onNewStage(stage + 1); }
        }
      }
      state.score += points;
      sfxMerge(Math.min(10, stage + 1));
      if (state.combo >= 2) { sfxCombo(state.combo); popups.push({ text: '×' + C.comboMultiplier(state.combo) + ' COMBO ' + state.combo, x: W / 2, y: H / 2 - 40, t: 0 }); }
      if (state.combo === 5) sfxFever();
      cb.onScore && cb.onScore(state.score, state.combo, points, stage);
    }
    function slowMo(ms) { engine.timing.timeScale = 0.15; setTimeout(function () { engine.timing.timeScale = 1; }, ms); }

    M.Events.on(engine, 'collisionStart', function (ev) {
      if (state.phase !== 'playing') return;
      ev.pairs.forEach(function (p) {
        var a = p.bodyA, b = p.bodyB;
        if (a.isStatic || b.isStatic) return;
        if (a.plugin.stage !== b.plugin.stage) return;
        if (merging[a.id] || merging[b.id]) return;
        merge(a, b);
      });
      merging = {};
    });

    function burst(x, y, stage, n) {
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
        particles.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, life: 1, color: STAGE_COLORS[Math.min(10, stage)], size: 3 + Math.random() * 4 });
      }
    }

    function checkDanger(now) {
      var over = false, all = balls();
      for (var i = 0; i < all.length; i++) {
        var b = all[i];
        if (now - b.plugin.born < 800) continue;                 // 방금 떨어진 건 제외
        if (b.position.y - b.plugin.r < DANGER_Y) { over = true; break; }   // 떨어진 지 0.8초 지난 공이 선 위에 있으면 위험(1.5초 지속 시 종료)
      }
      if (over) { if (!dangerSince) dangerSince = now; }
      else dangerSince = 0;
      var d = !!dangerSince;
      if (d !== dangerOn) { dangerOn = d; cb.onDanger && cb.onDanger(d); }
      if (d && now - lastDangerBeep > 400) { lastDangerBeep = now; sfxDanger(); }
      if (dangerSince && now - dangerSince >= CFG.dangerHoldMs) gameOver();
    }

    function gameOver() {
      state.phase = 'over'; current = null; sfxOver();
      walls.forEach(function (w) { M.Composite.remove(world, w); }); // 붕괴 연출: 벽·바닥 제거
      var summary = { score: state.score, maxCombo: state.maxCombo, merges: state.merges, stages: state.stages.slice(), discovered: state.discovered.slice() };
      setTimeout(function () { cb.onGameOver && cb.onGameOver(summary); }, 900);
    }

    // ---- 렌더 ----
    function drawBall(x, y, r, stage, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = STAGE_COLORS[stage]; ctx.fill();
      if (images[stage].complete && images[stage].naturalWidth) ctx.drawImage(images[stage], -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    function draw(now) {
      ctx.save(); ctx.clearRect(0, 0, W, H);
      if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.5) shake = 0; }
      // 통
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(WALL, 0, INNER, FLOOR_Y);
      ctx.strokeStyle = 'rgba(160,190,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(WALL, 0); ctx.lineTo(WALL, FLOOR_Y); ctx.lineTo(W - WALL, FLOOR_Y); ctx.lineTo(W - WALL, 0); ctx.stroke();
      // 경계선
      var blink = dangerOn ? (Math.sin(now / 90) > 0 ? 1 : 0.3) : 0.35;
      ctx.strokeStyle = dangerOn ? 'rgba(255,70,70,' + blink + ')' : 'rgba(255,255,255,' + blink + ')';
      ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(WALL, DANGER_Y); ctx.lineTo(W - WALL, DANGER_Y); ctx.stroke(); ctx.setLineDash([]);
      // 공들
      balls().forEach(function (b) {
        if (b.plugin.pop > 1) b.plugin.pop = Math.max(1, b.plugin.pop - 0.03);
        drawBall(b.position.x, b.position.y, b.plugin.r * b.plugin.pop, b.plugin.stage, b.angle);
      });
      // 현재(낙하 대기) 캐릭터 + 조준선
      if (current && state.phase === 'playing') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(current.x, DROP_Y); ctx.lineTo(current.x, FLOOR_Y); ctx.stroke(); ctx.setLineDash([]);
        drawBall(current.x, DROP_Y, current.r, current.stage, 0);
      }
      // 다음 미리보기
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(W - 40, 40, 26, 0, Math.PI * 2); ctx.fill();
      drawBall(W - 40, 40, 16, nextStage, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEXT', W - 40, 78);
      // 파티클
      particles = particles.filter(function (p) { return p.life > 0; });
      particles.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
      ctx.globalAlpha = 1;
      // 콤보 텍스트
      popups = popups.filter(function (p) { return p.t < 1; });
      popups.forEach(function (p) { p.t += 0.03; ctx.globalAlpha = 1 - p.t; ctx.font = 'bold ' + (28 + p.t * 10) + 'px sans-serif'; ctx.fillStyle = '#ffd94f'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.textAlign = 'center'; ctx.strokeText(p.text, p.x, p.y - p.t * 30); ctx.fillText(p.text, p.x, p.y - p.t * 30); });
      ctx.globalAlpha = 1; ctx.restore();
    }

    // 물리는 타이머로(창이 가려져도 진행), 그리기는 requestAnimationFrame으로(보일 때만).
    var STEP = 1000 / 60, physId = 0, accum = 0;
    function physics() {
      var now = performance.now();
      if (document.hidden) { lastT = now; return; }            // 탭이 숨겨지면 멈춤(시간 누적 안 함)
      accum += lastT ? Math.min(STEP * 6, now - lastT) : STEP; lastT = now;   // 프레임 끊김은 최대 100ms까지만 따라잡음
      while (accum >= STEP) {
        if (state.phase !== 'ready') M.Engine.update(engine, STEP);
        accum -= STEP;
      }
      if (state.phase === 'playing') checkDanger(now);
    }
    function loop(t) {
      draw(t);
      rafId = requestAnimationFrame(loop);
    }

    // ---- 입력: 포인터(터치·마우스 공용) ----
    function toLogicalX(clientX) { var rect = canvas.getBoundingClientRect(); return (clientX - rect.left) / rect.width * W; }
    function onMove(e) { pointerX = toLogicalX(e.clientX); if (current) current.x = clampX(pointerX, current.r); }
    function onDown(e) { ensureAudio(); onMove(e); if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} } }
    function onUp(e) { onMove(e); drop(); }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp);

    function start() {
      state.phase = 'playing'; nextStage = C.pickDropStage(rand()); spawnCurrent(); state.discovered[0] = true;
      lastT = 0; accum = 0;
      if (!physId) physId = setInterval(physics, STEP);
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
    function destroy() {
      cancelAnimationFrame(rafId); rafId = 0;
      clearInterval(physId); physId = 0;
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      M.Composite.clear(world, false); M.Engine.clear(engine);
    }
    function setSound(on) { soundOn = on; if (on) ensureAudio(); }
    rafId = requestAnimationFrame(loop);
    return { start: start, destroy: destroy, setSound: setSound, state: state, _drop: drop, _engine: engine };
  }

  window.MergeGame = { create: create, W: W, H: H };
})();
