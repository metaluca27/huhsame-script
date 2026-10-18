// 모닥불 한 무더기: 돌 둘레, 숯불 바닥, 원뿔로 기대 세운 통나무, 입자 불꽃·연기·불티, 불빛
import * as THREE from 'three';

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

// 나무껍질: 세로 결 + 갈라진 틈
const barkTex = () => canvasTexture(256, 512, (g, w, h) => {
  g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = rand(0, w), bw = rand(2, 9), l = rand(40, 60);
    g.fillStyle = `hsl(${rand(20, 32)}, ${rand(20, 35)}%, ${l * 0.4}%)`;
    g.globalAlpha = rand(0.3, 0.8);
    g.fillRect(x, 0, bw, h);
  }
  g.globalAlpha = 1; g.strokeStyle = '#120b07';
  for (let i = 0; i < 40; i++) {
    g.lineWidth = rand(1, 3); g.beginPath();
    let x = rand(0, w), y = rand(0, h); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rand(-4, 4); y += rand(10, 30); g.lineTo(x, y); }
    g.stroke();
  }
  // 아래쪽은 타서 검게
  const grad = g.createLinearGradient(0, h, 0, h * 0.35);
  grad.addColorStop(0, 'rgba(8,5,4,0.95)'); grad.addColorStop(1, 'rgba(8,5,4,0)');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
});

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
  const bark = barkTex(), glow = charGlowTex(), endGrain = endGrainTex();
  const glowMats = [];   // 불빛 따라 숨 쉬듯 깜빡일 재료들

  /* 재와 숯 바닥 */
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.y = 0.006; group.add(ash);
  const coal = coalTex();
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x140c08, roughness: 1, emissive: 0xffffff, emissiveMap: coal, emissiveIntensity: 1.6 });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), bedMat);
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.012; group.add(bed);
  glowMats.push({ mat: bedMat, base: 1.6 });

  // 숯 덩어리
  const chunkGeo = roughen(new THREE.IcosahedronGeometry(1, 1), 0.25);
  for (let i = 0; i < 28; i++) {
    const hot = Math.random();
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d0907, roughness: 1, emissive: new THREE.Color().setHSL(0.04 + hot * 0.03, 1, 0.5), emissiveIntensity: hot * 1.4 });
    const m = new THREE.Mesh(chunkGeo, mat);
    const s = rand(0.025, 0.055);
    m.scale.set(s * rand(1, 1.6), s * 0.7, s);
    m.position.copy(polar(rand(0, 6.28), Math.sqrt(Math.random()) * 0.36, s * 0.4));
    m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    group.add(m);
    glowMats.push({ mat, base: hot * 1.4 });
  }

  /* 둘레 돌 */
  const stoneGeo = roughen(new THREE.IcosahedronGeometry(1, 2), 0.12);
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + rand(-0.08, 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rand(0.06, 0.1), rand(0.02, 0.06), rand(0.05, 0.09)), roughness: 1 });
    const s = new THREE.Mesh(stoneGeo, mat);
    const r = rand(0.12, 0.17);
    s.scale.set(r * rand(1.1, 1.4), r * rand(0.65, 0.85), r);
    s.position.copy(polar(a, 0.66, r * 0.45));
    s.rotation.set(rand(-0.3, 0.3), a + rand(-0.4, 0.4), rand(-0.3, 0.3));
    group.add(s);
  }

  /* 통나무 */
  const up = new THREE.Vector3(0, 1, 0);
  function addLog(from, to, radius, burn) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = roughen(new THREE.CylinderGeometry(radius * 0.9, radius, len, 14, 6), 0.07);
    const b = bark.clone(); b.repeat.set(1, len); b.offset.x = Math.random(); b.needsUpdate = true;
    const side = new THREE.MeshStandardMaterial({ map: b, color: 0x6e6258, roughness: 1, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: burn });
    const end = new THREE.MeshStandardMaterial({ map: endGrain, color: 0x8a7a6c, roughness: 0.95 });
    const log = new THREE.Mesh(geo, [side, end, end]);
    log.position.copy(from).addScaledVector(dir, 0.5);
    log.quaternion.setFromUnitVectors(up, dir.normalize());
    log.rotateY(rand(0, 6.28));
    group.add(log);
    glowMats.push({ mat: side, base: burn });
  }
  // 원뿔(티피)로 기대 세운 장작
  const tip = new THREE.Vector3(rand(-0.03, 0.03), 0.72, rand(-0.03, 0.03));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand(-0.15, 0.15);
    const foot = polar(a, rand(0.34, 0.42), 0.03);
    const top = tip.clone().add(polar(a, rand(-0.06, 0.04), rand(-0.08, 0.06)));
    top.addScaledVector(new THREE.Vector3().subVectors(top, foot).normalize(), rand(0.0, 0.05)); // 끝이 살짝 엇갈려 튀어나오게
    addLog(foot, top, rand(0.04, 0.065), rand(0.35, 0.7));
  }
  // 바닥에 눕힌 굵은 장작 (반쯤 탄)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const c = polar(a, 0.3, 0.07);
    const d = polar(a + Math.PI / 2, 0.36, 0);
    addLog(c.clone().sub(d), c.clone().add(d), rand(0.07, 0.09), rand(0.6, 1.0));
  }

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
  const light = new THREE.PointLight(0xff8a3d, 70, 0, 2);
  light.position.set(0, 1.4, 0); group.add(light);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xff7a2a, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.set(0, 0.5, 0); halo.scale.setScalar(2.6); group.add(halo);

  function resize() {
    const h = renderer.domElement.height;
    const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    flameMat.uniforms.uScale.value = s; smokeMat.uniforms.uScale.value = s;
  }
  resize();

  function update(t, dt) {
    const flicker = 0.85 + 0.09 * Math.sin(t * 12.7) + 0.06 * Math.sin(t * 7.3 + 1) + 0.05 * Math.random();
    light.intensity = 70 * flicker;
    halo.material.opacity = 0.28 + 0.1 * Math.sin(t * 9.1);
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
