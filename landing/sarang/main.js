import * as THREE from 'three';
import { ARTWORKS } from '/sarang/artworks.js';
import { createPiano } from '/sarang/piano.js';

const N = ARTWORKS.length;
const RING = 9;          // 그림이 둘러선 원의 반지름(m)
const ART_Y = 1.75;      // 그림 중심 높이
const ART_H = 2.1;       // 그림 기본 높이
const ART_MAX_W = 2.4;   // 가로로 긴 그림의 최대 폭
const FOV = 50;
const SEA_Y = -0.35;     // 바다 수면 높이 (언덕 꼭대기가 0)

/* ---------- 기본 무대 ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2a585, 45, 240);
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 800);

const rand = (a, b) => a + Math.random() * (b - a);
const polar = (angle, radius, y) => new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- 노을 하늘 (바다 반사에도 같은 색을 씀) ---------- */
const sunDir = new THREE.Vector3(0, 0.06, -1).normalize();
const SKY_GLSL = `
  uniform vec3 uSun;
  vec3 skyColor(vec3 d){
    float h = clamp(d.y, 0.0, 1.0);
    vec3 horizon = vec3(1.0, 0.66, 0.47);
    vec3 low = vec3(0.95, 0.55, 0.58);
    vec3 mid = vec3(0.58, 0.50, 0.74);
    vec3 top = vec3(0.24, 0.31, 0.56);
    vec3 c = mix(horizon, low, smoothstep(0.0, 0.07, h));
    c = mix(c, mid, smoothstep(0.07, 0.28, h));
    c = mix(c, top, smoothstep(0.28, 0.85, h));
    float s = max(dot(d, uSun), 0.0);
    c += vec3(1.0, 0.55, 0.25) * pow(s, 6.0) * 0.45;
    c += vec3(1.0, 0.75, 0.45) * pow(s, 60.0) * 0.6;
    return c;
  }`;
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(500, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; ${SKY_GLSL}
      void main(){
        vec3 c = skyColor(vP);
        float s = dot(normalize(vP), uSun);
        c = mix(c, vec3(1.0, 0.93, 0.78), smoothstep(0.99955, 0.9998, s));   // 해 원반
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
scene.add(sky);

// 노을에 물든 구름
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = rand(40, 216), y = rand(45, 85), r = rand(18, 40);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
{
  const tex = cloudTexture();
  for (let i = 0; i < 11; i++) {
    const a = rand(0, Math.PI * 2), y = rand(30, 90);
    const warm = new THREE.Color().setHSL(rand(0.0, 0.08), 0.7, rand(0.75, 0.85));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: warm, transparent: true, opacity: rand(0.45, 0.8), depthWrite: false, fog: false }));
    s.position.copy(polar(a, rand(260, 330), y));
    s.scale.set(rand(110, 190), rand(28, 45), 1);
    scene.add(s);
  }
}

