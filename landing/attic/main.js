import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { STORIES, HOSTS, EBOOK_URL } from '/attic/stories.js?v=8';
import { makeProp, makeStand } from '/attic/props.js?v=3';

const $ = (s) => document.querySelector(s);
const SEEN_KEY = 'attic-seen-v1';

/* ---------- 기본 무대 ---------- */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1210);
scene.fog = new THREE.Fog(0x1a1210, 9, 18);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.minDistance = 2.2;
controls.maxDistance = 10;
controls.minPolarAngle = 0.95;
controls.maxPolarAngle = 1.5;
controls.minAzimuthAngle = -0.75;
controls.maxAzimuthAngle = 0.75;

const isPortrait = () => window.innerWidth / window.innerHeight < 0.8;
const homeTarget = () => new THREE.Vector3(0, window.innerWidth / window.innerHeight < 0.8 ? 1.25 : 0.85, -0.7);
// 화면이 좁을수록 시야를 넓히고 뒤로 물러나서 방 양옆 물건이 다 들어오게
const fitFov = () => {
  const a = window.innerWidth / window.innerHeight;
  camera.fov = a < 0.8 ? 66 : 50;
  camera.updateProjectionMatrix();
};
const homePos = () => {
  const a = window.innerWidth / window.innerHeight;
  if (a < 0.8) return new THREE.Vector3(0, 3.0, 5.6 + (0.8 - a) * 9);
  const back = a >= 1.4 ? 0 : (1.4 - a) * 4.2;
  return new THREE.Vector3(0, 2.3 + back * 0.15, 5.0 + back);
};
fitFov();
camera.position.copy(homePos());
controls.target.copy(homeTarget());

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });

/* ---------- 다락방 ---------- */
const W = 3.6;        // 방 반폭
const KNEE = 1.0;     // 옆벽 높이
const RIDGE = 3.7;    // 지붕 꼭대기
const BACK = -3.0;    // 뒷벽 z
const FRONT = 9.5;    // 바닥 앞끝 z (카메라 아래까지 깔아서 화면 아래가 비지 않게)
const WIN = { x: 0, y: 1.55, w: 1.2, h: 0.95 };

// 바닥 널빤지
const plankColors = [0x8a5a3b, 0x7d5034, 0x94633f, 0x845637];
const PLANK = 0.4;
for (let i = 0, x = -W; x < W - 0.01; x += PLANK, i++) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(PLANK - 0.015, 0.06, FRONT - BACK), mat(plankColors[i % 4]));
  p.position.set(x + PLANK / 2, -0.03, (FRONT + BACK) / 2);
  scene.add(p);
}

// 뒷벽: 오각형에 창문 구멍
const wallShape = new THREE.Shape();
wallShape.moveTo(-W, 0); wallShape.lineTo(W, 0); wallShape.lineTo(W, KNEE); wallShape.lineTo(0, RIDGE); wallShape.lineTo(-W, KNEE); wallShape.closePath();
const hole = new THREE.Path();
hole.moveTo(WIN.x - WIN.w / 2, WIN.y - WIN.h / 2); hole.lineTo(WIN.x + WIN.w / 2, WIN.y - WIN.h / 2);
hole.lineTo(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2); hole.lineTo(WIN.x - WIN.w / 2, WIN.y + WIN.h / 2); hole.closePath();
wallShape.holes.push(hole);
const backWall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape), mat(0xc9a27c, { side: THREE.DoubleSide }));
backWall.position.z = BACK;
scene.add(backWall);

// 옆벽(낮은 무릎벽)
for (const s of [-1, 1]) {
  const kw = new THREE.Mesh(new THREE.PlaneGeometry(FRONT - BACK, KNEE), mat(0xb88f6a, { side: THREE.DoubleSide }));
  kw.rotation.y = Math.PI / 2; kw.position.set(s * W, KNEE / 2, (FRONT + BACK) / 2);
  scene.add(kw);
}

