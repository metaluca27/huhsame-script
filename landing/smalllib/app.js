// landing/smalllib/app.js — 첫 화면(지도·요즘 소식·목록)과 도서관 한 곳 페이지(?lib=ulju-1)
(async () => {
  const { esc, date, photo } = SL;
  const $ = (id) => document.getElementById(id);
  const libId = new URLSearchParams(location.search).get('lib');
  const libs = (await SL.libraries()).filter((l) => !l.hidden);
  const byId = Object.fromEntries(libs.map((l) => [l.id, l]));
  const link = (id) => '/smalllib?lib=' + encodeURIComponent(id) + keepApi();
  function keepApi() { const a = new URLSearchParams(location.search).get('api'); return a ? '&api=' + encodeURIComponent(a) : ''; }
  const initial = (name) => esc(name.replace(/^(울산|대공원|우정)/, '').slice(0, 1));

  // 사진 크게 보기
  const lb = $('lightbox');
  document.addEventListener('click', (e) => {
    const img = e.target.closest('[data-zoom]');
    if (img) { lb.querySelector('img').src = img.dataset.zoom; lb.hidden = false; }
    else if (e.target.closest('#lightbox')) lb.hidden = true;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true; });

  if (libId && byId[libId]) return showLib(byId[libId]);
  return showHome();

  async function showHome() {
    $('home').hidden = false;
    let data = { index: {}, feed: [] };
    try { data = await SL.get('home'); } catch (e) { console.warn(e); }
    const idx = data.index || {};
    $('st-libs').textContent = libs.length;
    $('st-posts').textContent = Object.values(idx).reduce((a, x) => a + (x.count || 0), 0);

    // 그래프 (기본) ↔ 지도 탭
    SLGraph.mount($('graph'), { libs, index: idx, onOpen: (id) => { location.href = link(id); } });
    $('legend').innerHTML = Object.entries(SLGraph.GU_COLOR).map(([g, c]) => `<span class="legend-dot" style="background:${c}"></span>${g}`).join('');
    let mapMade = false;
    document.querySelector('.view-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]'); if (!b) return;
      for (const x of document.querySelectorAll('.view-tabs [data-view]')) x.setAttribute('aria-pressed', x === b);
      $('graph-wrap').hidden = b.dataset.view !== 'graph';
      $('map-wrap').hidden = b.dataset.view !== 'map';
      if (b.dataset.view === 'map' && !mapMade) { mapMade = true; makeMap(); }
    });

    function makeMap() {
    const map = L.map('map', { scrollWheelZoom: false }).setView([35.55, 129.3], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    const pts = [];
    for (const l of libs) {
      if (l.lat == null) continue;
      const icon = L.divIcon({ className: '', html: `<div class="pin ${l.loc === 'apt' ? 'apt' : ''}"></div>`, iconSize: [16, 16] });
      L.marker([l.lat, l.lng], { icon, title: l.name }).addTo(map)
        .bindPopup(`<b>${esc(l.name)}</b><br>${esc(l.gu)}<br><a href="${link(l.id)}">둘러보기 →</a>`);
      pts.push([l.lat, l.lng]);
    }
    if (pts.length) map.fitBounds(pts, { padding: [24, 24] });
    }

    // 요즘 소식
    const feed = (data.feed || []).filter((f) => byId[f.lib]);
    $('feed').innerHTML = feed.length ? feed.slice(0, 24).map((f) => `
      <a class="fcard" href="${link(f.lib)}">
        <div class="ph" style="${f.photo ? `background-image:url('${photo(f.photo)}')` : ''}"></div>
        <div class="tx"><span class="when">${date(f.at)}</span><div class="who">${esc(byId[f.lib].name)}</div>
        <div class="body">${esc(f.text)}</div></div>
      </a>`).join('')
      : '<div class="empty">아직 올라온 소식이 없어요. 첫 소식을 기다리는 중이에요 📚</div>';

    // 도서관 목록 + 구·군 고르기
    const gus = ['전체', '중구', '남구', '동구', '북구', '울주군'];
    let pick = '전체';
    const draw = () => {
      const list = libs.filter((l) => pick === '전체' || l.gu === pick);
      $('lib-count').textContent = list.length + '곳';
      $('libs').innerHTML = list.map((l) => {
        const s = idx[l.id] || {};
        const th = s.cover ? `style="background-image:url('${photo(s.cover)}')">` : `>${initial(l.name)}`;
        return `<a class="lcard" href="${link(l.id)}"><div class="th" ${th}</div>
          <div><div class="nm">${esc(l.name)}</div><div class="mt">${esc(l.gu)}${s.count ? ' · 소식 ' + s.count : ''}${s.last ? ' · ' + date(s.last) : ''}</div></div></a>`;
      }).join('');
      $('chips').innerHTML = gus.map((g) => `<button class="chip" aria-pressed="${g === pick}" data-gu="${g}">${g}</button>`).join('');
    };
    $('chips').addEventListener('click', (e) => { const b = e.target.closest('[data-gu]'); if (b) { pick = b.dataset.gu; draw(); } });
    draw();
  }

  async function showLib(l) {
    $('lib').hidden = false;
    document.title = l.name + ' · 울산 작은도서관 마실';
    $('lib-name').textContent = l.name;
    $('lib-gu').textContent = '울산 ' + l.gu + (l.group ? ' · ' + l.group : '');
    let data = { profile: {}, posts: [] };
    try { data = await SL.get('lib/' + l.id); } catch (e) { console.warn(e); }
    const p = data.profile || {};
    const posts = data.posts || [];
    const cover = p.cover || (posts.find((x) => x.photos.length) || { photos: [] }).photos[0];
    $('lib-cover').innerHTML = cover ? '' : initial(l.name);
    if (cover) $('lib-cover').style.backgroundImage = `url('${photo(cover)}')`;

    const nums = [];
    if (p.opened) nums.push('개관 ' + esc(p.opened));
    if (p.members) nums.push('회원 ' + esc(p.members) + '명');
    if (p.volunteers) nums.push('자원봉사 ' + esc(p.volunteers) + '명');
    $('lib-nums').innerHTML = nums.map((n) => `<span>${n}</span>`).join('');
    $('lib-intro').textContent = p.intro || '';

    const addr = p.address || l.address;
    const rows = [];
    if (addr) rows.push(['주소', esc(addr) + (l.loc === 'apt' && !p.address ? '<div class="note">도서관이 있는 아파트 주소예요.</div>' : '')]);
    if (p.hours) rows.push(['여는 시간', esc(p.hours)]);
    const tel = p.phone || l.phone;
    if (tel) rows.push(['전화', `<a href="tel:${esc(tel.replace(/[^0-9+]/g, ''))}">${esc(tel)}</a>`]);
    if (addr) rows.push(['길찾기', `<a href="https://map.naver.com/p/search/${encodeURIComponent(l.name)}" target="_blank" rel="noopener">네이버 지도에서 보기 ↗</a>`]);
    $('lib-info').innerHTML = rows.length ? rows.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span>${v}</span></div>`).join('') : '<span class="note">아직 주소를 모르고 있어요. 관장님이 채워 주실 거예요.</span>';

    $('lib-post-count').textContent = posts.length ? posts.length + '개' : '';
    $('lib-posts').innerHTML = posts.length ? posts.map((x) => `
      <article class="post"><div class="when">${date(x.at)}</div>
        ${x.text ? `<p class="body">${esc(x.text)}</p>` : ''}
        ${x.photos.length ? `<div class="grid">${x.photos.map((id) => `<img loading="lazy" src="${photo(id)}" data-zoom="${photo(id)}" alt="">`).join('')}</div>` : ''}
      </article>`).join('')
      : '<div class="empty">아직 올라온 소식이 없어요.</div>';

    $('share').onclick = async () => {
      const url = location.origin + '/smalllib?lib=' + l.id;
      try {
        if (navigator.share) await navigator.share({ title: l.name, url });
        else { await navigator.clipboard.writeText(url); $('share-msg').textContent = '링크를 복사했어요!'; }
      } catch { /* 공유 창 닫음 */ }
    };
  }
})();
