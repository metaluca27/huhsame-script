// landing/smalllib/common.js — 첫 화면·올리기·관리 화면이 같이 쓰는 것들
// 확인용으로 ?api=http://127.0.0.1:8799 처럼 워커 주소를 바꿀 수 있다.
const SL = (() => {
  const API = new URLSearchParams(location.search).get('api') || 'https://small-recipe-9345.atlia0318.workers.dev';

  async function get(path) {
    const r = await fetch(API + '/smalllib/' + path);
    if (!r.ok) throw new Error('서버 응답 ' + r.status);
    return r.json();
  }
  async function post(path, body) {
    const r = await fetch(API + '/smalllib/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || '서버 응답 ' + r.status), { code: data.error });
    return data;
  }
  let libsPromise;
  function libraries() {
    libsPromise = libsPromise || fetch('/smalllib/libraries.json?v=2').then((r) => r.json()).then((d) => d.libraries);
    return libsPromise;
  }
  const photo = (id) => API + '/smalllib/photo/' + encodeURIComponent(id);
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
  // 사진을 긴 쪽 1280px JPEG로 줄인다 (폰 사진 5MB → 200KB 안팎)
  async function shrink(file, max = 1280, quality = 0.82) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
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
  const ERR = {
    bad_token: '이 링크가 맞지 않아요. 받은 링크를 다시 확인해 주세요.',
    need_consent: '보호자 동의 확인 칸에 체크해 주세요.',
    too_many_photos: '사진은 한 번에 6장까지 올릴 수 있어요.',
    photo_too_big: '사진이 너무 커요. 다른 사진으로 해 주세요.',
    bad_photo_type: '사진 파일만 올릴 수 있어요.',
    empty: '글이나 사진을 하나 이상 넣어 주세요.',
  };
  const errText = (e) => ERR[e && e.code] || '잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요. (' + ((e && e.message) || e) + ')';
  return { API, get, post, libraries, photo, esc, date, shrink, errText };
})();
