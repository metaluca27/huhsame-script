import * as THREE from 'three';

// 물건 모양 만들기. stories.js의 id와 같은 이름으로 함수 하나씩.
// 모두 바닥(y=0)에서 위로 쌓이는 크기 약 0.5m 안팎의 로우폴리 소품.

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, seg, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };

function merge() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28, roughness: 0.1, flatShading: true });
  g.add(put(cyl(0.2, 0.22, 0.42, 10, glass), 0, 0.21, 0));
  g.add(put(cyl(0.12, 0.12, 0.06, 10, mat(0x8a5a3a)), 0, 0.45, 0));
  const colors = [0xff8a65, 0xffd54f, 0x81c784, 0x64b5f6, 0xba68c8, 0xf06292];
  const sizes = [0.07, 0.06, 0.08, 0.05, 0.065, 0.055];
  const spots = [[-0.08, 0.08, 0.02], [0.08, 0.07, -0.04], [0, 0.09, 0.08], [0.05, 0.2, 0.05], [-0.06, 0.21, -0.05], [0.02, 0.31, 0]];
  spots.forEach((p, i) => g.add(put(new THREE.Mesh(new THREE.IcosahedronGeometry(sizes[i], 0), mat(colors[i], { emissive: colors[i], emissiveIntensity: 0.25 })), ...p)));
  return g;
}

function nyangsa() {
  const g = new THREE.Group();
  const wood = mat(0x7b4a2e), roof = mat(0x3d4a5a), wall = mat(0xf1e4cc), red = mat(0xb5432f);
  g.add(put(box(0.62, 0.06, 0.46, mat(0x9a8f7f)), 0, 0.03, 0));
  g.add(put(box(0.42, 0.18, 0.28, wall), 0, 0.15, 0));
  for (const x of [-0.19, -0.065, 0.065, 0.19]) g.add(put(box(0.025, 0.18, 0.025, red), x, 0.15, 0.14));
  const r = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.2, 4), roof);
  r.rotation.y = Math.PI / 4; r.scale.set(1.25, 1, 0.85);
  g.add(put(r, 0, 0.34, 0));
  // 작은 석탑
  for (let i = 0; i < 3; i++) g.add(put(box(0.09 - i * 0.02, 0.05, 0.09 - i * 0.02, mat(0xb9b2a6)), 0.27, 0.085 + i * 0.07, 0.15));
  g.add(put(box(0.04, 0.12, 0.04, wood), -0.27, 0.12, 0.16));
  return g;
}

function tarot() {
  const g = new THREE.Group();
  const back = mat(0x3b2457), gold = mat(0xd9b45b, { emissive: 0x5a3d10, emissiveIntensity: 0.4 });
  for (let i = 0; i < 6; i++) {
    const c = put(box(0.2, 0.012, 0.32, i % 2 ? back : mat(0x45296a)), 0, 0.006 + i * 0.013, 0);
    c.rotation.y = (i - 3) * 0.04;
    g.add(c);
  }
  // 세워 둔 카드 한 장
  const card = new THREE.Group();
  card.add(box(0.2, 0.32, 0.01, back));
  card.add(put(new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), gold), 0, 0, 0.012));
  card.position.set(0.05, 0.2, -0.12); card.rotation.x = -0.25;
  g.add(card);
  // 촛불
  g.add(put(cyl(0.025, 0.025, 0.1, 6, mat(0xf3ead6)), -0.2, 0.05, 0.08));
  g.add(put(new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 5), mat(0xffc164, { emissive: 0xffa040, emissiveIntensity: 2 })), -0.2, 0.12, 0.08));
  return g;
}

