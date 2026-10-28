// 손 홀로그램: 손가락 1~3·엄지척으로 친구 고르기 → 손바닥 쫙 = 등장, 주먹 = 사라짐.
import { createHands, readGesture, palmPose, stableGesture } from './hands.js';
import { createHolo, CHARACTERS } from './holo.js';
import { createRecorder } from './recorder.js';
import * as sfx from './sfx.js';

const $ = (id) => document.getElementById(id);
const video = $('cam'), status = $('status'), tag = $('tag');
const DEBUG = new URLSearchParams(location.search).has('debug'); // ?debug → 손가락 개수 표시

let selected = 'pureum';
let tagTimer = 0;
function showTag(text) {
  tag.textContent = text;
  tag.classList.add('on');
  clearTimeout(tagTimer);
  tagTimer = setTimeout(() => tag.classList.remove('on'), 1400);
}

async function start() {
  try {
    const test = new URLSearchParams(location.search).get('src'); // ?src=영상.mp4 → 웹캠 대신 영상으로 시험
    if (test) {
      video.src = test;
      video.loop = true;
    } else {
      video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' }, audio: false,
      });
    }
    await video.play();
    // 웹캠 비율(16:9, 4:3 …)에 화면을 맞춰야 손 좌표와 홀로그램 위치가 어긋나지 않는다
    $('frame').style.setProperty('--ar', video.videoWidth / video.videoHeight);
    if (video.videoWidth < video.videoHeight) $('guide').classList.add('off'); // 폰 세로 카메라는 화면 자체가 세로
  } catch (e) {
    status.textContent = '카메라를 켤 수 없어요. 주소창 옆 카메라 권한을 허용해 주세요.';
    throw e;
  }
  status.textContent = '손 인식 준비 중…';
  const [hands, holo] = await Promise.all([createHands(), createHolo($('holo'))]);
  status.textContent = '';
  showTag('손가락으로 친구를 골라요 ☝️');
  if (DEBUG) window.__holo = holo;

  const stable = stableGesture();
  let lastVideoTime = -1, handSeenAt = 0, prev = null;
  const PICK = { '1': 0, '2': 1, '3': 2, '👍': 3 }; // 동작 → CHARACTERS 순서

  function loop(now) {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const res = hands.detectForVideo(video, now);
      const lm = res.landmarks?.[0];
      if (lm) {
        handSeenAt = now;
        holo.setPose(palmPose(lm));
        const raw = readGesture(lm);
        const g = stable(raw);
        if (DEBUG) {
          window.__hand = { raw, g, shown: holo.visible, selected };
          $('hud').textContent = `손동작 ${raw} → ${g ?? '-'} · ${holo.visible ? '보임' : '숨음'}`;
        }
        if (g !== null && g !== prev) {
          prev = g;
          if (g in PICK) {
            const c = CHARACTERS[PICK[g]];
            if (c.id !== selected || !holo.visible) {
              selected = c.id;
              showTag(`${g} · ${c.name}`);
              sfx.pick();
            }
          } else if (g === '🖐') {
            if (holo.appear(selected)) sfx.summon();
          } else if (g === '0') {
            if (holo.vanish()) sfx.vanish();
          }
        }
      }
    }
    const handVisible = now - handSeenAt < 400;
    if (!handVisible && now - handSeenAt > 1500 && holo.visible && !window.__freeze) holo.vanish();
    holo.render(now, handVisible);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 녹화 · 비율 · 안내 숨김
  const rec = createRecorder(video, $('holo'));
  let vertical = true;
  $('ratio').onclick = () => {
    vertical = !vertical;
    rec.vertical = vertical;
    $('ratio').textContent = vertical ? '세로 9:16' : '가로 16:9';
    $('guide').classList.toggle('off', !vertical);
  };
  $('rec').onclick = () => {
    sfx.audio(); // 브라우저는 클릭이 있어야 소리를 켜 준다
    if (rec.recording) { rec.stop(); $('rec').textContent = '⏺ 녹화'; $('rec').classList.remove('on'); }
    else { rec.start(); $('rec').textContent = '⏹ 멈춤'; $('rec').classList.add('on'); }
  };
  const toggleUi = () => document.body.classList.toggle('ui-hidden');
  $('hide').onclick = toggleUi;
  addEventListener('keydown', (e) => { if (e.key === 'h' || e.key === 'H') toggleUi(); });
  addEventListener('pointerdown', () => sfx.audio(), { once: true });
}

start();
