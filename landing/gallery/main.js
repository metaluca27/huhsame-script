import * as THREE from 'three';
import { ARTWORKS } from '/gallery/artworks.js';
import { createCampfire } from '/gallery/campfire.js';
import { setupVR } from '/gallery/vr.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const N = ARTWORKS.length;
const RING = 9;          // 그림이 둘러선 원의 반지름(m)
const ART_Y = 1.75;      // 그림 중심 높이
const ART_H = 2.1;       // 그림 기본 높이
const ART_MAX_W = 2.4;   // 가로로 긴 그림의 최대 폭
const FOV = 50;

/* ---------- 기본 무대 ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1026, 0.02);
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 500);
// VR에서 순간이동할 때 옮기는 '몸통'. 평소엔 원점에 가만히 있어서 기존 카메라 연출엔 영향 없음
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

const rand = (a, b) => a + Math.random() * (b - a);
const polar = (angle, radius, y) => new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);

/* ---------- 하늘·별·달 ---------- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 horizon = vec3(0.10, 0.12, 0.26);
        vec3 mid = vec3(0.035, 0.05, 0.13);
        vec3 top = vec3(0.01, 0.015, 0.05);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.25, h));
        c = mix(c, top, smoothstep(0.25, 0.9, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
scene.add(sky);

const starCount = 2200;
const starPos = new Float32Array(starCount * 3);
const starSize = new Float32Array(starCount);
const starPhase = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
  const v = new THREE.Vector3(rand(-1, 1), rand(0.06, 1), rand(-1, 1)).normalize().multiplyScalar(250);
  starPos.set([v.x, v.y, v.z], i * 3);
  starSize[i] = Math.random() < 0.06 ? rand(2.6, 4) : rand(0.8, 2);
  starPhase[i] = rand(0, Math.PI * 2);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));
const starMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
  vertexShader: `attribute float size; attribute float phase; uniform float uTime; uniform float uPR; varying float vA;
    void main(){ vA = 0.55 + 0.45 * sin(uTime * (0.8 + phase * 0.4) + phase * 7.0);
      gl_PointSize = size * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vec3(0.95, 0.93, 1.0), a * vA); }`,
});
scene.add(new THREE.Points(starGeo, starMat));

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const moonPos = new THREE.Vector3(-90, 85, -160);
const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf6efd6, fog: false }));
moon.position.copy(moonPos); scene.add(moon);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture('rgba(220,225,255,0.55)', 'rgba(220,225,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
moonGlow.position.copy(moonPos); moonGlow.scale.setScalar(55); scene.add(moonGlow);

/* ---------- 땅·산·나무·풀 ---------- */
scene.add(new THREE.HemisphereLight(0x4a5a9a, 0x0c140c, 0.55));
const moonLight = new THREE.DirectionalLight(0x9db0ff, 0.35);
moonLight.position.copy(moonPos); scene.add(moonLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(160, 64),
  new THREE.MeshStandardMaterial({ color: 0x1c2b1d, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2; scene.add(ground);

// 멀리 둘러선 산 능선
{
  const seg = 160, R = 120, pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const h = 10 + 7 * Math.sin(a * 3 + 1) + 4 * Math.sin(a * 7 + 2) + 2 * Math.sin(a * 17);
    pos.push(Math.sin(a) * R, -2, Math.cos(a) * R, Math.sin(a) * R, Math.max(3, h), Math.cos(a) * R);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x060914, side: THREE.DoubleSide })));
}

// 원 바깥 나무 실루엣
{
  const count = 46;
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ color: 0x0e1c15, roughness: 1 }), count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), r = rand(15, 34), h = rand(3.5, 7.5), w = h * rand(0.28, 0.38);
    m.compose(polar(a, r, h / 2), new THREE.Quaternion(), new THREE.Vector3(w, h, w));
    trees.setMatrixAt(i, m);
  }
  scene.add(trees);
}

