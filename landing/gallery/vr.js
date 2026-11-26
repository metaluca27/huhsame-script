// 모닥불 전시장 VR 모드: 헤드셋(또는 에뮬레이터) 안에서 가리키고 눌러 순간이동
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const STAND = 2.3;        // 그림 앞 몇 m에 세워줄지
const WALK_MIN = 1.4;     // 모닥불에서 최소 거리
const WALK_MAX = 7.5;     // 그림 원(9m) 안에서만 다니게

const EMU = new URLSearchParams(location.search).get('xr') === 'emu';

// 주소에 ?xr=emu 를 붙이면 Meta 웹 에뮬레이터(가상 헤드셋)를 켠다.
// 에뮬레이터 자체 조작판은 화살표·고리가 화면을 가리고 클릭을 가로채서 쓰지 않고,
// 아래 setupEmuControls 의 간단한 마우스 조작(끌기=고개, 누르기=이동)을 쓴다.
async function maybeEmulate() {
  if (!EMU) return;
  const load = (src) => new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.append(s);
  });
  await load('https://cdn.jsdelivr.net/npm/iwer@2.8.0/build/iwer.min.js');
  const device = new window.IWER.XRDevice(window.IWER.metaQuest3);
  device.installRuntime({ forceInstall: true });   // 브라우저에 꺼진 VR 기능이 있어도 덮어쓰기
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

