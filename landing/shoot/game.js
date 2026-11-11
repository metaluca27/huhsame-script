// 다락방 사격장 — 문제를 읽고 정답 표적을 쏘는 퀴즈 게임
import * as THREE from 'three';
import { QUESTIONS } from '/shoot/questions.js?v=3';

// ───────── 조절하기 쉬운 숫자들 ─────────
const ROUND = 10;          // 한 판 문제 수
const PLAN = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3];   // 문제 순서별 난이도 (쉬움 4 → 보통 3 → 어려움 3)
const LV_MULT = { 1: 1, 2: 1.5, 3: 2 };       // 난이도별 점수 배율
const LV_NAME = { 1: '★ 쉬움', 2: '★★ 보통', 3: '★★★ 어려움' };
const TIME = 12;           // 문제당 제한 시간(초)
const BASE = 100;          // 정답 기본 점수
const SPEED_MAX = 100;     // 빨리 맞혔을 때 최대 보너스
const COMBO_STEP = 20;     // 연속 정답 1회당 보너스
const COMBO_MAX = 100;     // 콤보 보너스 상한
const BEST_KEY = 'attic-shoot-best';

// ───────── 다락방 식구들 ─────────
const CAST = [
  { id: 'clo',    name: '클로',   ok: ['데이터대로예요, 명중!', '분석 끝, 정답이에요'],        no: ['괜찮아요, 오답도 데이터예요', '다음 발은 맞을 확률이 높아요'] },
  { id: 'rurik',  name: '루릭',   ok: ['...쉽네', '나쁘지 않음'],                              no: ['...집중 안 함?', '그건 아님'] },
  { id: 'pureum', name: '푸름이', ok: ['명중 확인 완료', '정상 처리됐어요'],                   no: ['괜찮아요, 다음 발 준비됐어요', '기록해 뒀어요. 다음엔 맞혀요'] },
  { id: 'nova',   name: '노바',   ok: ['예측대로네요', '확률적으로 완벽한 선택'],              no: ['확률은 다음 발 편이에요', '오차 범위 안이에요'] },
  { id: 'luna',   name: '루나',   ok: ['좋은 발견이야', '그 느낌, 기억해 둬'],                 no: ['틀려도 괜찮아, 이제 알았잖아', '천천히 읽어 봐'] },
  { id: 'juju',   name: '주주야', ok: ['체크! 명중!', '함께라서 더 잘 맞아요!'],               no: ['괜찮아요, 같이 다시 해요!', '다음엔 꼭 체크!'] },
  { id: 'hermi',  name: '헤르미', ok: ['단서를 정확히 봤네요!', '찾았다, 정답!'],              no: ['단서를 다시 볼까요?', '돋보기로 한 번 더 봐요'] },
];
const img = id => `/shoot/img/${id}.webp?v=1`;

const $ = id => document.getElementById(id);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ───────── 소리 (전부 코드로 합성) ─────────
let actx = null, muted = false;
function ac() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, at, dur, type = 'sine', vol = 0.18, to = null) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function sShot() {
  const c = ac(); if (!c || muted) return;
  const len = Math.floor(c.sampleRate * 0.16), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = 0.5;
  s.connect(f).connect(g).connect(c.destination); s.start();
  tone(190, 0, 0.14, 'triangle', 0.35, 55);
}
const sOk = () => { tone(784, 0.05, 0.14, 'triangle', 0.2); tone(1175, 0.16, 0.26, 'triangle', 0.2); };
const sNo = () => { tone(220, 0.05, 0.3, 'sawtooth', 0.12, 110); };
const sTick = () => tone(1000, 0, 0.05, 'square', 0.05);
const sPop = () => tone(420, 0, 0.09, 'sine', 0.1, 700);
const sFan = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.18));

// ───────── 3D 무대 ─────────
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1c14);
scene.fog = new THREE.Fog(0x2a1c14, 14, 34);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xffe6c4, 0x3a2618, 1.25));
const sun = new THREE.DirectionalLight(0xffd9a0, 1.3); sun.position.set(-3, 8, 4); scene.add(sun);
const lamp = new THREE.PointLight(0xffc27a, 40, 22); lamp.position.set(0, 5, -6); scene.add(lamp);

