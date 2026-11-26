// 모닥불 한 무더기: 돌 둘레, 숯불 바닥, 원뿔로 기대 세운 통나무, 입자 불꽃·연기·불티, 불빛
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFirewood } from '/gallery/firewood.js';

// 실사 재료: Poly Haven(CC0, 상업 이용 자유) 돌 화덕 모델 + 나무껍질 사진 질감

const rand = (a, b) => a + Math.random() * (b - a);
const polar = (angle, radius, y) => new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 탄 부분에서 빨갛게 빛나는 틈 (발광용)
const charGlowTex = () => canvasTexture(256, 512, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 28; i++) {
    const y0 = h - Math.pow(Math.random(), 1.8) * h * 0.55;
    g.strokeStyle = `rgba(255,${Math.floor(rand(50, 110))},15,${rand(0.3, 0.7)})`;
    g.lineWidth = rand(0.8, 2); g.beginPath();
    let x = rand(0, w), y = y0; g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += rand(-12, 12); y += rand(-14, 14); g.lineTo(x, y); }
    g.stroke();
  }
});

// 통나무 단면: 나이테
const endGrainTex = () => canvasTexture(128, 128, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#1a110b'; g.fillRect(0, 0, w, w);
  for (let r = c * 0.92; r > 2; r -= rand(3, 6)) {
    g.beginPath(); g.arc(c + rand(-1, 1), c + rand(-1, 1), r, 0, Math.PI * 2);
    g.fillStyle = `hsl(30, ${rand(25, 40)}%, ${rand(22, 38)}%)`; g.fill();
  }
  g.strokeStyle = 'rgba(10,6,4,0.9)'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const a = rand(0, 6.28); g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8); g.stroke(); }
  // 겉은 까맣게 탐
  const grad = g.createRadialGradient(c, c, c * 0.55, c, c, c);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(5,3,2,1)');
  g.fillStyle = grad; g.fillRect(0, 0, w, w);
});

