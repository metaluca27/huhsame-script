// 바닷가 언덕 한가운데 놓인 낡은 업라이트 피아노: 나무 몸통, 건반, 악보, 덩굴·꽃, 분홍 리본, 의자
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 바닷바람에 바랜 나무: 세로 결 + 군데군데 벗겨진 칠
const woodTex = () => canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#6a452c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `hsl(${rand(20, 30)}, ${rand(30, 45)}%, ${rand(18, 36)}%)`;
    g.globalAlpha = rand(0.25, 0.6);
    g.fillRect(rand(0, w), 0, rand(1, 6), h);
  }
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `hsl(${rand(28, 40)}, 25%, ${rand(55, 68)}%)`;
    g.globalAlpha = rand(0.15, 0.35);
    g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(8, 30), rand(4, 14), rand(0, 3), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
});

// 건반 36개 + 검은건반 (조금 누렇게 바랜 상아색)
const keysTex = () => canvasTexture(1024, 128, (g, w, h) => {
  const n = 36, kw = w / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = `hsl(42, ${rand(25, 40)}%, ${rand(80, 90)}%)`;
    g.fillRect(i * kw, 0, kw, h);
    g.fillStyle = 'rgba(40,30,20,0.6)'; g.fillRect(i * kw, 0, 2, h);
  }
  g.fillStyle = '#15110e';
  for (let i = 0; i < n - 1; i++) {
    if ([0, 1, 3, 4, 5].includes(i % 7)) g.fillRect((i + 1) * kw - kw * 0.3, 0, kw * 0.6, h * 0.6);
  }
});