// 풀: Poly Haven 'Grass Medium 02'(CC0) 실사 풀포기 5종을 여러 번 복사해 심는다.
// (예전 원뿔 풀은 못처럼 보여서 교체) 폰·VR에서도 버티게 불 근처는 촘촘히, 멀리는 듬성듬성.
new GLTFLoader().load('/gallery/models/grass/grass_medium_02.gltf', (gltf) => {
  const parts = [];
  gltf.scene.traverse((o) => { if (o.isMesh) parts.push(o); });
  const COUNT = 360;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
  parts.forEach((part, k) => {
    const mat = part.material;
    mat.transparent = false; mat.alphaTest = 0.45; mat.depthWrite = true; mat.side = THREE.DoubleSide;   // 잎 가장자리는 오려내기 방식
    mat.color.multiplyScalar(0.85);
    const n = Math.round(COUNT / parts.length);
    const inst = new THREE.InstancedMesh(part.geometry, mat, n);
    for (let i = 0; i < n; i++) {
      // 불 둘레(2~12m)에 몰리게: 제곱근 대신 거듭제곱으로 가까운 쪽 비중 높임
      const r = 1.9 + Math.pow(Math.random(), 1.6) * 22, a = rand(0, Math.PI * 2);
      if (Math.abs(r - RING) < 0.7) { i--; continue; }   // 그림 받침대 바로 밑은 비움
      const s = rand(1.6, 2.8);
      e.set(0, rand(0, Math.PI * 2), 0); q.setFromEuler(e);
      v.copy(polar(a, r, 0));
      m.compose(v, q, new THREE.Vector3(s, s * rand(0.8, 1.2), s));
      inst.setMatrixAt(i, m);
    }
    inst.frustumCulled = false;
    scene.add(inst);
  });
});

/* ---------- 모닥불 ---------- */
const campfire = createCampfire({ renderer, camera });
scene.add(campfire.group);
// 통나무 의자: 나무껍질 사진 + 끝은 나이테 사진 (예전엔 단색이라 크레파스 같았음)
{
  const tl = new THREE.TextureLoader();
  const tex = (f, srgb, rx, ry) => {
    const t = tl.load(`/gallery/tex/${f}`); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
  };
  const side = new THREE.MeshStandardMaterial({
    map: tex('bark_diffuse.jpg', true, 3, 4.5), normalMap: tex('bark_nor_gl.jpg', false, 3, 4.5),
    roughnessMap: tex('bark_arm.jpg', false, 3, 4.5), roughness: 1, color: 0x8a7868,
  });
  const end = new THREE.MeshStandardMaterial({ map: tex('wood_end.jpg', true, 1, 1), roughness: 0.95, color: 0xb59c80 });
  const bench = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.2, 28, 1), [side, end, end]);
  bench.rotation.z = Math.PI / 2; bench.position.set(-2.4, 0.22, 1.3); bench.rotation.y = 0.9; scene.add(bench);
}

/* ---------- 그림 걸기 ---------- */
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const enterBtn = document.getElementById('enter');
manager.onProgress = (_url, loaded, total) => { enterBtn.textContent = `그림 거는 중… ${loaded} / ${total}`; };
manager.onLoad = () => { enterBtn.disabled = false; enterBtn.textContent = '입장하기'; };
manager.onError = () => { enterBtn.disabled = false; enterBtn.textContent = '입장하기'; };

const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, emissive: 0x8a857c, roughness: 0.7 });
const legMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
const artPieces = ARTWORKS.map((art, i) => {
  const angle = (i / N) * Math.PI * 2;
  const group = new THREE.Group();
  group.position.copy(polar(angle, RING, ART_Y));
  group.lookAt(0, ART_Y, 0);
  scene.add(group);
  const piece = { ...art, index: i, angle, w: ART_H * 0.75, h: ART_H, group, mesh: null };

  loader.load(`/gallery/art/${art.file}`, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const aspect = tex.image.width / tex.image.height;
    let w = ART_H * aspect, h = ART_H;
    if (w > ART_MAX_W) { w = ART_MAX_W; h = w / aspect; }
    piece.w = w; piece.h = h;

    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.z = 0.012; mesh.userData.index = i;
    group.add(mesh); piece.mesh = mesh;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08), frameMat);
    frame.position.z = -0.03; group.add(frame);
    const legH = ART_Y - h / 2 - 0.1;
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, legH, 0.06), legMat);
      leg.position.set(side * w * 0.32, -h / 2 - 0.1 - legH / 2, -0.06); group.add(leg);
    });
    if (mode === 'art') goTo(current, true);   // 실제 크기를 알게 되면 거리 다시 맞추기
  });
  return piece;
});

