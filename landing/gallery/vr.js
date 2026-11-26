// 모닥불 전시장 VR 모드: 헤드셋(또는 에뮬레이터) 안에서 가리키고 눌러 순간이동
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const STAND = 2.3;        // 그림 앞 몇 m에 세워줄지
const WALK_MIN = 1.4;     // 모닥불에서 최소 거리
const WALK_MAX = 26;      // 전시장 밖으로 못 나가게

// 주소에 ?xr=emu 를 붙이면 Meta 웹 에뮬레이터(가상 헤드셋 + 조작판)를 켠다
async function maybeEmulate() {
  if (new URLSearchParams(location.search).get('xr') !== 'emu') return;
  const load = (src) => new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.append(s);
  });
  await load('https://cdn.jsdelivr.net/npm/iwer@2.8.0/build/iwer.min.js');
  await load('https://cdn.jsdelivr.net/npm/@iwer/devui@2.8.0/build/iwer-devui.min.js');
  const device = new window.IWER.XRDevice(window.IWER.metaQuest3);
  device.installRuntime({ forceInstall: true });   // 브라우저에 꺼진 VR 기능이 있어도 덮어쓰기
  new window.IWER_DevUI.DevUI(device);
  window.xrDevice = device;   // 확인용
}

// 한글 줄바꿈: 글자 단위로 재면서 폭을 넘으면 다음 줄
function wrapLines(g, text, maxW) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of para) {
      if (g.measureText(line + ch).width > maxW && line) { lines.push(line.trimEnd()); line = ch.trimStart(); }
      else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

function makePlate(piece, total) {
  const W = 1024, PAD = 56;
  const c = document.createElement('canvas'); c.width = W; c.height = 1024;
  const g = c.getContext('2d');
  const font = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  g.font = `34px ${font}`;
  const story = wrapLines(g, piece.story || '', W - PAD * 2);
  const H = Math.min(1024, 250 + story.length * 50 + PAD);
  c.height = H;
  g.fillStyle = 'rgba(10,12,24,0.86)'; g.beginPath(); g.roundRect(0, 0, W, H, 36); g.fill();
  g.strokeStyle = 'rgba(255,176,102,0.5)'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#ffb066'; g.font = `28px ${font}`;
  g.fillText(`${String(piece.index + 1).padStart(2, '0')} / ${total}`, PAD, PAD + 24);
  g.fillStyle = '#f4ead8'; g.font = `bold 60px ${font}`;
  g.fillText(piece.title, PAD, PAD + 104);
  if (piece.year) {
    const tw = g.measureText(piece.title).width;
    g.fillStyle = '#b9ad98'; g.font = `34px ${font}`; g.fillText(piece.year, PAD + tw + 20, PAD + 104);
  }
  g.fillStyle = '#e2d7c3'; g.font = `34px ${font}`;
  story.forEach((l, i) => g.fillText(l, PAD, 220 + i * 50));

  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const w = 1.15, h = w * (H / W);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
  // 그림 오른쪽, 윗변이 바닥에서 1.6m (그림 묶음의 원점이 1.75m 높이)
  plate.position.set(piece.w / 2 + 0.25 + w / 2, 1.6 - 1.75 - h / 2, 0.05);
  plate.rotation.y = -0.25;
  return plate;
}

export function setupVR({ renderer, scene, camera, rig, pieces, ground, polar, ring, onEnter, onExit }) {
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  const buttons = [...document.querySelectorAll('[data-vr]')];
  const plates = [];

  /* ---------- 손·컨트롤러 ---------- */
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const controllerModels = new XRControllerModelFactory();
  const handModels = new XRHandModelFactory();
  const inputs = [0, 1].map((i) => {
    const ctrl = renderer.xr.getController(i);
    const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xf4ead8, transparent: true, opacity: 0.7 }));
    ray.scale.z = 5; ctrl.add(ray);
    rig.add(ctrl);
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModels.createControllerModel(grip)); rig.add(grip);
    const hand = renderer.xr.getHand(i);
    hand.add(handModels.createHandModel(hand, 'boxes')); rig.add(hand);
    const input = { ctrl, ray, hit: null };
    ctrl.addEventListener('selectend', () => act(input));
    ctrl.addEventListener('connected', (e) => { ray.visible = e.data.targetRayMode !== 'gaze'; });
    return input;
  });

  // 땅에 뜨는 동그라미(어디로 갈지)
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffb066, transparent: true, opacity: 0.85, depthWrite: false })
  );
  reticle.visible = false; scene.add(reticle);

  /* ---------- 순간이동 ---------- */
  const headLocal = new THREE.Vector3();
  const headQ = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  // 머리가 (x,z)에 오도록 몸통을 옮긴다. yaw를 주면 그 방향을 보게 돌린다.
  function teleport(x, z, yaw = null) {
    // VR 중엔 three.js가 camera에 '몸통 기준' 머리 위치·방향을 넣어 준다
    headLocal.copy(camera.position);
    if (yaw !== null) {
      headQ.copy(camera.quaternion); euler.setFromQuaternion(headQ);
      rig.rotation.y = yaw - euler.y;
    }
    const off = new THREE.Vector3(headLocal.x, 0, headLocal.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rig.rotation.y);
    rig.position.set(x - off.x, 0, z - off.z);
  }
  // 그림을 바라보는 방향(바깥쪽)의 yaw: (0,0,-1)을 돌려 (sin a, cos a)가 되게
  const faceOut = (a) => a + Math.PI;

  function goToPiece(i) {
    const p = pieces[i];
    const pos = polar(p.angle, ring - STAND, 0);
    teleport(pos.x, pos.z, faceOut(p.angle));
  }

  function act(input) {
    const h = input.hit;
    if (!h) return;
    if (h.piece != null) goToPiece(h.piece);
    else if (h.ground) teleport(h.point.x, h.point.z);
  }

  /* ---------- 가리키는 곳 찾기 ---------- */
  const raycaster = new THREE.Raycaster();
  const rot = new THREE.Matrix4();
  function aim() {
    const targets = pieces.map((p) => p.mesh).filter(Boolean);
    reticle.visible = false;
    for (const input of inputs) {
      const { ctrl, ray } = input;
      input.hit = null;
      if (!ctrl.visible && !ray.visible) continue;
      rot.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rot);
      raycaster.far = 40;
      const art = raycaster.intersectObjects(targets)[0];
      const floor = raycaster.intersectObject(ground)[0];
      if (art && (!floor || art.distance < floor.distance)) {
        input.hit = { piece: art.object.userData.index };
        ray.material.color.set(0xffb066); ray.scale.z = art.distance;
      } else if (floor) {
        const r = Math.hypot(floor.point.x, floor.point.z);
        const ok = r > WALK_MIN && r < WALK_MAX;
        input.hit = ok ? { ground: true, point: floor.point.clone() } : null;
        ray.material.color.set(ok ? 0xf4ead8 : 0x885555); ray.scale.z = floor.distance;
        if (ok) { reticle.position.set(floor.point.x, 0.02, floor.point.z); reticle.visible = true; }
      } else {
        ray.material.color.set(0xf4ead8); ray.scale.z = 5;
      }
    }
  }

  /* ---------- 들어가기·나가기 ---------- */
  async function enterVR() {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
    } catch (err) {
      console.warn('VR 입장 실패', err);
    }
  }
  renderer.xr.addEventListener('sessionstart', () => {
    if (!plates.length) {
      pieces.forEach((p) => {
        if (!p.mesh) return;
        const plate = makePlate(p, pieces.length); p.group.add(plate); plates.push(plate);
      });
    }
    plates.forEach((pl) => { pl.visible = true; });
    onEnter();
    // 첫 자세가 잡힌 다음 프레임에 첫 그림 앞에 세운다
    requestAnimationFrame(() => {
      const p = pieces[0];
      const pos = polar(p.angle, 3.4, 0);
      teleport(pos.x, pos.z, faceOut(p.angle));
    });
  });
  renderer.xr.addEventListener('sessionend', () => {
    plates.forEach((pl) => { pl.visible = false; });
    reticle.visible = false;
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    onExit();
  });

  buttons.forEach((b) => b.addEventListener('click', enterVR));
  maybeEmulate()
    .catch((e) => console.warn('에뮬레이터 불러오기 실패', e))
    .then(() => navigator.xr?.isSessionSupported('immersive-vr'))
    .then((ok) => { if (ok) buttons.forEach((b) => { b.hidden = false; }); })
    .catch(() => {});

  return {
    update() { if (renderer.xr.isPresenting) aim(); },
    goToPiece,
    enterVR,
    // 확인용: 콘솔에서 gallery.vr.debug()
    debug: () => ({ rig: rig.position.toArray().map((v) => +v.toFixed(2)), hits: inputs.map((i) => i.hit) }),
  };
}