// 지붕 경사면
const slopeLen = Math.hypot(W, RIDGE - KNEE);
const slopeAng = Math.atan2(RIDGE - KNEE, W);
for (const s of [-1, 1]) {
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, FRONT - BACK), mat(0xa4785a, { side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.add(roof);
  roof.position.x = -s * slopeLen / 2;
  pivot.position.set(s * W, KNEE, (FRONT + BACK) / 2);
  pivot.rotation.z = s * -slopeAng;
  scene.add(pivot);
  // 서까래
  for (let z = BACK + 0.6; z < FRONT; z += 1.1) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.12, 0.12), mat(0x5e3b25));
    r.position.set(s * W / 2, (KNEE + RIDGE) / 2 - 0.08, z);
    r.rotation.z = s * -slopeAng;
    scene.add(r);
  }
}
const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, FRONT - BACK), mat(0x5e3b25));
ridgeBeam.position.set(0, RIDGE - 0.12, (FRONT + BACK) / 2);
scene.add(ridgeBeam);

// 창문: 노을 하늘 + 창틀 + 덧창
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 64; skyCanvas.height = 128;
const sctx = skyCanvas.getContext('2d');
const grad = sctx.createLinearGradient(0, 0, 0, 128);
grad.addColorStop(0, '#5a4a8a'); grad.addColorStop(0.45, '#f08a5d'); grad.addColorStop(0.75, '#ffc27a'); grad.addColorStop(1, '#ffe2a8');
sctx.fillStyle = grad; sctx.fillRect(0, 0, 64, 128);
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false });
const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w * 1.6, WIN.h * 1.6), skyMat);
skyPlane.position.set(WIN.x, WIN.y, BACK - 0.35);
scene.add(skyPlane);
const sun = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false }));
sun.position.set(WIN.x + 0.25, WIN.y - 0.2, BACK - 0.3);
scene.add(sun);

const frameMat = mat(0x5a3a24);
const fr = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat); m.position.set(x, y, BACK + 0.02); scene.add(m); };
fr(WIN.w + 0.16, 0.08, WIN.x, WIN.y + WIN.h / 2 + 0.04);
fr(WIN.w + 0.3, 0.1, WIN.x, WIN.y - WIN.h / 2 - 0.05);
fr(0.08, WIN.h, WIN.x - WIN.w / 2 - 0.04, WIN.y);
fr(0.08, WIN.h, WIN.x + WIN.w / 2 + 0.04, WIN.y);
fr(0.04, WIN.h, WIN.x, WIN.y);
fr(WIN.w, 0.04, WIN.x, WIN.y);
// 창턱 (푸름이 자리 근처)
const sill = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.5, 0.06, 0.4), frameMat);
sill.position.set(WIN.x, WIN.y - WIN.h / 2 - 0.1, BACK + 0.2);
scene.add(sill);
// 창가 붙박이 의자 + 방석 (푸름이 자리)
const bench = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.46, 0.55), mat(0x8b5e3c));
bench.position.set(WIN.x, 0.23, BACK + 0.28);
scene.add(bench);
const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.48), mat(0x5d7fa6));
cushion.position.set(WIN.x, 0.5, BACK + 0.29);
scene.add(cushion);

// 덧창: 경첩 축(pivot)으로 회전. 처음엔 반쯤 닫힘, 다 보면 활짝.
const shutters = [];
for (const s of [-1, 1]) {
  const pivot = new THREE.Group();
  pivot.position.set(WIN.x + s * (WIN.w / 2 + 0.08), WIN.y, BACK + 0.08);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(WIN.w / 2, WIN.h + 0.05, 0.04), mat(0x6e8a6a));
  panel.position.x = -s * WIN.w / 4;
  pivot.add(panel);
  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(WIN.w / 2 - 0.06, 0.03, 0.02), mat(0x5a7356));
    slat.position.set(-s * WIN.w / 4, i * 0.17, 0.03);
    pivot.add(slat);
  }
  pivot.userData = { side: s, angle: 1.05, goal: 1.05 };
  scene.add(pivot);
  shutters.push(pivot);
}

// 소품: 러그, 상자, 책 더미, 전구
const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.02, 24), mat(0x7a3b3b));
rug.scale.z = 0.7; rug.position.set(0, 0.01, -0.1);
scene.add(rug);
const rugIn = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.022, 24), mat(0xc58a4a));
rugIn.scale.z = 0.7; rugIn.position.set(0, 0.012, -0.1);
scene.add(rugIn);
const clutter = [
  [0.5, 0.4, 0.45, -3.1, 0.2, -2.5, 0xb08458], [0.4, 0.3, 0.4, -3.15, 0.55, -2.45, 0xa47a50],
  [0.45, 0.35, 0.4, 3.15, 0.18, 0.2, 0xb08458], [0.3, 0.06, 0.22, -0.6, 0.03, 0.5, 0x3c5a7a],
  [0.28, 0.06, 0.2, -0.6, 0.09, 0.5, 0x8a3c3c], [0.26, 0.06, 0.2, -0.58, 0.15, 0.48, 0xd8b45a],
];
for (const [w, h, d, x, y, z, c] of clutter) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z); m.rotation.y = (x * 7) % 0.4;
  scene.add(m);
}
const bulbGroup = new THREE.Group();
const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 4), mat(0x222222));
cord.position.y = 0.5;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
bulbGroup.add(cord, bulb);
bulbGroup.position.set(0, RIDGE - 1.3, -0.4);
scene.add(bulbGroup);

