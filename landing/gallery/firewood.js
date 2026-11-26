// 쪼갠 장작 더미: 굵은 장작을 쐐기·반달 모양으로 쪼개고,
// 둥근 쪽은 나무껍질, 쪼갠 면은 밝은 나뭇결, 끝은 나이테, 군데군데 거북등처럼 갈라진 숯 자국(틈새는 빨갛게 빛남)
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/* ---------- 모양: 쪼갠 장작 한 토막 ---------- */
// kind: 'wedge'(쐐기) | 'half'(반달) | 'round'(통짜). 길이는 z축.
// 재료 칸: 0=끝 단면, 1=껍질 쪽, 2=쪼갠 면
// hot: 'top' = +z 끝이 불 속(기대 세운 장작), 'middle' = 가운데가 불 속(눕힌 장작)
function splitLogGeometry(R, L, kind, hot = 'top') {
  const span = kind === 'round' ? Math.PI * 2 : kind === 'half' ? Math.PI : rand(1.3, 1.9);
  const a0 = rand(0, Math.PI * 2);
  const arcPts = [];
  const N = kind === 'round' ? 22 : 12;
  for (let i = 0; i <= N; i++) {
    if (kind === 'round' && i === N) break;
    const a = a0 + (i / N) * span;
    const r = R * (1 + Math.sin(a * 5 + a0) * 0.04 + rand(-0.03, 0.03));
    arcPts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const shape = new THREE.Shape();
  if (kind === 'wedge') {
    // 쐐기 끝은 한가운데가 아니라 살짝 안쪽(심재)에서 뭉툭하게 끊김
    const core = new THREE.Vector2(Math.cos(a0 + span / 2) * R * 0.12, Math.sin(a0 + span / 2) * R * 0.12);
    shape.moveTo(core.x, core.y);
    arcPts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(core.x, core.y);
  } else {
    shape.moveTo(arcPts[0].x, arcPts[0].y);
    arcPts.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
    shape.closePath();
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, steps: 10 });   // 길이 방향 마디: 가운데가 탄 통나무도 사진이 제대로 붙게
  geo.translate(0, 0, -L / 2);

  // 삼각형을 끝 단면 / 껍질 쪽 / 쪼갠 면으로 다시 나누고, 질감 좌표를 직접 매김
  const pos = geo.attributes.position;
  const buckets = [[], [], []];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let t = 0; t < pos.count; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, t + k);
    e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2).normalize();
    let bucket;
    if (Math.abs(n.z) > 0.9) bucket = 0;
    else {
      const mx = (v[0].x + v[1].x + v[2].x) / 3, my = (v[0].y + v[1].y + v[2].y) / 3;
      bucket = Math.hypot(mx, my) > R * 0.8 ? 1 : 2;
    }
    const uvs = v.map((p) => {
      if (bucket === 0) return [p.x / (2 * R) + 0.5, p.y / (2 * R) + 0.5];   // 나이테 중심 = 원래 나무 중심
      // 사진을 실제 크기(약 25cm)로 붙인다. 통나무 전체에 늘려 붙이면 숯 무늬가 줄무늬로 뭉개짐.
      const TEX = 0.25;
      const around = bucket === 1 ? (Math.atan2(p.y, p.x) * R) / TEX : (p.x - p.y) * 0.7 / TEX;
      // 사진 아래쪽(v=0)이 숯이라, 불 속 지점에서 잰 거리로 v를 매김 (사진 위쪽 너머는 결이 그대로 이어짐)
      const dist = hot === 'middle' ? Math.abs(p.z) : L / 2 - p.z;
      return [around, dist / TEX];
    });
    buckets[bucket].push(...v.map((p, k) => [p.x, p.y, p.z, ...uvs[k]]));
  }
  const out = new THREE.BufferGeometry();
  const P = [], U = [];
  buckets.forEach((b, i) => {
    out.addGroup(P.length / 3, b.length, i);
    b.forEach(([x, y, z, u, w]) => { P.push(x, y, z); U.push(u, w); });
  });
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.computeVertexNormals();
  // 껍질 쪽은 둥글게 보이도록 바깥 방향으로 매끈한 법선 (안 하면 각진 상자처럼 보임)
  const nrm = out.attributes.normal, start = out.groups[1].start, cnt = out.groups[1].count;
  for (let i = start; i < start + cnt; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], l = Math.hypot(x, y) || 1;
    nrm.setXYZ(i, x / l, y / l, 0);
  }
  // 무게중심을 원점으로 (돌릴 때 엉뚱한 곳 기준으로 돌지 않게)
  out.computeBoundingBox();
  const c = out.boundingBox.getCenter(new THREE.Vector3()); c.z = 0;
  out.translate(-c.x, -c.y, 0);
  out.userData.barkAngle = a0 + span / 2;   // 껍질이 향한 쪽 (반대쪽이 쪼갠 면)
  return out;
}

