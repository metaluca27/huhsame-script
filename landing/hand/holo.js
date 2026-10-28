// 3D 홀로그램: 캐릭터 불러오기, 푸른 반투명 재질, 등장·사라짐 효과, 손바닥 빛 고리, 반짝이.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const CHARACTERS = [
  { id: 'pureum', name: '푸름이', yaw: -Math.PI / 2 }, // 서 있는 인형 (얼굴 +x → 카메라 쪽으로)
  { id: 'rurik', name: '루릭', yaw: 0 },               // 사무실 앉은 인형들은 얼굴이 이미 카메라 쪽
  { id: 'clo', name: 'CLO', yaw: 0 },
  { id: 'jujuya', name: '주주야', yaw: 0 },
];

const HOLO = new THREE.Color('#6fd8ff');
const APPEAR_S = 0.7;  // 아래에서 위로 그려지는 시간
const VANISH_S = 0.5;

const vert = /* glsl */`
  varying vec3 vN; varying vec3 vView; varying vec2 vUv; varying float vH;
  uniform float uMinY, uMaxY;
  void main() {
    vUv = uv;
    vH = (position.y - uMinY) / (uMaxY - uMinY);           // 발 0 ~ 머리 1
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const frag = /* glsl */`
  varying vec3 vN; varying vec3 vView; varying vec2 vUv; varying float vH;
  uniform sampler2D uMap; uniform vec3 uColor; uniform float uTime, uReveal, uAlpha, uGlitch;
  void main() {
    if (vH > uReveal) discard;                               // 등장: 아래부터 차오름 / 사라짐: 위부터 지워짐
    float lum = dot(texture2D(uMap, vUv).rgb, vec3(.3, .59, .11));
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.0);
    float scan = .72 + .28 * sin(vH * 140.0 - uTime * 7.0);  // 위로 흐르는 줄무늬
    float edge = smoothstep(uReveal - .04, uReveal, vH) * 2.5; // 차오르는 경계선이 밝게
    vec3 col = uColor * (.28 + lum * 1.05) + uColor * fres * .9 + vec3(.75, .95, 1.0) * edge;
    float a = (.42 + fres * .55 + lum * .25) * scan * uAlpha * (1.0 - uGlitch * .6) + edge;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;

function holoMaterial(map) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: map }, uColor: { value: HOLO }, uTime: { value: 0 }, uReveal: { value: 0 },
      uAlpha: { value: 1 }, uGlitch: { value: 0 }, uMinY: { value: 0 }, uMaxY: { value: 1 },
    },
  });
}

async function loadCharacter(loader, c) {
  const gltf = await loader.loadAsync(`models/${c.id}.glb`);
  const root = new THREE.Group();
  const model = gltf.scene;
  model.rotation.y = c.yaw;
  model.updateMatrixWorld(true);
  // 발바닥이 0, 키가 1 이 되게 맞춘다 (손 크기에 따라 밖에서 키움)
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y;
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const holder = new THREE.Group();
  holder.scale.setScalar(1 / h);
  holder.add(model);
  root.add(holder);
  const mats = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mat = holoMaterial(o.material.map || null);
    // 셰이더의 높이(vH)는 메시 자기 좌표 기준이라 메시마다 위아래 범위를 넣는다
    o.geometry.computeBoundingBox();
    mat.uniforms.uMinY.value = o.geometry.boundingBox.min.y;
    mat.uniforms.uMaxY.value = o.geometry.boundingBox.max.y;
    o.material = mat;
    mats.push(mat);
  });
  root.visible = false;
  return { ...c, root, mats };
}

function sparkles(n = 70) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ color: HOLO, size: 5, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.userData.vel = Array.from({ length: n }, () => new THREE.Vector3());
  return pts;
}

function glowRing() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(160,230,255,.9)');
  grad.addColorStop(.45, 'rgba(111,216,255,.35)');
  grad.addColorStop(1, 'rgba(111,216,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0 });
  return new THREE.Sprite(mat);
}

