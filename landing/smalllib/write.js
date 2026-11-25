// landing/smalllib/write.js — 관장님 올리기 화면. 링크 끝(#뒤)의 토큰이 곧 열쇠.
(async () => {
  const $ = (id) => document.getElementById(id);
  const { esc, date, photo, evDate } = SL;
  const token = decodeURIComponent(location.hash.slice(1));
  const libs = await SL.libraries();
  let me;
  try { me = await SL.post('me', { token }); }
  catch (e) { $('who').textContent = '링크를 확인할 수 없어요'; $('bad').hidden = false; return; }
  const lib = libs.find((l) => l.id === me.lib) || { name: me.lib, gu: '', address: '', phone: '' };
  $('who').textContent = lib.name;
  $('who-sub').textContent = '안녕하세요, 관장님! 여기서 올린 사진과 소식이 도서관 페이지에 바로 나와요.';
  $('view').href = '/smalllib?lib=' + encodeURIComponent(me.lib) + (new URLSearchParams(location.search).get('api') ? '&api=' + encodeURIComponent(new URLSearchParams(location.search).get('api')) : '');
  $('app').hidden = false;

  // ── 소식 올리기 ──
  let picked = []; // data URL
  $('files').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    for (const f of files) {
      if (picked.length >= 6) { msg('send-msg', '사진은 6장까지예요.', true); break; }
      try { picked.push(await SL.shrink(f)); } catch { msg('send-msg', '이 사진은 열 수 없어요: ' + f.name, true); }
    }
    drawThumbs();
  });
  function drawThumbs() {
    $('thumbs').innerHTML = picked.map((d, i) => `<div><img src="${d}" alt=""><button data-rm="${i}" aria-label="빼기">×</button></div>`).join('');
  }
  $('thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { picked.splice(+b.dataset.rm, 1); drawThumbs(); } });

  $('is-event').addEventListener('change', () => {
    $('evt-fields').hidden = !$('is-event').checked;
    if ($('is-event').checked && !$('evt-date').value) $('evt-date').focus();
  });
  $('send').addEventListener('click', async () => {
    const text = $('text').value.trim();
    let event = null;
    if ($('is-event').checked) {
      if (!$('evt-date').value) return msg('send-msg', '행사 날짜를 골라 주세요.', true);
      event = { date: $('evt-date').value, time: $('evt-time').value.trim() };
    }
    if (!text && !picked.length) return msg('send-msg', '사진이나 글을 넣어 주세요.', true);
    if (!$('consent').checked) return msg('send-msg', '동의 확인 칸에 체크해 주세요.', true);
    $('send').disabled = true; msg('send-msg', '올리는 중… 사진이 많으면 조금 걸려요.');
    try {
      const r = await SL.post('post', { token, text, photos: picked, consent: true, event });
      me.posts.unshift(r.post);
      picked = []; drawThumbs(); $('text').value = ''; $('consent').checked = false;
      $('is-event').checked = false; $('evt-fields').hidden = true; $('evt-date').value = ''; $('evt-time').value = '';
      msg('send-msg', '올렸어요! 도서관 페이지에 1분 안에 나타나요. 🎉');
      drawMine();
    } catch (e) { msg('send-msg', SL.errText(e), true); }
    $('send').disabled = false;
  });

  // ── 지금까지 올린 소식 ──
  function drawMine() {
    const list = me.posts || [];
    $('mine').innerHTML = list.length ? list.map((p) => `
      <article class="post" data-pid="${esc(p.pid)}">
        <div class="when">${date(p.at)}${p.hidden ? ' · <b style="color:var(--warn)">협회에서 숨김 처리함</b>' : ''}</div>
        ${p.event ? `<div class="evt-badge">📅 ${esc(evDate(p.event))}</div>` : ''}
        <p class="body">${esc(p.text)}</p>
        ${p.photos.length ? `<div class="grid">${p.photos.map((id) => `<img loading="lazy" src="${photo(id)}" alt="">`).join('')}</div>` : ''}
        <div class="actions"><button class="btn ghost small" data-act="edit">글 고치기</button><button class="btn ghost small danger" data-act="del">지우기</button></div>
      </article>`).join('') : '<div class="empty">아직 올린 소식이 없어요.</div>';
  }
  $('mine').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const art = b.closest('[data-pid]'); const pid = art.dataset.pid;
    const post = me.posts.find((p) => p.pid === pid);
    if (b.dataset.act === 'del') {
      if (!confirm('이 소식을 지울까요? 사진도 같이 지워지고 되돌릴 수 없어요.')) return;
      try { await SL.post('delete', { token, pid }); me.posts = me.posts.filter((p) => p.pid !== pid); drawMine(); }
      catch (err) { alert(SL.errText(err)); }
    } else if (b.dataset.act === 'edit') {
      art.querySelector('.body').outerHTML = `<label class="f"><textarea maxlength="1000">${esc(post.text)}</textarea></label>
        <label class="f">행사 날짜 (행사가 아니면 비워 두세요) <input type="date" data-f="date" value="${esc(post.event ? post.event.date : '')}"></label>
        <label class="f">시간 (선택) <input data-f="time" maxlength="30" value="${esc(post.event ? post.event.time : '')}"></label>`;
      b.outerHTML = '<button class="btn small" data-act="save">저장</button>';
    } else if (b.dataset.act === 'save') {
      const text = art.querySelector('textarea').value.trim();
      const d = art.querySelector('[data-f="date"]').value;
      const event = d ? { date: d, time: art.querySelector('[data-f="time"]').value.trim() } : null;
      try { const r = await SL.post('edit', { token, pid, text, event }); Object.assign(post, r.post || { text }); if (!event) delete post.event; drawMine(); }
      catch (err) { alert(SL.errText(err)); }
    }
  });
  drawMine();

  // ── 도서관 소개 ──
  const F = ['intro', 'hours', 'phone', 'address', 'opened', 'members', 'volunteers'];
  const prof = me.profile || {};
  const defaults = { phone: lib.phone || '', address: lib.address || '' };
  for (const k of F) $('p-' + k).value = prof[k] != null ? prof[k] : (defaults[k] || '');
  let coverData = null;
  const drawCover = () => {
    const src = coverData || (prof.cover ? photo(prof.cover) : '');
    $('cover-now').innerHTML = src ? `<div><img src="${src}" alt="대표 사진"></div>` : '';
  };
  drawCover();
  $('cover').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { coverData = await SL.shrink(f, 1600); drawCover(); } catch { msg('save-msg', '이 사진은 열 수 없어요.', true); }
  });
  $('save').addEventListener('click', async () => {
    const body = { token };
    for (const k of F) body[k] = $('p-' + k).value.trim();
    if (coverData) body.cover = coverData;
    $('save').disabled = true; msg('save-msg', '저장하는 중…');
    try {
      const r = await SL.post('profile', body);
      Object.assign(prof, r.profile); coverData = null; drawCover();
      msg('save-msg', '저장했어요! 👍');
    } catch (err) { msg('save-msg', SL.errText(err), true); }
    $('save').disabled = false;
  });

  function msg(id, text, bad) { const m = $(id); m.textContent = text; m.className = 'msg ' + (bad ? 'err' : 'ok'); }
})();
