// 냥사(猫寺) — 온라인 고양이 절
// 워커 small-recipe-9345 의 /nyangsa/* 에 몇 초마다 "나 여기 있어요"를 보내고,
// 돌아온 집사 목록을 방석에 앉힌다. 확인용으로 ?api=http://localhost:8787 처럼 주소를 바꿀 수 있다.

(function () {
  const API = new URLSearchParams(location.search).get('api') || 'https://small-recipe-9345.atlia0318.workers.dev';
  const POLL_MS = 5000;
  const COATS = ['cheese', 'mackerel', 'tuxedo', 'calico', 'black'];
  const ADJ = ['말랑한', '졸린', '포근한', '동그란', '느긋한', '수줍은', '따끈한', '보송한', '조용한', '엉뚱한', '나른한', '도도한'];
  const NOUN = ['식빵', '젤리', '꾹꾹이', '솜방망이', '털뭉치', '콧수염', '방석', '햇살', '꼬리', '찹쌀떡'];

  // 배경 그림(1024×1824) 위 방석 자리: 가운데 x, 가운데 y, 방석 너비 (그림 픽셀)
  // 앞줄 가운데 방석은 주지스님을 가리니 맨 나중에 채운다
  const ME_SEAT = [512, 1540, 330];
  const SEATS = [
    [217, 988, 200], [820, 990, 195],
    [160, 1105, 235], [868, 1105, 235],
    [105, 1272, 240], [910, 1272, 240],
    [517, 1105, 230], [513, 1275, 290],
    [80, 1530, 280], [950, 1540, 280],
    [520, 990, 195],
  ];
  const W = 1024, H = 1824;

  const $ = (id) => document.getElementById(id);
  const seatsEl = $('seats');

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const me = {
    id: store('nyangsa:id') || (crypto.randomUUID ? crypto.randomUUID() : 'cat-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)),
    name: store('nyangsa:name') || pick(ADJ) + ' ' + pick(NOUN),
    coat: COATS.includes(store('nyangsa:coat')) ? store('nyangsa:coat') : pick(COATS),
  };
  store('nyangsa:id', me.id); store('nyangsa:name', me.name); store('nyangsa:coat', me.coat);

  let seq = null;             // 마지막으로 받은 알림 번호 (처음엔 지난 알림은 안 받음)
  let others = [];            // 지금 방석에 앉은 다른 집사들
  const catEls = new Map();   // id → 방석 위 고양이 요소

  // ----- 고양이 앉히기 -----
  function placeCat(el, seat) {
    const [cx, cy, w] = seat;
    el.style.left = (cx / W * 100) + '%';
    // 그림 속 고양이가 방석보다 커 보여서 방석 너비의 80%로 앉힌다
    el.style.width = (w * 0.8 / W * 100) + '%';
    el.style.bottom = ((H - cy - w * 0.16) / H * 100) + '%';
    el.style.zIndex = String(cy);   // 앞줄 고양이가 뒷줄을 가리도록
  }

  function makeCat(cat, isMe) {
    const el = document.createElement('div');
    el.className = 'sprite cat enter' + (isMe ? ' me' : '');
    el.innerHTML = '<span class="name"></span><img alt="">';
    seatsEl.appendChild(el);
    setTimeout(() => el.classList.remove('enter'), 600);
    return el;
  }

  function updateCat(el, cat) {
    const img = el.querySelector('img');
    const src = '/nyangsa/img/cat-' + cat.coat + '.webp';
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    el.querySelector('.name').textContent = cat.name;
  }

  function render() {
    let meEl = catEls.get(me.id);
    if (!meEl) {
      meEl = makeCat(me, true);
      catEls.set(me.id, meEl);
      placeCat(meEl, ME_SEAT);
      meEl.addEventListener('click', changeCoat);
    }
    updateCat(meEl, me);

    const shown = others.slice(0, SEATS.length);
    const keep = new Set([me.id, ...shown.map((c) => c.id)]);
    for (const [id, el] of catEls) {
      if (!keep.has(id)) { el.remove(); catEls.delete(id); }
    }
    // 이미 앉은 고양이는 자리를 지키고, 새 고양이는 빈 방석에 앉는다
    const used = new Set();
    for (const c of shown) { const el = catEls.get(c.id); if (el) used.add(el.dataset.seat); }
    for (const c of shown) {
      let el = catEls.get(c.id);
      if (!el) {
        const free = SEATS.findIndex((_, i) => !used.has(String(i)));
        el = makeCat(c, false);
        el.dataset.seat = String(free);
        used.add(String(free));
        placeCat(el, SEATS[free]);
        catEls.set(c.id, el);
      }
      updateCat(el, c);
    }
    $('count').textContent = String(others.length + 1);
  }

  function changeCoat() {
    me.coat = COATS[(COATS.indexOf(me.coat) + 1) % COATS.length];
    store('nyangsa:coat', me.coat);
    render();
  }

  // ----- 떠오르는 하트·음표 -----
  function floatOver(id, text) {
    const el = catEls.get(id);
    if (!el) return;
    const f = document.createElement('span');
    f.className = 'float';
    f.textContent = text;
    f.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    el.appendChild(f);
    setTimeout(() => f.remove(), 1700);
  }

  // ----- 알림 -----
  const toastQueue = [];
  let toastBusy = false;
  function toast(text) {
    toastQueue.push(text);
    if (toastQueue.length > 3) toastQueue.shift();
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const text = toastQueue.shift();
    if (!text) { toastBusy = false; return; }
    toastBusy = true;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2700);
    setTimeout(nextToast, 1300);
  }

  function showEvent(e) {
    if (e.from === me.id) return;
    if (e.type === 'join') toast(e.name + '님이 방석에 앉았어요');
    else if (e.type === 'kkuk') { floatOver(e.from, '💗'); toast(e.name + '님이 꾹꾹이를 했어요 🐾'); }
    else if (e.type === 'purr') { floatOver(e.from, '🎵'); toast(e.name + '님이 골골송을 불렀어요'); }
    else if (e.type === 'gongyang') toast('누군가 고민을 내려놓고 갔어요 🐾');
  }

  // ----- 서버 -----
  async function post(path, body) {
    const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }

  let pollTimer = null;
  async function ping() {
    clearTimeout(pollTimer);
    try {
      const data = await post('/nyangsa/ping', { id: me.id, name: me.name, coat: me.coat, since: seq == null ? undefined : seq });
      if (data && data.ok) {
        others = data.cats.filter((c) => c.id !== me.id);
        $('merit').textContent = data.merit.toLocaleString('ko-KR');
        render();
        if (seq != null) data.events.forEach(showEvent);
        seq = data.seq;
      }
    } catch (e) { /* 잠깐 끊겨도 다음 확인 때 다시 */ }
    if (!document.hidden) pollTimer = setTimeout(ping, POLL_MS);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });

  async function act(type, icon) {
    floatOver(me.id, icon);
    if (type === 'kkuk') $('merit').textContent = (Number($('merit').textContent.replace(/,/g, '')) + 1).toLocaleString('ko-KR');
    try { await post('/nyangsa/act', { id: me.id, type }); } catch (e) { /* 하트는 이미 떴으니 조용히 넘어감 */ }
  }
  let lastAct = 0;
  function throttled(fn) {
    return () => { const now = Date.now(); if (now - lastAct < 650) return; lastAct = now; fn(); };
  }
  $('btn-kkuk').addEventListener('click', throttled(() => { moktak(0.4); act('kkuk', '💗'); }));
  $('btn-purr').addEventListener('click', throttled(() => { purr(); act('purr', '🎵'); }));

  // ----- 푸름이 스님 말풍선 -----
  const pureumImg = document.querySelector('#pureum img');
  // 말풍선 꼬리가 푸름이 머리 바로 위에 오도록 화면마다 자리를 잡는다
  function placeBubble() {
    const r = document.getElementById('pureum').getBoundingClientRect();
    $('bubble').style.bottom = (window.innerHeight - r.top - r.height * 0.06) + 'px';
  }
  window.addEventListener('resize', placeBubble);

  function say(text, waiting) {
    $('bubble').hidden = false;
    placeBubble();
    $('bubble-text').textContent = text;
    $('bubble-text').classList.toggle('waiting', !!waiting);
    $('bubble-close').hidden = !!waiting;
    pureumImg.src = '/nyangsa/img/pureum-talk.webp';
  }
  function hush() {
    $('bubble').hidden = true;
    pureumImg.src = '/nyangsa/img/pureum.webp';
  }
  $('bubble-close').addEventListener('click', hush);

  // ----- 고민 공양 -----
  const dlg = $('gongyang');
  $('btn-gongyang').addEventListener('click', () => {
    $('gongyang-text').value = '';
    dlg.showModal();
    setTimeout(() => $('gongyang-text').focus(), 50);
  });
  $('gongyang-cancel').addEventListener('click', () => dlg.close());
  $('gongyang-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = $('gongyang-text').value.trim();
    if (!text) { $('gongyang-text').focus(); return; }
    dlg.close();
    $('btn-gongyang').disabled = true;
    say('푸름이 스님이 고민을 읽고 있어요…', true);
    let reply = '';
    try {
      const data = await post('/nyangsa/gongyang', { id: me.id, text });
      if (data && data.ok) reply = data.reply;
      else if (data && data.error === 'too_fast') reply = '집사야, 방금 내려놓은 고민 아직 데우는 중이다옹. 조금만 있다가 또 와.';
    } catch (e) { /* 아래 기본 대답 */ }
    say(reply || '바람이 세서 잘 못 들었다옹. 조금 있다가 다시 들려줘 🐾');
    bell();
    $('btn-gongyang').disabled = false;
  });

  // ----- 소리: 목탁·종·골골송은 브라우저가 직접 만들고, 염불은 mp3 -----
  // 폰은 화면을 한 번 눌러야 소리를 낼 수 있어서 🔇 버튼으로 켠다
  let ctx = null;
  let soundOn = store('nyangsa:sound') === 'on';
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, decay, gain, type) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    o.connect(g).connect(ctx.destination);
    o.start(start);
    o.stop(start + decay + 0.05);
  }
  function moktak(vol) {
    if (!soundOn || !audio()) return;
    const t = ctx.currentTime;
    const v = vol == null ? 0.5 : vol;
    tone(560, t, 0.16, v);
    tone(1310, t, 0.08, v * 0.35);
    tone(245, t, 0.25, v * 0.2);
  }
  function bell() {
    if (!soundOn || !audio()) return;
    const t = ctx.currentTime;
    [[196, 0.3, 4], [392, 0.15, 2.5], [541, 0.1, 1.8], [1058, 0.04, 1]].forEach(([f, g, d]) => tone(f, t, d, g));
  }
  function purr() {
    if (!soundOn || !audio()) return;
    const t = ctx.currentTime;
    const len = 1.2;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const s = i / ctx.sampleRate;
      const flutter = 0.5 + 0.5 * Math.sin(2 * Math.PI * 24 * s);
      d[i] = (Math.random() * 2 - 1) * flutter * Math.sin(Math.PI * s / len);
    }
    const src = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    g.gain.value = 0.9;
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
  }
  function showSound() {
    $('btn-sound').textContent = soundOn ? '🔈' : '🔇';
    $('btn-sound').setAttribute('aria-label', soundOn ? '소리 끄기' : '소리 켜기');
  }
  $('btn-sound').addEventListener('click', () => {
    soundOn = !soundOn;
    store('nyangsa:sound', soundOn ? 'on' : 'off');
    showSound();
    if (soundOn) moktak();
    else stopTracks();
  });
  showSound();

  // 염불·명상 음악은 한 번에 하나만 튼다
  const TRACKS = [
    { btn: $('btn-yeombul'), el: $('yeombul'), on: '🪷 염불 끄기', off: '🪷 염불 듣기', volume: 0.7 },
    { btn: $('btn-music'), el: $('music'), on: '🎵 음악 끄기', off: '🎵 음악 듣기', volume: 0.6 },
  ];
  const yeombul = TRACKS[0].el;
  function stopTrack(t) {
    t.el.pause();
    t.btn.classList.remove('on');
    t.btn.textContent = t.off;
  }
  function stopTracks() { TRACKS.forEach(stopTrack); }
  TRACKS.forEach((t) => {
    t.btn.addEventListener('click', () => {
      if (!t.el.paused) { stopTrack(t); return; }
      stopTracks();
      if (!soundOn) { soundOn = true; store('nyangsa:sound', 'on'); showSound(); }
      audio();
      t.el.volume = t.volume;
      t.el.play().catch(() => {});
      t.btn.classList.add('on');
      t.btn.textContent = t.on;
    });
  });

  // ----- 동자승 루릭: 법당 마루 걸레질하다가 가끔 목탁 -----
  const rurik = $('rurik');
  const rurikImg = rurik.querySelector('img');
  let rurikX = 30;
  function rurikLoop(step) {
    if (step % 4 === 3) {
      rurik.classList.add('moktak');
      rurik.classList.remove('flip');
      rurikImg.src = '/nyangsa/img/rurik-moktak.webp';
      rurik.style.transition = 'none';
      rurik.style.left = '80%';
      rurikX = 80;
      let knocks = 0;
      const knock = setInterval(() => {
        if (yeombul.paused) moktak(0.35);
        if (++knocks >= 14) clearInterval(knock);
      }, 600);
      setTimeout(() => rurikLoop(step + 1), 9000);
      return;
    }
    rurik.classList.remove('moktak');
    rurikImg.src = '/nyangsa/img/rurik-mop.webp';
    const next = rurikX > 50 ? 20 + Math.random() * 15 : 65 + Math.random() * 15;
    rurik.classList.toggle('flip', next < rurikX);
    rurik.style.transition = '';
    requestAnimationFrame(() => { rurik.style.left = next + '%'; });
    rurikX = next;
    setTimeout(() => rurikLoop(step + 1), 7000);
  }

  render();
  ping();
  rurikLoop(0);
  setTimeout(() => say('집사야~ 왔냐옹. 편한 방석에 앉아서 쉬다 가.'), 700);
  setTimeout(() => { if ($('bubble-close').hidden === false && $('bubble-text').textContent.startsWith('집사야~ 왔냐옹')) hush(); }, 6000);
})();