// 숯불 바닥
const coalTex = () => canvasTexture(256, 256, (g, w) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 260; i++) {
    const x = rand(0, w), y = rand(0, w), r = rand(3, 12);
    const d = Math.hypot(x - w / 2, y - w / 2) / (w / 2);
    if (d > 1) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const hot = Math.max(0, 1 - d) * rand(0.5, 1);
    gr.addColorStop(0, `rgba(255,${Math.floor(80 + hot * 120)},${Math.floor(hot * 40)},${0.4 + hot * 0.6})`);
    gr.addColorStop(1, 'rgba(60,10,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}, true);

const softDot = () => canvasTexture(64, 64, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});

// 표면을 울퉁불퉁하게 (같은 위치는 같은 값이라 이음새가 안 벌어짐)
function roughen(geo, amount) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 37.1 + v.y * 11.7) * Math.cos(v.z * 29.3 - v.y * 7.9) + Math.sin(v.y * 53.0 + v.x * 3.1) * 0.5;
    const k = 1 + n * amount;
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createCampfire({ renderer, camera }) {
  const group = new THREE.Group();
  const texLoader = new THREE.TextureLoader();
  const loadTex = (f, srgb) => { const t = texLoader.load(`/gallery/tex/${f}`); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const barkMap = loadTex('bark_diffuse.jpg', true), barkNor = loadTex('bark_nor_gl.jpg', false), barkArm = loadTex('bark_arm.jpg', false);
  const glowMats = [];   // 불빛 따라 숨 쉬듯 깜빡일 재료들

  /* 재와 숯 바닥 */
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.y = 0.006; group.add(ash);
  const coal = coalTex();
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x140c08, roughness: 1, emissive: 0xffffff, emissiveMap: coal, emissiveIntensity: 1.6 });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), bedMat);
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.012; group.add(bed);
  glowMats.push({ mat: bedMat, base: 1.6 });

  /* 둘레 돌: 실사 돌 화덕 모델 (Poly Haven 'Stone Fire Pit') */
  new GLTFLoader().load('/gallery/models/fire_pit/stone_fire_pit.gltf', (gltf) => {
    const pit = gltf.scene;
    const box = new THREE.Box3().setFromObject(pit);
    const size = box.getSize(new THREE.Vector3());
    const k = 1.75 / Math.max(size.x, size.z);          // 바깥 지름 1.75m 정도
    pit.scale.setScalar(k);
    box.setFromObject(pit);
    const c = box.getCenter(new THREE.Vector3());
    pit.position.set(-c.x, -box.min.y, -c.z);            // 가운데 맞추고 바닥에 붙이기
    pit.traverse((o) => { if (o.isMesh) { o.material.envMapIntensity = 0.3; } });
    group.add(pit);
  });

  /* 장작: 쪼갠 장작 더미 + 숯 (firewood.js) */
  const wood = createFirewood({ barkMap, barkNor, barkArm });
  group.add(wood.group);
  glowMats.push(...wood.glowMats);

  /* 불꽃 입자 */
  const FLAMES = 130;
  const fPos = new Float32Array(FLAMES * 3), fLife = new Float32Array(FLAMES), fSize = new Float32Array(FLAMES);
  const fData = [];
  function resetFlame(i, life) {
    const r = Math.pow(Math.random(), 1.6) * 0.24, a = rand(0, 6.28);
    fData[i] = { x0: Math.sin(a) * r, z0: Math.cos(a) * r, h: rand(0.9, 1.6) * (1 - r * 1.8), speed: rand(1.0, 1.7), size: rand(0.26, 0.46), seed: rand(0, 6.28) };
    fLife[i] = life;
  }
  for (let i = 0; i < FLAMES; i++) resetFlame(i, Math.random());
  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  flameGeo.setAttribute('aLife', new THREE.BufferAttribute(fLife, 1));
  flameGeo.setAttribute('aSize', new THREE.BufferAttribute(fSize, 1));
  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uScale: { value: 1 } },
    vertexShader: `attribute float aLife; attribute float aSize; uniform float uScale; varying float vLife;
      void main(){ vLife = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vLife;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y;
        float w = 1.0 - 0.5 * (p.y * 0.5 + 0.5);
        float d = length(vec2(p.x / w, p.y * 0.9));
        float a = smoothstep(1.0, 0.0, d);
        vec3 hot = vec3(1.0, 0.72, 0.32), mid = vec3(1.0, 0.45, 0.08), cool = vec3(0.6, 0.1, 0.02);
        vec3 col = vLife < 0.35 ? mix(hot, mid, vLife / 0.35) : mix(mid, cool, (vLife - 0.35) / 0.65);
        float alpha = a * smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife)) * 0.6;
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const flames = new THREE.Points(flameGeo, flameMat);
  flames.frustumCulled = false; flames.renderOrder = 2;
  group.add(flames);

  /* 실사 불꽃: 픽스버스 v6로 만든 '검은 배경 불꽃' 영상을 장작 위에 겹친다.
     더하기 섞기라 검은 부분은 사라지고 불빛만 남음. 늘 보는 사람 쪽으로 돌아선다. */
  const video = document.createElement('video');
  Object.assign(video, { src: '/gallery/fire.mp4', muted: true, loop: true, playsInline: true, autoplay: true, crossOrigin: 'anonymous', preload: 'auto' });
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const vtex = new THREE.VideoTexture(video);
  vtex.colorSpace = THREE.SRGBColorSpace;
  const fireMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
    uniforms: { map: { value: vtex }, uGain: { value: 1.25 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uGain; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        c = pow(c, vec3(2.2));                       // 영상(sRGB)을 빛 세기로
        float edge = smoothstep(0.0, 0.14, vUv.y)    // 아래 띠(영상 속 땅)는 지우고
                   * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x)
                   * smoothstep(1.0, 0.9, vUv.y);
        c = max(c - 0.01, 0.0) * edge * uGain;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const FIRE_W = 1.15, FIRE_H = FIRE_W * 16 / 9;
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(FIRE_W, FIRE_H), fireMat);
  fire.position.set(0, FIRE_H / 2 - FIRE_H * 0.1, 0);   // 영상 아래 10%(지운 띠)가 땅 밑으로
  fire.renderOrder = 3; fire.visible = false;
  group.add(fire);
  const startVideo = () => video.play().catch(() => {});
  startVideo();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, startVideo, { once: true }));
  video.addEventListener('playing', () => { fire.visible = true; flames.visible = false; });   // 영상이 돌면 옛 불꽃은 숨김
  const camPos = new THREE.Vector3(), firePos = new THREE.Vector3();

  /* 연기 */
  const SMOKE = 26;
  const sPos = new Float32Array(SMOKE * 3), sLife = new Float32Array(SMOKE), sSize = new Float32Array(SMOKE), sData = [];
  function resetSmoke(i, life) { sData[i] = { x0: rand(-0.1, 0.1), z0: rand(-0.1, 0.1), speed: rand(0.12, 0.2), drift: rand(0.2, 0.5), seed: rand(0, 6.28) }; sLife[i] = life; }
  for (let i = 0; i < SMOKE; i++) resetSmoke(i, Math.random());
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('aLife', new THREE.BufferAttribute(sLife, 1));
  smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1 } },
    vertexShader: flameMat.vertexShader,
    fragmentShader: `varying float vLife;
      void main(){ float d = length(gl_PointCoord * 2.0 - 1.0); float a = smoothstep(1.0, 0.1, d);
        float alpha = a * smoothstep(0.0, 0.2, vLife) * (1.0 - smoothstep(0.4, 1.0, vLife)) * 0.12;
        gl_FragColor = vec4(vec3(0.42, 0.4, 0.42), alpha); }`,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false; smoke.renderOrder = 1;
  group.add(smoke);

  /* 불티 */
  const EMBERS = 90;
  const ePos = new Float32Array(EMBERS * 3), eData = [];
  function resetEmber(i, initial) {
    ePos[i * 3] = rand(-0.2, 0.2); ePos[i * 3 + 1] = initial ? rand(0.3, 3.5) : rand(0.4, 0.8); ePos[i * 3 + 2] = rand(-0.2, 0.2);
    eData[i] = { up: rand(0.5, 1.3), sway: rand(0, 6), life: rand(1.5, 4) };
  }
  for (let i = 0; i < EMBERS; i++) resetEmber(i, true);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    color: 0xffa050, size: 0.035, map: softDot(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  embers.frustumCulled = false; group.add(embers);

  /* 불빛 */
  const LIGHT = 26;   // 실사 돌이 하얗게 날아가지 않을 만큼
  const light = new THREE.PointLight(0xff8a3d, LIGHT, 0, 2);
  light.position.set(0, 1.4, 0); group.add(light);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xff7a2a, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.set(0, 0.5, 0); halo.scale.setScalar(2.6); group.add(halo);

  function resize() {
    const h = renderer.domElement.height;
    const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    flameMat.uniforms.uScale.value = s; smokeMat.uniforms.uScale.value = s;
  }
  resize();

  function update(t, dt) {
    // 불꽃 판을 보는 사람 쪽으로 (세로축만 돌림)
    if (fire.visible) {
      camera.getWorldPosition(camPos); fire.getWorldPosition(firePos);
      fire.rotation.y = Math.atan2(camPos.x - firePos.x, camPos.z - firePos.z);
    }
    const flicker = 0.85 + 0.09 * Math.sin(t * 12.7) + 0.06 * Math.sin(t * 7.3 + 1) + 0.05 * Math.random();
    light.intensity = LIGHT * flicker;
    halo.material.opacity = 0.14 + 0.05 * Math.sin(t * 9.1);
    const breathe = 0.8 + 0.2 * Math.sin(t * 1.7) + 0.1 * Math.sin(t * 5.3);
    glowMats.forEach((g) => { g.mat.emissiveIntensity = g.base * breathe; });

    for (let i = 0; i < FLAMES; i++) {
      const d = fData[i];
      let life = fLife[i] + dt * d.speed;
      if (life >= 1) { resetFlame(i, 0); life = 0; }
      fLife[i] = life;
      const pull = 1 - life * 0.75;   // 위로 갈수록 가운데로 모여 뾰족하게
      const wob = Math.sin(t * 6 + d.seed) * 0.035 * life;
      fPos[i * 3] = d.x0 * pull + wob;
      fPos[i * 3 + 1] = 0.05 + life * d.h;
      fPos[i * 3 + 2] = d.z0 * pull + Math.cos(t * 5 + d.seed) * 0.03 * life;
      fSize[i] = d.size * (1 - life * 0.55);
    }
    flameGeo.attributes.position.needsUpdate = true;
    flameGeo.attributes.aLife.needsUpdate = true;
    flameGeo.attributes.aSize.needsUpdate = true;

    for (let i = 0; i < SMOKE; i++) {
      const d = sData[i];
      let life = sLife[i] + dt * d.speed;
      if (life >= 1) { resetSmoke(i, 0); life = 0; }
      sLife[i] = life;
      sPos[i * 3] = d.x0 + Math.sin(t * 0.4 + d.seed) * d.drift * life;
      sPos[i * 3 + 1] = 0.9 + life * 3.2;
      sPos[i * 3 + 2] = d.z0 + life * d.drift * 0.6;
      sSize[i] = 0.4 + life * 1.6;
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.aLife.needsUpdate = true;
    smokeGeo.attributes.aSize.needsUpdate = true;

    for (let i = 0; i < EMBERS; i++) {
      const e = eData[i];
      e.life -= dt;
      ePos[i * 3 + 1] += e.up * dt;
      ePos[i * 3] += Math.sin(t * 2 + e.sway) * 0.004;
      ePos[i * 3 + 2] += Math.cos(t * 1.7 + e.sway) * 0.004;
      if (e.life <= 0 || ePos[i * 3 + 1] > 4.5) resetEmber(i, false);
    }
    emberGeo.attributes.position.needsUpdate = true;
  }

  return { group, update, resize };
}