/* ---------- 장작 더미 ---------- */
export function createFirewood({ barkMap, barkNor, barkArm }) {
  const group = new THREE.Group();
  const glowMats = [];
  // 실사 사진 질감 (픽스버스 Seedream으로 생성): 쪼갠 면(아래쪽 숯 포함)·단면 나이테.
  // 빛 지도는 사진 속 숯 조각 사이 가장 어두운 틈만 뽑아 만든 것이라 사진 틈과 정확히 겹친다.
  const tl = new THREE.TextureLoader();
  const photo = (f, srgb = true) => { const t = tl.load(`/gallery/tex/${f}`); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const along = (t) => { t.wrapT = THREE.ClampToEdgeWrapping; return t; };   // 사진 위쪽 너머는 맨 윗줄 결이 계속
  const variants = [
    { split: along(photo('wood_split.jpg')), glow: along(photo('wood_split_glow.jpg')), end: photo('wood_end.jpg') },
    { split: along(photo('wood_split2.jpg')), glow: along(photo('wood_split2_glow.jpg')), end: photo('wood_end2.jpg') },
  ];
  // 다 탄 통나무용: 숯 부분만 잘라 이어 붙인 반복 질감
  const charTex = photo('wood_char.jpg'), charGlow = photo('wood_char_glow.jpg');
  charTex.repeat.set(1.3, 1.7); charGlow.repeat.copy(charTex.repeat);
  // 껍질 쪽 빛: 불 쪽 끝에서만 은은하게 (사진 껍질과 안 어긋나게 무늬 없이 번짐만)
  const barkGlow = canvasTex(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, h * 0.55);
    gr.addColorStop(0, 'rgba(255,90,20,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  barkGlow.wrapT = THREE.ClampToEdgeWrapping;

  // 재료: [타는 정도 3단계 × 사진 2종] + 다 탄 통나무. levels[단계][종류] = [끝, 껍질 쪽, 쪼갠 면]
  const levels = [0.8, 1.3, 2.0].map((burn) => variants.map(({ split, glow, end }) => {   // 빛 지도가 가는 틈뿐이라 세기를 높게
    const endMat = new THREE.MeshStandardMaterial({ map: end, roughness: 0.95, color: 0xbfa98f });
    const barkMat = new THREE.MeshStandardMaterial({
      map: barkMap, normalMap: barkNor, roughnessMap: barkArm, roughness: 1, color: 0x6d5a4a,
      emissive: 0xffffff, emissiveMap: barkGlow, emissiveIntensity: burn,
    });
    const splitMat = new THREE.MeshStandardMaterial({
      map: split, roughness: 0.9, color: 0xc9b6a0, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: burn,
    });
    glowMats.push({ mat: barkMat, base: burn }, { mat: splitMat, base: burn });
    return [endMat, barkMat, splitMat];
  }));
  // 4단계: 다 타서 시커먼 통나무 — 둘레 전체가 숯 조각, 끝도 그을림
  levels.push(variants.map(({ end }) => {
    const endMat = new THREE.MeshStandardMaterial({ map: end, roughness: 1, color: 0x3a2c22 });
    const charMat = new THREE.MeshStandardMaterial({
      map: charTex, roughness: 0.95, color: 0xb8a898, emissive: 0xffffff, emissiveMap: charGlow, emissiveIntensity: 1.1,
    });
    glowMats.push({ mat: charMat, base: 1.1 });
    return [endMat, charMat, charMat];
  }));
  const CHARRED = 3;

  const zAxis = new THREE.Vector3(0, 0, 1);
  function addLog(from, to, R, kind, level, hot = 'top') {
    const dir = new THREE.Vector3().subVectors(to, from);
    const L = dir.length();
    const log = new THREE.Mesh(splitLogGeometry(R, L, kind, hot), pick(levels[level]));
    log.position.copy(from).addScaledVector(dir, 0.5);
    log.quaternion.setFromUnitVectors(zAxis, dir.normalize());
    // 쪼갠 면(밝은 나뭇결)이 보는 쪽(앞)을 향하게 돌린다 — 루카가 보낸 사진처럼
    if (kind === 'round') log.rotateZ(rand(0, Math.PI * 2));
    else {
      const bark = new THREE.Vector3(), base = log.quaternion.clone();
      let best = 0, bestDot = Infinity;
      for (let k = 0; k < 24; k++) {
        const th = (k / 24) * Math.PI * 2;
        log.quaternion.copy(base); log.rotateZ(th);
        const ang = log.geometry.userData.barkAngle;
        bark.set(Math.cos(ang), Math.sin(ang), 0).applyQuaternion(log.quaternion);
        const d = bark.z + bark.y * 0.3;               // 껍질이 앞(+z)·위를 덜 향할수록 좋음
        if (d < bestDot) { bestDot = d; best = th; }
      }
      log.quaternion.copy(base); log.rotateZ(best + rand(-0.25, 0.25));
    }
    group.add(log);
  }

  // 쌓는 구조 = 루카가 보낸 사진 그대로 (보는 쪽이 +z):
  //  왼쪽 앞에서 크게 기대 선 쪼갠 장작, 오른쪽 앞에서 비스듬히 누운 굵은 장작(윗면 숯),
  //  맨 위에 가로질러 얹힌 시커먼 통나무, 가운데 아래로 기대 누운 장작 두어 개,
  //  맨 아래 불 속에 타고 있는 통나무 토막, 뒤쪽에 기대 선 장작들.
  const V = (x, y, z) => new THREE.Vector3(x + rand(-0.01, 0.01), y, z + rand(-0.01, 0.01));
  const LOGS = [
    // [아래 끝, 위 끝, 굵기, 모양, 탄 정도, 불 속 위치]
    [V(-0.36, 0.05, 0.30), V(-0.02, 0.50, -0.06), 0.115, 'half', 1, 'top'],          // 왼쪽 앞: 크게 기대 선 쪼갠 장작
    [V(0.40, 0.06, 0.26), V(0.04, 0.30, -0.02), 0.11, 'wedge', 2, 'top'],            // 오른쪽 앞: 낮게 누운 굵은 장작
    [V(-0.22, 0.56, 0.02), V(0.30, 0.44, -0.10), 0.09, 'round', CHARRED, 'middle'],  // 맨 위 가로지른 시커먼 통나무
    [V(-0.12, 0.08, 0.26), V(0.10, 0.36, -0.08), 0.085, 'wedge', 2, 'top'],          // 가운데 앞으로 기대 누운 장작
    [V(-0.30, 0.20, 0.06), V(0.08, 0.30, 0.06), 0.08, 'round', CHARRED, 'middle'],   // 가운데 숯 통나무 (왼쪽에 걸침)
    [V(-0.10, 0.07, 0.12), V(0.14, 0.08, 0.14), 0.065, 'round', CHARRED, 'middle'],  // 맨 아래 불 속 토막
    [V(0.38, 0.06, -0.24), V(-0.04, 0.48, 0.02), 0.1, 'wedge', 1, 'top'],            // 오른쪽 뒤에 기대 선 장작
    [V(-0.30, 0.06, -0.30), V(0.02, 0.44, 0.02), 0.095, 'half', 2, 'top'],           // 왼쪽 뒤에 기대 선 장작
    [V(0.02, 0.06, -0.40), V(0.0, 0.46, -0.02), 0.09, 'wedge', 1, 'top'],            // 정 뒤 기대 선 장작
  ];
  LOGS.forEach(([a, b, R, kind, level, hot]) => addLog(a, b, R, kind, level, hot));
  // 불 속 잔가지
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2);
    const p = polarXZ(a, rand(0.05, 0.18)); p.y = rand(0.04, 0.08);
    const q = polarXZ(a + rand(1.5, 2.5), rand(0.05, 0.2)); q.y = rand(0.08, 0.2);
    addLog(p, q, rand(0.025, 0.035), 'round', CHARRED, 'middle');
  }

  // 아래 숯 더미: 시커먼 덩어리, 틈새로 빨간 불씨
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 70; i++) {
    const hot = Math.pow(Math.random(), 0.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: 1, emissive: new THREE.Color().setHSL(0.01 + hot * 0.02, 1, 0.32), emissiveIntensity: hot ** 3 * 0.6 });   // 대부분 시커멓고 일부만 빨갛게
    const m = new THREE.Mesh(chunkGeo, mat);
    const s = rand(0.025, 0.06);
    m.scale.set(s * rand(1, 1.7), s * rand(0.5, 0.8), s * rand(0.8, 1.2));
    const p = polarXZ(rand(0, Math.PI * 2), Math.sqrt(Math.random()) * 0.3);   // 돌 둘레 밖으로 안 삐져나오게
    m.position.set(p.x, 0.03 + s * 0.35, p.z);
    m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    group.add(m);
    glowMats.push({ mat, base: hot ** 3 * 0.6 });
  }

  window.__firewood = group;   // 확인용
  return { group, glowMats };
}

function polarXZ(angle, radius) { return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius); }
