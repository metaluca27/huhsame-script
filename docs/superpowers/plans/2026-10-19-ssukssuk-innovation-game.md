# 「쑥쑥! 혁신제품」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조달청 AI 게임 공모전 출품용 합체 퍼즐 「쑥쑥! 혁신제품」을 만들어 웹(/ssukssuk)에 배포하고, 오프라인 실행 ZIP과 시연영상 재료를 준비한다.

**Architecture:** 다락방 합체(`landing/merge/`)를 복사해 새 폴더 `landing/ssukssuk/`로 만든다. 순수 계산(`ssuk-core.js`)과 저장(`ssuk-store.js`)은 Node 테스트로 검증하고, 물리·렌더(`ssuk-game.js`)와 화면(`ssuk-ui.js`)은 브라우저에서 확인한다. 모든 경로는 상대 경로이고 물리엔진은 로컬 사본이라, ZIP을 풀어 `index.html`을 더블클릭해도 동작한다.

**Tech Stack:** 바닐라 JS(ES5 스타일, 기존 코드와 동일), Matter.js 0.20.0, Node `node:test`, Python Pillow(이미지 후처리), Higgsfield CLI(Nano Banana 2), Firebase Hosting.

**Spec:** `docs/superpowers/specs/2026-10-19-ssukssuk-innovation-game-design.md`

---

## File Structure

| 파일 | 책임 |
|---|---|
| `landing/ssukssuk/ssuk-core.js` | 11단계 데이터(이름·이모지·이미지·색·크기·점수·도감 문구) + 점수 계산 순수 함수. 브라우저 전역 `SsukCore` / Node `module.exports` |
| `landing/ssukssuk/ssuk-core.test.mjs` | core 테스트 |
| `landing/ssukssuk/ssuk-store.js` | 최고 점수·모은 카드·소리 설정 저장. 저장소 실패 시 메모리로 대체. 전역 `SsukStore` / Node `{createStore}` |
| `landing/ssukssuk/ssuk-store.test.mjs` | store 테스트 |
| `landing/ssukssuk/ssuk-game.js` | Matter.js 물리·합체·게임오버·렌더·파티클·소리 + 일시정지. 전역 `SsukGame` |
| `landing/ssukssuk/ssuk-ui.js` | 시작·플레이·도감 카드 팝업·결과·도감 화면. 전역 `SsukUI` |
| `landing/ssukssuk/index.html` | 화면 뼈대·스타일·스크립트 로드(상대 경로) |
| `landing/ssukssuk/vendor/matter.min.js`, `vendor/LICENSE-matter-js.txt` | 물리엔진 로컬 사본 + MIT 라이선스 |
| `landing/ssukssuk/img/stage01.png`~`stage11.png` | 원형 배지 11장 (먼저 임시 그림, 나중에 진짜 그림으로 교체) |
| `docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_placeholder_badges.py` | 임시 배지 생성 |
| `docs/공모전/조달청_AI게임콘텐츠_2026/tools/badge_prompts.json` | 11단계 그림 프롬프트 |
| `docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_badges.py` | 생성 그림 → 원형 투명 PNG 512px |
| `docs/공모전/조달청_AI게임콘텐츠_2026/tools/pack_zip.py` | 제출 ZIP 만들기 + 외부 주소 검사 |
| `firebase.json` | `/ssukssuk/**` JS 캐시 끄기 헤더 추가 |

---

### Task 1: 폴더 만들기 + 물리엔진 로컬 사본

**Files:**
- Create: `landing/ssukssuk/vendor/matter.min.js`
- Create: `landing/ssukssuk/vendor/LICENSE-matter-js.txt`

- [ ] **Step 1: 루카에게 다운로드 허락 받기**

다운로드할 파일 2개를 알리고 허락을 받는다(안전 규칙: 파일 다운로드는 명시적 허락 필요).
- `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js` (약 80KB, 다락방 합체가 이미 쓰는 같은 파일)
- `https://raw.githubusercontent.com/liabru/matter-js/0.20.0/LICENSE` (MIT 라이선스 원문, 1KB)

- [ ] **Step 2: 받기**

```bash
mkdir -p landing/ssukssuk/vendor landing/ssukssuk/img
curl -sL -o landing/ssukssuk/vendor/matter.min.js https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js
curl -sL -o landing/ssukssuk/vendor/LICENSE-matter-js.txt https://raw.githubusercontent.com/liabru/matter-js/0.20.0/LICENSE
head -c 120 landing/ssukssuk/vendor/matter.min.js; echo; head -3 landing/ssukssuk/vendor/LICENSE-matter-js.txt
```
Expected: 첫 줄에 `matter-js 0.20.0` 주석, 라이선스 첫 줄 `The MIT License (MIT)`

- [ ] **Step 3: Commit**

```bash
git add landing/ssukssuk/vendor
git commit -m "쑥쑥 혁신제품: 물리엔진(Matter.js 0.20.0) 로컬 사본과 MIT 라이선스 추가"
```

---

### Task 2: ssuk-core.js (단계 데이터 + 점수)

**Files:**
- Create: `landing/ssukssuk/ssuk-core.js`
- Test: `landing/ssukssuk/ssuk-core.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`landing/ssukssuk/ssuk-core.test.mjs`:
```js
// landing/ssukssuk/ssuk-core.test.mjs — 순수 계산·데이터 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('./ssuk-core.js');

test('STAGES는 11단계, 지름과 점수가 단조 증가', () => {
  assert.equal(core.STAGES.length, 11);
  for (let i = 1; i < 11; i++) {
    assert.ok(core.STAGES[i].diamPct > core.STAGES[i - 1].diamPct, 'diam ' + i);
    assert.ok(core.STAGES[i].score > core.STAGES[i - 1].score, 'score ' + i);
  }
  assert.equal(core.STAGES[0].key, 'idea');
  assert.equal(core.STAGES[5].key, 'innovation');
  assert.equal(core.STAGES[10].key, 'k-champion');
});