/* ---------- 빛 ---------- */
scene.add(new THREE.HemisphereLight(0xffe0c0, 0x3a2418, 0.9));
const lamp = new THREE.PointLight(0xffc98a, 14, 9, 1.6);
lamp.position.copy(bulbGroup.position);
scene.add(lamp);
const sunset = new THREE.DirectionalLight(0xff9a5a, 1.4);
sunset.position.set(0.4, 2.2, BACK - 2);
sunset.target.position.set(0, 0, 1);
scene.add(sunset, sunset.target);
const fill = new THREE.DirectionalLight(0xbfd0ff, 0.35);
fill.position.set(0, 3, 6);
scene.add(fill);

/* ---------- 물건 ---------- */
const pickables = [];   // 클릭 판정용 메시
const items = [];       // { story, root, prop, ring, baseY, seen }
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(0.5, 'rgba(255,180,90,0.35)'); g.addColorStop(1, 'rgba(255,160,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const seen = new Set(loadSeen());

for (const story of STORIES) {
  const root = new THREE.Group();
  root.position.set(...story.pos);
  if (story.shelf > 0) root.add(makeStand(story.shelf));
  const prop = makeProp(story.id);
  prop.position.y = story.shelf + 0.03;
  root.add(prop);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = story.shelf + 0.012;
  root.add(ring);
  // 누르기 쉬운 투명 판정 상자
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = story.shelf + 0.3;
  root.add(hit);
  const item = { story, root, prop, ring, baseY: prop.position.y, phase: Math.random() * 6 };
  hit.userData.item = item;
  root.traverse((o) => { if (o.isMesh) o.userData.item = item; });
  pickables.push(hit);
  scene.add(root);
  items.push(item);
}

/* ---------- 푸름이·루나 (TRELLIS 3D 인형 또는 그림 등신대, 원점 = 발바닥, scale = 키) ---------- */
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
const hosts = {};
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
for (const [key, h] of Object.entries(HOSTS)) {
  const group = new THREE.Group();
  group.position.set(h.pos[0], h.seat, h.pos[2]);
  const body = new THREE.Group();   // 숨쉬기·고개 돌리기용
  group.add(body);
  if (h.stool) {   // 앉을 둥근 의자
    const stool = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), mat(0x7a4a2c));
    top.position.y = -0.03;
    stool.add(top);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, h.seat - 0.06, 5), mat(0x5e3b25));
      leg.position.set(Math.cos(a) * 0.13, -0.06 - (h.seat - 0.06) / 2, Math.sin(a) * 0.13);
      stool.add(leg);
    }
    group.add(stool);
  }
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -h.seat + 0.015;
  if (h.seat < 0.05 || h.stool) group.add(sh);
  // 불러오기 전에도 누를 수 있게 투명 판정 상자
  const tall = h.scale || 1;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, tall, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = tall / 2;
  hit.userData.host = key;
  group.add(hit);
  pickables.push(hit);
  if (h.img) {   // 그림 등신대: 흰 칼선 테두리 그림 + 뒤판 + 나무 받침
    const tall = h.scale || 1;
    const tex = new THREE.TextureLoader().load(h.img, (t) => {
      const w = tall * (t.image.width / t.image.height);
      front.scale.set(w, tall, 1);
      back.scale.set(w, tall, 1);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const front = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 }));
    // 뒤판: 같은 모양을 판지색으로 (뒤에서 보면 등신대 뒷면)
    const back = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0xb8956a, alphaMap: tex, transparent: true, alphaTest: 0.1, side: THREE.BackSide }));
    front.position.z = 0.003;
    front.userData.host = back.userData.host = key;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.22), mat(0x6e4529));
    stand.position.y = 0.025;
    body.add(front, back, stand);
  } else {
    gltfLoader.load(h.model, (gltf) => {
      const m = gltf.scene;
      m.scale.setScalar(h.scale || 1);
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.host = key;
        if (o.material) { o.material.side = THREE.FrontSide; }
      });
      body.add(m);
    }, undefined, (err) => console.warn(`${key} 인형을 못 불러왔어요`, err));
  }
  scene.add(group);
  hosts[key] = { ...h, group, body, line: 0, yaw: 0, yawGoal: null };
}

