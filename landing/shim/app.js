import { Engine } from '/shim/audio.js?v=4';

const $ = (s) => document.querySelector(s);

// root = 음악 화음의 기준음(MIDI 번호)
const SCENES = [
  { id: 'fire', name: '불멍', line: '모닥불 곁, 멀리서 파도', carrier: 180, beat: 6, root: 50, pos: '30% 70%',
    nature: [{ type: 'fire', gain: 0.7 }, { type: 'waves', gain: 0.35 }] },
  { id: 'home', name: '하루 끝', line: '노을 지는 길, 새소리', carrier: 160, beat: 5, root: 53,
    nature: [{ type: 'file', src: 'forest', gain: 0.45 }, { type: 'wind', gain: 0.15 }] },
  { id: 'moon', name: '멍', line: '달항아리 앞, 졸졸 물소리', carrier: 200, beat: 7, root: 55,
    nature: [{ type: 'file', src: 'stream', gain: 0.3 }] },
  { id: 'night', name: '밤 생각 내려놓기', line: '창밖에 비', carrier: 150, beat: 4, root: 50,
    nature: [{ type: 'file', src: 'rain', gain: 0.9 }] },
  { id: 'green', name: '초록 숨', line: '숲 바람, 시냇물', carrier: 220, beat: 10, root: 55,
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
  back.style.backgroundImage = `url(/shim/img/${s.id}.jpg)`;
  back.style.backgroundPosition = s.pos || 'center';
  back.classList.add('on');
  bgs[front].classList.remove('on');
  front = 1 - front;
  $('#scene-name').textContent = s.name;
  $('#scene-line').textContent = s.line;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('sel', c.dataset.id === s.id));
}

/* ---------- 장면 카드 ---------- */
const cards = $('#cards');
for (const s of SCENES) {
  const b = document.createElement('button');
  b.className = 'card';
  b.dataset.id = s.id;
  b.innerHTML = `<span class="thumb" style="background-image:url(/shim/img/${s.id}_s.jpg)"></span><span>${s.name}</span>`;
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
};

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