function plankTex(w, h, base, line, n, vertical) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const p = (vertical ? w : h) / n * i;
    x.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 220 : 0},${i % 2 ? 160 : 0},${0.04 + Math.random() * 0.05})`;
    vertical ? x.fillRect(p, 0, w / n, h) : x.fillRect(0, p, w, h / n);
    x.fillStyle = line; vertical ? x.fillRect(p, 0, 3, h) : x.fillRect(0, p, w, 3);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const M = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
function box(w, h, d, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }

// 바닥·벽·박공지붕
const floorT = plankTex(512, 512, '#a8733f', 'rgba(60,34,14,.55)', 8, true); floorT.repeat.set(4, 8);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 40), M(0xffffff, { map: floorT })); floor.rotation.x = -Math.PI / 2; floor.position.z = -10; scene.add(floor);
const wallT = plankTex(512, 512, '#7a4f2c', 'rgba(40,22,8,.6)', 10, true); wallT.repeat.set(3, 1);
const back = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), M(0xffffff, { map: wallT })); back.position.set(0, 6, -15); scene.add(back);
for (const s of [-1, 1]) {
  const side = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), M(0x6d4526, { map: wallT })); side.rotation.y = -s * Math.PI / 2; side.position.set(s * 7.5, 2, -10); scene.add(side);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 40), M(0x4d3019, { side: THREE.DoubleSide })); roof.rotation.set(Math.PI / 2, s * 0.5, 0); roof.position.set(s * 3.8, 6.05, -10); scene.add(roof);
  for (let z = -2; z > -15; z -= 4) { const b = box(9.4, 0.28, 0.28, M(0x3a2312), s * 3.8, 5.9, z); b.rotation.z = -s * 0.5; }
}
// 둥근 창과 간판
const win = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); win.position.set(0, 7.1, -14.95); scene.add(win);
box(2.6, 0.12, 0.1, M(0x3a2312), 0, 7.1, -14.9); box(0.12, 2.6, 0.1, M(0x3a2312), 0, 7.1, -14.9);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.1, 8, 32), M(0x3a2312)); ring.position.set(0, 7.1, -14.9); scene.add(ring);
// 줄전구
const bulbs = [];
for (const z of [-5, -11]) for (let i = 0; i <= 12; i++) {
  const u = i / 12, x = -7 + 14 * u, y = 4.6 - Math.sin(u * Math.PI) * 0.7;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: [0xffd27a, 0xff9d6c, 0x9fe0d0][i % 3] }));
  b.position.set(x, y, z); scene.add(b); bulbs.push(b);
}
// 상자·통 소품
const crateM = M(0xc98d4e), crateD = M(0x8a5a2e);
function crate(x, z, s = 1, ry = 0) { const g = new THREE.Group(); box(s, s, s, crateM, 0, s / 2, 0, g); box(s * 1.04, s * 0.12, s * 1.04, crateD, 0, s * 0.94, 0, g); box(s * 1.04, s * 0.12, s * 1.04, crateD, 0, s * 0.06, 0, g); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g; }
crate(-5.6, -6, 1.3, 0.3); crate(-5.9, -7.6, 1, -0.2); crate(-5.5, -6.1, 0.8, 0.6).position.y = 1.3;
crate(5.7, -8, 1.4, -0.3); crate(5.4, -5.6, 0.9, 0.4); crate(6, -11, 1.2, 0.1); crate(-6, -12, 1.2, 0.2);
for (const [x, z, c] of [[-4.6, -9.5, 0xe89a7a], [4.5, -10.5, 0x7cc7c0], [6.2, -6.6, 0xe9c46a]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 14), M(c)); m.position.set(x, 0.55, z); scene.add(m); }
// 사격 선(카운터)
box(18, 0.9, 0.5, M(0x6b4424), 0, 0.45, -2.2); box(18, 0.1, 0.8, M(0xd9a566), 0, 0.95, -2.2);

// ───────── 표적 4개 ─────────
const LETTERS = ['A', 'B', 'C', 'D'];
const BW = 1.8, BH = 1.12, TW = 720, TH = 448;
const targets = [];
const COLORS = { idle: ['#fff6e2', '#5b3a20', '#3b2616'], ok: ['#3f9d5a', '#1f5c33', '#ffffff'], no: ['#d2523f', '#7d2a1f', '#ffffff'], dim: ['#cdbfa6', '#6b5540', '#6b5540'] };

function drawBoard(t, text, mode = 'idle') {
  const x = t.ctx, [bg, edge, ink] = COLORS[mode];
  x.clearRect(0, 0, TW, TH);
  x.fillStyle = edge; x.fillRect(0, 0, TW, TH);
  x.fillStyle = bg; roundRect(x, 16, 16, TW - 32, TH - 32, 34); x.fill();
  // 글자 표식
  x.fillStyle = mode === 'idle' ? '#d2523f' : 'rgba(0,0,0,.25)';
  x.beginPath(); x.arc(84, 84, 50, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = `64px Jua, 'Malgun Gothic', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(LETTERS[t.i], 84, 90);
  // 보기 글
  x.fillStyle = ink;
  const maxW = TW - 96;
  let size = 104, lines;
  for (; size >= 48; size -= 6) { x.font = `${size}px Jua, 'Malgun Gothic', sans-serif`; lines = wrap(x, text, maxW); if (lines.length * size * 1.16 <= TH - 150 && lines.every(l => x.measureText(l).width <= maxW)) break; }
  const lh = size * 1.16, y0 = TH / 2 + 34 - (lines.length - 1) * lh / 2;
  lines.forEach((l, k) => x.fillText(l, TW / 2, y0 + k * lh));
  t.tex.needsUpdate = true;
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function wrap(x, text, maxW) {
  const out = []; let cur = '';
  for (const w of text.split(' ')) {
    const tryL = cur ? cur + ' ' + w : w;
    if (x.measureText(tryL).width <= maxW) { cur = tryL; continue; }
    if (cur) out.push(cur);
    cur = w;
    while (x.measureText(cur).width > maxW && cur.length > 1) { let k = cur.length - 1; while (k > 1 && x.measureText(cur.slice(0, k)).width > maxW) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); }
  }
  if (cur) out.push(cur);
  return out;
}