const sheetTex = () => canvasTexture(256, 180, (g, w, h) => {
  g.fillStyle = '#f3ead6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#6b5a48'; g.fillStyle = '#3b2f25'; g.lineWidth = 1;
  for (let s = 0; s < 4; s++) {
    const y0 = 22 + s * 40;
    for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(14, y0 + l * 5); g.lineTo(w - 14, y0 + l * 5); g.stroke(); }
    for (let x = 30; x < w - 20; x += rand(12, 22)) {
      g.beginPath(); g.ellipse(x, y0 + Math.floor(rand(0, 9)) * 2.5, 3, 2.2, -0.4, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = 'rgba(150,110,60,0.15)'; g.fillRect(0, 0, w, h);
});

export function createPiano() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.85 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); group.add(m); return m;
  };

  // 몸통 (앞면이 +z 쪽)
  box(1.5, 1.32, 0.36, wood, 0, 0.66, -0.13);
  box(1.56, 0.05, 0.42, darkWood, 0, 1.345, -0.13);           // 뚜껑
  box(1.42, 0.1, 0.32, wood, 0, 0.7, 0.2);                     // 건반 받침
  [-1, 1].forEach((s) => {
    box(0.07, 0.3, 0.4, darkWood, s * 0.745, 0.82, 0.18);       // 양옆 팔걸이
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.66, 10), darkWood);
    leg.position.set(s * 0.69, 0.33, 0.3); group.add(leg);
  });
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.16), new THREE.MeshStandardMaterial({ map: keysTex(), roughness: 0.5 }));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.752, 0.24); group.add(keys);
  box(1.42, 0.12, 0.03, darkWood, 0, 0.82, 0.07);               // 건반 뒤 띠

  // 악보대와 악보
  const desk = box(0.7, 0.05, 0.02, darkWood, 0, 0.93, 0.075);
  desk.rotation.x = -0.15;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ map: sheetTex(), roughness: 1, side: THREE.DoubleSide }));
  sheet.position.set(0, 1.12, 0.07); sheet.rotation.x = -0.15; group.add(sheet);

  // 덩굴
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6b2e, roughness: 1 });
  const vines = [
    [[-0.82, 0, 0.3], [-0.8, 0.35, 0.2], [-0.79, 0.8, 0.08], [-0.7, 1.2, 0.04], [-0.45, 1.39, -0.05], [-0.1, 1.38, -0.2]],
    [[0.86, 0, -0.05], [0.8, 0.45, -0.28], [0.79, 0.95, -0.2], [0.62, 1.38, -0.25], [0.3, 1.39, -0.1]],
    [[-0.3, 0, 0.35], [-0.55, 0.2, 0.32], [-0.68, 0.45, 0.3], [-0.72, 0.7, 0.28]],
    [[0.5, 0, 0.4], [0.66, 0.25, 0.33], [0.7, 0.55, 0.3]],
  ].map((pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))));
  vines.forEach((c) => group.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.012, 5), vineMat)));

  const leafGeo = new THREE.CircleGeometry(0.04, 6); leafGeo.scale(1.8, 1, 1);
  const leafCount = 140;
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0x4f8a35, roughness: 0.9, side: THREE.DoubleSide }), leafCount);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < leafCount; i++) {
    const p = vines[i % vines.length].getPoint(Math.random());
    p.add(new THREE.Vector3(rand(-0.05, 0.05), rand(-0.03, 0.03), rand(-0.05, 0.05)));
    e.set(rand(0, 3), rand(0, 3), rand(0, 3)); q.setFromEuler(e);
    const s = rand(0.6, 1.3);
    m.compose(p, q, new THREE.Vector3(s, s, s)); leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, col.setHSL(rand(0.24, 0.32), rand(0.4, 0.6), rand(0.25, 0.4)));
  }
  group.add(leaves);

  // 붉은 동백, 하얀 들꽃
  const camellia = new THREE.MeshStandardMaterial({ color: 0xe0352b, roughness: 0.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c53d, roughness: 0.6 });
  [[0, 0.35], [0, 0.7], [1, 0.5], [1, 0.85], [2, 0.6], [0, 0.95]].forEach(([v, t]) => {
    const p = vines[v].getPoint(t);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), camellia);
    f.scale.set(1, 0.7, 1); f.position.copy(p).add(new THREE.Vector3(0, 0.02, 0.03)); group.add(f);
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), yellow);
    c.position.copy(f.position).add(new THREE.Vector3(0, 0.035, 0.015)); group.add(c);
  });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.7 });
  for (let i = 0; i < 7; i++) {
    const x = rand(-0.6, 0.6), z = rand(-0.25, 0);
    const petal = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 12), white);
    petal.position.set(x, 1.375, z); group.add(petal);
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), yellow);
    c.position.set(x, 1.385, z); group.add(c);
  }

  // 분홍 리본 (왼쪽 위 모서리)
  const ribbon = new THREE.MeshStandardMaterial({ color: 0xe8879b, roughness: 0.55, side: THREE.DoubleSide });
  const bow = new THREE.Group(); bow.position.set(-0.6, 1.42, 0.05); group.add(bow);
  [-1, 1].forEach((s) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 24), ribbon);
    loop.scale.set(1.2, 0.7, 0.4); loop.position.x = s * 0.1; loop.rotation.z = s * 0.25; bow.add(loop);
  });
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), ribbon));
  const tails = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.02, -0.02, 0.02); bow.add(pivot);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.38), ribbon);
    tail.position.y = -0.19; pivot.rotation.z = s * 0.35; pivot.add(tail);
    return { pivot, s };
  });

  // 피아노 앞 나무 의자
  const chair = new THREE.Group(); chair.position.set(0.05, 0, 0.82); group.add(chair);
  const part = (w, h, d, x, y, z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkWood); p.position.set(x, y, z); chair.add(p); };
  part(0.44, 0.04, 0.42, 0, 0.46, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(0.035, 0.46, 0.035, sx * 0.19, 0.23, sz * 0.18));
  [-1, 1].forEach((sx) => part(0.035, 0.5, 0.035, sx * 0.19, 0.73, 0.18));
  part(0.44, 0.08, 0.03, 0, 0.94, 0.18);
  part(0.44, 0.04, 0.03, 0, 0.74, 0.18);

  group.traverse((o) => { if (o.isMesh) o.userData.piano = true; });

  return {
    group,
    update(t) {
      tails.forEach(({ pivot, s }, i) => { pivot.rotation.z = s * 0.35 + Math.sin(t * 1.6 + i * 1.3) * 0.12; pivot.rotation.x = Math.sin(t * 1.1 + i) * 0.15; });
    },
  };
}