/* ---------- 말풍선 ---------- */
const bubbleEl = $('#bubble');
let bubbleAnchor = null, bubbleTimer = 0;
function say(hostKey, text, ms = 4200) {
  const h = hosts[hostKey];
  if (!h) return;
  bubbleEl.textContent = text;
  bubbleEl.classList.add('show');
  bubbleAnchor = new THREE.Vector3(h.pos[0], h.seat + (h.scale || 1) + 0.08, h.pos[2]);
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubbleEl.classList.remove('show'); bubbleAnchor = null; }, ms);
}
function hideBubble() {
  clearTimeout(bubbleTimer);
  bubbleEl.classList.remove('show');
  bubbleAnchor = null;
}
function placeBubble() {
  if (!bubbleAnchor) return;
  const v = bubbleAnchor.clone().project(camera);
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  const half = Math.min(bubbleEl.offsetWidth / 2, window.innerWidth / 2 - 12);
  bubbleEl.style.left = `${Math.min(Math.max(x, half + 12), window.innerWidth - half - 12)}px`;
  bubbleEl.style.top = `${Math.max(y, 70)}px`;
}

/* ---------- 카메라 이동 ---------- */
let tween = null;
function flyTo(pos, target, dur = 0.9) {
  tween = { fromP: camera.position.clone(), fromT: controls.target.clone(), toP: pos, toT: target, t: 0, dur };
}
let savedView = null;
function focusItem(item) {
  savedView = { p: camera.position.clone(), t: controls.target.clone() };
  hideBubble();
  const s = item.story;
  const center = new THREE.Vector3(s.pos[0], s.shelf + 0.3, s.pos[2]);
  const dir = new THREE.Vector3(s.pos[0] * -0.25, 0.55, 1).normalize();
  const wide = window.innerWidth / window.innerHeight >= 1.4;
  const dist = wide ? 2.4 : 3.3;
  const pos = center.clone().addScaledVector(dir, dist);
  // 아래쪽 카드 패널에 안 가리게, 시선을 아래로 → 물건이 화면 위쪽 빈 곳에 보임
  const target = center.clone().add(new THREE.Vector3(0, wide ? -0.45 : -0.9, 0));
  controls.enabled = false;
  flyTo(pos, target);
}
function unfocus() {
  const back = savedView || { p: homePos(), t: homeTarget() };
  flyTo(back.p, back.t);
  savedView = null;
}

/* ---------- 카드 패널 ---------- */
const panel = $('#panel');
const track = $('#track');
const dots = $('#dots');
let openItem = null;

function openPanel(item) {
  openItem = item;
  const s = item.story;
  $('#panel-thing').textContent = s.thing;
  $('#panel-name').textContent = s.name;
  track.innerHTML = '';
  dots.innerHTML = '';
  s.cards.forEach((c, i) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `<div class="step">${i + 1} / ${s.cards.length}</div><h3></h3>${c.quote ? '<blockquote></blockquote>' : ''}<p></p>`;
    el.querySelector('h3').textContent = c.title;
    if (c.quote) el.querySelector('blockquote').textContent = c.quote;
    el.querySelector('p').textContent = c.body;
    if (i === s.cards.length - 1) {
      const a = document.createElement('a');
      a.className = 'try';
      a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `직접 써보기 → ${s.name}`;
      el.appendChild(a);
    }
    track.appendChild(el);
    const d = document.createElement('button');
    d.className = 'dot'; d.setAttribute('aria-label', `${i + 1}번 카드`);
    d.addEventListener('click', () => goCard(i));
    dots.appendChild(d);
  });
  track.scrollLeft = 0;
  cur = 0;
  updateDots();
  panel.classList.add('open');
  document.body.classList.add('reading');
  markSeen(s.id);
}
function closePanel() {
  if (!openItem) return;
  openItem = null;
  panel.classList.remove('open');
  document.body.classList.remove('reading');
  unfocus();
  if (seen.size === items.length && !doneShown) setTimeout(showDone, 900);
}
let cur = 0;   // 지금 보고 있는(또는 넘어가는 중인) 카드 번호
function cardIndex() { return cur; }
function goCard(i) {
  const n = openItem?.story.cards.length ?? 1;
  cur = Math.max(0, Math.min(n - 1, i));
  track.scrollTo({ left: cur * track.clientWidth, behavior: 'smooth' });
  updateDots();
}
function updateDots() {
  const i = cur;
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  $('#next').textContent = i >= (openItem?.story.cards.length ?? 1) - 1 ? '닫기' : '다음 →';
}
// 손가락으로 넘긴 경우: 스크롤이 멈춘 자리로 번호 맞추기
let scrollEndTimer = 0;
track.addEventListener('scroll', () => {
  clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => { cur = Math.round(track.scrollLeft / track.clientWidth); updateDots(); }, 120);
});
$('#next').addEventListener('click', () => {
  const n = openItem?.story.cards.length ?? 0;
  const i = cardIndex();
  if (i >= n - 1) closePanel(); else goCard(i + 1);
});
$('#close').addEventListener('click', closePanel);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePanel(); closeDone(); }
  if (openItem && e.key === 'ArrowRight') goCard(cardIndex() + 1);
  if (openItem && e.key === 'ArrowLeft') goCard(cardIndex() - 1);
});

