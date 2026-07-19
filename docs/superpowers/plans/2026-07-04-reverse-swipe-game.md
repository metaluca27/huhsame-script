# 리버스 스와이프 게임 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 60초 시간제 반사신경 스와이프 게임(파랑=그대로, 빨강=반대)을 루릭·푸름이 캐릭터와 함께 단일 HTML 파일로 만들어 `landing/game/`에 배치한다.

**Architecture:** 바닐라 JS 단일 파일(`landing/game/index.html`). 스크립트 내부를 상태 머신 / 순수 게임 로직 / 입력 처리 / 렌더링 / 냥이봇 섹션으로 구분. DOM + CSS 애니메이션만 사용(캔버스 없음). 검증은 로컬 프리뷰 서버(preview 도구)에서 `preview_eval`로 순수 함수·상태를 직접 호출해 확인한다.

**Tech Stack:** HTML/CSS/Vanilla JS, localStorage, npx serve(로컬 프리뷰), Firebase Hosting(기존 설정 그대로)

**Spec:** `docs/superpowers/specs/2026-07-04-reverse-swipe-game-design.md`

## Global Constraints

- 이 폴더는 **git 저장소가 아니다** — 커밋 단계 없음. 파일 저장으로 대체한다.
- 게임 본체는 `landing/game/index.html` **단일 파일** + 이미지 2장(`landing/game/img/`)만 생성한다. 프레임워크·빌드 도구·외부 라이브러리 금지.
- 점수 공식: `10 × 콤보배율 × (피버 시 2)`. 콤보배율 = `min(4, floor(콤보/5)+1)`.
- 화살표 응답 제한시간: 2000ms에서 시작해 경과 시간에 선형 비례로 감소, 최소 800ms.
- 빨간(반대) 화살표 비율 30%.
- 피버: 콤보가 10의 배수 도달 시 5초 발동(중복 도달 시 연장). 피버 중 오답은 콤보 유지 + 피버만 종료.
- 루릭 대사에 이모지·감탄사 금지. 푸름이 문구는 스펙 문자열 그대로: `결과 전달했어요 — {점수}점 · 최대 {콤보}콤보`, 신기록 시 `신기록 갱신 알림 보냈어요`.
- localStorage 키: `reverse-swipe-best`.
- 모바일: `user-scalable=no`, `touch-action:none`, 375px 폭 기준 레이아웃.

---

### Task 1: 캐릭터 이미지 준비

**Files:**
- Create: `landing/game/img/pureum.png` (푸름이, 리사이즈본)
- Create: `landing/game/img/ruric.png` (루릭, 리사이즈본)

**Interfaces:**
- Consumes: 원본 이미지
  - 푸름이: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664.png`
  - 루릭: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664_01.png`
- Produces: 긴 변 400px PNG 2장. Task 2의 HTML이 `img/pureum.png`, `img/ruric.png` 상대 경로로 참조한다.

- [ ] **Step 1: PowerShell로 리사이즈 복사**

```powershell
Add-Type -AssemblyName System.Drawing
function Resize-Png($src, $dst, $max) {
  $img = [System.Drawing.Image]::FromFile($src)
  $r = [Math]::Min($max / $img.Width, $max / $img.Height)
  $w = [int]($img.Width * $r); $h = [int]($img.Height * $r)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($img, 0, 0, $w, $h)
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
New-Item -ItemType Directory -Force "C:\Users\atlia\Desktop\huhsame-script\landing\game\img" | Out-Null
Resize-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664.png' 'C:\Users\atlia\Desktop\huhsame-script\landing\game\img\pureum.png' 400
Resize-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664_01.png' 'C:\Users\atlia\Desktop\huhsame-script\landing\game\img\ruric.png' 400
```

- [ ] **Step 2: 결과 확인**

```powershell
Add-Type -AssemblyName System.Drawing
foreach ($f in 'pureum.png','ruric.png') {
  $p = "C:\Users\atlia\Desktop\huhsame-script\landing\game\img\$f"
  $i = [System.Drawing.Image]::FromFile($p)
  "{0}: {1}x{2}, {3:N0} bytes" -f $f, $i.Width, $i.Height, (Get-Item $p).Length
  $i.Dispose()
}
```

