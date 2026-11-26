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

/* ---------- 질감: 쪼갠 면 (가로=둘레 방향, 세로=길이 방향) ---------- */
// 숯 자국: 불 쪽 끝(아래)에서 번진 검은 부분 + 그 안이 거북등처럼 크고 불규칙하게 갈라짐.
// 같은 무늬를 색 질감과 빛 질감에 똑같이 그리려고 난수를 고정한 그리드를 미리 만든다.
function charCells(w, h) {
  const cw = 56, ch = 40, cols = Math.ceil(w / cw) + 1, rows = Math.ceil(h / ch) + 1;
  const pts = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++)
    pts.push([c * cw + rand(-cw, cw) * 0.28, h - r * ch + rand(-ch, ch) * 0.28]);
  const P = (r, c) => pts[r * (cols + 1) + c];
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const y = h - r * ch;
    const reach = 0.62 + rand(-0.08, 0.08);                  // 숯이 길이의 60% 언저리까지
    if ((h - y) / h > reach * (0.75 + 0.25 * Math.sin(c * 1.7))) continue;
    cells.push({ poly: [P(r, c), P(r, c + 1), P(r + 1, c + 1), P(r + 1, c)], heat: 1 - (h - y) / h / reach, shade: rand(0, 1), glow: rand(0, 1) });
  }
  return cells;
}
function tracePoly(g, poly, inset) {
  const cx = poly.reduce((a, p) => a + p[0], 0) / 4, cy = poly.reduce((a, p) => a + p[1], 0) / 4;
  g.beginPath();
  poly.forEach(([x, y], i) => { const px = cx + (x - cx) * inset, py = cy + (y - cy) * inset; i ? g.lineTo(px, py) : g.moveTo(px, py); });
  g.closePath();
}
function drawChar(g, w, h, cells, glowOnly) {
  if (!glowOnly) {
    // 숯과 생나무 사이: 그을린 갈색 번짐
    const grad = g.createLinearGradient(0, h, 0, h * 0.25);
    grad.addColorStop(0, 'rgba(25,14,8,0.85)'); grad.addColorStop(0.55, 'rgba(45,25,12,0.55)'); grad.addColorStop(1, 'rgba(60,35,18,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // 틈은 거의 검정 (먼저 칠하고 그 위에 조각을 올림)
    cells.forEach(({ poly }) => { tracePoly(g, poly, 1.02); g.fillStyle = '#060302'; g.fill(); });
  }
  cells.forEach(({ poly, heat, shade, glow }) => {
    if (glowOnly) {
      // 불 바로 옆, 일부 틈 깊은 곳만 가늘게 빨갛게
      if (heat < 0.55 || glow > heat * 0.8) return;
      tracePoly(g, poly, 1.0);
      g.strokeStyle = `rgba(255,${Math.floor(60 + heat * 50)},20,${(heat - 0.5) * 1.2})`;
      g.lineWidth = 1.5; g.stroke();
    } else {
      tracePoly(g, poly, 0.86);
      g.fillStyle = `hsl(22, ${10 + shade * 12}%, ${6 + shade * 8}%)`; g.fill();
      tracePoly(g, poly, 0.55);                                 // 조각 가운데 살짝 볼록한 윤기
      g.fillStyle = `rgba(255,230,200,${0.025 + shade * 0.035})`; g.fill();
    }
  });
}
const W = 512, H = 1024;
const SPLIT_CELLS = charCells(W, H);
const splitTex = () => canvasTex(W, H, (g, w, h) => {
  g.fillStyle = '#b7895a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {                     // 세로 나뭇결
    const x = rand(0, w), lw = rand(1, 5);
    g.fillStyle = `hsla(${rand(24, 34)}, ${rand(30, 50)}%, ${rand(32, 62)}%, ${rand(0.25, 0.6)})`;
    g.fillRect(x, 0, lw, h);
  }
  for (let i = 0; i < 18; i++) {                      // 쪼개질 때 생긴 결 따라 갈라진 틈
    g.strokeStyle = `rgba(40,22,10,${rand(0.4, 0.8)})`; g.lineWidth = rand(1, 2.5);
    let x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += rand(-3, 3); y += rand(20, 50); g.lineTo(x, y); }
    g.stroke();
  }
  drawChar(g, w, h, SPLIT_CELLS, false);
});
const splitGlowTex = () => canvasTex(W, H, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  drawChar(g, w, h, SPLIT_CELLS, true);
});
// 나무껍질 쪽에도 같은 거북등 숯 자국 (사진 질감 위에 겹칠 빛만)
const barkGlowTex = splitGlowTex;

/* ---------- 질감: 끝 단면 나이테 ---------- */
const endTex = () => canvasTex(256, 256, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#c69863'; g.fillRect(0, 0, w, w);
  for (let r = c; r > 3; r -= rand(4, 9)) {
    g.beginPath(); g.arc(c + rand(-1.5, 1.5), c + rand(-1.5, 1.5), r, 0, Math.PI * 2);
    g.strokeStyle = `hsla(26, ${rand(35, 50)}%, ${rand(30, 45)}%, ${rand(0.4, 0.8)})`;
    g.lineWidth = rand(1, 2.5); g.stroke();
  }
  g.strokeStyle = 'rgba(50,28,12,0.7)'; g.lineWidth = 2;     // 마르며 생긴 방사형 금
  for (let i = 0; i < 6; i++) { const a = rand(0, 6.28); g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * rand(0.4, 0.95), c + Math.sin(a) * c * rand(0.4, 0.95)); g.stroke(); }
  const grad = g.createRadialGradient(c, c, c * 0.8, c, c, c);  // 바깥 껍질 테두리
  grad.addColorStop(0, 'rgba(30,18,10,0)'); grad.addColorStop(1, 'rgba(30,18,10,1)');
  g.fillStyle = grad; g.fillRect(0, 0, w, w);
});

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
      if (bucket === 0) return [p.x / (2.2 * R) + 0.5, p.y / (2.2 * R) + 0.5];   // 나이테 중심 = 원래 나무 중심
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
  const split = splitTex(), splitGlow = splitGlowTex(), end = endTex(), barkGlow = barkGlowTex();

  // 타는 정도 3단계로 재료를 나눠 씀
  const levels = [0.35, 0.6, 0.95].map((burn) => {
    const endMat = new THREE.MeshStandardMaterial({ map: end, roughness: 0.95, color: 0xa88a6c });
    const barkMat = new THREE.MeshStandardMaterial({
      map: barkMap, normalMap: barkNor, roughnessMap: barkArm, roughness: 1, color: 0x6d5a4a,
      emissive: 0xffffff, emissiveMap: barkGlow, emissiveIntensity: burn,
    });
    const splitMat = new THREE.MeshStandardMaterial({
      map: split, roughness: 0.85, color: 0xd8c2a8, emissive: 0xffffff, emissiveMap: splitGlow, emissiveIntensity: burn,
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