export async function createHolo(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  // 화면 픽셀 = 장면 단위. y 는 위가 + 라서 손 좌표(아래가 +)를 뒤집어 넣는다
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);
  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const chars = await Promise.all(CHARACTERS.map((c) => loadCharacter(loader, c)));
  chars.forEach((c) => scene.add(c.root));
  const ring = glowRing();
  const spark = sparkles();
  scene.add(ring, spark);

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H;
    cam.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas); // 웹캠 비율에 맞춰 화면 틀이 바뀌어도 따라감

  let shown = null;          // 지금 보이는 캐릭터
  let phase = 'hidden';      // hidden | appear | idle | vanish
  let t0 = 0;
  let pose = null;

  function burst(at, size) {
    const p = spark.geometry.attributes.position;
    spark.userData.vel.forEach((v, i) => {
      p.setXYZ(i, at.x + (Math.random() - .5) * size * .4, at.y + Math.random() * size * .3, 0);
      v.set((Math.random() - .5) * 2.2, Math.random() * 2.6 + .6, 0).multiplyScalar(size * .9);
    });
    p.needsUpdate = true;
    spark.material.opacity = 1;
  }

  return {
    chars,
    /** 손바닥 자세(0~1 좌표) → 화면 픽셀. 영상은 거울 반전이라 x 를 뒤집는다 */
    setPose(p) {
      pose = {
        ...p,
        px: Math.min(p.size * H * 1.8, H * .45),            // 캐릭터 키 = 손 크기에 비례, 손이 카메라에 붙어도 화면 절반까지만
        pt: new THREE.Vector3((1 - p.x) * W, -p.y * H + p.size * H * .15, 0),
      };
    },
    /** 고른 캐릭터 등장 (이미 보이는 게 다르면 바꿔 등장) */
    appear(id) {
      const next = chars.find((c) => c.id === id);
      if (shown === next && (phase === 'idle' || phase === 'appear')) return false;
      if (shown && shown !== next) shown.root.visible = false;
      shown = next; phase = 'appear'; t0 = performance.now();
      shown.root.visible = true;
      if (pose) burst(pose.pt, pose.px);
      return true;
    },
    vanish() {
      if (!shown || phase === 'hidden' || phase === 'vanish') return false;
      phase = 'vanish'; t0 = performance.now();
      if (pose) burst(pose.pt, pose.px);
      return true;
    },
    get visible() { return phase !== 'hidden'; },
    render(now, handVisible) {
      const t = now / 1000;
      for (const c of chars) for (const m of c.mats) m.uniforms.uTime.value = t;
      if (shown && pose) {
        const r = shown.root;
        r.position.copy(pose.pt);
        r.scale.setScalar(pose.px);
        // 손을 기울이면 같이 기울고, 천천히 빙글 돌며 떠 있다
        const tilt = -(Math.PI / 2 + pose.angle);           // 손가락이 위를 향하면 0
        r.rotation.set(0.12, Math.sin(t * .9) * .55, -tilt * .6);
        r.position.y += Math.sin(t * 2.2) * pose.px * .03;
        let reveal = 1, alpha = 1;
        const k = (now - t0) / 1000;
        if (phase === 'appear') { reveal = Math.min(1, k / APPEAR_S); if (reveal >= 1) phase = 'idle'; }
        if (phase === 'vanish') {
          reveal = 1 - Math.min(1, k / VANISH_S); alpha = reveal;
          if (reveal <= 0) { phase = 'hidden'; r.visible = false; }
        }
        if (!handVisible) alpha *= .35;                       // 손이 잠깐 안 보이면 희미하게
        const glitch = Math.random() < .03 ? 1 : 0;          // 가끔 지지직
        for (const m of shown.mats) {
          m.uniforms.uReveal.value = reveal * 1.02;
          m.uniforms.uAlpha.value = alpha;
          m.uniforms.uGlitch.value = glitch;
        }
        if (glitch) r.position.x += (Math.random() - .5) * pose.px * .05;
        ring.position.set(pose.pt.x, pose.pt.y, -1);
        ring.scale.set(pose.px * .9, pose.px * .32, 1);
        ring.material.opacity = phase === 'hidden' ? 0 : .8 * alpha * (.85 + .15 * Math.sin(t * 6));
      } else {
        ring.material.opacity = 0;
      }
      // 반짝이: 위로 흩어지며 사라짐
      if (spark.material.opacity > 0) {
        const p = spark.geometry.attributes.position;
        spark.userData.vel.forEach((v, i) => {
          p.setXYZ(i, p.getX(i) + v.x / 60, p.getY(i) + v.y / 60, 0);
          v.multiplyScalar(.96);
        });
        p.needsUpdate = true;
        spark.material.opacity = Math.max(0, spark.material.opacity - .018);
      }
      renderer.render(scene, cam);
    },
  };
}