Expected: 두 파일 모두 긴 변 400px, 각 200KB 이하.

---

### Task 2: HTML 뼈대 + 3개 화면 + 상태 전환

**Files:**
- Create: `landing/game/index.html`
- Modify: `.claude/launch.json` (프리뷰 서버 설정 추가)

**Interfaces:**
- Consumes: Task 1의 `img/pureum.png`, `img/ruric.png`
- Produces: `showScreen(name)` (`'start' | 'play' | 'result'`), DOM id — `screen-start`, `screen-play`, `screen-result`, `btn-start`, `btn-retry`, `time-bar`, `score`, `combo`, `arrow`, `arrow-zone`, `ruric-bubble`, `result-lines`, `best-start`. Task 3~5가 이 id들과 `<script>` 블록을 확장한다.

- [ ] **Step 1: launch.json에 game 서버 설정 추가**

`.claude/launch.json`의 `configurations` 배열에 아래 항목을 추가한다 (기존 `market` 항목은 유지):

```json
{
  "name": "game",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["serve", "-l", "3457", "C:/Users/atlia/Desktop/huhsame-script/landing"],
  "port": 3457
}
```

- [ ] **Step 2: index.html 작성**

`landing/game/index.html` 전체 내용:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>리버스 스와이프 — 나의 냥이봇들</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; overflow:hidden; }
  body {
    font-family:'Segoe UI','Malgun Gothic',sans-serif;
    background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);
    color:#fff; touch-action:none; overscroll-behavior:none;
    user-select:none; -webkit-user-select:none;
  }
  .screen { display:none; height:100%; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:24px; text-align:center; }
  .screen.active { display:flex; }
  h1 { font-size:2rem; letter-spacing:2px; }
  .avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; object-position:top; border:3px solid #4f8cff; background:#fff; }
  .cats { display:flex; gap:16px; }
  .rules { line-height:1.9; font-size:1.05rem; background:rgba(255,255,255,.08); padding:14px 20px; border-radius:14px; }
  .btn { font-size:1.2rem; font-weight:700; padding:14px 48px; border:none; border-radius:999px; background:#4f8cff; color:#fff; cursor:pointer; }
  .btn:active { transform:scale(.96); }
  #best-start { opacity:.8; }
  /* --- 플레이 화면 --- */
  #screen-play { justify-content:flex-start; }
  #hud { width:100%; max-width:420px; }
  #time-bar-wrap { width:100%; height:10px; background:rgba(255,255,255,.15); border-radius:999px; overflow:hidden; }
  #time-bar { width:100%; height:100%; background:#4f8cff; border-radius:999px; }
  #hud-row { display:flex; justify-content:space-between; margin-top:10px; font-size:1.3rem; font-weight:700; }
  #arrow-zone { flex:1; display:flex; align-items:center; justify-content:center; width:100%; }
  #arrow { width:140px; height:140px; }
  #arrow svg { width:100%; height:100%; }
  #arrow.blue { color:#4f8cff; }
  #arrow.red { color:#ff4f6d; }
  #ruric-corner { position:fixed; left:12px; bottom:12px; display:flex; align-items:flex-end; gap:8px; }
  #ruric-corner .avatar { width:64px; height:64px; border-color:#9b6dff; }
  #ruric-bubble { background:#fff; color:#222; border-radius:12px; padding:8px 12px; font-size:.9rem; opacity:0; transition:opacity .25s; max-width:200px; text-align:left; }
  #ruric-bubble.show { opacity:1; }
  /* --- 결과 화면 --- */
  .slack-card { display:flex; gap:12px; align-items:flex-start; background:#fff; color:#1d1c1d; border-radius:12px; padding:16px; max-width:340px; width:100%; text-align:left; }
  .slack-card .avatar { width:44px; height:44px; border-radius:8px; border:none; }
  .slack-card b { color:#1264a3; }
  #result-lines { font-size:.95rem; line-height:1.6; }
</style>
</head>
<body>
  <div id="screen-start" class="screen active">
    <h1>리버스 스와이프</h1>
    <div class="cats">
      <img class="avatar" src="img/ruric.png" alt="루릭">
      <img class="avatar" src="img/pureum.png" alt="푸름이">
    </div>
    <div class="rules">🔵 파란 화살표 → <b>그대로</b> 스와이프<br>🔴 빨간 화살표 → <b>반대로</b> 스와이프</div>
    <div id="best-start">최고 점수: 0</div>
    <button id="btn-start" class="btn">시작!</button>
  </div>

  <div id="screen-play" class="screen">
    <div id="hud">
      <div id="time-bar-wrap"><div id="time-bar"></div></div>
      <div id="hud-row"><span id="score">0</span><span id="combo"></span></div>
    </div>
    <div id="arrow-zone">
      <div id="arrow" class="blue">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 6 L86 52 H64 V94 H36 V52 H14 Z" fill="currentColor"/>
        </svg>
      </div>
    </div>
    <div id="ruric-corner">
      <img class="avatar" src="img/ruric.png" alt="루릭">
      <div id="ruric-bubble"></div>
    </div>
  </div>

  <div id="screen-result" class="screen">
    <div class="slack-card">
      <img class="avatar" src="img/pureum.png" alt="푸름이">
      <div>
        <b>푸름이</b>
        <div id="result-lines"></div>
      </div>
    </div>
    <button id="btn-retry" class="btn">다시하기</button>
  </div>

<script>
// ===== 유틸 =====
const $ = (id) => document.getElementById(id);

// ===== 화면 전환 =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

// ===== 버튼 (Task 3에서 startGame으로 교체) =====
$('btn-start').addEventListener('click', () => showScreen('play'));
$('btn-retry').addEventListener('click', () => showScreen('start'));
</script>
</body>
</html>
```

- [ ] **Step 3: 프리뷰로 검증**

1. `preview_start`로 `game` 서버 시작 → `http://localhost:3457/game/` 접속됨.
2. `preview_snapshot`: 시작 화면에 "리버스 스와이프" 제목, 규칙 텍스트, "시작!" 버튼 확인.
3. `preview_click`으로 `#btn-start` 클릭 → `preview_snapshot`에서 플레이 화면(화살표) 표시 확인.
4. `preview_console_logs` (level: error): 에러 0건, 이미지 404 없음.

Expected: 세 화면 전환 동작, 콘솔 에러 없음.

---

### Task 3: 핵심 게임플레이 (화살표·입력·점수·타이머)

**Files:**
- Modify: `landing/game/index.html` (`<script>` 블록 전체 교체 + CSS 추가)

**Interfaces:**
- Consumes: Task 2의 DOM id들
- Produces: `state` 객체, `comboMultiplier(combo)`, `pointsFor(combo, fever)`, `arrowTimeLimit(elapsed)`, `correctDir(arrow)`, `newArrow()`, `startGame()`, `endGame()`, `handleSwipe(dir)`, `onMiss(now)`, `spawnArrow(now)`, `renderHud()`, `isFever(now)`. Task 4·5가 `handleSwipe`/`onMiss`/`startGame`/`endGame`를 수정한다.

- [ ] **Step 1: CSS에 정답/오답 피드백 애니메이션 추가**

`</style>` 직전에 추가:

```css
  @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-10px)} 75%{transform:translateX(10px)} }
  #arrow-zone.ok { animation:pop .18s; }
  #arrow-zone.bad { animation:shake .25s; }
```

- [ ] **Step 2: `<script>` 블록 전체를 아래로 교체**

```javascript
// ===== 유틸 =====
const $ = (id) => document.getElementById(id);
const GAME_DURATION = 60000;
const DIRS = ['up', 'right', 'down', 'left'];
const OPPOSITE = { up:'down', down:'up', left:'right', right:'left' };
const ROTATION = { up:0, right:90, down:180, left:270 };

// ===== 게임 상태 =====
const state = {
  phase: 'start',        // start | playing | result
  score: 0, combo: 0, maxCombo: 0,
  gameEnd: 0,
  arrow: null,           // { dir, reversed }
  arrowDeadline: 0,
  feverUntil: 0,
  rafId: 0,
};

// ===== 순수 게임 로직 =====
function comboMultiplier(combo) { return Math.min(4, Math.floor(combo / 5) + 1); }
function isFever(now) { return now < state.feverUntil; }
function pointsFor(combo, fever) { return 10 * comboMultiplier(combo) * (fever ? 2 : 1); }
function arrowTimeLimit(elapsed) {
  const t = Math.min(1, elapsed / GAME_DURATION);
  return 2000 - (2000 - 800) * t;
}
function correctDir(arrow) { return arrow.reversed ? OPPOSITE[arrow.dir] : arrow.dir; }
function newArrow() {
  return { dir: DIRS[Math.floor(Math.random() * 4)], reversed: Math.random() < 0.3 };
}

// ===== 화면 전환 =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

// ===== 게임 진행 =====
function startGame() {
  const now = performance.now();
  state.phase = 'playing';
  state.score = 0; state.combo = 0; state.maxCombo = 0;
  state.feverUntil = 0;
  state.gameEnd = now + GAME_DURATION;
  showScreen('play');
  renderHud();
  spawnArrow(now);
  state.rafId = requestAnimationFrame(tick);
}

function spawnArrow(now) {
  state.arrow = newArrow();
  const elapsed = now - (state.gameEnd - GAME_DURATION);
  state.arrowDeadline = now + arrowTimeLimit(elapsed);
  renderArrow();
}

function handleSwipe(dir) {
  if (state.phase !== 'playing' || !state.arrow) return;
  const now = performance.now();
  if (dir === correctDir(state.arrow)) {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.score += pointsFor(state.combo, isFever(now));
    flash(true);
  } else {
    onMiss(now);
  }
  renderHud();
  spawnArrow(now);
}

function onMiss(now) {
  state.combo = 0;
  flash(false);
}

function tick(now) {
  if (state.phase !== 'playing') return;
  if (now >= state.gameEnd) { endGame(); return; }
  if (now >= state.arrowDeadline) {
    onMiss(now);
    renderHud();
    spawnArrow(now);
  }
  $('time-bar').style.width = ((state.gameEnd - now) / GAME_DURATION * 100) + '%';
  state.rafId = requestAnimationFrame(tick);
}

function endGame() {
  state.phase = 'result';
  cancelAnimationFrame(state.rafId);
  $('result-lines').textContent = '결과 전달했어요 — ' + state.score + '점 · 최대 ' + state.maxCombo + '콤보';
  showScreen('result');
}

// ===== 렌더링 =====
function renderArrow() {
  const a = $('arrow');
  a.className = state.arrow.reversed ? 'red' : 'blue';
  a.style.transform = 'rotate(' + ROTATION[state.arrow.dir] + 'deg)';
}
function renderHud() {
  $('score').textContent = state.score;
  const m = comboMultiplier(state.combo);
  $('combo').textContent = state.combo > 0 ? state.combo + '콤보 ×' + m : '';
}
function flash(ok) {
  const zone = $('arrow-zone');
  zone.classList.remove('ok', 'bad');
  void zone.offsetWidth;   /* 리플로우로 애니메이션 재시작 */
  zone.classList.add(ok ? 'ok' : 'bad');
}

// ===== 입력 =====
let touchStart = null;
window.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 30) return;
  const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  handleSwipe(dir);
});
window.addEventListener('keydown', (e) => {
  const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
  if (map[e.key]) { e.preventDefault(); handleSwipe(map[e.key]); }
});

// ===== 버튼 =====
$('btn-start').addEventListener('click', startGame);
$('btn-retry').addEventListener('click', startGame);
```

- [ ] **Step 3: 순수 로직 검증 (preview_eval)**

프리뷰 새로고침 후 `preview_eval`:

```javascript
JSON.stringify([
  comboMultiplier(0), comboMultiplier(4), comboMultiplier(5), comboMultiplier(9),
  comboMultiplier(10), comboMultiplier(15), comboMultiplier(99),
  pointsFor(1, false), pointsFor(5, false), pointsFor(10, true),
  arrowTimeLimit(0), arrowTimeLimit(30000), arrowTimeLimit(60000), arrowTimeLimit(99999),
  correctDir({dir:'up', reversed:false}), correctDir({dir:'up', reversed:true}),
])
```

Expected: `[1,1,2,2,3,4,4, 10,20,60, 2000,1400,800,800, "up","down"]`

- [ ] **Step 4: 플레이 흐름 검증 (preview_eval)**

```javascript
(() => {
  startGame();
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('up');                       // 정답
  const a = { score: state.score, combo: state.combo };
  state.arrow = { dir: 'left', reversed: true };
  handleSwipe('right');                    // 반대로 → 정답
  const b = { score: state.score, combo: state.combo };
  state.arrow = { dir: 'down', reversed: false };
  handleSwipe('up');                       // 오답
  const c = { score: state.score, combo: state.combo };
  return JSON.stringify([a, b, c]);
})()
```

Expected: `[{"score":10,"combo":1},{"score":20,"combo":2},{"score":20,"combo":0}]`

- [ ] **Step 5: 게임 종료 검증 (preview_eval)**

```javascript
(() => { state.gameEnd = performance.now(); return true; })()
```

이후 `preview_snapshot`: 결과 화면에 "푸름이", "결과 전달했어요 — 20점 · 최대 2콤보" 표시. "다시하기" 클릭(`preview_click` `#btn-retry`) → 플레이 화면으로 복귀.

- [ ] **Step 6: 키보드 입력 검증 (preview_eval)**

```javascript
(() => {
  startGame();
  state.arrow = { dir: 'right', reversed: false };
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  return JSON.stringify({ score: state.score, combo: state.combo });
})()
```

Expected: `{"score":10,"combo":1}`

---

### Task 4: 피버 모드 + 이펙트

**Files:**
- Modify: `landing/game/index.html` (CSS 추가, `handleSwipe`/`onMiss`/`tick`/`startGame` 수정)

**Interfaces:**
- Consumes: Task 3의 `state`, `isFever(now)`, `handleSwipe`, `onMiss`, `tick`, `startGame`
- Produces: `checkFeverTrigger(now)`, `body.fever` 클래스. Task 5가 피버 트리거 지점에 루릭 대사를 연결한다.

- [ ] **Step 1: 피버 CSS 추가**

`</style>` 직전에 추가:

```css
  @keyframes feverbg {
    0% { background:linear-gradient(160deg,#3a1a5e 0%,#5e2168 50%,#a3305f 100%); }
    50% { background:linear-gradient(160deg,#5e2168 0%,#a3305f 50%,#3a1a5e 100%); }
    100% { background:linear-gradient(160deg,#3a1a5e 0%,#5e2168 50%,#a3305f 100%); }
  }
  body.fever { animation:feverbg 1s infinite; }
  body.fever #time-bar { background:#ffd94f; }
  body.fever #combo { color:#ffd94f; }
```

- [ ] **Step 2: 피버 로직 반영**

`handleSwipe`의 정답 분기를 아래로 교체:

```javascript
  if (dir === correctDir(state.arrow)) {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.score += pointsFor(state.combo, isFever(now));
    checkFeverTrigger(now);
    flash(true);
  } else {
    onMiss(now);
  }
```

`onMiss` 전체 교체 (피버 중엔 콤보 유지, 피버만 종료):

```javascript
function onMiss(now) {
  if (isFever(now)) {
    state.feverUntil = now;
  } else {
    state.combo = 0;
  }
  flash(false);
}
```

`checkFeverTrigger` 신규 추가 (`onMiss` 아래):

```javascript
function checkFeverTrigger(now) {
  if (state.combo > 0 && state.combo % 10 === 0) {
    state.feverUntil = now + 5000;
    document.body.classList.add('fever');
  }
}
```

`tick`에 피버 해제 처리 추가 — `if (now >= state.arrowDeadline) {...}` 블록 다음 줄에:

```javascript
  if (document.body.classList.contains('fever') && !isFever(now)) {
    document.body.classList.remove('fever');
  }
```

`startGame`의 `state.feverUntil = 0;` 다음 줄에 추가:

```javascript
  document.body.classList.remove('fever');
```

`endGame`의 `showScreen('result');` 앞에 추가:

```javascript
  document.body.classList.remove('fever');
```

- [ ] **Step 3: 피버 검증 (preview_eval)**

```javascript
(() => {
  startGame();
  const results = [];
  for (let i = 0; i < 10; i++) {           // 10연속 정답 → 피버 발동
    state.arrow = { dir: 'up', reversed: false };
    handleSwipe('up');
  }
  results.push({ combo: state.combo, fever: isFever(performance.now()), bodyFever: document.body.classList.contains('fever') });
  const scoreBefore = state.score;
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('up');                        // 피버 중 정답 → 10×3×2=60점
  results.push({ gained: state.score - scoreBefore });
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('down');                      // 피버 중 오답 → 콤보 유지, 피버 종료
  results.push({ combo: state.combo, fever: isFever(performance.now()) });
  return JSON.stringify(results);
})()
```

Expected: `[{"combo":10,"fever":true,"bodyFever":true},{"gained":60},{"combo":11,"fever":false}]`

(참고: 10콤보째 점수는 배율 ×3 적용 전 피버 발동 순서상 `pointsFor` 호출 후 `checkFeverTrigger`이므로 10콤보째 자체는 2배 미적용 — 의도된 동작)

- [ ] **Step 4: 일반 오답 콤보 리셋 재확인 (preview_eval)**

```javascript
(() => {
  startGame();
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('up');
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('down');                      // 피버 아님 → 콤보 리셋
  return JSON.stringify({ combo: state.combo, fever: isFever(performance.now()) });
})()
```

Expected: `{"combo":0,"fever":false}`

---

### Task 5: 루릭 코멘트 + 푸름이 결과 카드 + 최고 점수

**Files:**
- Modify: `landing/game/index.html` (`<script>`에 냥이봇·localStorage 코드 추가, `startGame`/`onMiss`/`handleSwipe`/`checkFeverTrigger`/`endGame` 수정)

**Interfaces:**
- Consumes: Task 3·4의 함수들, DOM id `ruric-bubble`, `result-lines`, `best-start`
- Produces: `ruricSay(event)` (`'start'|'miss'|'combo'|'fever'`), `loadBest()`, localStorage 키 `reverse-swipe-best`

- [ ] **Step 1: 냥이봇 + 최고점수 코드 추가**

`// ===== 버튼 =====` 섹션 바로 위에 추가:

```javascript
// ===== 냥이봇 =====
const RURIC_LINES = {
  start: ['...시작함', '빨간 건 반대. 알겠음?', '집중해'],
  miss: ['그걸 틀림?', '(한숨)', '...', '집중 안 함?'],
  combo: ['나쁘지 않음', '좀 하네', '계속해봐'],
  fever: ['오. 좀 치네', '피버. 놀랍군', '...인정'],
};
let bubbleTimer = 0;
function ruricSay(event) {
  const lines = RURIC_LINES[event];
  const bubble = $('ruric-bubble');
  bubble.textContent = '루릭: ' + lines[Math.floor(Math.random() * lines.length)];
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1500);
}

// ===== 최고 점수 =====
const BEST_KEY = 'reverse-swipe-best';
function loadBest() { return Number(localStorage.getItem(BEST_KEY) || 0); }
function renderBest() { $('best-start').textContent = '최고 점수: ' + loadBest(); }
renderBest();
```

- [ ] **Step 2: 대사 호출 연결**

`startGame`의 `state.rafId = requestAnimationFrame(tick);` 앞에:

```javascript
  ruricSay('start');
```

`onMiss`의 `flash(false);` 앞에:

```javascript
  ruricSay('miss');
```

`checkFeverTrigger` 전체 교체 (피버 발동 시 fever 대사, 5의 배수 콤보엔 combo 대사):

```javascript
function checkFeverTrigger(now) {
  if (state.combo > 0 && state.combo % 10 === 0) {
    state.feverUntil = now + 5000;
    document.body.classList.add('fever');
    ruricSay('fever');
  } else if (state.combo > 0 && state.combo % 5 === 0) {
    ruricSay('combo');
  }
}
```

- [ ] **Step 3: endGame을 푸름이 카드 + 신기록 처리로 교체**

```javascript
function endGame() {
  state.phase = 'result';
  cancelAnimationFrame(state.rafId);
  document.body.classList.remove('fever');
  const best = loadBest();
  const isRecord = state.score > best;
  if (isRecord) localStorage.setItem(BEST_KEY, String(state.score));
  let html = '결과 전달했어요 — <b>' + state.score + '점</b> · 최대 ' + state.maxCombo + '콤보';
  if (isRecord) html += '<br>신기록 갱신 알림 보냈어요';
  $('result-lines').innerHTML = html;
  renderBest();
  showScreen('result');
}
```

- [ ] **Step 4: 루릭 대사 검증 (preview_eval)**

```javascript
(() => {
  ruricSay('miss');
  const b = $('ruric-bubble');
  return JSON.stringify({ text: b.textContent.startsWith('루릭: '), shown: b.classList.contains('show') });
})()
```

Expected: `{"text":true,"shown":true}`

- [ ] **Step 5: 신기록 저장 검증 (preview_eval)**

```javascript
(() => {
  localStorage.removeItem('reverse-swipe-best');
  startGame();
  state.arrow = { dir: 'up', reversed: false };
  handleSwipe('up');                        // 10점
  state.gameEnd = performance.now();        // 강제 종료
  endGame();
  const first = { best: loadBest(), html: $('result-lines').innerHTML.includes('신기록') };
  startGame();
  state.gameEnd = performance.now();        // 0점으로 종료 → 신기록 아님
  endGame();
  const second = { best: loadBest(), html: $('result-lines').innerHTML.includes('신기록') };
  return JSON.stringify([first, second]);
})()
```

Expected: `[{"best":10,"html":true},{"best":10,"html":false}]`

- [ ] **Step 6: 시작 화면 최고점수 표시 확인**

`preview_eval`: `document.getElementById('best-start').textContent` → `"최고 점수: 10"`.

---

### Task 6: 모바일 검증 + 최종 확인

**Files:**
- Modify: `landing/game/index.html` (검증 중 발견된 문제만 수정)

**Interfaces:**
- Consumes: 완성된 게임 전체
- Produces: 배포 준비 완료 상태

- [ ] **Step 1: 모바일 뷰포트 레이아웃 검증**

1. `preview_resize` preset `mobile` (375×812).
2. `preview_snapshot`: 시작 화면 요소가 잘리지 않고 모두 보임.
3. `preview_click` `#btn-start` → 플레이 화면에서 HUD(시간 바·점수)와 화살표, 루릭 아바타가 겹치지 않음. `preview_screenshot`으로 확인.

- [ ] **Step 2: 전체 판 통합 플레이 확인**

`preview_eval`로 판을 짧게 줄여 실제 흐름 확인:

```javascript
(() => { startGame(); state.gameEnd = performance.now() + 5000; return true; })()
```

5초 후 `preview_snapshot`: 결과 화면으로 자동 전환됨(타임아웃 미스 발생해도 크래시 없음).

- [ ] **Step 3: 콘솔/네트워크 최종 점검**

- `preview_console_logs` (level: error): 0건.
- `preview_network` (filter: failed): 실패 요청 0건 (이미지 2장 정상 로드).

- [ ] **Step 4: 데스크톱 뷰 복귀 및 스크린샷 공유**

`preview_resize` preset `desktop` 후 `preview_screenshot` — 사용자에게 시작/플레이/결과 화면 증빙 공유.

- [ ] **Step 5: 배포 안내**

배포는 기존 Firebase 설정 그대로: 사용자가 원할 때 `firebase deploy --only hosting` 실행 → `사이트주소/game`으로 접속 가능. (배포 실행 여부는 사용자에게 확인)