test('모든 단계에 이름·이모지·색·도감 문구·상대경로 이미지가 있고 key가 겹치지 않음', () => {
  const keys = new Set();
  core.STAGES.forEach((s, i) => {
    assert.ok(s.name && s.name.length <= 14, 'name ' + i);
    assert.ok(s.emoji, 'emoji ' + i);
    assert.match(s.color, /^#[0-9A-F]{6}$/i, 'color ' + i);
    assert.ok(s.card && s.card.length >= 10 && s.card.length <= 90, 'card ' + i + ' len ' + (s.card || '').length);
    assert.equal(s.img, './img/stage' + String(i + 1).padStart(2, '0') + '.png');
    assert.ok(!keys.has(s.key), 'dup ' + s.key); keys.add(s.key);
  });
});

test('단계 점수는 삼각수', () => {
  assert.deepEqual(core.STAGES.map(s => s.score), [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
  assert.equal(core.stageScore(5), 21);
});

test('반지름: 통 폭 360에서 1단계 14.4, 11단계 81', () => {
  assert.equal(core.radiusFor(0, 360), 14.4);
  assert.equal(core.radiusFor(10, 360), 81);
});

test('콤보 배율: 1→1, 2→1.25, 5→2, 9 이상→3 고정', () => {
  assert.equal(core.comboMultiplier(1), 1);
  assert.equal(core.comboMultiplier(2), 1.25);
  assert.equal(core.comboMultiplier(5), 2);
  assert.equal(core.comboMultiplier(9), 3);
  assert.equal(core.comboMultiplier(30), 3);
});

test('합체 점수는 단계점수×배율 내림', () => {
  assert.equal(core.mergePoints(0, 1), 1);
  assert.equal(core.mergePoints(2, 2), 7);
  assert.equal(core.mergePoints(10, 20), 198);
});

test('낙하 단계 가중치: 0~4단계만, 구간 경계 확인', () => {
  assert.equal(core.pickDropStage(0), 0);
  assert.equal(core.pickDropStage(0.299), 0);
  assert.equal(core.pickDropStage(0.30), 1);
  assert.equal(core.pickDropStage(0.55), 2);
  assert.equal(core.pickDropStage(0.75), 3);
  assert.equal(core.pickDropStage(0.90), 4);
  assert.equal(core.pickDropStage(0.999), 4);
});

test('highestStage: 발견 배열에서 가장 높은 단계 번호, 없으면 0', () => {
  assert.equal(core.highestStage([true, true, false, true, false, false, false, false, false, false, false]), 3);
  assert.equal(core.highestStage(new Array(11).fill(false)), 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test landing/ssukssuk/ssuk-core.test.mjs`
Expected: FAIL — `Cannot find module './ssuk-core.js'`

- [ ] **Step 3: 구현**

`landing/ssukssuk/ssuk-core.js`:
```js
// landing/ssukssuk/ssuk-core.js
// 쑥쑥! 혁신제품 — 순수 계산·데이터 모듈. 브라우저(전역 SsukCore)와 Node(module.exports) 공용.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SsukCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // index 0 = 1단계. diamPct = 통 안쪽 폭 대비 지름 %, score = 이 단계 둘이 합쳐질 때 기본 점수(삼각수).
  // card = 도감 카드 "알쓸조달" 문구 (근거: 설계서 3절, 2026-10 기사)
  var STAGES = [
    { key: 'idea',        name: '아이디어',          emoji: '💡', color: '#FFE27A', img: './img/stage01.png', diamPct: 8,  score: 1,
      card: '모든 혁신은 작은 생각 하나에서 시작해요.' },
    { key: 'blueprint',   name: '설계도',            emoji: '📝', color: '#9AD0FF', img: './img/stage02.png', diamPct: 11, score: 3,
      card: '생각을 그림과 숫자로 옮기면 만들 수 있는 계획이 돼요.' },
    { key: 'prototype',   name: '시제품',            emoji: '🔧', color: '#FFB37A', img: './img/stage03.png', diamPct: 14, score: 6,
      card: '처음 만든 물건이에요. 조달청은 뛰어난 시제품을 \'혁신시제품\'으로 뽑아 공공기관이 써 보게 도와요.' },
    { key: 'certified',   name: '시험·인증',          emoji: '🧪', color: '#B6E3A8', img: './img/stage04.png', diamPct: 17, score: 10,
      card: '안전하고 품질이 좋은지 꼼꼼히 검증받아요. 믿고 쓸 수 있어야 공공기관이 살 수 있어요.' },
    { key: 'product',     name: '우리 동네 기업 제품', emoji: '🏭', color: '#C9B6FF', img: './img/stage05.png', diamPct: 21, score: 15,
      card: '중소기업이 만든 진짜 제품이 탄생했어요!' },
    { key: 'innovation',  name: '혁신제품 지정',      emoji: '⭐', color: '#FFD34D', img: './img/stage06.png', diamPct: 25, score: 21,
      card: '조달청이 기술력을 인정하면 혁신제품이 돼요. 공공기관이 입찰 없이 바로 살 수 있어요(3년, 최대 6년).' },
    { key: 'naramarket',  name: '나라장터 등록',      emoji: '🛒', color: '#5EC8C8', img: './img/stage07.png', diamPct: 29, score: 28,
      card: '나라장터는 공공기관이 물건을 사는 온라인 장터예요. 7만여 공공기관과 60만여 기업이 이용해요.' },
    { key: 'pilot',       name: '첫 공공 납품',       emoji: '🏫', color: '#FF9AA2', img: './img/stage08.png', diamPct: 33, score: 36,
      card: '시범구매: 조달청이 혁신제품을 사서 학교·병원·소방서에 주면, 현장에서 직접 써 보며 성능을 확인해요.' },
    { key: 'nationwide',  name: '전국 공공기관으로',   emoji: '🏢', color: '#6FA8FF', img: './img/stage09.png', diamPct: 37, score: 45,
      card: '검증된 제품은 전국 공공기관으로 퍼져요. 우리나라 공공구매는 한 해 238조 원 규모예요.' },
    { key: 'export',      name: '해외 수출',          emoji: '🌏', color: '#7ED6A5', img: './img/stage10.png', diamPct: 41, score: 55,
      card: '조달청은 경쟁력 있는 기업을 \'G-PASS 기업\'으로 뽑아 해외 공공조달 시장 진출을 도와요.' },
    { key: 'k-champion',  name: 'K-혁신 대표기업',    emoji: '🏆', color: '#FF7A59', img: './img/stage11.png', diamPct: 45, score: 66,
      card: '작은 아이디어가 세계적인 기업이 됐어요! 공공조달은 혁신기업의 디딤돌이에요.' },
  ];

  var MERGE_CONFIG = {
    comboWindowMs: 1500,
    maxMultiplier: 3,
    legendBonus: 100,
    dangerHoldMs: 1500,
    dropLockMs: 500,
    dropWeights: [30, 25, 20, 15, 10],
  };

  function radiusFor(stageIdx, jarInnerWidth) {
    return STAGES[stageIdx].diamPct / 100 * jarInnerWidth / 2;
  }
  function stageScore(stageIdx) { return STAGES[stageIdx].score; }
  function comboMultiplier(combo) {
    var m = 1 + 0.25 * (Math.max(1, combo) - 1);
    return Math.min(MERGE_CONFIG.maxMultiplier, m);
  }
  function mergePoints(stageIdx, combo) {
    return Math.floor(stageScore(stageIdx) * comboMultiplier(combo));
  }
  function pickDropStage(rand) {
    var w = MERGE_CONFIG.dropWeights, total = 0, i;
    for (i = 0; i < w.length; i++) total += w[i];
    var x = rand * total;
    for (i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; }
    return w.length - 1;
  }
  function highestStage(discovered) {
    for (var i = discovered.length - 1; i >= 0; i--) if (discovered[i]) return i;
    return 0;
  }

  return { STAGES: STAGES, MERGE_CONFIG: MERGE_CONFIG, radiusFor: radiusFor, stageScore: stageScore,
           comboMultiplier: comboMultiplier, mergePoints: mergePoints, pickDropStage: pickDropStage,
           highestStage: highestStage };
}));
```

- [ ] **Step 4: 통과 확인**

Run: `node --test landing/ssukssuk/ssuk-core.test.mjs`
Expected: `# pass 8`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add landing/ssukssuk/ssuk-core.js landing/ssukssuk/ssuk-core.test.mjs
git commit -m "쑥쑥 혁신제품: 11단계 데이터·도감 문구·점수 계산 모듈과 테스트"
```

---

### Task 3: ssuk-store.js (저장)

**Files:**
- Create: `landing/ssukssuk/ssuk-store.js`
- Test: `landing/ssukssuk/ssuk-store.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`landing/ssukssuk/ssuk-store.test.mjs`:
```js
// landing/ssukssuk/ssuk-store.test.mjs — 저장 모듈 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createStore } = require('./ssuk-store.js');

function fakeStorage() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}
const brokenStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('처음엔 최고점수 0, 카드 없음, 소리 켜짐', () => {
  const s = createStore(fakeStorage());
  assert.equal(s.best(), 0);
  assert.deepEqual(s.cards(), []);
  assert.equal(s.soundOn(), true);
});

test('최고점수·소리 저장이 같은 저장소의 새 인스턴스에서도 유지', () => {
  const st = fakeStorage();
  const a = createStore(st); a.saveBest(1234); a.saveSound(false);
  const b = createStore(st);
  assert.equal(b.best(), 1234);
  assert.equal(b.soundOn(), false);
});

test('addCard: 새 카드면 true, 이미 있으면 false, 정렬 유지', () => {
  const s = createStore(fakeStorage());
  assert.equal(s.addCard(5), true);
  assert.equal(s.addCard(0), true);
  assert.equal(s.addCard(5), false);
  assert.deepEqual(s.cards(), [0, 5]);
  assert.equal(s.hasCard(5), true);
  assert.equal(s.hasCard(3), false);
});

test('저장소가 깨진 JSON이거나 범위 밖 값이면 무시', () => {
  const st = fakeStorage(); st.setItem('ssuk.cards', '{oops');
  assert.deepEqual(createStore(st).cards(), []);
  st.setItem('ssuk.cards', JSON.stringify([1, 99, -1, 'x', 2.5, 3]));
  assert.deepEqual(createStore(st).cards(), [1, 3]);
});

test('저장소 접근이 막혀도(시크릿 창) 같은 인스턴스 안에서는 메모리로 동작', () => {
  const s = createStore(brokenStorage);
  s.saveBest(50); s.addCard(2); s.saveSound(false);
  assert.equal(s.best(), 50);
  assert.deepEqual(s.cards(), [2]);
  assert.equal(s.soundOn(), false);
});

test('저장소가 null이어도 동작', () => {
  const s = createStore(null);
  assert.equal(s.addCard(1), true);
  assert.deepEqual(s.cards(), [1]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test landing/ssukssuk/ssuk-store.test.mjs`
Expected: FAIL — `Cannot find module './ssuk-store.js'`

- [ ] **Step 3: 구현**

`landing/ssukssuk/ssuk-store.js`:
```js
// landing/ssukssuk/ssuk-store.js — 최고 점수·모은 도감 카드·소리 설정 저장.
// localStorage가 막혀도(시크릿 창, file://) 메모리로 대체해서 게임은 계속 동작.
// 브라우저: 전역 SsukStore(바로 쓰는 인스턴스) / Node: { createStore }
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    var ls = null;
    try { ls = root.localStorage; } catch (e) { ls = null; }
    root.SsukStore = api.createStore(ls);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STAGE_COUNT = 11;

  function createStore(storage) {
    var mem = {};
    function get(k) {
      if (Object.prototype.hasOwnProperty.call(mem, k)) return mem[k];
      try { if (storage) { var v = storage.getItem(k); if (v !== null && v !== undefined) return v; } } catch (e) {}
      return null;
    }
    function set(k, v) {
      mem[k] = String(v);
      try { if (storage) storage.setItem(k, String(v)); } catch (e) {}
    }
    function cards() {
      var arr;
      try { arr = JSON.parse(get('ssuk.cards') || '[]'); } catch (e) { return []; }
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (n) { return typeof n === 'number' && n % 1 === 0 && n >= 0 && n < STAGE_COUNT; });
    }
    return {
      best: function () { return Number(get('ssuk.best') || 0); },
      saveBest: function (v) { set('ssuk.best', v); },
      cards: cards,
      hasCard: function (i) { return cards().indexOf(i) !== -1; },
      addCard: function (i) {
        var a = cards();
        if (a.indexOf(i) !== -1) return false;
        a.push(i); a.sort(function (x, y) { return x - y; });
        set('ssuk.cards', JSON.stringify(a));
        return true;
      },
      soundOn: function () { return get('ssuk.sound') !== 'off'; },
      saveSound: function (on) { set('ssuk.sound', on ? 'on' : 'off'); },
    };
  }

  return { createStore: createStore };
}));
```

- [ ] **Step 4: 통과 확인**

Run: `node --test landing/ssukssuk/ssuk-store.test.mjs`
Expected: `# pass 6`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add landing/ssukssuk/ssuk-store.js landing/ssukssuk/ssuk-store.test.mjs
git commit -m "쑥쑥 혁신제품: 최고점수·도감·소리 저장 모듈(저장소 막혀도 동작)과 테스트"
```

---

### Task 4: ssuk-game.js (물리·렌더 + 일시정지)

다락방 합체 `landing/merge/merge-game.js`를 바탕으로 바꾼 점:
- 전역 `MergeCore` → `SsukCore`, `MergeGame` → `SsukGame`
- 공 색은 `C.STAGES[i].color`
- 밝은 화면에 맞춘 통·선·글자 색
- `pause()` / `resume()` 추가 (도감 카드 볼 때 멈춤). 멈춘 동안 물리·위험 판정·낙하 정지, 재개 시 위험 타이머와 콤보 타이머를 멈춘 시간만큼 밀어줌
- 처음 도달한 단계는 **1단계 이상 모두** `onNewStage`로 알림(카드 팝업용). 슬로모션은 기존처럼 5단계(index 4) 이상만

**Files:**
- Create: `landing/ssukssuk/ssuk-game.js`

- [ ] **Step 1: 작성**

`landing/ssukssuk/ssuk-game.js`:
```js
// landing/ssukssuk/ssuk-game.js — 물리(Matter.js)·합체·게임오버·렌더·파티클·소리·일시정지. 전역 SsukGame.
// 다락방 합체(landing/merge/merge-game.js)를 바탕으로 함.
(function () {
  'use strict';
  var C = SsukCore, CFG = C.MERGE_CONFIG;
  var W = 400, H = 640, WALL = 20, INNER = W - WALL * 2; // 통 안쪽 폭 360
  var FLOOR_Y = H - WALL, DANGER_Y = 120, DROP_Y = 70;

  var images = C.STAGES.map(function (s) { var im = new Image(); im.src = s.img; return im; });
  var STAGE_COLORS = C.STAGES.map(function (s) { return s.color; });

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
  var SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17];
  function sfxMerge(stage) { beep(261.63 * Math.pow(2, SCALE_STEPS[stage] / 12), 0.16, 'triangle', 0.16, 0); }
  function sfxCombo(combo) { beep(660 + Math.min(combo, 12) * 40, 0.08, 'square', 0.08, 0); }
  function sfxFever() { [660, 880, 1100].forEach(function (f, i) { beep(f, 0.12, 'square', 0.12, i * 0.08); }); }
  function sfxDanger() { beep(70, 0.25, 'sine', 0.2, 0); }
  function sfxOver() { [392, 330, 262].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.12, i * 0.18); }); }
  function sfxDrop() { beep(200, 0.05, 'sine', 0.08, 0); }
  function sfxCard() { [523, 659, 784].forEach(function (f, i) { beep(f, 0.14, 'triangle', 0.12, i * 0.09); }); }

  function create(canvas, cb) {
    var ctx = canvas.getContext('2d');
    var M = Matter, engine = M.Engine.create({ gravity: { x: 0, y: 1.6 } });
    var world = engine.world;
    var state = { score: 0, combo: 0, maxCombo: 0, merges: 0, stages: new Array(11).fill(0),
                  discovered: new Array(11).fill(false), phase: 'ready', paused: false };
    var lastMergeAt = 0, dangerSince = 0, dangerOn = false, lockUntil = 0, lastDangerBeep = 0, pausedAt = 0;
    var current = null, nextStage = 0, pointerX = W / 2, rafId = 0, lastT = 0;
    var particles = [], shake = 0, popups = [];
    var merging = {};

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
      cb.onNext && cb.onNext(nextStage);
    }
    function drop() {
      var now = performance.now();
      if (state.phase !== 'playing' || state.paused || !current || now < lockUntil) return;
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
          if (stage + 1 >= 4) slowMo(700);
          cb.onNewStage && cb.onNewStage(stage + 1);
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
        if (now - b.plugin.born < 800) continue;
        if (b.position.y - b.plugin.r < DANGER_Y) { over = true; break; }
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
      walls.forEach(function (w) { M.Composite.remove(world, w); });
      var summary = { score: state.score, maxCombo: state.maxCombo, merges: state.merges, stages: state.stages.slice(), discovered: state.discovered.slice() };
      setTimeout(function () { cb.onGameOver && cb.onGameOver(summary); }, 900);
    }

    // ---- 렌더 (밝은 화면용 색) ----
    function drawBall(x, y, r, stage, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = STAGE_COLORS[stage]; ctx.fill();
      if (images[stage].complete && images[stage].naturalWidth) ctx.drawImage(images[stage], -r, -r, r * 2, r * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,60,120,0.25)'; ctx.stroke();
      ctx.restore();
    }
    function draw(now) {
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.save(); ctx.clearRect(0, 0, W, H);
      if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.5) shake = 0; }
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(WALL, 0, INNER, FLOOR_Y);
      ctx.strokeStyle = '#3f6fd1'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(WALL, 0); ctx.lineTo(WALL, FLOOR_Y); ctx.lineTo(W - WALL, FLOOR_Y); ctx.lineTo(W - WALL, 0); ctx.stroke();
      var blink = dangerOn ? (Math.sin(now / 90) > 0 ? 1 : 0.3) : 0.45;
      ctx.strokeStyle = dangerOn ? 'rgba(230,50,50,' + blink + ')' : 'rgba(63,111,209,' + blink + ')';
      ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(WALL, DANGER_Y); ctx.lineTo(W - WALL, DANGER_Y); ctx.stroke(); ctx.setLineDash([]);
      balls().forEach(function (b) {
        if (b.plugin.pop > 1) b.plugin.pop = Math.max(1, b.plugin.pop - 0.03);
        drawBall(b.position.x, b.position.y, b.plugin.r * b.plugin.pop, b.plugin.stage, b.angle);
      });
      if (current && state.phase === 'playing') {
        ctx.strokeStyle = 'rgba(63,111,209,0.35)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(current.x, DROP_Y); ctx.lineTo(current.x, FLOOR_Y); ctx.stroke(); ctx.setLineDash([]);
        drawBall(current.x, DROP_Y, current.r, current.stage, 0);
      }
      particles = particles.filter(function (p) { return p.life > 0; });
      particles.forEach(function (p) { if (!state.paused) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025; } ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
      ctx.globalAlpha = 1;
      popups = popups.filter(function (p) { return p.t < 1; });
      popups.forEach(function (p) { if (!state.paused) p.t += 0.03; ctx.globalAlpha = 1 - p.t; ctx.font = 'bold ' + (28 + p.t * 10) + 'px sans-serif'; ctx.fillStyle = '#ff8a00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.textAlign = 'center'; ctx.strokeText(p.text, p.x, p.y - p.t * 30); ctx.fillText(p.text, p.x, p.y - p.t * 30); });
      ctx.globalAlpha = 1; ctx.restore();
    }

    var STEP = 1000 / 60, physId = 0, accum = 0;
    function physics() {
      var now = performance.now();
      if (document.hidden || state.paused) { lastT = now; return; }
      accum += lastT ? Math.min(STEP * 6, now - lastT) : STEP; lastT = now;
      while (accum >= STEP) {
        if (state.phase !== 'ready') M.Engine.update(engine, STEP);
        accum -= STEP;
      }
      if (state.phase === 'playing') checkDanger(now);
    }
    function loop(t) { draw(t); rafId = requestAnimationFrame(loop); }

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
    function pause() {
      if (state.paused || state.phase !== 'playing') return;
      state.paused = true; pausedAt = performance.now(); sfxCard();
    }
    function resume() {
      if (!state.paused) return;
      var gap = performance.now() - pausedAt;
      if (dangerSince) dangerSince += gap;
      if (lastMergeAt) lastMergeAt += gap;
      lockUntil += gap;
      state.paused = false; lastT = 0;
    }
    function destroy() {
      cancelAnimationFrame(rafId); rafId = 0;
      clearInterval(physId); physId = 0;
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      M.Composite.clear(world, false); M.Engine.clear(engine);
    }
    function setSound(on) { soundOn = on; if (on) ensureAudio(); }
    rafId = requestAnimationFrame(loop);
    return { start: start, pause: pause, resume: resume, destroy: destroy, setSound: setSound, state: state, _drop: drop, _engine: engine };
  }

  window.SsukGame = { create: create, W: W, H: H };
})();
```

- [ ] **Step 2: 문법 확인**

Run: `node --check landing/ssukssuk/ssuk-game.js`
Expected: 출력 없음(성공)

- [ ] **Step 3: Commit**

```bash
git add landing/ssukssuk/ssuk-game.js
git commit -m "쑥쑥 혁신제품: 물리·합체·렌더 모듈(다락방 합체 기반, 일시정지·첫 단계 알림 추가)"
```

---

### Task 5: index.html + ssuk-ui.js (화면)

**Files:**
- Create: `landing/ssukssuk/index.html`
- Create: `landing/ssukssuk/ssuk-ui.js`

- [ ] **Step 1: index.html 작성**

`landing/ssukssuk/index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script>
  // 웹(/ssukssuk, 끝 슬래시 없음)에서도 상대 경로가 맞게: 폴더 기준 base 지정. 파일로 열 때(file://)는 그대로.
  (function () {
    var p = location.pathname;
    if (location.protocol !== 'file:' && !/\/$/.test(p) && !/\.html$/.test(p)) document.write('<base href="' + p + '/">');
  })();
