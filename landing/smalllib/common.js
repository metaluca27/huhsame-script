// landing/smalllib/common.js — 첫 화면·올리기·관리 화면이 같이 쓰는 것들
// 확인용으로 ?api=http://127.0.0.1:8799 처럼 워커 주소를 바꿀 수 있다.
// 다른 단체·데모 사이트는 common.js 앞에 window.SL_CONFIG 를 두고 아래 기본값(울산)을 바꾼다.
const SL = (() => {
  const CFG = Object.assign({
    base: '/smalllib',                 // 사이트 경로
    siteName: '울산 작은도서관 마실',
    region: '울산',                    // 도서관 페이지의 "울산 중구"
    rootLabel: '울산작은도서관협회',     // 그래프 가운데 점
    groups: { '중구': '#e8a33d', '남구': '#5fb3a1', '동구': '#e0705a', '북구': '#8c8fe6', '울주군': '#7fbf5a' },
    map: true,                         // 지도 탭
    demo: false,                       // true 면 서버 없이 demo.json + 이 브라우저 저장소만 씀
    libsVersion: 2,
  }, window.SL_CONFIG || {});
  const API = new URLSearchParams(location.search).get('api') || 'https://small-recipe-9345.atlia0318.workers.dev';

  async function get(path) {
    if (CFG.demo) return Demo.get(path);
    const r = await fetch(API + '/smalllib/' + path);
    if (!r.ok) throw new Error('서버 응답 ' + r.status);
    return r.json();
  }
  async function post(path, body) {
    if (CFG.demo) return Demo.post(path, body);
    const r = await fetch(API + '/smalllib/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || '서버 응답 ' + r.status), { code: data.error });
    return data;
  }
  let libsPromise;
  function libraries() {
    libsPromise = libsPromise || fetch(CFG.base + '/libraries.json?v=' + CFG.libsVersion).then((r) => r.json()).then((d) => d.libraries);
    return libsPromise;
  }
  const photo = (id) => String(id).startsWith('data:') ? id
    : CFG.demo ? CFG.base + '/img/' + encodeURIComponent(id) + '.jpg'
    : API + '/smalllib/photo/' + encodeURIComponent(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function date(ms) {
    const d = new Date(ms);
    const diff = (Date.now() - ms) / 1000;
    if (diff < 60) return '방금';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  }
  // 행사 날짜 보기: "12.6 (토) 오전 10시" + 남은 날
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function todayKST() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function evDate(ev, withDday) {
    const [y, m, d] = ev.date.split('-').map(Number);
    const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    let s = `${m}.${d} (${wd})` + (ev.time ? ' ' + ev.time : '');
    const left = Math.round((Date.UTC(y, m - 1, d) - Date.parse(todayKST() + 'T00:00:00Z')) / 864e5);
    if (left < 0) return s + ' · 지난 행사';
    if (withDday) s += left === 0 ? ' · 오늘!' : ` · D-${left}`;
    return s;
  }
  // 사진을 긴 쪽 1280px JPEG로 줄인다 (폰 사진 5MB → 200KB 안팎)
  // HEIC(아이폰·갤럭시 '고효율 사진')는 크롬이 못 열어서, 그때만 변환기를 불러 JPEG로 바꿈
  let heicP;
  const isHeic = (f) => /hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');
  function loadHeic() {
    return (heicP = heicP || new Promise((ok, no) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      sc.onload = () => ok(window.heic2any); sc.onerror = () => { heicP = null; no(new Error('heic_load')); };
      document.head.appendChild(sc);
    }));
  }
  async function shrink(file, max = 1280, quality = 0.82) {
    if (isHeic(file)) {
      try { return await draw(file, max, quality); } catch { /* 이 브라우저는 못 읽음 → 변환 */ }
      const conv = await loadHeic();
      const out = await conv({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      file = Array.isArray(out) ? out[0] : out;
    }
    return draw(file, max, quality);
  }
  async function draw(file, max, quality) {
    // 오래된 폰 브라우저엔 createImageBitmap 이 없어서 그땐 <img>로 읽음
    const bmp = typeof createImageBitmap === 'function'
      ? await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null) : null;
    let src = bmp, w, h;
    if (!bmp) {
      src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); });
    }
    w = src.width; h = src.height;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }
  // 사람들 이야기 갈래 (워커 STORY_WHO 와 같은 값)
  const STORY = { visitor: '도서관에 오는 분', director: '관장', volunteer: '봉사자' };
  const ERR = {
    bad_token: '이 링크가 맞지 않아요. 받은 링크를 다시 확인해 주세요.',
    need_consent: '보호자 동의 확인 칸에 체크해 주세요.',
    too_many_photos: '사진은 한 번에 6장까지 올릴 수 있어요.',
    photo_too_big: '사진이 너무 커요. 다른 사진으로 해 주세요.',
    bad_photo_type: '사진 파일만 올릴 수 있어요.',
    empty: '글이나 사진을 하나 이상 넣어 주세요.',
    bad_event_date: '행사 날짜를 다시 골라 주세요.',
    bad_story: '이야기 갈래를 다시 골라 주세요.',
    bad_event_link: '신청 링크가 주소 모양이 아니에요. 네이버 폼·구글 폼 주소를 그대로 붙여 넣어 주세요.',
    demo_full: '체험판 저장 공간이 꽉 찼어요. 아래 "지금까지 올린 소식"에서 몇 개 지우고 다시 해 주세요.',
  };
  const errText = (e) => ERR[e && e.code] || '잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요. (' + ((e && e.message) || e) + ')';
  // ── 데모 모드: demo.json(미리 채운 소식) + 이 브라우저에만 저장되는 체험 글 ──
  const Demo = (() => {
    const KEY = 'sl-demo:' + CFG.base;
    let seedP;
    const seed = () => (seedP = seedP || fetch(CFG.base + '/demo.json?v=' + CFG.libsVersion).then((r) => r.json()));
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { posts: {}, profiles: {} }; } catch { return { posts: {}, profiles: {} }; } };
    const save = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { throw Object.assign(new Error('full'), { code: 'demo_full' }); } };
    const day = 864e5;
    const dateIn = (n) => new Date(Date.now() + 9 * 3600e3 + n * day).toISOString().slice(0, 10);
    // demo.json 의 상대 날짜(며칠 전에 올림 daysAgo, 며칠 뒤 행사 eventIn)를 오늘 기준 실제 날짜로
    async function allPosts(lib) {
      const s = await seed();
      const fromSeed = (s.posts[lib] || []).map((p) => ({
        pid: p.pid, at: Date.now() - p.daysAgo * day - (p.hour || 3) * 36e5, text: p.text, photos: p.photos || [],
        ...(p.story ? { story: { who: p.story } } : {}),
        ...(p.eventIn != null ? { event: { date: dateIn(p.eventIn), time: p.time || '', ...(p.link ? { link: p.link } : {}) } } : {}),
      }));
      return [...(load().posts[lib] || []), ...fromSeed].sort((a, b) => b.at - a.at);
    }
    async function profile(lib) { const s = await seed(); return { ...(s.profiles[lib] || {}), ...(load().profiles[lib] || {}) }; }
    async function get(path) {
      const libs = await libraries();
      if (path === 'home') {
        const index = {}, feed = [], events = [], stories = [];
        const today = todayKST();
        for (const l of libs) {
          const posts = await allPosts(l.id);
          const prof = await profile(l.id);
          const first = posts.find((p) => p.photos.length);
          index[l.id] = { cover: prof.cover || (first ? first.photos[0] : null), count: posts.length, last: posts[0] ? posts[0].at : null };
          for (const p of posts) {
            feed.push({ lib: l.id, pid: p.pid, at: p.at, text: p.text.slice(0, 120), photo: p.photos[0] || null });
            if (p.story) stories.push({ lib: l.id, pid: p.pid, at: p.at, who: p.story.who, text: p.text.slice(0, 300), photo: p.photos[0] || null });
            if (p.event && p.event.date >= today) events.push({ lib: l.id, pid: p.pid, ...p.event, text: p.text.slice(0, 120), photo: p.photos[0] || null });
          }
        }
        feed.sort((a, b) => b.at - a.at);
        events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        stories.sort((a, b) => b.at - a.at);
        return { index, feed: feed.slice(0, 60), events, stories: stories.slice(0, 100) };
      }
      const id = path.replace(/^lib\//, '');
      return { profile: await profile(id), posts: await allPosts(id) };
    }
    // 체험판 행사: 신청 링크는 서버와 같은 규칙(앞에 https:// 없으면 붙여 줌, 이상하면 거절)
    function demoStory(v) {
      if (!v || !Object.prototype.hasOwnProperty.call(STORY, v.who)) throw Object.assign(new Error('bad_story'), { code: 'bad_story' });
      return { who: v.who };
    }
    function demoEvent(ev) {
      const out = { date: ev.date, time: String(ev.time || '').slice(0, 30) };
      let l = String(ev.link || '').trim();
      if (l) {
        if (!/^https?:\/\//i.test(l)) l = 'https://' + l;
        let ok = false; try { const u = new URL(l); ok = /^https?:$/.test(u.protocol) && u.hostname.includes('.'); l = u.href; } catch {}
        if (!ok) throw Object.assign(new Error('bad_event_link'), { code: 'bad_event_link' });
        out.link = l;
      }
      return out;
    }
    async function post(path, body) {
      const fail = (code) => { throw Object.assign(new Error(code), { code }); };
      const s = await seed();
      const lib = body.token === 'demo' ? s.demoLib : null;
      if (!lib) fail('bad_token');
      const st = load();
      const mine = (st.posts[lib] = st.posts[lib] || []);
      if (path === 'me') return { lib, profile: await profile(lib), posts: mine, demo: true };
      if (path === 'post') {
        if (body.consent !== true) fail('need_consent');
        if (!String(body.text || '').trim() && !(body.photos || []).length) fail('empty');
        if ((body.photos || []).length > 6) fail('too_many_photos');
        // 체험 글 사진은 브라우저 저장소가 작아서 더 줄여 둠
        const photos = await Promise.all((body.photos || []).map((d) => shrinkData(d, 640)));
        const p = { pid: 'my-' + Date.now().toString(36), at: Date.now(), text: String(body.text || '').trim().slice(0, 1000), photos };
        if (body.event) p.event = demoEvent(body.event);
        if (body.story) p.story = demoStory(body.story);
        mine.unshift(p); save(st);
        return { ok: true, post: p };
      }
      const i = mine.findIndex((x) => x.pid === body.pid);
      if (path === 'edit') {
        if (i < 0) fail('not_found');
        mine[i].text = String(body.text || '').trim();
        if (body.event) mine[i].event = demoEvent(body.event); else delete mine[i].event;
        if ('story' in body) { if (body.story) mine[i].story = demoStory(body.story); else delete mine[i].story; }
        save(st); return { ok: true, post: mine[i] };
      }
      if (path === 'delete') { if (i >= 0) mine.splice(i, 1); save(st); return { ok: true }; }
      if (path === 'profile') {
        const prof = (st.profiles[lib] = st.profiles[lib] || {});
        for (const k of ['intro', 'hours', 'phone', 'address', 'opened', 'members', 'volunteers']) if (k in body) prof[k] = String(body[k] || '').slice(0, 500);
        if (body.cover) prof.cover = await shrinkData(body.cover, 800);
        else if (body.removeCover === true) prof.cover = null; // 미리 채운 대표 그림도 가리기
        save(st); return { ok: true, profile: { ...(s.profiles[lib] || {}), ...prof } };
      }
      fail('not_found');
    }
    async function shrinkData(dataUrl, max) {
      const im = await new Promise((ok, no) => { const x = new Image(); x.onload = () => ok(x); x.onerror = no; x.src = dataUrl; });
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.75);
    }
    return { get, post };
  })();
  ERR.demo_full = '체험판 저장 공간이 꽉 찼어요. 올린 체험 글을 몇 개 지워 주세요.';

  return { API, CFG, get, post, libraries, photo, esc, date, shrink, errText, evDate, todayKST, STORY };
})();