/* ---------- 바다 ---------- */
const seaMat = new THREE.ShaderMaterial({
  fog: false,
  uniforms: { uTime: { value: 0 }, uSun: { value: sunDir } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `varying vec3 vW; uniform float uTime; ${SKY_GLSL}
    void main(){
      vec2 p = vW.xz;
      vec2 g = vec2(0.0);
      float dist = length(cameraPosition - vW);
      float near = 1.0 - smoothstep(15.0, 70.0, dist), mid = 1.0 - smoothstep(40.0, 160.0, dist);   // 먼 물결은 줄무늬가 생겨서 끔
      vec2 d1 = normalize(vec2(0.3, 1.0)), d2 = normalize(vec2(-0.8, 0.6)), d3 = normalize(vec2(0.9, 0.2)), d4 = normalize(vec2(-0.2, -1.0));
      g += 0.050 * (0.35 + 0.65 * mid) * d1 * cos(dot(d1, p) * 0.35 + uTime * 0.9);
      g += 0.035 * mid * d2 * cos(dot(d2, p) * 0.6 + uTime * 1.2);
      g += 0.025 * near * d3 * cos(dot(d3, p) * 1.3 + uTime * 1.7);
      g += 0.018 * near * d4 * cos(dot(d4, p) * 2.4 + uTime * 2.3);
      vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
      vec3 v = normalize(cameraPosition - vW);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
      vec3 r = reflect(-v, n); r.y = abs(r.y);
      vec3 refl = skyColor(r);
      float shore = smoothstep(32.0, 19.0, length(p));
      vec3 deep = mix(vec3(0.10, 0.22, 0.34), vec3(0.20, 0.50, 0.52), shore);
      vec3 c = mix(deep, refl, clamp(fres + 0.15, 0.0, 1.0));
      float s = max(dot(r, uSun), 0.0);
      c += vec3(1.0, 0.8, 0.55) * (pow(s, 400.0) * 3.0 + pow(s, 40.0) * 0.35);   // 해 길
      c = mix(c, skyColor(normalize(vec3(-v.x, 0.001, -v.z))), smoothstep(120.0, 480.0, dist));
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const sea = new THREE.Mesh(new THREE.CircleGeometry(520, 96), seaMat);
sea.rotation.x = -Math.PI / 2; sea.position.y = SEA_Y; scene.add(sea);

// 물가에 밀려오는 하얀 파도 거품
const foamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec2 vP; uniform float uTime;
    void main(){
      float r = length(vP), a = atan(vP.y, vP.x);
      float wob = sin(a * 9.0 + uTime * 0.3) * 0.25 + sin(a * 23.0 - uTime * 0.2) * 0.12;
      float alpha = 0.0;
      for (int i = 0; i < 2; i++) {
        float ph = fract(uTime * 0.09 + float(i) * 0.5);
        float band = mix(22.0, 17.4, ph) + wob;
        alpha += exp(-pow((r - band) * 2.6, 2.0)) * sin(ph * 3.1416) * 0.75;
      }
      alpha += exp(-pow((r - 17.9 - wob * 0.5) * 3.5, 2.0)) * 0.35;
      gl_FragColor = vec4(vec3(1.0, 0.97, 0.93), clamp(alpha, 0.0, 0.85));
    }`,
});
const foam = new THREE.Mesh(new THREE.RingGeometry(16.5, 23.5, 160, 6), foamMat);
foam.rotation.x = -Math.PI / 2; foam.position.y = SEA_Y + 0.015; scene.add(foam);

/* ---------- 언덕·모래·풀 ---------- */
const sunPos = sunDir.clone().multiplyScalar(200);
scene.add(new THREE.HemisphereLight(0xffd9c0, 0x6e5a42, 1.0));
const sunLight = new THREE.DirectionalLight(0xffb27a, 1.5);
sunLight.position.copy(sunPos); scene.add(sunLight);
const fill = new THREE.DirectionalLight(0xb7b4e6, 0.5);
fill.position.set(0, 60, 120); scene.add(fill);

const groundH = (x, z) => {
  const r = Math.hypot(x, z);
  return -1.0 * smooth(12, 26, r) + 0.06 * Math.sin(x * 0.7) * Math.cos(z * 0.6) * smooth(3, 8, r);
};
{
  const geo = new THREE.PlaneGeometry(64, 64, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = [];
  const grassC = new THREE.Color(0x5f7a3a), sandC = new THREE.Color(0xe2c49a), wetC = new THREE.Color(0xa88a68), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    pos.setY(i, groundH(x, z));
    c.copy(grassC).lerp(sandC, smooth(10.5, 13.5, r + Math.sin(Math.atan2(z, x) * 5) * 0.8)).lerp(wetC, smooth(16, 18, r));
    c.offsetHSL(0, 0, rand(-0.025, 0.025));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
}

// 풀 한 포기씩 + 들꽃
{
  const count = 2400;
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.34, 3), new THREE.MeshStandardMaterial({ color: 0x6f8f3e, roughness: 1 }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 11.5 + 0.9, a = rand(0, Math.PI * 2), s = rand(0.6, 1.4);
    const p = polar(a, r, 0); p.y = groundH(p.x, p.z) + 0.15 * s;
    e.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3)); q.setFromEuler(e);
    m.compose(p, q, new THREE.Vector3(s, s, s)); grass.setMatrixAt(i, m);
    grass.setColorAt(i, col.setHSL(rand(0.2, 0.28), rand(0.35, 0.5), rand(0.3, 0.42)));
  }
  scene.add(grass);

  const fcount = 420;
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), fcount);
  const palette = [0xf7f3ea, 0xf7f3ea, 0xf4d14a, 0xf09ab0, 0xb7a7e8];
  for (let i = 0; i < fcount; i++) {
    const r = Math.sqrt(Math.random()) * 11 + 1.5, a = rand(0, Math.PI * 2);
    const p = polar(a, r, 0); p.y = groundH(p.x, p.z) + rand(0.2, 0.32);
    m.compose(p, q.identity(), new THREE.Vector3(1, 0.6, 1)); flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, col.set(palette[i % palette.length]));
  }
  scene.add(flowers);
}