</script>
<title>쑥쑥! 혁신제품</title>
<meta name="description" content="작은 아이디어를 합쳐 혁신제품으로 키워 세계로 보내는 조달 합체 퍼즐">
<style>
  :root { --ink:#1d2b4f; --blue:#3f6fd1; --sky:#e8f3ff; --sun:#ffd34d; --mint:#7ed6a5; }
  * { box-sizing:border-box; }
  html, body { margin:0; height:100%; background:linear-gradient(180deg, #f4faff 0%, var(--sky) 60%, #d9ecff 100%); color:var(--ink); font-family:system-ui, -apple-system, 'Noto Sans KR', 'Malgun Gothic', sans-serif; overflow:hidden; touch-action:none; -webkit-user-select:none; user-select:none; }
  .screen { position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; }
  .screen.show { display:flex; }
  h1 { font-size:2.2rem; margin:0 0 6px; letter-spacing:-1px; color:var(--blue); }
  h1 .sprout { display:inline-block; }
  .sub { margin:0 0 16px; line-height:1.55; font-size:1.05rem; }
  .chain { display:flex; gap:4px; justify-content:center; flex-wrap:wrap; margin:0 0 16px; max-width:420px; }
  .chain img { width:34px; height:34px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.12); }
  .btn { border:none; border-radius:999px; padding:14px 30px; font-size:1.1rem; font-weight:700; color:#fff; background:var(--blue); cursor:pointer; margin:6px; box-shadow:0 3px 0 #2c54a8; }
  .btn.alt { background:#ff9a3c; box-shadow:0 3px 0 #d07418; } .btn.ghost { background:#fff; color:var(--ink); box-shadow:0 2px 0 #c9d6ea; font-weight:600; }
  .small { font-size:.8rem; opacity:.7; margin-top:14px; }
  #btn-sound { position:fixed; top:12px; right:12px; z-index:30; background:#fff; border:none; border-radius:50%; width:44px; height:44px; font-size:1.2rem; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.12); }
  /* 플레이 */
  #screen-play { justify-content:flex-start; padding:0; }
  #hud { width:100%; max-width:480px; height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 72px 0 20px; }
  #hud-score { font-size:1.9rem; font-weight:800; color:var(--blue); } #hud-combo { color:#ff8a00; font-weight:700; flex:1; text-align:center; }
  #hud-next-wrap { display:flex; align-items:center; gap:6px; font-size:.7rem; }
  #hud-next { width:40px; height:40px; border-radius:50%; background:#fff; }
  #game { display:block; }
  #fever-frame { position:fixed; inset:0; pointer-events:none; transition:box-shadow .3s; }
  #fever-frame.on { box-shadow:inset 0 0 40px 10px rgba(255,211,77,.7); animation:pulse .6s infinite alternate; }
  @keyframes pulse { to { box-shadow:inset 0 0 60px 16px rgba(255,140,60,.6); } }
  #screen-play.danger #hud-score { color:#e33; }
  /* 도감 카드 팝업 */
  #card-pop { position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(20,40,80,.45); z-index:25; padding:20px; }
  #card-pop.show { display:flex; animation:fadein .2s; }
  @keyframes fadein { from { opacity:0; } }
  .card { background:#fff; border-radius:22px; padding:22px 20px 18px; width:100%; max-width:340px; box-shadow:0 10px 30px rgba(0,0,0,.25); }
  .card .tag { display:inline-block; background:var(--sun); color:var(--ink); font-weight:800; font-size:.8rem; border-radius:999px; padding:4px 12px; }
  .card img { width:120px; height:120px; border-radius:50%; margin:12px auto 6px; display:block; }
  .card h3 { margin:4px 0 8px; font-size:1.35rem; }
  .card p { margin:0 0 14px; line-height:1.6; word-break:keep-all; }
  .card .tap { font-size:.85rem; opacity:.6; }
  /* 결과 */
  #result-reached img { width:96px; height:96px; border-radius:50%; background:#fff; }
  #result-reached-text { font-size:1.2rem; font-weight:700; margin:6px 0; word-break:keep-all; }
  #result-score { font-size:2.4rem; font-weight:800; color:var(--blue); margin:4px 0; }
  #result-sub { margin-bottom:10px; }
  /* 도감 */
  #screen-book { justify-content:flex-start; padding-top:24px; overflow:auto; touch-action:pan-y; }
  #book-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; width:100%; max-width:520px; margin:12px 0; }
  .book-item { background:#fff; border-radius:16px; padding:10px; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,.08); }
  .book-item img { width:64px; height:64px; border-radius:50%; }
  .book-item.locked img { filter:brightness(0) opacity(.18); }
  .book-item b { display:block; margin:4px 0; font-size:.95rem; }
  .book-item span { font-size:.78rem; line-height:1.45; display:block; word-break:keep-all; }
</style>
</head>
<body>
<button id="btn-sound" aria-label="소리 끄기/켜기">🔊</button>
<div id="fever-frame"></div>

<section id="screen-start" class="screen">
  <h1><span class="sprout">🌱</span> 쑥쑥! 혁신제품</h1>
  <p class="sub">같은 단계끼리 붙이면 쑥쑥 자라요.<br>작은 아이디어를 합쳐 세계로!</p>
  <div class="chain" id="start-chain"></div>
  <div id="best-line">최고 점수: -</div>
  <div>
    <button id="btn-start" class="btn">시작!</button>
    <button id="btn-book-start" class="btn ghost">📖 도감</button>
  </div>
  <div class="small">2026 조달청 AI 게임·콘텐츠 공모전 출품작</div>
</section>

<section id="screen-play" class="screen">
  <div id="hud"><span id="hud-score">0</span><span id="hud-combo"></span><span id="hud-next-wrap"><small>NEXT</small><img id="hud-next" alt="다음 단계"></span></div>
  <canvas id="game" width="400" height="640"></canvas>
</section>

<div id="card-pop" role="dialog" aria-modal="true">
  <div class="card">
    <span class="tag" id="card-tag">새 단계 발견!</span>
    <img id="card-img" alt="">
    <h3 id="card-name"></h3>
    <p id="card-text"></p>
    <div class="tap">화면을 누르면 계속해요</div>
  </div>
</div>

<section id="screen-result" class="screen">
  <h2 style="margin:0 0 8px">게임 끝!</h2>
  <div id="result-reached"><img id="result-reached-img" alt=""></div>
  <div id="result-reached-text"></div>
  <div id="result-score">0점</div>
  <div id="result-sub"></div>
  <div>
    <button id="btn-retry" class="btn alt">다시하기</button>
    <button id="btn-book-result" class="btn ghost">📖 도감</button>
    <button id="btn-home" class="btn ghost">처음으로</button>
  </div>
</section>

<section id="screen-book" class="screen">
  <h2 style="margin:0">📖 혁신제품 도감 <small id="book-count"></small></h2>
  <div id="book-grid"></div>
  <button id="btn-book-close" class="btn ghost">닫기</button>
</section>

<script src="./vendor/matter.min.js"></script>
<script src="./ssuk-core.js"></script>
<script src="./ssuk-store.js"></script>
<script src="./ssuk-game.js"></script>
<script src="./ssuk-ui.js"></script>
<script>
  (function () {
    var chain = document.getElementById('start-chain');
    SsukCore.STAGES.forEach(function (s) { var im = document.createElement('img'); im.src = s.img; im.alt = s.name; im.title = s.name; chain.appendChild(im); });
    SsukUI.boot();
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: ssuk-ui.js 작성**

`landing/ssukssuk/ssuk-ui.js`:
```js
// landing/ssukssuk/ssuk-ui.js — 화면 전환·HUD·도감 카드 팝업·결과·도감. 전역 SsukUI.
(function () {
  'use strict';
  var C = SsukCore, S = SsukStore;

  function $(id) { return document.getElementById(id); }
  function show(name) { ['start', 'play', 'result', 'book'].forEach(function (s) { $('screen-' + s).classList.toggle('show', s === name); }); }

  var game = null, soundOn = S.soundOn(), bookFrom = 'start', cardOpen = false;

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
    cardOpen = false; $('card-pop').classList.remove('show');
    if (game) game.resume();
  }

  function startGame() {
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
    closeCard();
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
```

- [ ] **Step 3: 문법 확인**

Run: `node --check landing/ssukssuk/ssuk-ui.js`
Expected: 출력 없음

- [ ] **Step 4: Commit**

```bash
git add landing/ssukssuk/index.html landing/ssukssuk/ssuk-ui.js
git commit -m "쑥쑥 혁신제품: 시작·플레이·도감 카드·결과·도감 화면"
```

---

### Task 6: 임시 배지 그림 + 로컬 플레이 확인

진짜 그림 전에 게임 전체가 도는지 확인하려고, 단계 색 원 + 단계 번호로 임시 배지를 만든다.

**Files:**
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_placeholder_badges.py`
- Create: `landing/ssukssuk/img/stage01.png` ~ `stage11.png` (임시)
- Create: `.claude/launch.json` 항목 추가 (이미 있으면 configurations에 하나 추가)

- [ ] **Step 1: 스크립트 작성**

`docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_placeholder_badges.py`:
```python
"""쑥쑥! 혁신제품 — 임시 배지 11장(단계 색 원 + 번호). 진짜 그림 생기면 make_badges.py가 덮어씀.
사용: python make_placeholder_badges.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk", "img"))
COLORS = ["#FFE27A", "#9AD0FF", "#FFB37A", "#B6E3A8", "#C9B6FF", "#FFD34D",
          "#5EC8C8", "#FF9AA2", "#6FA8FF", "#7ED6A5", "#FF7A59"]
SIZE = 512

os.makedirs(OUT, exist_ok=True)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 220)
except OSError:
    font = ImageFont.load_default()
for i, col in enumerate(COLORS):
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, SIZE - 4, SIZE - 4), fill=col, outline="#1d2b4f", width=10)
    text = str(i + 1)
    box = d.textbbox((0, 0), text, font=font)
    d.text(((SIZE - (box[2] - box[0])) / 2 - box[0], (SIZE - (box[3] - box[1])) / 2 - box[1]), text, font=font, fill="#1d2b4f")
    im.save(os.path.join(OUT, f"stage{i + 1:02d}.png"))
print("saved 11 placeholders to", OUT)
```

- [ ] **Step 2: 실행**

Run: `python "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_placeholder_badges.py"`
Expected: `saved 11 placeholders to ...landing\ssukssuk\img`

- [ ] **Step 3: 로컬 미리보기 설정**

`.claude/launch.json`의 `configurations` 배열에 추가 (파일이 없으면 아래 전체로 생성):
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "ssukssuk", "runtimeExecutable": "python", "runtimeArgs": ["-m", "http.server", "8790", "--directory", "landing"], "port": 8790 }
  ]
}
```
`preview_start {name: "ssukssuk"}` 후 `navigate http://localhost:8790/ssukssuk/` 와 `http://localhost:8790/ssukssuk` 둘 다 열어 본다(두 번째는 base 우회 코드 확인용).

- [ ] **Step 4: 브라우저 확인 체크리스트**

`read_console_messages {onlyErrors:true}` → 에러 0건. 그다음 확인:
1. 시작 화면에 11개 배지 줄, 「🌱 쑥쑥! 혁신제품」
2. 시작 → 곧바로 "1단계 발견!" 아이디어 카드 → 클릭하면 닫히고 게임 진행
3. `javascript_tool`로 빠른 합체 유도: `var g=SsukUI._game(); for(var i=0;i<6;i++) g._drop();` 반복하며 2단계 카드 뜨는지, 카드가 떠 있는 동안 공이 멈춰 있는지
4. 카드 닫으면 재개, 점수 HUD 증가
5. 계속 떨어뜨려 게임오버 → 결과 화면에 "…까지 자랐어요!", 도감 n/11
6. 도감 화면: 모은 칸은 문구, 못 모은 칸은 실루엣과 ???
7. 새로고침 후 시작 → 아이디어 카드가 **다시 뜨지 않음**(저장 확인)
8. `resize_window preset mobile` → 터치 크기에서 화면 깨짐 없음 → `preset desktop`으로 복구

- [ ] **Step 5: Commit**

```bash
git add "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_placeholder_badges.py" landing/ssukssuk/img .claude/launch.json
git commit -m "쑥쑥 혁신제품: 임시 배지와 로컬 미리보기 설정, 전체 흐름 동작 확인"
```

---

### Task 7: 진짜 배지 그림 11장 (Higgsfield)

**Files:**
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/tools/badge_prompts.json`
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_badges.py`
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/badge_raw/stageNN.png` (생성 원본, 커밋 안 함)
- Modify: `landing/ssukssuk/img/stage01.png` ~ `stage11.png`

- [ ] **Step 1: 프롬프트 파일 작성**

`docs/공모전/조달청_AI게임콘텐츠_2026/tools/badge_prompts.json`:
```json
{
  "style": "A single round circular badge icon that fills the whole square frame edge to edge, cute flat vector illustration, soft rounded shapes, thick clean outline, bright cheerful Korean public campaign style, simple centered subject, solid circular background color {color}, plain white outside the circle, no text, no letters, no numbers, no logo, no watermark.",
  "stages": [
    {"n": 1,  "color": "pastel yellow #FFE27A", "subject": "a glowing light bulb with a tiny sprout leaf on top"},
    {"n": 2,  "color": "light sky blue #9AD0FF", "subject": "a rolled-out blueprint paper with a pencil and simple drawn shapes"},
    {"n": 3,  "color": "soft orange #FFB37A", "subject": "a small handmade gadget prototype with a wrench and a few screws"},
    {"n": 4,  "color": "light green #B6E3A8", "subject": "a test flask and a big check mark seal, quality certification"},
    {"n": 5,  "color": "lavender #C9B6FF", "subject": "a friendly small factory building with a finished product box in front"},
    {"n": 6,  "color": "golden yellow #FFD34D", "subject": "a shining product box with a big star medal ribbon, innovation award"},
    {"n": 7,  "color": "teal #5EC8C8", "subject": "a shopping cart in front of a laptop screen showing an online marketplace"},
    {"n": 8,  "color": "soft pink #FF9AA2", "subject": "a school building and a fire station side by side receiving a delivered box"},
    {"n": 9,  "color": "blue #6FA8FF", "subject": "a simple map of South Korea with many small public building pins connected by lines"},
    {"n": 10, "color": "mint green #7ED6A5", "subject": "a globe with a cargo airplane and a ship carrying product boxes"},
    {"n": 11, "color": "coral red #FF7A59", "subject": "a golden trophy with confetti and a sprout growing into a big tree behind it"}
  ]
}
```

- [ ] **Step 2: 1번만 먼저 생성해 스타일 기준 확인**

```bash
cd "docs/공모전/조달청_AI게임콘텐츠_2026" && mkdir -p badge_raw
python -c "import json;d=json.load(open('tools/badge_prompts.json',encoding='utf-8'));s=d['stages'][0];print(d['style'].format(color=s['color'])+' Subject: '+s['subject'])" > badge_raw/p01.txt
higgsfield generate create nano_banana_2 --prompt "$(cat badge_raw/p01.txt)" --aspect_ratio 1:1 --resolution 1k --wait 2>&1 | tail -1 > badge_raw/u01.txt
curl -sL -o badge_raw/stage01.png "$(cat badge_raw/u01.txt)"
```
`Read badge_raw/stage01.png`로 직접 보고 확인: 원이 프레임을 꽉 채우는지, 글자 없는지, 귀여운 플랫 스타일인지. 아니면 style 문구를 고쳐 다시. 결과는 루카에게 보여주고 OK 받기.

- [ ] **Step 3: 나머지 10장 생성 (1번을 스타일 참고로)**

```bash
cd "docs/공모전/조달청_AI게임콘텐츠_2026"
for n in 2 3 4 5 6 7 8 9 10 11; do
  i=$((n-1)); nn=$(printf "%02d" $n)
  python -c "import json,sys;d=json.load(open('tools/badge_prompts.json',encoding='utf-8'));s=d['stages'][$i];print(d['style'].format(color=s['color'])+' Subject: '+s['subject']+' Match the exact same art style, outline thickness and badge shape as the reference image.')" > badge_raw/p$nn.txt
  for try in 1 2 3; do
    u=$(higgsfield generate create nano_banana_2 --prompt "$(cat badge_raw/p$nn.txt)" --image-references badge_raw/stage01.png --aspect_ratio 1:1 --resolution 1k --wait 2>&1 | tail -1)
    if [[ $u == https* ]]; then curl -sL -o badge_raw/stage$nn.png "$u"; echo "$nn ok"; break; else echo "$nn fail($try): $u"; fi
  done
done
higgsfield account status | head -1
```
Expected: `02 ok` … `11 ok`

- [ ] **Step 4: 원형 투명 PNG로 후처리 스크립트**

`docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_badges.py`:
```python
"""생성 원본(badge_raw/stageNN.png) → 원 바깥을 투명하게 깎은 512px 배지(landing/ssukssuk/img/stageNN.png).
원이 프레임을 꽉 채운다는 전제로, 가운데 정사각형을 잘라 지름 98% 원 마스크를 씌움.
사용: python make_badges.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.normpath(os.path.join(HERE, "..", "badge_raw"))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk", "img"))
SIZE, SS = 512, 4  # 최종 크기, 마스크 안티에일리어싱 배율

for n in range(1, 12):
    src = os.path.join(RAW, f"stage{n:02d}.png")
    im = Image.open(src).convert("RGBA")
    side = min(im.size)
    left, top = (im.width - side) // 2, (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    mask = Image.new("L", (SIZE * SS, SIZE * SS), 0)
    pad = int(SIZE * SS * 0.01)
    ImageDraw.Draw(mask).ellipse((pad, pad, SIZE * SS - pad, SIZE * SS - pad), fill=255)
    mask = mask.resize((SIZE, SIZE), Image.LANCZOS)
    im.putalpha(mask)
    im.save(os.path.join(OUT, f"stage{n:02d}.png"))
    print("ok", n)
```

- [ ] **Step 5: 실행하고 눈으로 확인**

Run: `python "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_badges.py"`
Expected: `ok 1` … `ok 11`

11장을 한 장으로 모은 미리보기를 만들어 `Read`로 확인하고 루카에게 보여준다:
```bash
python -c "
from PIL import Image
ims=[Image.open(f'landing/ssukssuk/img/stage{n:02d}.png') for n in range(1,12)]
s=Image.new('RGBA',(128*11,128),(232,243,255,255))
[s.alpha_composite(im.resize((128,128)),(i*128,0)) for i,im in enumerate(ims)]
s.save('docs/공모전/조달청_AI게임콘텐츠_2026/badge_raw/_sheet.png')"
```
구별 안 되거나 이상한 장은 Step 3 방식으로 그 번호만 다시 생성 → Step 5 재실행.

- [ ] **Step 6: 게임에서 확인**

미리보기 새로고침 → 시작 화면 배지 줄, 플레이 중 공 그림, 카드 큰 그림, 도감에서 모두 새 그림으로 보이는지 `computer screenshot`으로 확인.

- [ ] **Step 7: Commit (원본 badge_raw는 제외)**

```bash
echo "docs/공모전/조달청_AI게임콘텐츠_2026/badge_raw/" >> .gitignore
git add .gitignore "docs/공모전/조달청_AI게임콘텐츠_2026/tools/badge_prompts.json" "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_badges.py" landing/ssukssuk/img
git commit -m "쑥쑥 혁신제품: 11단계 배지 일러스트(Nano Banana 2 생성, 원형 투명 처리)"
```

---

### Task 8: 웹 배포 (/ssukssuk)

**Files:**
- Modify: `firebase.json` (headers 배열에 항목 추가)

- [ ] **Step 1: 캐시 헤더 추가**

`firebase.json`의 `"headers"` 배열에서 `/merge/**/*.@(js)` 항목 바로 뒤에 추가:
```json
      {
        "source": "/ssukssuk/**/*.@(js|png)",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, must-revalidate" }
        ]
      },
```

- [ ] **Step 2: 배포**

Run: `firebase deploy --only hosting`
Expected: `Deploy complete!` 와 Hosting URL `https://vaulted-bus-346411.web.app`

- [ ] **Step 3: 실제 주소 확인**

`preview_start {url: "https://vaulted-bus-346411.web.app/ssukssuk"}` → `read_console_messages {onlyErrors:true}` 0건, `read_network_requests`에서 `ssuk-core.js`·`vendor/matter.min.js`·`img/stage01.png`가 모두 200, 시작 → 카드 → 플레이 한 판 → `computer screenshot`.

- [ ] **Step 4: Commit**

```bash
git add firebase.json
git commit -m "쑥쑥 혁신제품: /ssukssuk 웹 배포 (JS·그림 캐시 끄기)"
```

---

### Task 9: 제출 ZIP + 오프라인 검사

**Files:**
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/tools/pack_zip.py`
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/제출/AI게임_실행파일_쑥쑥혁신제품_<성명>.zip` (커밋 안 함)

- [ ] **Step 1: 스크립트 작성**

`docs/공모전/조달청_AI게임콘텐츠_2026/tools/pack_zip.py`:
```python
"""제출용 ZIP: landing/ssukssuk 통째(테스트 파일 제외) + 외부 주소 검사.
사용: python pack_zip.py <성명>
결과: ../제출/AI게임_실행파일_쑥쑥혁신제품_<성명>.zip  (안에 '쑥쑥혁신제품/index.html')
"""
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk"))
OUTDIR = os.path.normpath(os.path.join(HERE, "..", "제출"))
SKIP = re.compile(r"\.test\.mjs$")
EXTERNAL = re.compile(r"""(src|href)\s*=\s*["']https?://|fetch\(\s*["']https?://|url\(\s*["']?https?://""")

if len(sys.argv) < 2:
    sys.exit("사용: python pack_zip.py <성명>")
name = sys.argv[1]
os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, f"AI게임_실행파일_쑥쑥혁신제품_{name}.zip")

problems = []
for fn in ("index.html", "ssuk-core.js", "ssuk-store.js", "ssuk-game.js", "ssuk-ui.js"):
    text = open(os.path.join(SRC, fn), encoding="utf-8").read()
    for m in EXTERNAL.finditer(text):
        problems.append(f"{fn}: {m.group(0)}")
if problems:
    sys.exit("외부 주소 발견 — 오프라인에서 안 돌 수 있음:\n" + "\n".join(problems))

count = 0
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(SRC):
        for f in files:
            if SKIP.search(f):
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, SRC).replace(os.sep, "/")
            z.write(full, "쑥쑥혁신제품/" + rel)
            count += 1
    z.writestr("쑥쑥혁신제품/실행방법.txt",
               "1. 압축을 풉니다.\n2. '쑥쑥혁신제품' 폴더 안의 index.html을 더블클릭합니다 (크롬·엣지 권장).\n"
               "3. 인터넷 연결 없이 실행됩니다.\n웹 버전: https://vaulted-bus-346411.web.app/ssukssuk\n")
print(f"{out}  ({count + 1} files, {os.path.getsize(out) // 1024} KB)")
```

- [ ] **Step 2: 실행**

Run: `python "docs/공모전/조달청_AI게임콘텐츠_2026/tools/pack_zip.py" <루카 실명>`
Expected: `…\제출\AI게임_실행파일_쑥쑥혁신제품_<성명>.zip  (20 files, … KB)` — 외부 주소 오류 없음

- [ ] **Step 3: 오프라인 실행 확인**

```bash
S="$TEMP/ssuk_unzip"; rm -rf "$S"; mkdir -p "$S"
python -c "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "docs/공모전/조달청_AI게임콘텐츠_2026/제출/AI게임_실행파일_쑥쑥혁신제품_<성명>.zip" "$S"
ls "$S/쑥쑥혁신제품"
```
그다음 루카에게 `"$S/쑥쑥혁신제품/index.html"`을 더블클릭해 달라고 요청(Wi‑Fi 끈 상태 권장) → 시작·플레이·카드가 되는지 답 받기. (클로의 브라우저는 file:// 열기가 제한될 수 있어 루카 확인이 확실함)

- [ ] **Step 4: Commit (ZIP 자체는 제외)**

```bash
echo "docs/공모전/조달청_AI게임콘텐츠_2026/제출/" >> .gitignore
git add .gitignore "docs/공모전/조달청_AI게임콘텐츠_2026/tools/pack_zip.py"
git commit -m "쑥쑥 혁신제품: 제출 ZIP 만들기 스크립트(외부 주소 검사, 실행방법 포함)"
```

---

### Task 10: 시연영상 (1분, 1920×1080)

게임은 세로 화면이라, 가로 1080p 영상 가운데에 플레이 화면을 두고 양옆은 흐린 배경 + 자막으로 채운다.

**Files:**
- Create: `docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_demo.py`
- Input: 루카가 녹화한 원본 `docs/공모전/조달청_AI게임콘텐츠_2026/녹화/raw.mp4` (커밋 안 함)
- Output: `docs/공모전/조달청_AI게임콘텐츠_2026/제출/AI게임_시연영상_쑥쑥혁신제품_<성명>.mp4`

- [ ] **Step 1: 루카에게 녹화 부탁**

안내: 크롬에서 `https://vaulted-bus-346411.web.app/ssukssuk` 열기 → 도감을 비우려면 시크릿 창 사용 → **Win+Alt+R**(Xbox Game Bar 녹화 시작/끝) → 시작 화면 3초 → 시작 → 아이디어 카드 → 2~3분 플레이(카드 몇 장 뜨게) → 게임오버 → 결과 → 도감 → 녹화 끝. 파일(동영상 폴더 `캡처`)을 `녹화/raw.mp4`로 복사.

- [ ] **Step 2: 편집 스크립트 작성**

`docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_demo.py`:
```python
"""시연영상: 녹화 원본에서 구간을 골라 1920x1080 가로 영상으로.
가운데 = 게임 화면(세로), 배경 = 같은 화면 흐리게 확대, 위 제목/아래 구간 자막.
사용: python make_demo.py <성명> "<구간1 시작-끝>" "<구간2 시작-끝>" ...   (초 단위, 예: "0-6" "12-30")
구간 자막은 SEG_TITLES 순서대로 붙음. 합계 55~65초가 되게 고를 것.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.normpath(os.path.join(HERE, ".."))
RAW = os.path.join(BASE, "녹화", "raw.mp4")
FONT = "C\\:/Windows/Fonts/malgunbd.ttf"
SEG_TITLES = ["작은 아이디어에서 시작해요", "같은 단계끼리 합치면 쑥쑥 자라요", "새 단계마다 알쓸조달 도감 카드",
              "혁신제품 지정 → 나라장터 → 공공기관으로", "모은 카드는 도감에서 다시 봐요", "작은 아이디어를 세계로!"]

def run(cmd):
    subprocess.run(cmd, check=True)

def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\u2019")

name, segs = sys.argv[1], sys.argv[2:]
tmp = os.path.join(BASE, "녹화", "_seg")
os.makedirs(tmp, exist_ok=True)
parts = []
for i, seg in enumerate(segs):
    a, b = (float(x) for x in seg.split("-"))
    title = SEG_TITLES[min(i, len(SEG_TITLES) - 1)]
    out = os.path.join(tmp, f"s{i}.mp4")
    vf = ("[0:v]split[bg][fg];"
          "[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:5,eq=brightness=-0.05[b];"
          "[fg]scale=-2:960[f];"
          "[b][f]overlay=(W-w)/2:90,"
          f"drawtext=fontfile='{FONT}':text='쑥쑥! 혁신제품':fontsize=46:fontcolor=white:borderw=4:bordercolor=0x1d2b4f:x=(w-text_w)/2:y=22,"
          f"drawtext=fontfile='{FONT}':text='{esc(title)}':fontsize=40:fontcolor=0x1d2b4f:box=1:boxcolor=0xFFD34D@0.95:boxborderw=14:x=(w-text_w)/2:y=h-70,"
          "fps=30,format=yuv420p[v]")
    run(["ffmpeg", "-y", "-ss", str(a), "-to", str(b), "-i", RAW, "-filter_complex", vf, "-map", "[v]", "-map", "0:a?",
         "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-ar", "48000", "-ac", "2", out])
    parts.append(out)
lst = os.path.join(tmp, "list.txt")
open(lst, "w", encoding="utf-8").write("".join(f"file '{p}'\n" for p in parts))
final = os.path.join(BASE, "제출", f"AI게임_시연영상_쑥쑥혁신제품_{name}.mp4")
os.makedirs(os.path.dirname(final), exist_ok=True)
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", final])
print("done:", final)
```

- [ ] **Step 3: 구간 고르기**

`video-watch` 스킬로 `녹화/raw.mp4`를 보고(프레임 시트) 장면별 시작·끝 초를 정한다: 시작화면, 첫 합체들, 카드 팝업, 높은 단계(혁신제품·나라장터) 합체, 게임오버·결과, 도감. 합계 55~65초.

- [ ] **Step 4: 만들기·검증**

Run: `python "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_demo.py" <성명> "0-5" "8-20" ...`
검증:
```bash
ffprobe -v error -show_entries stream=width,height:format=duration -of compact "docs/공모전/조달청_AI게임콘텐츠_2026/제출/AI게임_시연영상_쑥쑥혁신제품_<성명>.mp4"
```
Expected: `width=1920 height=1080`, duration 55~65. 프레임 몇 장을 뽑아 `Read`로 자막·화면 확인 → 루카에게 영상 전달(SendUserFile).

- [ ] **Step 5: Commit**

```bash
echo "docs/공모전/조달청_AI게임콘텐츠_2026/녹화/" >> .gitignore
git add .gitignore "docs/공모전/조달청_AI게임콘텐츠_2026/tools/make_demo.py"
git commit -m "쑥쑥 혁신제품: 시연영상 편집 스크립트(세로 플레이를 1080p 가로로)"
```

---

### Task 11: 신청서(붙임1-1)·동의서(붙임2) 작품 칸 채우기

**Files:**
- Input: `docs/공모전/조달청_AI게임콘텐츠_2026/공식자료/신청서_게임.hwpx`
- Output: `docs/공모전/조달청_AI게임콘텐츠_2026/제출/참가신청서_AI게임_작품칸.hwpx`

- [ ] **Step 1: hwpx 스킬 로드**

`Skill hwpxskill` 로 hwpx 편집 방법을 읽는다.

- [ ] **Step 2: 작품 칸 채우기** (개인정보·서명 칸은 비움)

| 칸 | 내용 |
|---|---|
| 참가구분 | ☑ 개인 |
| 작품명 | 쑥쑥! 혁신제품 |
| 게임 장르 | 퍼즐, 교육 |
| 실행환경 | ☑ PC ☑ WEB ☑ 모바일 |
| 작품 한 줄 소개 | 작은 아이디어를 합쳐 혁신제품으로 키워 세계로 보내는 조달 합체 퍼즐 |
| 기획의도 | 혁신제품 제도는 기업에게는 기회지만 국민에게는 낯선 말입니다. 아이디어가 시제품·인증을 거쳐 혁신제품으로 지정되고, 나라장터와 시범구매를 통해 공공기관에서 쓰이며, 해외로까지 뻗어 가는 과정을 '같은 것끼리 합치면 자란다'는 누구나 아는 합체 퍼즐로 옮겼습니다. 공공조달이 혁신기업의 디딤돌이라는 메시지를 놀이로 전합니다. |
| 게임 설명 | 위에서 단계 배지를 떨어뜨려 같은 단계끼리 닿게 하면 다음 단계로 진화합니다. 💡아이디어 → 📝설계도 → 🔧시제품 → 🧪시험·인증 → 🏭기업 제품 → ⭐혁신제품 지정 → 🛒나라장터 등록 → 🏫첫 공공 납품(시범구매) → 🏢전국 공공기관 → 🌏해외 수출 → 🏆K-혁신 대표기업까지 11단계입니다. 새 단계를 처음 만들면 '알쓸조달' 도감 카드가 나와 해당 제도를 한두 줄로 알려 주고, 모은 카드는 도감에서 다시 볼 수 있습니다. 통 위 경계선을 넘어 쌓이면 게임이 끝나고 몇 단계까지 키웠는지 보여 줍니다. |
| 주요 플레이 방식 | 화면을 좌우로 움직여 떨어질 위치를 정하고, 손을 떼면(클릭하면) 떨어집니다. 한 손가락(마우스 하나)으로만 조작합니다. 빠르게 연달아 합치면 콤보 배율이 올라갑니다. 도감 카드는 화면을 누르면 닫히고 게임이 이어집니다. |
| 조달청·조달정책 반영 내용 | 혁신시제품 지정, 혁신제품 지정(공공기관 수의계약 구매, 지정 3년·최대 6년), 나라장터(7만여 수요기관·60만여 기업), 혁신제품 시범구매, 연 238조 원 공공구매력, G-PASS 기업 해외조달시장 진출 지원을 11단계와 도감 카드에 담았습니다. |
| AI 활용 내용 | Claude(Anthropic): 게임 기획 정리, 코드 작성·테스트, 정책 문구 초안. Higgsfield Nano Banana 2: 11단계 배지 일러스트 생성(1장을 기준으로 나머지 스타일 통일). 정책 내용은 2026년 10월 보도·조달청 자료로 확인 후 반영. |
| 사용 프로그램 | Claude(Claude Code), Higgsfield(Nano Banana 2), Matter.js(오픈소스 물리엔진, MIT) |
| 제출파일(명) | AI게임_시연영상_쑥쑥혁신제품_성명.mp4 / AI게임_실행파일_쑥쑥혁신제품_성명.zip |

- [ ] **Step 3: 결과 확인**

hwpx 텍스트를 다시 뽑아 칸마다 들어갔는지 확인 → 루카에게 한컴으로 열기(`Hwp.exe`) → 개인정보·서명 채우고 PDF 저장 요청.

- [ ] **Step 4: Commit (개인정보 없는 작품칸 버전만)**

```bash
git add "docs/공모전/조달청_AI게임콘텐츠_2026/제출/참가신청서_AI게임_작품칸.hwpx" -f
git commit -m "쑥쑥 혁신제품: 참가신청서(붙임1-1) 작품 칸 채움(개인정보 칸은 비움)"
```

---

## 마감 전 최종 체크 (접수가이드 체크리스트)
- [ ] 올바른 신청서(붙임1-1) + 동의서(붙임2) PDF, 서명 완료
- [ ] 파일명: `참가신청서_AI게임_성명.pdf`, `AI게임_시연영상_쑥쑥혁신제품_성명.mp4`, `AI게임_실행파일_쑥쑥혁신제품_성명.zip`, `개인정보동의서_성명.pdf`
- [ ] 이메일 제목 `[2026 조달청 공모전] AI게임_성명_쑥쑥! 혁신제품`, 본문: 참가부문/참가구분/성명/작품명/연락처
- [ ] 첨부 크기가 메일 한도를 넘으면 대용량 첨부(드라이브 링크) 사용
- [ ] 도감 문구를 조달청 공식 누리집(pps.go.kr)과 한 번 더 대조