function makePlate(piece, total, renderer) {
  // 2배 해상도로 그려서 헤드셋 안에서도 글자가 또렷하게
  const S = 2, W = 1024 * S, PAD = 56 * S;
  const c = document.createElement('canvas'); c.width = W; c.height = 1024 * S;
  const g = c.getContext('2d');
  const font = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  g.font = `500 ${40 * S}px ${font}`;
  const story = wrapLines(g, piece.story || '', W - PAD * 2);
  const LINE = 58 * S;
  const H = Math.min(1400 * S, 240 * S + story.length * LINE + PAD);
  c.height = H;
  g.fillStyle = 'rgb(12,14,26)'; g.beginPath(); g.roundRect(0, 0, W, H, 36 * S); g.fill();
  g.strokeStyle = 'rgba(255,176,102,0.6)'; g.lineWidth = 4 * S; g.stroke();
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffb066'; g.font = `600 ${30 * S}px ${font}`;
  g.fillText(`${String(piece.index + 1).padStart(2, '0')} / ${total}`, PAD, PAD + 26 * S);
  g.fillStyle = '#ffffff'; g.font = `bold ${64 * S}px ${font}`;
  g.fillText(piece.title, PAD, PAD + 110 * S);
  if (piece.year) {
    const tw = g.measureText(piece.title).width;
    g.fillStyle = '#d8ccb6'; g.font = `500 ${38 * S}px ${font}`; g.fillText(piece.year, PAD + tw + 20 * S, PAD + 110 * S);
  }
  g.fillStyle = '#f6efe2'; g.font = `500 ${40 * S}px ${font}`;
  story.forEach((l, i) => g.fillText(l, PAD, 232 * S + i * LINE));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();   // 비스듬히 봐도 덜 뭉개지게
  // toneMapped:false = 전시장 색감 보정을 글자엔 안 걸어서 흰 글씨가 그대로 하얗게
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false });
  const w = 1.5, h = w * (H / W);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  // 그림 오른쪽, 윗변이 바닥에서 1.6m (그림 묶음의 원점이 1.75m 높이)
  const x = piece.w / 2 + 0.2 + w / 2;
  plate.position.set(x, 1.6 - 1.75 - h / 2, 0.05);
  plate.rotation.y = -Math.atan2(x, STAND);   // 그림 앞에 선 사람을 정면으로 보게
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
    if (!EMU) rig.add(ctrl);   // 에뮬레이터에선 마우스로 조작하니 가짜 컨트롤러를 안 띄움
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModels.createControllerModel(grip)); if (!EMU) rig.add(grip);
    const hand = renderer.xr.getHand(i);
    hand.add(handModels.createHandModel(hand, 'boxes')); if (!EMU) rig.add(hand);
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

  /* ---------- 에뮬레이터 전용: 마우스로 끌면 고개, 콕 누르면 그곳으로 ---------- */
  if (EMU) {
    const mouseRay = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const look = { yaw: 0, pitch: 0 };
    const q = new THREE.Quaternion();
    const e3 = new THREE.Euler(0, 0, 0, 'YXZ');
    let down = null;

    // 마우스 아래에 뭐가 있나: 그림 번호 또는 갈 수 있는 땅 위치
    const pickAt = (ev) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      // 실제로 화면에 그려진 '눈' 카메라 기준으로 쏴야 마우스 위치와 정확히 맞는다
      const xrCam = renderer.xr.getCamera();
      mouseRay.setFromCamera(ndc, xrCam.cameras[0] || xrCam);
      const art = mouseRay.intersectObjects(pieces.map((p) => p.mesh).filter(Boolean))[0];
      const floor = mouseRay.intersectObject(ground)[0];
      if (art && (!floor || art.distance < floor.distance)) return { piece: art.object.userData.index };
      if (floor) {
        const d = Math.hypot(floor.point.x, floor.point.z);
        if (d > WALK_MIN && d < WALK_MAX) return { point: floor.point };
      }
      return null;
    };
    window.__vrPick = (x, y) => {   // 확인용
      const hit = pickAt({ clientX: x, clientY: y });
      const xrCam = renderer.xr.getCamera();
      return { hit, n: xrCam.cameras.length, ray: [...mouseRay.ray.origin.toArray(), ...mouseRay.ray.direction.toArray()].map((v) => +v.toFixed(2)),
        vp: xrCam.cameras.map((c) => c.viewport && c.viewport.toArray()) };
    };
    const onCanvas = (ev) => renderer.xr.isPresenting && ev.target.tagName === 'CANVAS';

    window.addEventListener('pointerdown', (ev) => {
      if (!onCanvas(ev)) return;
      down = { x: ev.clientX, y: ev.clientY, yaw: look.yaw, pitch: look.pitch, moved: false };
    });
    window.addEventListener('pointermove', (ev) => {
      if (!renderer.xr.isPresenting) return;
      if (down) {
        const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
        if (Math.hypot(dx, dy) > 6) down.moved = true;
        look.yaw = down.yaw + dx * 0.004;
        look.pitch = THREE.MathUtils.clamp(down.pitch + dy * 0.004, -1.2, 1.2);
        e3.set(look.pitch, look.yaw, 0); q.setFromEuler(e3);
        window.xrDevice.quaternion.set(q.x, q.y, q.z, q.w);
        renderer.domElement.style.cursor = 'grabbing';
        return;
      }
      if (!onCanvas(ev)) return;
      const hit = pickAt(ev);
      reticle.visible = !!(hit && hit.point);
      if (hit && hit.point) reticle.position.set(hit.point.x, 0.02, hit.point.z);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    });
    window.addEventListener('pointerup', (ev) => {
      const start = down; down = null;
      renderer.domElement.style.cursor = 'grab';
      if (!start || start.moved || !onCanvas(ev)) return;
      const hit = pickAt(ev);
      if (!hit) return;
      if (hit.piece != null) goToPiece(hit.piece);
      else teleport(hit.point.x, hit.point.z);
    });

    // 화면 구석 안내 + 나가기
    const bar = document.createElement('div');
    bar.id = 'emu-bar'; bar.hidden = true;
    bar.innerHTML = '<span>밀어서 둘러보기 · 눌러서 이동</span><button type="button">나가기</button>';   // 폰에서도 한 줄에 들어가게 짧게
    document.body.append(bar);
    bar.querySelector('button').addEventListener('click', () => renderer.xr.getSession()?.end());
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') renderer.xr.getSession()?.end(); });
    renderer.xr.addEventListener('sessionstart', () => {
      look.yaw = 0; look.pitch = 0;
      window.xrDevice.quaternion.set(0, 0, 0, 1);
      bar.hidden = false;
    });
    renderer.xr.addEventListener('sessionend', () => { bar.hidden = true; });
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
        const plate = makePlate(p, pieces.length, renderer); p.group.add(plate); plates.push(plate);
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
    update() { if (renderer.xr.isPresenting && !EMU) aim(); },
    goToPiece,
    enterVR,
    // 확인용: 콘솔에서 gallery.vr.debug()
    debug: () => {
      const f = new THREE.Vector3(); renderer.xr.getCamera().getWorldDirection(f);
      return { rig: rig.position.toArray().map((v) => +v.toFixed(2)), rigYaw: +rig.rotation.y.toFixed(2),
        headLocalYaw: +new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y.toFixed(2),
        worldYaw: +Math.atan2(-f.x, -f.z).toFixed(2), hits: inputs.map((i) => i.hit) };
    },
  };
}