// 물가 바위
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x6d6258, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2), r = rand(15.5, 22), s = rand(0.3, 1.1);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
    const p = polar(a, r, 0); p.y = groundH(p.x, p.z) + s * 0.2;
    rock.position.copy(p); rock.scale.set(rand(1, 1.6), rand(0.5, 0.9), rand(1, 1.5)); rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    scene.add(rock);
  }
}

// 수평선 너머 섬 실루엣 (해 쪽은 비워 둠)
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a6f86, roughness: 1 });
  [[0.9, 230, 26], [1.4, 260, 18], [2.4, 210, 22], [3.0, 280, 30], [4.1, 240, 16], [4.6, 220, 24], [5.4, 250, 20]].forEach(([a, r, w]) => {
    const isle = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    isle.position.copy(polar(a, r, SEA_Y)); isle.scale.set(w, w * rand(0.18, 0.32), w * 0.6);
    isle.lookAt(0, SEA_Y, 0);
    scene.add(isle);
  });
}

/* ---------- 피아노 ---------- */
const piano = createPiano();
scene.add(piano.group);
const pianoLight = new THREE.PointLight(0xffcfa0, 6, 7, 2);
pianoLight.position.set(0.6, 2.4, 1.6); scene.add(pianoLight);

/* ---------- 그림 걸기 ---------- */
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const enterBtn = document.getElementById('enter');
manager.onProgress = (_url, loaded, total) => { enterBtn.textContent = `그림 거는 중… ${loaded} / ${total}`; };
manager.onLoad = () => { enterBtn.disabled = false; enterBtn.textContent = '입장하기'; };
manager.onError = () => { enterBtn.disabled = false; enterBtn.textContent = '입장하기'; };