const poleM = M(0x4a3020), baseM = M(0x3a2312);
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(); scene.add(g);
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const edge = M(0x5b3a20);
  const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.1), [edge, edge, edge, edge, new THREE.MeshBasicMaterial({ map: tex }), edge]);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), poleM);
  box(0.7, 0.1, 0.5, baseM, 0, 0.05, 0, g);
  g.add(board, pole);
  const t = { i, g, board, pole, tex, ctx: c.getContext('2d'), fall: 1, cur: 1, spin: 0, shake: 0, text: '' };
  board.userData.t = t; targets.push(t);
}

// ───────── 응원석 (다락방 식구들) ─────────
const loader = new THREE.TextureLoader();
const fans = CAST.map((c, k) => {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.35, fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.visible = false; scene.add(m);
  const f = { c, m, ar: 0.6, jump: 0, phase: k * 0.9, h: 1.2 };
  loader.load(img(c.id), tex => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; f.ar = tex.image.width / tex.image.height; m.visible = true; layout(); });
  return f;
});

// ───────── 총 (카메라에 붙어 있어요) ─────────
const gun = new THREE.Group(); camera.add(gun);
box(0.11, 0.13, 0.62, M(0x3b2a20), 0, 0, -0.1, gun);
box(0.07, 0.07, 0.4, M(0x8a8f96), 0, 0.02, -0.55, gun);
box(0.115, 0.03, 0.4, M(0xf2a33a), 0, -0.035, -0.1, gun);
box(0.09, 0.2, 0.11, M(0x6b4424), 0, -0.14, 0.12, gun).rotation.x = 0.3;
box(0.05, 0.06, 0.05, M(0xd2523f), 0, 0.09, -0.36, gun);
const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, -0.78); gun.add(muzzle);
const flash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0 })); muzzle.add(flash);
const gunHome = new THREE.Vector3(); let recoil = 0; const aim = { x: 0, y: 0 }, aimCur = { x: 0, y: 0 };

// ───────── 탄 자국·파편 ─────────
const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 })); scene.add(tracer);
const bits = [];
const bitG = new THREE.BoxGeometry(0.09, 0.09, 0.09);
function burst(p, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(bitG, new THREE.MeshBasicMaterial({ color })); m.position.copy(p); scene.add(m);
    bits.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1, Math.random() * 3 + 0.5), life: 0.8 });
  }
}

