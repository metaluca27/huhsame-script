import { Engine } from '/shim/audio.js?v=7';

const $ = (s) => document.querySelector(s);

// root = 음악 화음의 기준음(MIDI 번호)
const SCENES = [
  { id: 'fire', art: "metaluca's time · 2023", name: '불멍', line: '모닥불 곁, 멀리서 파도', carrier: 180, beat: 6, root: 50, pos: '30% 70%',
    nature: [{ type: 'fire', gain: 0.7 }, { type: 'waves', gain: 0.35 }] },
  { id: 'home', art: '집가는길 · 2025', name: '하루 끝', line: '노을 지는 길, 새소리', carrier: 160, beat: 5, root: 53,
    nature: [{ type: 'file', src: 'forest', gain: 0.45 }, { type: 'wind', gain: 0.15 }] },
  { id: 'moon', art: '달항아리 · 2026', name: '멍', line: '달항아리 앞, 졸졸 물소리', carrier: 200, beat: 7, root: 55,
    nature: [{ type: 'file', src: 'stream', gain: 0.3 }] },
  { id: 'night', art: '염소자리 여인의 사색 · 2025', name: '밤 생각 내려놓기', line: '창밖에 비', carrier: 150, beat: 4, root: 50,
    nature: [{ type: 'file', src: 'rain', gain: 0.9 }] },
  { id: 'green', art: '매실아님 · 2026', name: '초록 숨', line: '숲 바람, 시냇물', carrier: 220, beat: 10, root: 55,
    nature: [{ type: 'file', src: 'forest', gain: 0.7 }, { type: 'file', src: 'stream', gain: 0.5 }] },
];

const engine = new Engine();
let current = SCENES[0];
let state = 'idle'; // idle | playing | paused
let timerEnd = 0;
let timerId = null;

/* ---------- 배경 ---------- */
const bgs = [$('#bg0'), $('#bg1')];
let front = 0;
function showScene(s) {
  const back = bgs[1 - front];
  back.style.backgroundImage = `url(/shim/img/${s.id}.jpg?v=2)`;
  back.style.backgroundPosition = s.pos || 'center';
  $('#frame-img').src = `/shim/img/${s.id}.jpg?v=2`;
  $('#frame-img').alt = s.art;
  back.classList.add('on');
  bgs[front].classList.remove('on');
  front = 1 - front;
  $('#scene-name').textContent = s.name;
  $('#caption').innerHTML = `「${s.art.split(' · ')[0]}」${s.art.includes(' · ') ? ' · ' + s.art.split(' · ')[1] : ''}<br><span>메타루카</span>`;
  $('#scene-line').textContent = s.line;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('sel', c.dataset.id === s.id));
}

/* ---------- 장면 카드 ---------- */
const cards = $('#cards');
for (const s of SCENES) {
  const b = document.createElement('button');
  b.className = 'card';
  b.dataset.id = s.id;
  b.innerHTML = `<span class="thumb" style="background-image:url(/shim/img/${s.id}_s.jpg?v=2)"></span><span>${s.name}</span>`;
  b.onclick = () => pick(s);
  cards.appendChild(b);
}

async function pick(s) {
  if (s === current) return;
  current = s;
  showScene(s);
  if (state !== 'idle') await engine.setScene(s);
}

/* ---------- 재생 ---------- */
const play = $('#play');
play.onclick = async () => {
  if (state === 'idle') {
    play.disabled = true;
    await engine.start(current);
    for (const k of ['wave', 'nature', 'music']) engine.setLevel(k, $(`#lv-${k}`).value / 100);
    play.disabled = false;
    state = 'playing';
    document.body.classList.add('started');
    startTimer();
  } else if (state === 'playing') {
    await engine.pause();
    clearInterval(timerId);
    state = 'paused';
  } else {
    await engine.resume();
    state = 'playing';
    startTimer();
  }
  play.classList.toggle('playing', state === 'playing');
  play.setAttribute('aria-label', state === 'playing' ? '멈추기' : '듣기');
  wake();
};

/* ---------- 패널 숨기기: 듣는 중 잠시 손 안 대면 패널이 내려감 ---------- */
let idleId = null;
let toastShown = false;
function immerse() {
  if (state !== 'playing' || document.body.classList.contains('mixer-open')) return;
  document.body.classList.add('immersed');
  if (!toastShown) {
    toastShown = true;
    $('#toast').classList.add('show');
    setTimeout(() => $('#toast').classList.remove('show'), 3500);
  }
}
function wake() {
  document.body.classList.remove('immersed');
  clearTimeout(idleId);
  if (state === 'playing') idleId = setTimeout(immerse, 4000);
}
// 숨은 상태에서 첫 톡은 메뉴만 올리고, 버튼이 눌리지는 않게
document.addEventListener('click', (e) => {
  if (!document.body.classList.contains('immersed')) return;
  e.stopPropagation();
  e.preventDefault();
  wake();
}, true);
document.addEventListener('pointerdown', () => {
  if (!document.body.classList.contains('immersed')) wake();
}, true);

/* ---------- 믹서 ---------- */
for (const k of ['wave', 'nature', 'music']) {
  $(`#lv-${k}`).oninput = (e) => engine.setLevel(k, e.target.value / 100);
}

/* ---------- 타이머 ---------- */
let minutes = 30;
document.querySelectorAll('.chip').forEach((c) => {
  c.onclick = () => {
    document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('sel', x === c));
    minutes = Number(c.dataset.min);
    if (state === 'playing') startTimer();
  };
});

function startTimer() {
  clearInterval(timerId);
  if (!minutes) { $('#remain').textContent = ''; return; }
  timerEnd = Date.now() + minutes * 60000;
  const tick = () => {
    const left = timerEnd - Date.now();
    if (left <= 60000) {
      clearInterval(timerId);
      $('#remain').textContent = '천천히 작아지는 중…';
      engine.fadeOut(Math.max(left, 0) / 1000, () => {
        state = 'paused';
        play.classList.remove('playing');
        $('#remain').textContent = '';
        wake();
      });
      return;
    }
    const m = Math.ceil(left / 60000);
    $('#remain').textContent = `${m}분 남음`;
  };
  tick();
  timerId = setInterval(tick, 1000);
}

$('#mixer-toggle').onclick = () => document.body.classList.toggle('mixer-open');

showScene(current);