const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, emissive: 0x8a8278, roughness: 0.7 });
const legMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
const artPieces = ARTWORKS.map((art, i) => {
  const angle = (i / N) * Math.PI * 2;
  const group = new THREE.Group();
  group.position.copy(polar(angle, RING, ART_Y));
  group.lookAt(0, ART_Y, 0);
  scene.add(group);
  const piece = { ...art, index: i, angle, w: ART_H * 0.75, h: ART_H, group, mesh: null };

  loader.load(`/sarang/art/${art.file}`, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const aspect = tex.image.width / tex.image.height;
    let w = ART_H * aspect, h = ART_H;
    if (w > ART_MAX_W) { w = ART_MAX_W; h = w / aspect; }
    piece.w = w; piece.h = h;

    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.z = 0.012; mesh.userData.index = i;
    group.add(mesh); piece.mesh = mesh;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08), frameMat);
    frame.position.z = -0.03; group.add(frame);
    const legH = ART_Y - h / 2;   // 살짝 땅에 박히게
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
const cam = { a: Math.PI * 0.85, r: 19, y: 9, ta: 0, tr: 0, ty: 0.8, p: 0 };   // p = 피아노가 바라보는 방향
let tween = null;

function artState(i) {
  const p = artPieces[i];
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const aspect = camera.aspect;
  const byH = (p.h * 1.75) / (2 * tanHalf);
  const byW = (p.w * 1.35) / (2 * tanHalf * aspect);
  const d = THREE.MathUtils.clamp(Math.max(byH, byW), 2.6, 7.6);
  return { a: p.angle, r: RING - d, y: ART_Y + 0.05, ta: p.angle, tr: RING, ty: ART_Y - p.h * 0.17, p: cam.p };
}
// 피아노 곁에서: 의자 뒤에 서서 건반·악보 너머로 그림과 바다를 봄 (피아노도 그쪽으로 돌아앉음)
function pianoState(i) {
  const a = artPieces[i].angle;
  return { a: a + Math.PI, r: 2.6, y: 1.85, ta: a, tr: RING, ty: 1.35, p: a + Math.PI };
}
const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function animateTo(target, duration = 1.5) {
  const from = { ...cam };
  // 각도는 짧은 쪽으로 돌기
  const to = { ...target, a: from.a + wrap(target.a - from.a), ta: from.ta + wrap(target.ta - from.ta), p: from.p + wrap(target.p - from.p) };
  if (from.tr < 0.01) from.ta = to.ta;   // 중심을 보던 상태면 각도가 의미 없음
  tween = { from, to, t: 0, duration };
}

function goTo(i, instant = false) {
  current = (i + N) % N;
  mode = 'art';
  pianoBtn.setAttribute('aria-pressed', 'false');
  const s = artState(current);
  if (instant) { Object.assign(cam, s); tween = null; } else animateTo(s);
  showCard();
}
function togglePiano(instant = false) {
  if (mode === 'piano') { goTo(current); return; }
  mode = 'piano';
  pianoBtn.setAttribute('aria-pressed', 'true');
  if (instant) { Object.assign(cam, pianoState(current)); tween = null; } else animateTo(pianoState(current), 1.8);
  showCard();
}

/* ---------- 화면 글자 ---------- */
const info = document.getElementById('info');
const countEl = document.getElementById('count');
const titleEl = document.getElementById('title');
const storyEl = document.getElementById('story');
function showCard() {
  info.classList.add('fade');
  document.body.classList.toggle('by-piano', mode === 'piano');
  setTimeout(() => {
    if (mode === 'piano') {
      countEl.textContent = 'BY THE PIANO';
      titleEl.textContent = '피아노 곁에서';
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

/* ---------- 파도 소리 (파일 없이 소리를 직접 만들어요) ---------- */
let audio = null;
function startWaves() {
  if (audio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const len = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }   // 갈색 잡음
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
  const swell = ctx.createGain(); swell.gain.value = 0.35;
  const master = ctx.createGain(); master.gain.value = 0.5;   // 피아노 밑에 깔리게 작게
  src.connect(filter).connect(swell).connect(master).connect(ctx.destination);
  // 파도가 밀려왔다 빠지는 느낌: 소리 크기와 밝기를 천천히 흔들기
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.28; lfo.connect(lfoGain).connect(swell.gain);
  const lfoF = ctx.createGain(); lfoF.gain.value = 380; lfo.connect(lfoF).connect(filter.frequency);
  src.start(); lfo.start();
  audio = { ctx, master };
}

/* ---------- 조작 ---------- */
const pianoBtn = document.getElementById('bypiano');
const muteBtn = document.getElementById('mute');
const bgm = document.getElementById('bgm');
const hint = document.getElementById('hint');
const lightbox = document.getElementById('lightbox');
const lightImg = lightbox.querySelector('img');
let muted = false;

enterBtn.addEventListener('click', () => {
  document.getElementById('intro').classList.add('gone');
  document.body.classList.add('inside');
  try { startWaves(); } catch (_) { /* 소리가 막힌 브라우저면 조용히 */ }
  bgm.volume = 0.6;
  bgm.play().catch(() => {});
  goTo(0);
  tween.duration = 3.2;
  setTimeout(() => hint.classList.add('gone'), 6000);
});
document.getElementById('prev').addEventListener('click', () => (mode === 'piano' ? spinPiano(-1) : goTo(current - 1)));
document.getElementById('next').addEventListener('click', () => (mode === 'piano' ? spinPiano(1) : goTo(current + 1)));
pianoBtn.addEventListener('click', () => togglePiano());
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(muted));
  bgm.muted = muted;
  if (!muted && bgm.paused) bgm.play().catch(() => {});
  if (audio) { audio.master.gain.value = muted ? 0 : 0.5; if (!muted) audio.ctx.resume(); }
});

function spinPiano(dir) {
  current = (current + dir + N) % N;
  animateTo(pianoState(current), 1.2);
}

function openLightbox(i) {
  lightImg.src = `/sarang/art/${artPieces[i].file}`;
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
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (mode === 'art' && !tween) Object.assign(cam, artState(current));
});

/* ---------- 매 프레임 ---------- */
const clock = new THREE.Clock();
const lookAt = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

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

  piano.group.rotation.y = cam.p;
  piano.update(t);
  seaMat.uniforms.uTime.value = t;
  foamMat.uniforms.uTime.value = t;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 확인용: 콘솔에서 gallery.goTo(3, true) 처럼 바로 이동
window.gallery = {
  goTo, togglePiano, enter: () => enterBtn.click(),
  view: (s) => { mode = 'shot'; Object.assign(cam, s); tween = null; },   // 미리보기 사진 찍을 때 구도 잡기
};