// ───────── 화면 크기에 맞춰 배치 ─────────
let portrait = false, TZ = -9;
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  portrait = w / h < 1.1;
  let pos;
  if (portrait) {
    // 좁은 화면: 표적을 2×2로, 화면 폭에 맞춰 거리 조절
    camera.fov = 64; TZ = -Math.max(6.2, 2.05 / (Math.tan(THREE.MathUtils.degToRad(32)) * camera.aspect));
    pos = [[-0.98, 3.15], [0.98, 3.15], [-0.98, 1.85], [0.98, 1.85]];
    camera.position.set(0, 1.7, 0);
    gunHome.set(0.2, -0.36, -0.75);
  } else {
    camera.fov = 52; TZ = -9;
    pos = [-3.15, -1.05, 1.05, 3.15].map(x => [x, 2.35]);
    camera.position.set(0, 1.7, 0);
    gunHome.set(0.3, -0.32, -0.8);
  }
  camera.updateProjectionMatrix();
  // 문제 카드 바로 아래에 표적 윗줄이 오도록 카메라 고개 각도를 맞춰요
  const cardB = $('card').getBoundingClientRect().bottom, topPx = (cardB > 0 ? cardB : h * 0.27) + 14, topY = pos[0][1] + BH / 2;
  let lo = 0, hi = 14;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2; camera.lookAt(0, mid, TZ); camera.updateMatrixWorld(true);
    tmp.set(0, topY, TZ).project(camera);
    if ((1 - tmp.y) / 2 * h < topPx) lo = mid; else hi = mid;
  }
  targets.forEach((t, i) => { const [x, y] = pos[i]; t.g.position.set(x, 0, TZ); t.board.position.y = y; t.pole.scale.y = y - BH / 2; t.pole.position.y = (y - BH / 2) / 2; t.pole.position.z = -0.07; });
  // 응원석: 표적 뒤 바닥에 한 줄
  const fz = TZ - 2.6, span = portrait ? Math.min(2.3, -fz * Math.tan(THREE.MathUtils.degToRad(32)) * camera.aspect * 0.9) : 4.4;
  fans.forEach((f, k) => { f.h = portrait ? 1.05 : 1.35; f.m.scale.set(f.h * f.ar, f.h, 1); f.x = -span + (2 * span) * (k / (fans.length - 1)); f.z = fz - (k % 2) * 0.35; });
}
window.addEventListener('resize', layout);

// ───────── 게임 상태 ─────────
let state = 'load', deck = [], qi = 0, cur = null, timeLeft = TIME, score = 0, combo = 0, maxCombo = 0, hits = 0, hosts = [], host = null, fbAt = 0, lastTick = 0;
const best = () => +(localStorage.getItem(BEST_KEY) || 0);