/* ---------- 카메라 상태: 위치·바라보는 곳을 원 좌표로 ---------- */
// { a, r, y } = 카메라 위치, { ta, tr, ty } = 바라보는 점
let mode = 'intro';
let current = 0;
const cam = { a: Math.PI * 0.85, r: 17, y: 8.5, ta: 0, tr: 0, ty: 0.6 };
let tween = null;

function artState(i) {
  const p = artPieces[i];
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const aspect = camera.aspect;
  const byH = (p.h * 1.75) / (2 * tanHalf);
  const byW = (p.w * 1.35) / (2 * tanHalf * aspect);
  const d = THREE.MathUtils.clamp(Math.max(byH, byW), 2.6, 7.6);
  return { a: p.angle, r: RING - d, y: ART_Y + 0.05, ta: p.angle, tr: RING, ty: ART_Y - p.h * 0.17 };
}
function firesideState(i) {
  const a = artPieces[i].angle;
  return { a: a + Math.PI, r: 5.6, y: 2.3, ta: a, tr: RING * 0.75, ty: 0.55 };
}
const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function animateTo(target, duration = 1.5) {
  const from = { ...cam };
  // 각도는 짧은 쪽으로 돌기
  const to = { ...target, a: from.a + wrap(target.a - from.a), ta: from.ta + wrap(target.ta - from.ta) };
  if (from.tr < 0.01) from.ta = to.ta;   // 중심을 보던 상태면 각도가 의미 없음
  tween = { from, to, t: 0, duration };
}

function goTo(i, instant = false) {
  current = (i + N) % N;
  mode = 'art';
  firesideBtn.setAttribute('aria-pressed', 'false');
  const s = artState(current);
  if (instant) { Object.assign(cam, s); tween = null; } else animateTo(s);
  showCard();
}
function toggleFireside(instant = false) {
  if (mode === 'fireside') { goTo(current); return; }
  mode = 'fireside';
  firesideBtn.setAttribute('aria-pressed', 'true');
  if (instant) { Object.assign(cam, firesideState(current)); tween = null; } else animateTo(firesideState(current), 1.8);
  showCard();
}

/* ---------- 화면 글자 ---------- */
const info = document.getElementById('info');
const countEl = document.getElementById('count');
const titleEl = document.getElementById('title');
const storyEl = document.getElementById('story');
function showCard() {
  info.classList.add('fade');
  document.body.classList.toggle('by-fire', mode === 'fireside');
  setTimeout(() => {
    if (mode === 'fireside') {
      countEl.textContent = 'BY THE FIRE';
      titleEl.textContent = '모닥불 곁에서';
      storyEl.textContent = '';
    } else {
      const p = artPieces[current];
      countEl.textContent = `${String(current + 1).padStart(2, '0')} / ${N}`;
      titleEl.innerHTML = '';
      titleEl.append(p.title);
      if (p.year) { const s = document.createElement('small'); s.textContent = p.year; titleEl.append(s); }
      storyEl.textContent = p.story;
    }
    info.classList.remove('fade');
  }, 250);
}

/* ---------- 조작 ---------- */
const firesideBtn = document.getElementById('fireside');
const muteBtn = document.getElementById('mute');
const bgm = document.getElementById('bgm');
const hint = document.getElementById('hint');
const lightbox = document.getElementById('lightbox');
const lightImg = lightbox.querySelector('img');

