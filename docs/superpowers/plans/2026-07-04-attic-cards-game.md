# 다락방 짝꿍 찾기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디지털 다락방 6인 캐릭터 카드 짝맞추기 게임(3레벨, 별점, 캐릭터 팝업)을 단일 HTML 파일로 만들어 `landing/cards/`에 배치한다.

**Architecture:** 바닐라 JS 단일 파일(`landing/cards/index.html`). 상태 머신(start → playing → clear → result / timeout) / 카드 로직(Fisher-Yates 셔플, 2장 뒤집기 판정) / 렌더링(CSS grid + 3D flip) / 캐릭터 팝업 / Web Audio 사운드로 구분. 검증은 프리뷰 서버 + `preview_eval`.

**Tech Stack:** HTML/CSS/Vanilla JS, localStorage(try/catch), Web Audio, 기존 `game` 프리뷰 서버(landing 루트 서빙 → `/cards/` 접근 가능), Firebase Hosting

**Spec:** `docs/superpowers/specs/2026-07-04-attic-cards-game-design.md`

## Global Constraints

- 이 폴더는 **git 저장소가 아니다** — 커밋 단계 없음. 파일 저장으로 완료 처리.
- 게임 본체는 `landing/cards/index.html` **단일 파일** + `landing/cards/img/` 이미지 7장(캐릭터 6 + og). 프레임워크·외부 라이브러리 금지.
- **이미지 경로는 절대 경로** `/cards/img/...` (firebase trailingSlash 교훈).
- **localStorage 접근은 전부 try/catch** (키: `attic-cards-best`, JSON `{stars, l3time}`).
- 레벨: L1 3쌍(무제한), L2 6쌍(무제한), L3 6쌍+45초. 별점 기준(ms): L1 [15000,25000], L2 [40000,60000], L3 [25000,35000] — 이내 ★3/★2, 그 외(클리어 시) ★1.
- 불일치 카드는 0.8초 후 되뒤집힘. 되뒤집힘 대기 중 입력 무시.
- 캐릭터 대사·이름은 스펙 문자열 그대로 (아래 Task 5의 CHARS 배열이 원본).
- 공유 문구: `다락방 짝꿍 찾기에서 별 {n}개 획득! 도전해볼래?` + `https://vaulted-bus-346411.web.app/cards`
- 배포는 사용자 확인 후 `firebase deploy --only hosting`.

---

### Task 1: 캐릭터 이미지 6장 + OG 이미지 준비

**Files:**
- Create: `landing/cards/img/{luka,luna,nova,pureum,ruric,jujuya}.png` (긴 변 400px)
- Create: `landing/cards/img/og.png` (1200×630)

**Interfaces:**
- Consumes: 원본 이미지 6종 —
  - 루카: `C:\Users\atlia\Desktop\KakaoTalk_20260704_223718626.jpg` (1080×2340 — **크롭 필요**: 대략 x 70~900, y 350~2150 영역으로 잘라 양옆 이웃 제거. 크롭 후 Read로 확인해 고양이 귀·어른 옷이 크게 남으면 좌우를 더 잘라낼 것)
  - 루나: `C:\Users\atlia\Desktop\KakaoTalk_20260704_215731047.png` (1024×1536 내외 — **크롭 필요**: 좌우 블러 배경 제거, 대략 가로 중앙 60% 영역 x 200~820, y 60~1500)
  - 노바: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260517_200634868.png` (투명 배경, 크롭 불필요)
  - 푸름이: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664.png`
  - 루릭: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664_01.png`
  - 주주야: `C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260523_200936274.png`
- Produces: `/cards/img/{id}.png` 6장 + `/cards/img/og.png`. Task 2의 HTML이 이 경로를 참조.

- [ ] **Step 1: 크롭+리사이즈 스크립트 실행 (PowerShell)**

```powershell
Add-Type -AssemblyName System.Drawing
$dst = "C:\Users\atlia\Desktop\huhsame-script\landing\cards\img"
New-Item -ItemType Directory -Force $dst | Out-Null

