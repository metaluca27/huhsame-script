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
function splitLogGeometry(R, L, kind) {
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, steps: 1 });
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
      const around = bucket === 1 ? (Math.atan2(p.y, p.x) / (Math.PI * 2)) * 1.6 : (p.x + p.y) / (2 * R) * 0.5;
      return [around, (p.z + L / 2) / L];
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
  const split = photo('wood_split.jpg'), splitGlow = photo('wood_split_glow.jpg'), end = photo('wood_end.jpg');
  // 껍질 쪽 빛: 불 쪽 끝에서만 은은하게 (사진 껍질과 안 어긋나게 무늬 없이 번짐만)
  const barkGlow = canvasTex(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, h * 0.55);
    gr.addColorStop(0, 'rgba(255,90,20,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  // 타는 정도 3단계로 재료를 나눠 씀
  const levels = [0.8, 1.3, 2.0].map((burn) => {   // 빛 지도가 가는 틈뿐이라 세기를 높게
    const endMat = new THREE.MeshStandardMaterial({ map: end, roughness: 0.95, color: 0xbfa98f });
    const barkMat = new THREE.MeshStandardMaterial({
      map: barkMap, normalMap: barkNor, roughnessMap: barkArm, roughness: 1, color: 0x6d5a4a,
      emissive: 0xffffff, emissiveMap: barkGlow, emissiveIntensity: burn,
    });
    const splitMat = new THREE.MeshStandardMaterial({
      map: split, roughness: 0.9, color: 0xc9b6a0, emissive: 0xffffff, emissiveMap: splitGlow, emissiveIntensity: burn,
    });
    glowMats.push({ mat: barkMat, base: burn }, { mat: splitMat, base: burn });
    return [endMat, barkMat, splitMat];
  });

  const zAxis = new THREE.Vector3(0, 0, 1);
  function addLog(from, to, R, kind, level) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const L = dir.length();
    const log = new THREE.Mesh(splitLogGeometry(R, L, kind), levels[level]);
    log.position.copy(from).addScaledVector(dir, 0.5);
    log.quaternion.setFromUnitVectors(zAxis, dir.normalize());
    log.rotateZ(rand(0, Math.PI * 2));                // 쪼갠 면 방향을 제각각
    group.add(log);
  }

  // 바닥: 두 겹으로 엇갈려 눕힌 굵은 장작 (우물 정자 비슷하게)
  for (let layer = 0; layer < 2; layer++) {
    const base = layer * Math.PI / 2 + rand(-0.2, 0.2);
    [-1, 1].forEach((side) => {
      const off = polarXZ(base + Math.PI / 2, 0.2 * side);
      const half = polarXZ(base, rand(0.3, 0.36));
      const y = 0.09 + layer * 0.15;
      addLog(new THREE.Vector3(off.x - half.x, y, off.z - half.z), new THREE.Vector3(off.x + half.x, y + rand(-0.02, 0.02), off.z + half.z),
        rand(0.085, 0.11), pick(['wedge', 'half', 'round']), 2 - layer);
    });
  }
  // 위: 가운데로 기대 세워 엇갈린 장작
  const LEAN = 6;
  for (let i = 0; i < LEAN; i++) {
    const a = (i / LEAN) * Math.PI * 2 + rand(-0.2, 0.2);
    const foot = polarXZ(a, rand(0.36, 0.44)); foot.y = 0.06;
    const top = polarXZ(a + Math.PI + rand(-0.5, 0.5), rand(0.02, 0.12)); top.y = rand(0.5, 0.66);
    addLog(foot, top, rand(0.08, 0.105), pick(['wedge', 'wedge', 'half']), i % 3 === 0 ? 2 : 1);
  }
  // 불 속 가는 잔가지 몇 개
  for (let i = 0; i < 5; i++) {
    const a = rand(0, Math.PI * 2);
    const p = polarXZ(a, rand(0.05, 0.2)); p.y = rand(0.04, 0.1);
    const q = polarXZ(a + rand(1.5, 2.5), rand(0.05, 0.25)); q.y = rand(0.1, 0.3);
    addLog(p, q, rand(0.025, 0.04), 'round', 2);
  }

  // 아래 숯 더미: 시커먼 덩어리, 틈새로 빨간 불씨
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 70; i++) {
    const hot = Math.pow(Math.random(), 0.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 1, emissive: new THREE.Color().setHSL(0.03 + hot * 0.04, 1, 0.5), emissiveIntensity: hot * 1.2 });
    const m = new THREE.Mesh(chunkGeo, mat);
    const s = rand(0.025, 0.06);
    m.scale.set(s * rand(1, 1.7), s * rand(0.5, 0.8), s * rand(0.8, 1.2));
    const p = polarXZ(rand(0, Math.PI * 2), Math.sqrt(Math.random()) * 0.42);
    m.position.set(p.x, s * 0.35, p.z);
    m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    group.add(m);
    glowMats.push({ mat, base: hot * 1.2 });
  }

  return { group, glowMats };
}

function polarXZ(angle, radius) { return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius); }