/* ---------- 본 기록 ---------- */
function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}
function markSeen(id) {
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* 저장 못 해도 진행 */ }
  updateProgress();
}
function updateProgress() {
  const n = items.filter((it) => seen.has(it.story.id)).length;
  $('#progress-text').textContent = `${items.length}개 중 ${n}개 봤어요`;
  $('#progress-bar').style.width = `${(n / items.length) * 100}%`;
  if (n === items.length) openWindow();
}

/* ---------- 다 보면: 창문 활짝 ---------- */
let doneShown = false;
function openWindow() {
  shutters.forEach((s) => { s.userData.goal = 1.9; });
  sunset.intensity = 2.4;
  lamp.intensity = 16;
  if (hosts.pureum) hosts.pureum.yawGoal = 2.4;   // 열린 창밖을 바라봄
}
function showDone() {
  doneShown = true;
  $('#done').classList.add('open');
  if (hosts.pureum) say('pureum', hosts.pureum.done, 6000);
}
function closeDone() { $('#done').classList.remove('open'); }
$('#done-close').addEventListener('click', closeDone);
$('#ebook').href = EBOOK_URL;
$('#reset').addEventListener('click', () => {
  seen.clear();
  try { localStorage.removeItem(SEEN_KEY); } catch { /* 무시 */ }
  doneShown = false;
  shutters.forEach((s) => { s.userData.goal = 1.05; });
  sunset.intensity = 1.4; lamp.intensity = 14;
  if (hosts.pureum) hosts.pureum.yawGoal = null;
  closeDone();
  updateProgress();
});

/* ---------- 누르기 ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit?.object.userData;
}
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
  downAt = null;
  if (!document.body.classList.contains('inside')) return;
  const u = pick(e);
  if (openItem) { if (!u?.item || u.item !== openItem) closePanel(); return; }
  if (u?.host) {
    const h = hosts[u.host];
    say(u.host, h.lines[h.line % h.lines.length]);
    h.line++;
    hintDone();
  } else if (u?.item) {
    hintDone();
    focusItem(u.item);
    if (u.item.story.host && hosts[u.item.story.host]) {
      const h = hosts[u.item.story.host];
      say(u.item.story.host, h.lines[h.line % h.lines.length], 3800);
      h.line++;
      setTimeout(() => openPanel(u.item), 1300);
    } else {
      setTimeout(() => openPanel(u.item), 450);
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const u = pick(e);
  canvas.style.cursor = u?.item || u?.host ? 'pointer' : 'grab';
});
function hintDone() { $('#hint').classList.add('gone'); }

/* ---------- 소리: 잔잔한 오르골 + 따뜻한 패드 (파일 없이 즉석 합성) ---------- */
let audio = null;
function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const verb = ctx.createDelay(); verb.delayTime.value = 0.32;
  const fb = ctx.createGain(); fb.gain.value = 0.35;
  verb.connect(fb); fb.connect(verb); verb.connect(master);
  const chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
  const melody = [659.25, 587.33, 523.25, 493.88, 523.25, 587.33, 440, 493.88];
  let step = 0;
  function pad(freqs, t) {
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 6);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 6.1);
    }
  }
  function bell(f, t) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); g.connect(master); g.connect(verb); o.start(t); o.stop(t + 1.9);
  }
  function tick() {
    const t = ctx.currentTime + 0.05;
    pad(chords[step % chords.length], t);
    for (let k = 0; k < 2; k++) if (Math.random() < 0.8) bell(melody[(step * 2 + k) % melody.length], t + 1 + k * 1.6 + Math.random() * 0.3);
    step++;
  }
  tick();
  const timer = setInterval(tick, 5000);
  audio = { ctx, master, timer, on: false };
}
function setSound(on) {
  startAudio();
  if (!audio) return;
  audio.on = on;
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
  audio.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, audio.ctx.currentTime + 0.8);
  $('#sound').setAttribute('aria-pressed', String(on));
  $('#sound').textContent = on ? '♪' : '♪̸';
}
$('#sound').addEventListener('click', () => setSound(!(audio && audio.on)));