function startGame() {
  ac();
  const pool = { 1: [], 2: [], 3: [] };
  shuffle(QUESTIONS).forEach(q => pool[q.lv || 1].push(q));
  deck = PLAN.map(lv => pool[lv].pop() || pool[1].pop() || pool[2].pop() || pool[3].pop());
  hosts = shuffle(CAST);
  qi = 0; score = 0; combo = 0; maxCombo = 0; hits = 0;
  $('start').hidden = true; $('result').hidden = true; $('hud').style.display = 'flex'; $('cross').style.display = 'block';
  setHud(); layout(); nextQuestion();
}
function setHud() {
  $('n').textContent = Math.min(qi + 1, ROUND); $('score').textContent = score.toLocaleString();
  $('combo').textContent = combo; $('p-combo').classList.toggle('on', combo >= 2);
}
function nextQuestion() {
  $('fb').className = '';
  if (qi >= ROUND) return endGame();
  state = 'swap';
  targets.forEach(t => { t.fall = 1; });
  const q = deck[qi]; host = hosts[qi % hosts.length];
  const order = shuffle([0, 1, 2, 3]);
  cur = { q, order, correct: order.indexOf(0) };
  $('q').textContent = q.q; $('cat').textContent = `${LV_NAME[q.lv || 1]} · ${q.cat}`; $('cat').dataset.lv = q.lv || 1;
  $('host-img').src = img(host.id); $('host-name').textContent = `${host.name}의 문제`;
  $('timer').style.transform = 'scaleX(1)'; $('timer').classList.remove('low');
  setHud();
  setTimeout(() => {
    targets.forEach((t, i) => { t.text = q.a[order[i]]; t.spin = 0; t.board.rotation.y = 0; drawBoard(t, t.text); t.fall = 0; });
    sPop(); timeLeft = TIME; state = 'ask';
  }, 380);
}
function answer(i, sx, sy) {
  if (state !== 'ask') return;
  state = 'fb'; fbAt = performance.now();
  const ok = i === cur.correct, q = cur.q, right = q.a[0];
  targets.forEach((t, k) => drawBoard(t, t.text, k === cur.correct ? 'ok' : k === i ? 'no' : 'dim'));
  const fan = fans.find(f => f.c === host);
  if (ok) {
    hits++; combo++; maxCombo = Math.max(maxCombo, combo);
    const gain = Math.round((BASE + SPEED_MAX * timeLeft / TIME) * LV_MULT[q.lv || 1]) + Math.min(COMBO_MAX, (combo - 1) * COMBO_STEP);
    score += gain; sOk();
    targets[i].spin = 1; fans.forEach((f, k) => setTimeout(() => { f.jump = 1; }, k * 50));
    if (sx != null) popText(`+${gain}`, sx, sy);
    $('fb-head').textContent = combo >= 2 ? `명중! ${combo}연속` : '명중!';
  } else {
    combo = 0; sNo();
    if (i >= 0) targets[i].shake = 1;
    if (fan) fan.jump = 0.5;
    $('fb-head').textContent = i < 0 ? `시간 초과 · 정답은 ${right}` : `빗나감 · 정답은 ${right}`;
  }
  $('fb-img').src = img(host.id);
  $('fb-say').textContent = `${host.name} “${pick(ok ? host.ok : host.no)}”`;
  $('fb-ex').textContent = q.ex;
  $('fb-next').textContent = qi + 1 >= ROUND ? '화면을 누르면 결과 보기 ▶' : '화면을 누르면 다음 문제 ▶';
  $('fb').className = 'show ' + (ok ? 'ok' : 'no');
  qi++; setHud(); $('n').textContent = qi;
}
function endGame() {
  state = 'end'; $('hud').style.display = 'none'; $('cross').style.display = 'none';
  const prev = best(), isBest = score > prev; if (isBest) localStorage.setItem(BEST_KEY, score);
  const rank = hits >= 9 ? 'AI 저격수' : hits >= 7 ? '명사수' : hits >= 4 ? '다락방 사수' : '견습 사수';
  $('rank').textContent = rank; $('r-score').textContent = score.toLocaleString();
  $('r-hit').textContent = `${hits}/${ROUND}`; $('r-combo').textContent = maxCombo; $('r-best').textContent = Math.max(prev, score).toLocaleString();
  const c = pick(CAST); $('r-img').src = img(c.id);
  $('r-line').textContent = `${c.name} “${isBest && prev > 0 ? '신기록이에요! ' : ''}${hits >= 7 ? pick(c.ok) : pick(c.no)}”`;
  $('result').hidden = false; sFan();
  fans.forEach((f, k) => setTimeout(() => { f.jump = 1; }, k * 80));
}
function popText(text, x, y) { const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900); }

// ───────── 쏘기 ─────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function fireAt(sx, sy, forced = -1) {
  ndc.set(sx / window.innerWidth * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
  aim.x = ndc.x; aim.y = ndc.y; aimCur.x = ndc.x; aimCur.y = ndc.y;
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(targets.map(t => t.board), false)[0];
  const point = hit ? hit.point.clone() : ray.ray.at(16, tmp2).clone();
  const idx = forced >= 0 ? forced : hit ? hit.object.userData.t.i : -1;
  // 총구에서 맞은 곳까지 빛줄기
  placeGun(); muzzle.getWorldPosition(tmp);
  tracer.position.copy(tmp).lerp(point, 0.5); tracer.lookAt(point); tracer.scale.z = tmp.distanceTo(point); tracer.material.opacity = 0.9;
  flash.material.opacity = 1; recoil = 1; sShot();
  const cr = $('cross'); cr.style.left = sx + 'px'; cr.style.top = sy + 'px'; cr.classList.remove('bang'); void cr.offsetWidth; cr.classList.add('bang');
  if (idx >= 0 && state === 'ask') { burst(point, idx === cur.correct ? 0x7be08f : 0xff8a70); answer(idx, sx, sy); }
  else burst(point, 0xd9a566, 6);
}
function fireAtTarget(i) { // 키보드 1~4
  const t = targets[i]; t.board.getWorldPosition(tmp).project(camera);
  fireAt((tmp.x + 1) / 2 * window.innerWidth, (1 - tmp.y) / 2 * window.innerHeight, i);
}
function placeGun() {
  gun.position.copy(gunHome); gun.position.z += recoil * 0.07;
  gun.rotation.set(aimCur.y * 0.32 + recoil * 0.12 + 0.04, -aimCur.x * 0.5 * (portrait ? 0.6 : 1) - 0.05, 0);
  gun.updateMatrixWorld(true);
}
function advance() { if (state === 'fb' && performance.now() - fbAt > 550) nextQuestion(); }