function Prep-Png($src, $out, $max, $crop) {
  $img = [System.Drawing.Image]::FromFile($src)
  if ($crop) {
    $bmpC = New-Object System.Drawing.Bitmap $crop[2], $crop[3]
    $gc = [System.Drawing.Graphics]::FromImage($bmpC)
    $gc.DrawImage($img, (New-Object System.Drawing.Rectangle 0,0,$crop[2],$crop[3]), (New-Object System.Drawing.Rectangle $crop[0],$crop[1],$crop[2],$crop[3]), [System.Drawing.GraphicsUnit]::Pixel)
    $gc.Dispose(); $img.Dispose(); $img = $bmpC
  }
  $r = [Math]::Min($max / $img.Width, $max / $img.Height)
  $w = [int]($img.Width * $r); $h = [int]($img.Height * $r)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($img, 0, 0, $w, $h)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

Prep-Png 'C:\Users\atlia\Desktop\KakaoTalk_20260704_223718626.jpg' "$dst\luka.png" 400 @(70, 350, 830, 1800)
Prep-Png 'C:\Users\atlia\Desktop\KakaoTalk_20260704_215731047.png' "$dst\luna.png" 400 @(200, 60, 620, 1440)
Prep-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260517_200634868.png' "$dst\nova.png" 400 $null
Prep-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664.png' "$dst\pureum.png" 400 $null
Prep-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260405_153338664_01.png' "$dst\ruric.png" 400 $null
Prep-Png 'C:\Users\atlia\Desktop\콘텐츠\다락방캐릭터\KakaoTalk_20260523_200936274.png' "$dst\jujuya.png" 400 $null
Get-ChildItem $dst | ForEach-Object { "{0}: {1:N0} bytes" -f $_.Name, $_.Length }
```

크롭 파라미터는 `@(x, y, width, height)`. 크롭 좌표는 원본 픽셀 기준.

- [ ] **Step 2: 크롭 결과 육안 확인**

`luka.png`와 `luna.png`를 Read 도구로 열어 확인:
- luka.png: 루카(갈색 머리 소녀)가 중앙에 크게, 좌상단 고양이·우측 어른 옷이 화면 가장자리에 소폭만 남아야 함. 크게 남으면 크롭 x/width를 조정해 재실행.
- luna.png: 루나(하늘색 후드)가 중앙에, 좌우 어두운 블러 배경이 대부분 제거되어야 함.

- [ ] **Step 3: OG 이미지 생성 (1200×630)**

남색 그라데이션 배경 + 타이틀 + 6장의 카드(흰 라운드 사각형 안에 캐릭터) 나열:

```powershell
Add-Type -AssemblyName System.Drawing
$W=1200; $H=630
$bmp = New-Object System.Drawing.Bitmap $W,$H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'; $g.InterpolationMode='HighQualityBicubic'; $g.TextRenderingHint='AntiAliasGridFit'
$rect = New-Object System.Drawing.Rectangle 0,0,$W,$H
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(26,26,46)), ([System.Drawing.Color]::FromArgb(15,52,96)), 60
$g.FillRectangle($bg,$rect)

function Fill-RoundRect($g,$brush,$x,$y,$w,$h,$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x,$y,2*$r,2*$r,180,90); $p.AddArc($x+$w-2*$r,$y,2*$r,2*$r,270,90)
  $p.AddArc($x+$w-2*$r,$y+$h-2*$r,2*$r,2*$r,0,90); $p.AddArc($x,$y+$h-2*$r,2*$r,2*$r,90,90)
  $p.CloseFigure(); $g.FillPath($brush,$p); $p.Dispose()
}