function talk() {
  const g = new THREE.Group();
  const body = mat(0xe0723a), dark = mat(0x2b2b2e);
  g.add(put(box(0.18, 0.3, 0.09, body), 0, 0.15, 0));
  g.add(put(box(0.13, 0.08, 0.01, mat(0x9fe0c9, { emissive: 0x3c9a7a, emissiveIntensity: 0.6 })), 0, 0.22, 0.05));
  for (let i = 0; i < 3; i++) g.add(put(box(0.12, 0.012, 0.01, dark), 0, 0.1 - i * 0.03, 0.05));
  g.add(put(cyl(0.012, 0.012, 0.22, 5, dark), 0.06, 0.41, 0));
  // 짝꿍 무전기 하나 더 (마주 보는 대화)
  const b2 = new THREE.Group();
  b2.add(put(box(0.18, 0.3, 0.09, mat(0x3a7fe0)), 0, 0.15, 0));
  b2.add(put(box(0.13, 0.08, 0.01, mat(0x9fe0c9, { emissive: 0x3c9a7a, emissiveIntensity: 0.6 })), 0, 0.22, 0.05));
  b2.add(put(cyl(0.012, 0.012, 0.22, 5, dark), 0.06, 0.41, 0));
  b2.position.set(0.24, 0, -0.04); b2.rotation.y = -0.5;
  g.add(b2);
  g.position.x = -0.1;
  const wrap = new THREE.Group(); wrap.add(g);
  return wrap;
}

function look() {
  const g = new THREE.Group();
  g.add(put(box(0.36, 0.24, 0.3, mat(0xd9c3a0)), 0, 0.12, 0));
  g.add(put(box(0.38, 0.04, 0.32, mat(0xb89a72)), 0, 0.26, 0));
  // 상자에서 나오는 말풍선
  const bubble = new THREE.Group();
  bubble.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.15 })));
  bubble.children[0].scale.set(1.3, 0.85, 0.5);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 4), mat(0xffffff));
  tail.position.set(-0.08, -0.11, 0); tail.rotation.z = 0.6;
  bubble.add(tail);
  for (let i = -1; i <= 1; i++) bubble.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(0x4a5a7a)), i * 0.055, 0, 0.06));
  bubble.position.set(0.05, 0.48, 0);
  g.add(bubble);
  return g;
}

function gallery() {
  const g = new THREE.Group();
  const log = mat(0x6b4226);
  for (let i = 0; i < 4; i++) {
    const l = cyl(0.03, 0.035, 0.36, 6, log);
    l.rotation.z = Math.PI / 2; l.rotation.y = (i / 4) * Math.PI;
    g.add(put(l, 0, 0.035, 0));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(put(new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), mat(0x8f8a82)), Math.cos(a) * 0.24, 0.03, Math.sin(a) * 0.24));
  }
  const flameMat = mat(0xffa040, { emissive: 0xff7a1a, emissiveIntensity: 1.6, transparent: true, opacity: 0.92 });
  const f1 = put(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), flameMat), 0, 0.2, 0);
  const f2 = put(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), mat(0xffe08a, { emissive: 0xffc040, emissiveIntensity: 2 })), 0.02, 0.16, 0.02);
  f1.userData.flicker = 1; f2.userData.flicker = 1.6;
  g.add(f1, f2);
  // 작은 그림 액자 하나 (전시장)
  const frame = new THREE.Group();
  frame.add(box(0.26, 0.2, 0.02, mat(0x5b3a22)));
  frame.add(put(box(0.21, 0.15, 0.01, mat(0x5f7fb0, { emissive: 0x1a2a4a, emissiveIntensity: 0.4 })), 0, 0, 0.012));
  frame.position.set(-0.05, 0.16, -0.3); frame.rotation.x = -0.2;
  g.add(frame);
  return g;
}

const MAKERS = { merge, nyangsa, tarot, talk, look, gallery };

export function makeProp(id) {
  const maker = MAKERS[id];
  if (!maker) throw new Error(`props.js에 "${id}" 모양이 없어요`);
  return maker();
}

// 받침대(작은 나무 선반·상자)
export function makeStand(height) {
  const g = new THREE.Group();
  const wood = mat(0x8b5e3c);
  g.add(put(box(0.7, 0.05, 0.55, wood), 0, height - 0.025, 0));
  for (const [x, z] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) g.add(put(box(0.05, height - 0.05, 0.05, wood), x, (height - 0.05) / 2, z));
  return g;
}