enterBtn.addEventListener('click', () => {
  document.getElementById('intro').classList.add('gone');
  document.body.classList.add('inside');
  bgm.volume = 0.55;
  bgm.play().catch(() => {});
  goTo(0);
  tween.duration = 3.2;
  setTimeout(() => hint.classList.add('gone'), 6000);
});
document.getElementById('prev').addEventListener('click', () => (mode === 'fireside' ? spinFireside(-1) : goTo(current - 1)));
document.getElementById('next').addEventListener('click', () => (mode === 'fireside' ? spinFireside(1) : goTo(current + 1)));
firesideBtn.addEventListener('click', () => toggleFireside());
muteBtn.addEventListener('click', () => {
  bgm.muted = !bgm.muted;
  muteBtn.textContent = bgm.muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(bgm.muted));
  if (!bgm.muted && bgm.paused) bgm.play().catch(() => {});
});

function spinFireside(dir) {
  current = (current + dir + N) % N;
  animateTo(firesideState(current), 1.2);
}

function openLightbox(i) {
  lightImg.src = `/gallery/art/${artPieces[i].file}`;
  lightImg.alt = artPieces[i].title;
  lightbox.classList.add('open');
}
lightbox.addEventListener('click', () => lightbox.classList.remove('open'));

window.addEventListener('keydown', (e) => {
  if (mode === 'intro') return;
  if (e.key === 'Escape') lightbox.classList.remove('open');
  if (lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowRight') document.getElementById('next').click();
  if (e.key === 'ArrowLeft') document.getElementById('prev').click();
});

// 밀기(스와이프)와 누르기(탭) 구분
const raycaster = new THREE.Raycaster();
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || mode === 'intro') { down = null; return; }
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  down = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    document.getElementById(dx < 0 ? 'next' : 'prev').click();
    return;
  }
  if (Math.hypot(dx, dy) < 10) {
    const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(artPieces.map((p) => p.mesh).filter(Boolean));
    if (!hits.length) return;
    const i = hits[0].object.userData.index;
    if (mode === 'art' && i === current) openLightbox(i);
    else goTo(i);
  }
});

window.addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;   // VR 중엔 화면 크기를 헤드셋이 정함
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  campfire.resize();
  if (mode === 'art' && !tween) Object.assign(cam, artState(current));
});

/* ---------- VR ---------- */
const vr = setupVR({
  renderer, scene, camera, rig, pieces: artPieces, ground, polar, ring: RING,
  onEnter: () => {
    mode = 'vr'; tween = null;
    document.getElementById('intro').classList.add('gone');
    document.body.classList.add('inside', 'in-vr');
    bgm.volume = 0.55;
    bgm.play().catch(() => {});
  },
  onExit: () => {
    document.body.classList.remove('in-vr');
    camera.fov = FOV; camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    goTo(current, true);
  },
});

/* ---------- 매 프레임 ---------- */
const clock = new THREE.Clock();
const lookAt = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (renderer.xr.isPresenting) {
    // VR 중엔 헤드셋이 카메라를 움직인다
    vr.update();
    campfire.update(t, dt);
    starMat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
    return;
  }

  if (tween) {
    tween.t += dt / tween.duration;
    const k = ease(Math.min(tween.t, 1));
    for (const key of Object.keys(cam)) cam[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * k;
    if (tween.t >= 1) tween = null;
  }
  if (mode === 'intro') cam.a += dt * 0.05;   // 입장 전엔 하늘에서 천천히 빙글

  const sway = mode === 'intro' ? 0 : 1;
  camera.position.copy(polar(cam.a, cam.r, cam.y + Math.sin(t * 0.5) * 0.03 * sway));
  camera.position.x += Math.sin(t * 0.31) * 0.05 * sway;
  lookAt.copy(polar(cam.ta, cam.tr, cam.ty));
  camera.lookAt(lookAt);

  campfire.update(t, dt);
  starMat.uniforms.uTime.value = t;

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);   // VR에서도 돌아가는 방식

// 확인용: 콘솔에서 gallery.goTo(3, true) 처럼 바로 이동
window.gallery = {
  goTo, toggleFireside, enter: () => enterBtn.click(), vr,
  view: (s) => { mode = 'shot'; Object.assign(cam, s); tween = null; },   // 미리보기 사진 찍을 때 구도 잡기
};