$imgDir = "C:\Users\atlia\Desktop\huhsame-script\landing\cards\img"
$ids = @('luka','luna','nova','pureum','ruric','jujuya')
$cw=160; $ch=220; $gap=24; $x0=[int](($W - (6*$cw + 5*$gap))/2); $y0=340
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
for ($i=0; $i -lt 6; $i++) {
  $x = $x0 + $i*($cw+$gap)
  Fill-RoundRect $g $white $x $y0 $cw $ch 16
  $img = [System.Drawing.Image]::FromFile("$imgDir\$($ids[$i]).png")
  $m = 10
  $r = [Math]::Min(($cw-2*$m)/$img.Width, ($ch-2*$m)/$img.Height)
  $iw=[int]($img.Width*$r); $ih=[int]($img.Height*$r)
  $g.DrawImage($img, $x + [int](($cw-$iw)/2), $y0 + [int](($ch-$ih)/2), $iw, $ih)
  $img.Dispose()
}
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment='Center'
$titleFont = New-Object System.Drawing.Font('Malgun Gothic',62,[System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font('Malgun Gothic',26)
$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160,0,0,0))
$g.DrawString('다락방 짝꿍 찾기', $titleFont, $shadow, ($W/2+4), 64, $fmt)
$g.DrawString('다락방 짝꿍 찾기', $titleFont, [System.Drawing.Brushes]::White, ($W/2), 60, $fmt)
$sub = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,180,200,255))
$g.DrawString('6명의 다락방 식구들과 카드 짝맞추기!', $subFont, $sub, ($W/2), 190, $fmt)
$bmp.Save("$imgDir\og.png",[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"og.png: {0:N0} bytes" -f (Get-Item "$imgDir\og.png").Length
```

- [ ] **Step 4: og.png를 Read로 열어 확인**

타이틀 + 카드 6장에 6명이 각각 들어갔는지 확인. 캐릭터가 잘렸거나 순서가 이상하면 수정.

---

### Task 2: HTML 뼈대 + 5개 화면 + 상태 전환

**Files:**
- Create: `landing/cards/index.html`

**Interfaces:**
- Consumes: Task 1의 `/cards/img/*.png`
- Produces: `showScreen(name)` (`'start'|'play'|'clear'|'timeout'|'result'`), DOM id — `btn-sound`, `screen-start`, `screen-play`, `screen-clear`, `screen-timeout`, `screen-result`, `btn-start`, `btn-next`, `btn-retry-l3`, `btn-again`, `btn-share`, `level-label`, `clock`, `time-bar-wrap`, `time-bar`, `board`, `level-intro`, `char-pop`, `pop-img`, `pop-bubble`, `clear-title`, `clear-stars`, `clear-time`, `total-stars`, `record-line`, `best-line`. 이후 태스크가 `<script>`를 확장.

- [ ] **Step 1: index.html 작성 (전체 내용)**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>다락방 짝꿍 찾기 — 디지털 다락방</title>
<meta property="og:type" content="website">
<meta property="og:title" content="다락방 짝꿍 찾기 — 디지털 다락방">
<meta property="og:description" content="루카·루나·노바·푸름이·루릭·주주야와 카드 짝맞추기!">
<meta property="og:image" content="https://vaulted-bus-346411.web.app/cards/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://vaulted-bus-346411.web.app/cards">
<meta name="twitter:card" content="summary_large_image">
<meta name="description" content="루카·루나·노바·푸름이·루릭·주주야와 카드 짝맞추기!">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; overflow:hidden; }
  body {
    font-family:'Segoe UI','Malgun Gothic',sans-serif;
    background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);
    color:#fff; touch-action:manipulation; overscroll-behavior:none;
    user-select:none; -webkit-user-select:none;
  }
  .screen { display:none; height:100%; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:20px; text-align:center; }
  .screen.active { display:flex; }
  h1 { font-size:1.9rem; letter-spacing:1px; }
  h2 { font-size:1.6rem; }
  .btn { font-size:1.15rem; font-weight:700; padding:13px 40px; border:none; border-radius:999px; background:#4f8cff; color:#fff; cursor:pointer; white-space:nowrap; }
  .btn:active { transform:scale(.96); }
  .btn-sub { background:#9b6dff; }
  .result-btns { display:flex; gap:12px; }
  .result-btns .btn { padding:13px 26px; }
  #btn-sound { position:fixed; top:12px; right:12px; z-index:10; background:rgba(255,255,255,.12); border:none; border-radius:50%; width:44px; height:44px; font-size:1.2rem; cursor:pointer; }
  .preview { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; max-width:420px; }
  .preview img { width:52px; height:66px; object-fit:contain; background:#fff; border-radius:8px; padding:2px; }
  #best-line, #clear-time { opacity:.85; }
  /* --- 플레이 --- */
  #screen-play { justify-content:flex-start; padding-top:56px; }
  #hud { width:100%; max-width:420px; display:flex; justify-content:space-between; font-size:1.05rem; font-weight:700; }
  #time-bar-wrap { width:100%; max-width:420px; height:8px; background:rgba(255,255,255,.15); border-radius:999px; overflow:hidden; }
  #time-bar { width:100%; height:100%; background:#ffd94f; border-radius:999px; }
  #time-bar-wrap.hidden { visibility:hidden; }
  #board { display:grid; gap:10px; width:100%; max-width:420px; position:relative; }
  .card { aspect-ratio:3/4; perspective:600px; cursor:pointer; }
  .card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .35s; }
  .card.open .card-inner { transform:rotateY(180deg); }
  .card-face { position:absolute; inset:0; backface-visibility:hidden; border-radius:12px; }
  .card-back {
    background:linear-gradient(180deg,#233a63 0%,#1a2b4d 100%);
    border:2px solid rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px;
  }
  .card-back .roof { width:0; height:0; border-left:16px solid transparent; border-right:16px solid transparent; border-bottom:14px solid #9b6dff; }
  .card-back .q { font-size:1.3rem; font-weight:800; color:#9b6dff; }
  .card-front { background:#fff; transform:rotateY(180deg); display:flex; align-items:center; justify-content:center; padding:5px; }
  .card-front img { max-width:100%; max-height:100%; object-fit:contain; }
  .card.matched { pointer-events:none; }
  .card.matched .card-inner { animation:matchpulse .4s; }
  @keyframes matchpulse { 0%{transform:rotateY(180deg) scale(1)} 50%{transform:rotateY(180deg) scale(1.08)} 100%{transform:rotateY(180deg) scale(1)} }
  #level-intro { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:800; background:rgba(15,25,50,.85); border-radius:12px; z-index:5; }
  #level-intro.hidden { display:none; }
  /* --- 캐릭터 팝업 --- */
  #char-pop { position:fixed; left:50%; bottom:0; transform:translate(-50%,110%); transition:transform .25s ease-out; display:flex; align-items:flex-end; gap:8px; z-index:15; pointer-events:none; }
  #char-pop.show { transform:translate(-50%,6%); }
  #pop-img { width:110px; height:140px; object-fit:contain; }
  #pop-bubble { background:#fff; color:#222; border-radius:12px; padding:8px 12px; font-size:.92rem; margin-bottom:36px; max-width:200px; text-align:left; }
  /* --- 별 --- */
  #clear-stars, #total-stars { font-size:2.2rem; letter-spacing:6px; color:#ffd94f; }
  #record-line { color:#8fd3ff; }
</style>
</head>
<body>
  <button id="btn-sound" aria-label="소리 끄기/켜기">🔊</button>

  <div id="screen-start" class="screen active">
    <h1>다락방 짝꿍 찾기</h1>
    <div class="preview">
      <img src="/cards/img/luka.png" alt="루카"><img src="/cards/img/luna.png" alt="루나"><img src="/cards/img/nova.png" alt="노바"><img src="/cards/img/pureum.png" alt="푸름이"><img src="/cards/img/ruric.png" alt="루릭"><img src="/cards/img/jujuya.png" alt="주주야">
    </div>
    <div>3개의 레벨, 6명의 짝꿍!<br>같은 캐릭터 카드를 찾아주세요</div>
    <div id="best-line">최고 기록: -</div>
    <button id="btn-start" class="btn">시작!</button>
  </div>

  <div id="screen-play" class="screen">
    <div id="hud"><span id="level-label">레벨 1</span><span id="clock">0.0초</span></div>
    <div id="time-bar-wrap" class="hidden"><div id="time-bar"></div></div>
    <div id="board">
      <div id="level-intro" class="hidden">레벨 1</div>
    </div>
  </div>

  <div id="screen-clear" class="screen">
    <h2 id="clear-title">레벨 1 클리어!</h2>
    <div id="clear-stars">★★★</div>
    <div id="clear-time"></div>
    <button id="btn-next" class="btn">다음 레벨</button>
  </div>

  <div id="screen-timeout" class="screen">
    <h2>시간 초과!</h2>
    <div>루릭: ...다시 함?</div>
    <button id="btn-retry-l3" class="btn">재도전</button>
  </div>

  <div id="screen-result" class="screen">
    <h2>다락방 클리어!</h2>
    <div class="preview">
      <img src="/cards/img/luka.png" alt="루카"><img src="/cards/img/luna.png" alt="루나"><img src="/cards/img/nova.png" alt="노바"><img src="/cards/img/pureum.png" alt="푸름이"><img src="/cards/img/ruric.png" alt="루릭"><img src="/cards/img/jujuya.png" alt="주주야">
    </div>
    <div id="total-stars"></div>
    <div id="record-line"></div>
    <div class="result-btns">
      <button id="btn-share" class="btn btn-sub">공유하기</button>
      <button id="btn-again" class="btn">다시하기</button>
    </div>
  </div>

  <div id="char-pop"><img id="pop-img" src="/cards/img/ruric.png" alt=""><div id="pop-bubble"></div></div>

<script>
// ===== 유틸 =====
const $ = (id) => document.getElementById(id);

// ===== 화면 전환 =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

// ===== 버튼 (Task 3에서 게임 로직으로 교체) =====
$('btn-start').addEventListener('click', () => showScreen('play'));
$('btn-next').addEventListener('click', () => showScreen('result'));
$('btn-retry-l3').addEventListener('click', () => showScreen('play'));
$('btn-again').addEventListener('click', () => showScreen('start'));
</script>
</body>
</html>
```

- [ ] **Step 2: 프리뷰 검증**

1. `preview_start` name "game" (이미 실행 중이면 재사용) → `preview_eval`로 `window.location.href='http://localhost:3457/cards/'` 이동.
2. `preview_snapshot`: 시작 화면 — 타이틀, 6명 미리보기 이미지, 시작 버튼.
3. `preview_click` `#btn-start` → 플레이 화면 전환. `#btn-sound` 존재 확인.
4. `preview_console_logs` (error) 0건, `preview_network` (failed) 0건 — 이미지 6장 정상 로드.

---

### Task 3: 카드 로직 (덱·뒤집기·매치·레벨 진행)

**Files:**
- Modify: `landing/cards/index.html` (`<script>` 내용 전체 교체)

**Interfaces:**
- Consumes: Task 2의 DOM id
- Produces: `CHARS`(6종 `{id,name,img,lines}`), `LEVELS`, `state`, `shuffle(arr)`, `buildDeck(levelIdx)`, `startLevel(idx)`, `renderBoard()`, `onCardTap(idx)`, `resolvePair()`, `levelClear()`, `calcStars(levelIdx, ms)`, `startRun()`, `finishGame()`, `popup(charId, line)`(Task 5에서 구현 — 여기선 빈 함수), `sfxFlip/sfxMatch/sfxMiss/sfxClear/sfxTimeout/sfxRecord`(빈 함수 스텁, Task 5에서 구현), `ruricMissCheck()`

- [ ] **Step 1: `<script>` 내용 전체를 아래로 교체**

```javascript
// ===== 유틸 =====
const $ = (id) => document.getElementById(id);

// ===== 데이터 =====
const CHARS = [
  { id:'luka',   name:'루카',   img:'/cards/img/luka.png',   lines:['좋아, 바로 그거야!','역시 우리 팀!','다음 것도 찾아보자!'] },
  { id:'luna',   name:'루나',   img:'/cards/img/luna.png',   lines:['왜 우리가 닮았는지 알아?','짝이란 건 참 신기해','좋은 발견이야'] },
  { id:'nova',   name:'노바',   img:'/cards/img/nova.png',   lines:['예측대로네요','확률적으로 완벽한 선택','데이터가 맞다고 하네요'] },
  { id:'pureum', name:'푸름이', img:'/cards/img/pureum.png', lines:['매치 확인 완료','정상 처리됐어요','그거 자동화하면 되잖아?'] },
  { id:'ruric',  name:'루릭',   img:'/cards/img/ruric.png',  lines:['...쉽네','나쁘지 않음','그건 나임'] },
  { id:'jujuya', name:'주주야', img:'/cards/img/jujuya.png', lines:['짝꿍 찾았어요!','체크! 실행!','함께라서 더 힘이 돼!'] },
];
const LEVELS = [
  { pairs:3, cols:2, timeLimit:0,     stars:[15000, 25000] },
  { pairs:6, cols:3, timeLimit:0,     stars:[40000, 60000] },
  { pairs:6, cols:3, timeLimit:45000, stars:[25000, 35000] },
];

// ===== 상태 =====
const state = {
  phase: 'start',      // start | intro | playing | clear | timeout | result
  level: 0,            // 0..2
  deck: [],            // [{ charId, matched }]
  open: [],            // 뒤집힌 카드 인덱스 (최대 2)
  lock: false,         // 불일치 되뒤집힘 대기
  matchedPairs: 0,
  missStreak: 0,
  levelStart: 0,
  levelStars: [0, 0, 0],
  l3time: 0,
  rafId: 0,
};

// ===== 순수 로직 =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function buildDeck(levelIdx) {
  const pool = shuffle(CHARS.map(c => c.id)).slice(0, LEVELS[levelIdx].pairs);
  return shuffle(pool.concat(pool)).map(id => ({ charId: id, matched: false }));
}
function calcStars(levelIdx, ms) {
  const [s3, s2] = LEVELS[levelIdx].stars;
  return ms <= s3 ? 3 : ms <= s2 ? 2 : 1;
}
function charById(id) { return CHARS.find(c => c.id === id); }

// ===== 화면 전환 =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

// ===== 스텁 (Task 5에서 구현) =====
function popup(charId, line) {}
function ruricMissCheck() {}
function ensureAudio() {}
function sfxFlip() {} function sfxMatch() {} function sfxMiss() {}
function sfxClear() {} function sfxTimeout() {} function sfxRecord() {}

// ===== 게임 진행 =====
function startRun() {
  state.levelStars = [0, 0, 0];
  state.l3time = 0;
  ensureAudio();
  startLevel(0);
}

function startLevel(idx) {
  cancelAnimationFrame(state.rafId);
  state.phase = 'intro';
  state.level = idx;
  state.deck = buildDeck(idx);
  state.open = [];
  state.lock = false;
  state.matchedPairs = 0;
  state.missStreak = 0;
  $('level-label').textContent = '레벨 ' + (idx + 1);
  $('clock').textContent = '0.0초';
  $('time-bar-wrap').classList.toggle('hidden', LEVELS[idx].timeLimit === 0);
  $('time-bar').style.width = '100%';
  showScreen('play');
  renderBoard();
  const intro = $('level-intro');
  intro.textContent = '레벨 ' + (idx + 1);
  intro.classList.remove('hidden');
  setTimeout(() => {
    intro.classList.add('hidden');
    state.phase = 'playing';
    state.levelStart = performance.now();
    state.rafId = requestAnimationFrame(tick);
  }, 1000);
}

function renderBoard() {
  const board = $('board');
  board.style.gridTemplateColumns = 'repeat(' + LEVELS[state.level].cols + ', 1fr)';
  board.querySelectorAll('.card').forEach(el => el.remove());
  state.deck.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.i = i;
    el.innerHTML = '<div class="card-inner">' +
      '<div class="card-face card-back"><div class="roof"></div><div class="q">?</div></div>' +
      '<div class="card-face card-front"><img src="' + charById(card.charId).img + '" alt=""></div>' +
      '</div>';
    board.appendChild(el);
  });
}

function onCardTap(i) {
  if (state.phase !== 'playing' || state.lock) return;
  const card = state.deck[i];
  if (!card || card.matched || state.open.includes(i)) return;
  state.open.push(i);
  cardEl(i).classList.add('open');
  sfxFlip();
  if (state.open.length === 2) resolvePair();
}

function cardEl(i) { return $('board').querySelector('.card[data-i="' + i + '"]'); }

function resolvePair() {
  const [a, b] = state.open;
  if (state.deck[a].charId === state.deck[b].charId) {
    state.deck[a].matched = true;
    state.deck[b].matched = true;
    cardEl(a).classList.add('matched');
    cardEl(b).classList.add('matched');
    state.open = [];
    state.matchedPairs += 1;
    state.missStreak = 0;
    const ch = charById(state.deck[a].charId);
    popup(ch.id, ch.lines[Math.floor(Math.random() * ch.lines.length)]);
    sfxMatch();
    if (state.matchedPairs === LEVELS[state.level].pairs) levelClear();
  } else {
    state.lock = true;
    state.missStreak += 1;
    sfxMiss();
    ruricMissCheck();
    setTimeout(() => {
      cardEl(a).classList.remove('open');
      cardEl(b).classList.remove('open');
      state.open = [];
      state.lock = false;
    }, 800);
  }
}

function tick(now) {
  if (state.phase !== 'playing') return;
  const elapsed = now - state.levelStart;
  $('clock').textContent = (elapsed / 1000).toFixed(1) + '초';
  const limit = LEVELS[state.level].timeLimit;
  if (limit > 0) {
    const remain = limit - elapsed;
    $('time-bar').style.width = Math.max(0, remain / limit * 100) + '%';
    if (remain <= 0) {
      state.phase = 'timeout';
      cancelAnimationFrame(state.rafId);
      sfxTimeout();
      showScreen('timeout');
      return;
    }
  }
  state.rafId = requestAnimationFrame(tick);
}

function levelClear() {
  const elapsed = performance.now() - state.levelStart;
  state.phase = 'clear';
  cancelAnimationFrame(state.rafId);
  const stars = calcStars(state.level, elapsed);
  state.levelStars[state.level] = stars;
  if (state.level === 2) {
    state.l3time = Math.round(elapsed);
    finishGame();
    return;
  }
  $('clear-title').textContent = '레벨 ' + (state.level + 1) + ' 클리어!';
  $('clear-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('clear-time').textContent = (elapsed / 1000).toFixed(1) + '초';
  sfxClear();
  showScreen('clear');
}

function finishGame() {
  state.phase = 'result';
  const total = state.levelStars[0] + state.levelStars[1] + state.levelStars[2];
  $('total-stars').textContent = '★'.repeat(total > 9 ? 9 : total) + ' (' + total + '/9)';
  $('record-line').textContent = '';
  sfxClear();
  showScreen('result');
}

// ===== 입력 =====
$('board').addEventListener('click', (e) => {
  const el = e.target.closest('.card');
  if (el) onCardTap(Number(el.dataset.i));
});

// ===== 버튼 =====
$('btn-start').addEventListener('click', startRun);
$('btn-next').addEventListener('click', () => startLevel(state.level + 1));
$('btn-retry-l3').addEventListener('click', () => startLevel(2));
$('btn-again').addEventListener('click', startRun);
```

- [ ] **Step 2: 순수 로직 검증 (preview_eval)**

새로고침 후:

```javascript
(() => {
  const deck = buildDeck(0);
  const counts = {};
  deck.forEach(c => counts[c.charId] = (counts[c.charId] || 0) + 1);
  return JSON.stringify({
    len6: deck.length === 6,
    allPairs: Object.values(counts).every(n => n === 2),
    kinds: Object.keys(counts).length,
    deck12: buildDeck(1).length === 12,
    stars: [calcStars(0, 14999), calcStars(0, 15000), calcStars(0, 20000), calcStars(0, 25001), calcStars(2, 25000), calcStars(2, 35000), calcStars(2, 44000)],
  });
})()
```

Expected: `{"len6":true,"allPairs":true,"kinds":3,"deck12":true,"stars":[3,3,2,1,3,2,1]}`

- [ ] **Step 3: 매치/불일치 플로우 검증 (preview_eval)**

```javascript
(async () => {
  startRun();
  await new Promise(r => setTimeout(r, 1100));            // 인트로 대기
  // 덱을 알고 있는 상태에서 첫 카드와 그 짝을 찾아 탭
  const first = state.deck[0].charId;
  const mate = state.deck.findIndex((c, i) => i !== 0 && c.charId === first);
  onCardTap(0); onCardTap(mate);
  const afterMatch = { matched: state.matchedPairs, streak: state.missStreak };
  // 불일치 쌍 탭
  const restA = state.deck.findIndex(c => !c.matched);
  const restB = state.deck.findIndex((c, i) => !c.matched && i !== restA && c.charId !== state.deck[restA].charId);
  onCardTap(restA); onCardTap(restB);
  const locked = state.lock === true;
  const ignored = (() => { onCardTap(state.deck.findIndex((c,i) => !c.matched && i!==restA && i!==restB)); return state.open.length === 2; })();
  await new Promise(r => setTimeout(r, 900));              // 되뒤집힘 대기
  return JSON.stringify({ afterMatch, locked, ignored, unlocked: !state.lock, openCleared: state.open.length === 0, missStreak: state.missStreak });
})()
```

Expected: `{"afterMatch":{"matched":1,"streak":0},"locked":true,"ignored":true,"unlocked":true,"openCleared":true,"missStreak":1}`

- [ ] **Step 4: 레벨 클리어 전체 흐름 검증 (preview_eval)**

```javascript
(async () => {
  startLevel(0);
  await new Promise(r => setTimeout(r, 1100));
  // 모든 쌍을 순서대로 매치
  while (state.matchedPairs < 3) {
    const i = state.deck.findIndex(c => !c.matched);
    const j = state.deck.findIndex((c, k) => !c.matched && k !== i && c.charId === state.deck[i].charId);
    onCardTap(i); onCardTap(j);
  }
  return JSON.stringify({
    phase: state.phase,
    clearShown: $('screen-clear').classList.contains('active'),
    stars: state.levelStars[0] >= 1 && state.levelStars[0] <= 3,
  });
})()
```

Expected: `{"phase":"clear","clearShown":true,"stars":true}` (1초 인트로+즉시 매치 → 15초 이내라 실제로는 ★3)

- [ ] **Step 5: 레벨 2→3 진행과 타임아웃 검증 (preview_eval)**

```javascript
(async () => {
  startLevel(2);
  await new Promise(r => setTimeout(r, 1100));
  state.levelStart = performance.now() - 46000;   // 46초 경과로 조작
  await new Promise(r => setTimeout(r, 100));      // tick 한 프레임
  return JSON.stringify({ phase: state.phase, timeoutShown: $('screen-timeout').classList.contains('active') });
})()
```

Expected: `{"phase":"timeout","timeoutShown":true}`. 이후 `preview_click` `#btn-retry-l3` → 레벨 3 재시작(인트로 "레벨 3" 표시) 확인.

---

### Task 4: 별점 결과 화면 + 신기록 저장

**Files:**
- Modify: `landing/cards/index.html` (`finishGame` 교체, 최고기록 로드 추가)

**Interfaces:**
- Consumes: Task 3의 `state`, `finishGame`, DOM id `total-stars`, `record-line`, `best-line`
- Produces: `loadBest()` → `{stars, l3time}`, `renderBest()`, localStorage 키 `attic-cards-best`

- [ ] **Step 1: 최고기록 코드 추가**

`// ===== 입력 =====` 바로 위에 추가:

```javascript
// ===== 최고 기록 =====
const BEST_KEY = 'attic-cards-best';
function loadBest() {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY));
    if (v && typeof v.stars === 'number') return v;
  } catch (e) {}
  return { stars: 0, l3time: 0 };
}
function renderBest() {
  const b = loadBest();
  $('best-line').textContent = b.stars > 0
    ? '최고 기록: ★' + b.stars + '/9 · 레벨3 ' + (b.l3time / 1000).toFixed(1) + '초'
    : '최고 기록: -';
}
renderBest();
```

- [ ] **Step 2: `finishGame` 전체 교체**

```javascript
function finishGame() {
  state.phase = 'result';
  const total = state.levelStars[0] + state.levelStars[1] + state.levelStars[2];
  const best = loadBest();
  const isRecord = total > best.stars || (total === best.stars && state.l3time < best.l3time);
  if (isRecord) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify({ stars: total, l3time: state.l3time })); } catch (e) {}
    sfxRecord();
  }
  $('total-stars').textContent = '★'.repeat(total) + '☆'.repeat(9 - total);
  $('record-line').textContent = isRecord ? '신기록! 푸름이가 기록을 저장했어요' : '총 별 ' + total + '/9';
  renderBest();
  sfxClear();
  showScreen('result');
}
```

- [ ] **Step 3: 신기록 흐름 검증 (preview_eval)**

```javascript
(async () => {
  localStorage.removeItem('attic-cards-best');
  state.levelStars = [3, 2, 0];
  state.level = 2; state.l3time = 30000;
  state.levelStars[2] = 3;
  finishGame();
  const first = { best: loadBest(), line: $('record-line').textContent.includes('신기록') };
  state.levelStars = [1, 1, 1]; state.l3time = 40000;
  finishGame();
  const second = { best: loadBest().stars, line: $('record-line').textContent.includes('신기록') };
  localStorage.removeItem('attic-cards-best');
  return JSON.stringify([first, second]);
})()
```

Expected: `[{"best":{"stars":8,"l3time":30000},"line":true},{"best":8,"line":false}]`

- [ ] **Step 4: localStorage 예외 경로 검증 (preview_eval)**

```javascript
(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function() { throw new Error('quota'); };
  state.levelStars = [3, 3, 3]; state.l3time = 20000;
  finishGame();
  Storage.prototype.setItem = orig;
  return JSON.stringify({ resultShown: $('screen-result').classList.contains('active') });
})()
```

Expected: `{"resultShown":true}`

---

### Task 5: 캐릭터 팝업·대사 + 루릭 미스 리액션 + 사운드 + 공유

**Files:**
- Modify: `landing/cards/index.html` (스텁 함수들을 실제 구현으로 교체, 공유 버튼 연결)

**Interfaces:**
- Consumes: Task 3의 스텁 시그니처(`popup`, `ruricMissCheck`, `ensureAudio`, `sfx*`), DOM id `char-pop`, `pop-img`, `pop-bubble`, `btn-share`, `btn-sound`
- Produces: 완성된 게임

- [ ] **Step 1: 스텁 블록(`// ===== 스텁 (Task 5에서 구현) =====`부터 `function sfxClear() {} function sfxTimeout() {} function sfxRecord() {}`까지)을 아래로 교체**

```javascript
// ===== 캐릭터 팝업 =====
let popTimer = 0;
function popup(charId, line) {
  const ch = charById(charId);
  $('pop-img').src = ch.img;
  $('pop-bubble').textContent = ch.name + ': ' + line;
  const pop = $('char-pop');
  pop.classList.remove('show');
  void pop.offsetWidth;
  pop.classList.add('show');
  clearTimeout(popTimer);
  popTimer = setTimeout(() => pop.classList.remove('show'), 900);
}
function ruricMissCheck() {
  if (state.missStreak >= 3) {
    popup('ruric', '...집중 안 함?');
    state.missStreak = 0;
  }
}

// ===== 사운드 (Web Audio, 외부 파일 없음) =====
let audioCtx = null;
let soundOn = true;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq, dur, type, gain, delay) {
  if (!audioCtx || !soundOn) return;
  const t = audioCtx.currentTime + (delay || 0);
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur);
}
function sfxFlip() { beep(520, 0.06, 'square', 0.08, 0); }
function sfxMatch() { beep(660, 0.1, 'triangle', 0.14, 0); beep(990, 0.12, 'triangle', 0.12, 0.09); }
function sfxMiss() { beep(160, 0.15, 'sawtooth', 0.1, 0); }
function sfxClear() { [523, 659, 784].forEach((f, i) => beep(f, 0.13, 'triangle', 0.14, i * 0.1)); }
function sfxTimeout() { beep(220, 0.25, 'sawtooth', 0.13, 0); beep(140, 0.35, 'sawtooth', 0.13, 0.2); }
function sfxRecord() { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.15, 'triangle', 0.15, i * 0.12)); }
$('btn-sound').addEventListener('click', () => {
  soundOn = !soundOn;
  $('btn-sound').textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) { ensureAudio(); beep(660, 0.08, 'square', 0.1, 0); }
});

// ===== 공유 =====
$('btn-share').addEventListener('click', async () => {
  const total = state.levelStars[0] + state.levelStars[1] + state.levelStars[2];
  const text = '다락방 짝꿍 찾기에서 별 ' + total + '개 획득! 도전해볼래?';
  const url = 'https://vaulted-bus-346411.web.app/cards';
  if (navigator.share) {
    try { await navigator.share({ title: '다락방 짝꿍 찾기', text: text, url: url }); } catch (e) {}
  } else {
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      const b = $('btn-share');
      b.textContent = '복사됨!';
      setTimeout(() => { b.textContent = '공유하기'; }, 1500);
    } catch (e) {}
  }
});
```

- [ ] **Step 2: 팝업·대사 검증 (preview_eval)**

새로고침 후:

```javascript
(() => {
  popup('jujuya', '짝꿍 찾았어요!');
  const shown = $('char-pop').classList.contains('show');
  const text = $('pop-bubble').textContent;
  const img = $('pop-img').getAttribute('src');
  state.missStreak = 3; ruricMissCheck();
  const ruric = $('pop-bubble').textContent;
  return JSON.stringify({ shown, text, img, ruric, streakReset: state.missStreak === 0 });
})()
```

Expected: `{"shown":true,"text":"주주야: 짝꿍 찾았어요!","img":"/cards/img/jujuya.png","ruric":"루릭: ...집중 안 함?","streakReset":true}`

- [ ] **Step 3: 매치 시 팝업 연동 검증 (preview_eval)**

```javascript
(async () => {
  startRun();
  await new Promise(r => setTimeout(r, 1100));
  const first = state.deck[0].charId;
  const mate = state.deck.findIndex((c, i) => i !== 0 && c.charId === first);
  onCardTap(0); onCardTap(mate);
  const name = charById(first).name;
  return JSON.stringify({ popShown: $('char-pop').classList.contains('show'), startsWithName: $('pop-bubble').textContent.startsWith(name + ': ') });
})()
```

Expected: `{"popShown":true,"startsWithName":true}`

- [ ] **Step 4: 사운드 토글 + 콘솔 확인**

`preview_eval`: `$('btn-sound').click()` 후 textContent `🔇`, 다시 클릭 → `🔊`. `preview_console_logs` (error) 0건.

---

### Task 6: 모바일 검증 + 전체 흐름 통합 확인

**Files:**
- Modify: `landing/cards/index.html` (발견된 문제만 최소 수정)

**Interfaces:**
- Consumes: 완성된 게임
- Produces: 배포 준비 완료 상태

- [ ] **Step 1: 모바일 레이아웃 (375×812)**

`preview_resize` mobile → 새로고침 → 시작 화면 스냅샷(6명 미리보기·버튼 잘림 없음) → 시작 클릭 → 레벨 1 보드(2열 6장) 카드가 화면 안에 모두 보이는지 확인. `preview_eval`로 레벨 2 진입(`startLevel(1)`) 후 3열 12장 보드가 세로로 잘리지 않는지 bounding rect 확인:

```javascript
(async () => {
  startLevel(1);
  await new Promise(r => setTimeout(r, 1100));
  const cards = [...document.querySelectorAll('.card')];
  const last = cards[cards.length - 1].getBoundingClientRect();
  return JSON.stringify({ count: cards.length, lastBottom: Math.round(last.bottom), vh: window.innerHeight, fits: last.bottom <= window.innerHeight });
})()
```

Expected: `count` 12, `fits` true. false면 카드 크기/보드 max-width를 CSS에서 조정(`#board { max-width:390px }` 또는 gap 축소) 후 재확인.

- [ ] **Step 2: 전체 3레벨 통합 플레이 (preview_eval 자동 진행)**

```javascript
(async () => {
  const clearLevel = async () => {
    while (state.phase !== 'playing') await new Promise(r => setTimeout(r, 200));
    while (state.matchedPairs < LEVELS[state.level].pairs) {
      const i = state.deck.findIndex(c => !c.matched);
      const j = state.deck.findIndex((c, k) => !c.matched && k !== i && c.charId === state.deck[i].charId);
      onCardTap(i); onCardTap(j);
      await new Promise(r => setTimeout(r, 50));
    }
  };
  localStorage.removeItem('attic-cards-best');
  startRun();
  await clearLevel();                                   // L1
  document.getElementById('btn-next').click();
  await clearLevel();                                   // L2
  document.getElementById('btn-next').click();
  await clearLevel();                                   // L3 → finishGame
  await new Promise(r => setTimeout(r, 300));
  const out = {
    resultShown: document.getElementById('screen-result').classList.contains('active'),
    totalStars: state.levelStars[0] + state.levelStars[1] + state.levelStars[2],
    record: document.getElementById('record-line').textContent.includes('신기록'),
    bestSaved: loadBest().stars > 0,
  };
  localStorage.removeItem('attic-cards-best');
  return JSON.stringify(out);
})()
```

Expected: `{"resultShown":true,"totalStars":9,"record":true,"bestSaved":true}` (즉시 매치라 전 레벨 ★3)

- [ ] **Step 3: 콘솔/네트워크 최종 점검**

`preview_console_logs` (error) 0건, `preview_network` (failed) 0건 (이미지 6장 + og 미리보기 없음 확인 — og.png는 페이지에서 로드하지 않으므로 요청 자체가 없어야 정상).

- [ ] **Step 4: 데스크톱 복귀**

`preview_resize` desktop. 이후 컨트롤러가 사용자에게 결과 보고 + 배포 여부 확인.