canvas.addEventListener('pointerdown', e => {
  if (state === 'ask') fireAt(e.clientX, e.clientY);
  else if (state === 'fb') advance();
});
window.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  aim.x = e.clientX / window.innerWidth * 2 - 1; aim.y = -(e.clientY / window.innerHeight) * 2 + 1;
  const cr = $('cross'); cr.style.left = e.clientX + 'px'; cr.style.top = e.clientY + 'px';
});
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = e.key.toLowerCase(), i = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
  if (state === 'ask' && i >= 0 && k.length === 1) fireAtTarget(i);
  else if (state === 'fb' && (k === ' ' || k === 'enter')) advance();
  else if (k === 'm') toggleSound();
});
function toggleSound() { muted = !muted; $('sound').textContent = muted ? '🔇' : '🔊'; }
$('sound').addEventListener('pointerdown', e => { e.stopPropagation(); toggleSound(); });
$('go').addEventListener('click', startGame);
$('again').addEventListener('click', startGame);

// ───────── 매 프레임 ─────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const T = now / 1000;
  if (state === 'ask') {
    timeLeft -= dt;
    $('timer').style.transform = `scaleX(${Math.max(0, timeLeft / TIME)})`;
    if (timeLeft <= 3) { $('timer').classList.add('low'); if (Math.ceil(timeLeft) !== lastTick) { lastTick = Math.ceil(timeLeft); sTick(); } }
    if (timeLeft <= 0) answer(-1);
  }
  for (const t of targets) {
    t.cur += (t.fall - t.cur) * Math.min(1, dt * 11);
    t.g.rotation.x = -t.cur * Math.PI / 2 * 0.98;
    if (t.spin > 0) { t.spin = Math.max(0, t.spin - dt * 1.6); t.board.rotation.y = (1 - Math.pow(t.spin, 2)) * Math.PI * 2; }
    if (t.shake > 0) { t.shake = Math.max(0, t.shake - dt * 2.2); t.g.rotation.z = Math.sin(t.shake * 30) * 0.08 * t.shake; } else t.g.rotation.z = 0;
  }
  for (const f of fans) {
    if (f.jump > 0) f.jump = Math.max(0, f.jump - dt * 1.7);
    const hop = Math.abs(Math.sin(f.jump * Math.PI * 2)) * 0.5 * (f.jump > 0 ? 1 : 0);
    f.m.position.set(f.x || 0, f.h / 2 + hop + Math.sin(T * 1.6 + f.phase) * 0.02, f.z || -12);
    f.m.rotation.z = Math.sin(T * 1.3 + f.phase) * 0.035;
  }
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i]; b.life -= dt; b.v.y -= 9 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 8; b.m.rotation.y += dt * 6;
    if (b.life <= 0) { scene.remove(b.m); b.m.material.dispose(); bits.splice(i, 1); }
  }
  bulbs.forEach((b, i) => b.scale.setScalar(1 + Math.sin(T * 2 + i) * 0.15));
  aimCur.x += (aim.x - aimCur.x) * Math.min(1, dt * 12); aimCur.y += (aim.y - aimCur.y) * Math.min(1, dt * 12);
  recoil = Math.max(0, recoil - dt * 6); placeGun();
  gun.position.y += Math.sin(T * 1.8) * 0.004;
  flash.material.opacity = Math.max(0, flash.material.opacity - dt * 14);
  tracer.material.opacity = Math.max(0, tracer.material.opacity - dt * 7);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ───────── 시작 ─────────
async function boot() {
  $('cast').innerHTML = CAST.map(c => `<img src="${img(c.id)}" alt="${c.name}">`).join('');
  try { await Promise.race([document.fonts.load("64px Jua"), new Promise(r => setTimeout(r, 2500))]); } catch { /* 글꼴 없이도 진행 */ }
  layout();
  targets.forEach(t => drawBoard(t, ''));
  const b = best(); $('best').textContent = b ? `내 최고 점수 ${b.toLocaleString()}점` : '소리가 나요 · 조용한 곳에선 🔊를 눌러 꺼 주세요';
  $('load').remove(); $('start').hidden = false; state = 'start';
  requestAnimationFrame(frame);
}
boot();
