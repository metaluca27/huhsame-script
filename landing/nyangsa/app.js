// 냥사(猫寺) — 온라인 고양이 절
// 워커 small-recipe-9345 의 /nyangsa/* 에 몇 초마다 "나 여기 있어요"를 보내고,
// 돌아온 집사 목록을 법당 방석에 앉히거나 마당 석탑 둘레를 돌게 한다.
// 확인용으로 ?api=http://localhost:8787 처럼 주소를 바꿀 수 있다.

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
  // 마당 탑돌이 길: 석탑 둘레 타원(그림 픽셀). 앞쪽(아래)에선 왼쪽으로, 뒤쪽에선 오른쪽으로 걸어 위에서 보면 시계 방향
  const PATH = { cx: 500, cy: 1385, rx: 330, ry: 105 };
  const WALK_W = 255;        // 걷는 고양이 그림 너비(그림 픽셀, 맨 앞일 때). 다리 흔들 여백 포함
  const WALK_FRAMES = 6;     // 다리 4개를 엇갈려 흔든 걸음 그림 수
  const WALK_PAD_B = 14 / 338; // 걸음 그림 아래 여백(너비 대비)
  const LAP_SEC = 24;        // 한 바퀴 도는 데 걸리는 시간

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
    place: 'hall',
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
    const inHall = others.filter((c) => c.place !== 'yard');
    const inYard = others.filter((c) => c.place === 'yard');
    renderYard(inYard);

    let meEl = catEls.get(me.id);
    if (me.place === 'hall') {
      if (!meEl) {
        meEl = makeCat(me, true);
        catEls.set(me.id, meEl);
        placeCat(meEl, ME_SEAT);
        meEl.addEventListener('click', tapMe);
      }
      updateCat(meEl, me);
    }

    const shown = inHall.slice(0, SEATS.length);
    const keep = new Set([...(me.place === 'hall' ? [me.id] : []), ...shown.map((c) => c.id)]);
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

  // ----- 마당: 석탑 둘레를 도는 고양이들 -----
  const walkers = new Map();  // id → { el, theta, start, laps, cat }
  function hashAngle(id) {
    // FNV-1a: 비슷한 아이디도 둘레 여기저기로 흩어지게
    let h = 2166136261;
    for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return (h % 6283) / 1000;
  }
  function makeWalker(cat, isMe) {
    const el = document.createElement('div');
    el.className = 'walker' + (isMe ? ' me' : '');
    let imgs = '';
    for (let i = 0; i < WALK_FRAMES; i++) imgs += '<img class="f' + i + '" alt="">';
    el.innerHTML = '<span class="name"></span>' + imgs;
    $('walkers').appendChild(el);
    // 나는 맨 앞에서 출발, 다른 집사는 저마다 다른 자리에서
    const theta = isMe ? Math.PI / 2 : hashAngle(cat.id);
    return { el, theta, start: theta, laps: 0, cat };
  }
  function renderYard(inYard) {
    const list = me.place === 'yard' ? [me, ...inYard] : inYard;
    const keep = new Set(list.map((c) => c.id));
    for (const [id, w] of walkers) if (!keep.has(id)) { w.el.remove(); walkers.delete(id); }
    for (const c of list) {
      let w = walkers.get(c.id);
      if (!w) { w = makeWalker(c, c.id === me.id); walkers.set(c.id, w); }
      w.cat = c;
      // 다리 4개를 엇갈려 흔든 걸음 그림 6장을 차례로 보여줘서 걷게 한다
      if (w.coat !== c.coat) {
        w.coat = c.coat;
        w.el.querySelectorAll('img').forEach((img, i) => img.setAttribute('src', '/nyangsa/img/walk-' + c.coat + '-f-' + i + '.webp?v=3'));
      }
      w.el.querySelector('.name').textContent = c.name;
    }
  }
  let lastFrame = performance.now();
  function walk(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (me.place === 'yard') {
      for (const w of walkers.values()) {
        w.theta += dt * 2 * Math.PI / LAP_SEC;
        const sin = Math.sin(w.theta), cos = Math.cos(w.theta);
        const depth = (sin + 1) / 2;                 // 0 = 탑 뒤, 1 = 탑 앞
        const scale = 0.72 + 0.28 * depth;
        const x = PATH.cx + PATH.rx * cos;
        const y = PATH.cy + PATH.ry * sin;
        // 통통 튀지 않게: 발걸음에 맞춰 몸만 아주 살짝 흔들린다
        const step = Math.sin(now / 210 + w.start * 7);
        w.el.dataset.f = String(Math.floor(now / 120 + w.start * 3) % WALK_FRAMES);
        w.el.style.left = ((x - WALK_W * scale / 2) / W * 100) + '%';
        w.el.style.width = (WALK_W * scale / W * 100) + '%';
        w.el.style.bottom = ((H - y - WALK_W * scale * WALK_PAD_B) / H * 100) + '%';
        w.el.style.transform = 'translateY(' + (step * 0.6).toFixed(2) + 'px) rotate(' + (step * 0.6).toFixed(2) + 'deg)';
        // 탑 뒤쪽을 지날 땐 석탑 그림(z 1000) 아래로
        w.el.style.zIndex = String((sin < 0 ? 900 : 1100) + Math.round(y / 20));
        w.el.classList.toggle('flip', sin > 0);       // 앞쪽에선 왼쪽으로 걷는다
        w.el.classList.toggle('behind', sin < -0.2);   // 탑 뒤에선 이름표도 숨김
        if (w.cat.id === me.id && w.theta - w.start >= 2 * Math.PI * (w.laps + 1)) {
          w.laps += 1;
          moktak(0.35);
          act('lap', '🙏');
          toast('탑돌이 ' + w.laps + '바퀴! 공덕 +1 🙏');
        }
      }
    }
    requestAnimationFrame(walk);
  }

  // ----- 법당 ↔ 마당 -----
  function goTo(place) {
    if (me.place === place) return;
    me.place = place;
    document.body.classList.toggle('in-yard', place === 'yard');
    if (place === 'yard') hush();
    const w = walkers.get(me.id);
    if (w) { w.el.remove(); walkers.delete(me.id); }
    render();
    ping();
  }
  $('btn-to-yard').addEventListener('click', () => goTo('yard'));
  $('btn-to-hall').addEventListener('click', () => goTo('hall'));

  function changeCoat() {
    me.coat = COATS[(COATS.indexOf(me.coat) + 1) % COATS.length];
    store('nyangsa:coat', me.coat);
    render();
  }

  // 내 이름표를 누르면 이름 바꾸기, 고양이를 누르면 털색 바꾸기
  function tapMe(ev) {
    if (ev.target.closest('.name')) openRename();
    else changeCoat();
  }
  function openRename() {
    $('rename-input').value = me.name;
    $('rename').showModal();
    setTimeout(() => $('rename-input').select(), 50);
  }
  $('rename-cancel').addEventListener('click', () => $('rename').close());
  $('rename-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = $('rename-input').value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
    if (!name) { $('rename-input').focus(); return; }
    $('rename').close();
    me.name = name;
    store('nyangsa:name', name);
    render();
    ping();
  });

  // ----- 떠오르는 하트·음표 -----
  function floatOver(id, text) {
    const el = catEls.get(id) || (walkers.get(id) && walkers.get(id).el);
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
    else if (e.type === 'bow') { bowCat(e.from); toast(e.name + '님이 부처님께 절을 올렸어요 🙏'); }
    else if (e.type === 'lap') { floatOver(e.from, '🙏'); toast(e.name + '님이 탑돌이 한 바퀴를 돌았어요'); }
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
      const data = await post('/nyangsa/ping', { id: me.id, name: me.name, coat: me.coat, place: me.place, since: seq == null ? undefined : seq });
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
    if (type === 'kkuk' || type === 'lap') $('merit').textContent = (Number($('merit').textContent.replace(/,/g, '')) + 1).toLocaleString('ko-KR');
    try { await post('/nyangsa/act', { id: me.id, type }); } catch (e) { /* 하트는 이미 떴으니 조용히 넘어감 */ }
  }
  let lastAct = 0;
  function throttled(fn) {
    return () => { const now = Date.now(); if (now - lastAct < 650) return; lastAct = now; fn(); };
  }
  const kkuk = throttled(() => { moktak(0.4); act('kkuk', '💗'); });
  $('btn-kkuk').addEventListener('click', kkuk);
  $('btn-kkuk-yard').addEventListener('click', kkuk);
  $('btn-purr').addEventListener('click', throttled(() => { purr(); act('purr', '🎵'); }));

  // 절하기: 고양이가 꾸벅 숙인다
  function bowCat(id) {
    const el = catEls.get(id);
    if (!el) return;
    el.classList.remove('bow');
    void el.offsetWidth;
    el.classList.add('bow');
    setTimeout(() => el.classList.remove('bow'), 1700);
  }
  $('btn-bow').addEventListener('click', throttled(() => { bowCat(me.id); moktak(0.3); act('bow', '🙏'); }));

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
    { btn: $('btn-music'), el: $('music'), on: '🍃 산사 소리 끄기', off: '🍃 산사 소리', volume: 0.8 },
  ];
  const yeombul = TRACKS[0].el;
  function stopTrack(t) {
    t.el.pause();
    t.btn.classList.remove('on');
    t.btn.textContent = t.off;
  }
  function stopTracks() { TRACKS.forEach(stopTrack); }
  $('btn-credits').addEventListener('click', () => $('credits').showModal());
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

  // ----- 마당 루릭: 낙엽 쓸며 왔다 갔다 -----
  const rurikYard = $('rurik-yard');
  let yardX = 25;
  function sweepLoop() {
    const next = yardX > 50 ? 15 + Math.random() * 20 : 65 + Math.random() * 20;
    rurikYard.classList.toggle('flip', next > yardX);
    rurikYard.style.left = next + '%';
    yardX = next;
    setTimeout(sweepLoop, 8000);
  }

  render();
  ping();
  rurikLoop(0);
  sweepLoop();
  requestAnimationFrame(walk);
  setTimeout(() => say('집사야~ 왔냐옹. 편한 방석에 앉아서 쉬다 가.'), 700);
  setTimeout(() => { if ($('bubble-close').hidden === false && $('bubble-text').textContent.startsWith('집사야~ 왔냐옹')) hush(); }, 6000);
})();