/* ---------- 입장 ---------- */
$('#enter').addEventListener('click', () => {
  document.body.classList.add('inside');
  $('#intro').classList.add('gone');
  setSound(true);
  setTimeout(() => { if (hosts.pureum) say('pureum', hosts.pureum.lines[0]); hosts.pureum && hosts.pureum.line++; }, 1400);
});

/* ---------- 매 프레임 ---------- */
const clock = new THREE.Clock();
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (tween) {
    tween.t += dt / tween.dur;
    const k = ease(Math.min(tween.t, 1));
    camera.position.lerpVectors(tween.fromP, tween.toP, k);
    controls.target.lerpVectors(tween.fromT, tween.toT, k);
    if (tween.t >= 1) { tween = null; if (!openItem && !savedView) controls.enabled = true; }
  }
  // 물건 앞으로 다가간 동안엔 회전 제한(각도·거리)에 안 걸리게 직접 바라보기만
  if (controls.enabled) controls.update(); else camera.lookAt(controls.target);

  for (const it of items) {
    const isSeen = seen.has(it.story.id);
    it.prop.position.y = it.baseY + (isSeen ? 0.01 : 0.04 + Math.sin(t * 1.6 + it.phase) * 0.035);
    it.prop.rotation.y = Math.sin(t * 0.5 + it.phase) * 0.25;
    it.ring.material.opacity = isSeen ? 0.25 : 0.55 + Math.sin(t * 2.2 + it.phase) * 0.3;
    it.prop.traverse((o) => { if (o.userData.flicker) o.scale.y = 1 + Math.sin(t * 12 * o.userData.flicker) * 0.12; });
  }
  for (const h of Object.values(hosts)) {
    // 평소엔 카메라 쪽으로 살짝 몸 돌리기, yawGoal 이 있으면 그쪽(창밖)으로
    const toCam = Math.atan2(camera.position.x - h.group.position.x, camera.position.z - h.group.position.z) * 0.45;
    const goal = h.yawGoal ?? toCam;
    h.yaw += (goal - h.yaw) * Math.min(1, dt * 2.5);
    h.body.rotation.y = h.yaw;
    h.body.position.y = Math.sin(t * 1.4 + h.pos[0]) * 0.008;
    h.body.scale.y = 1 + Math.sin(t * 1.4 + h.pos[0]) * 0.006;
  }
  for (const s of shutters) {
    s.userData.angle += (s.userData.goal - s.userData.angle) * Math.min(1, dt * 1.5);
    s.rotation.y = s.userData.side * s.userData.angle;
  }
  lamp.intensity += Math.sin(t * 3.1) * 0.05;
  placeBubble();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  fitFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (openItem) goCard(cardIndex());
});

updateProgress();
if (seen.size === items.length) doneShown = true; // 이미 다 본 사람은 축하창 다시 안 띄움
frame();

// 확인용 훅 (콘솔에서 attic.open('tarot') 등)
window.attic = {
  open: (id) => { const it = items.find((i) => i.story.id === id); if (it) { focusItem(it); openPanel(it); } },
  close: closePanel,
  say,
  peek: (p, t) => { controls.enabled = false; savedView = { p: camera.position.clone(), t: controls.target.clone() }; flyTo(new THREE.Vector3(...p), new THREE.Vector3(...t), 0.01); },
  home: unfocus,
};
