// docs/worker/reverse-fetch.js — 리버스 비즈니스 해부기 (/reverse): 실제 페이지 한 장 읽기
// fetchPage(url) -> {status, url(최종), title, text, links} | {error: 'timeout'|'network'|'host'}
// HTMLRewriter(워커 전용)로 읽는다. 순수 도우미(collapseSpace, redirectTarget)는 node 테스트용으로 따로 내보낸다.
import { normalizeUrl } from './reverse-url.js';

const MAX_BYTES = 500 * 1024;   // 본문은 500KB까지만 읽는다
const MAX_LINKS = 200;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ReverseLab/1.0)',
  'Accept-Language': 'ko,en;q=0.8',
};

// 공백(줄바꿈·탭·nbsp 포함)을 하나로 줄이고 앞뒤를 자른다
export function collapseSpace(s) {
  return String(s == null ? '' : s).replace(/[\s ]+/g, ' ').trim();
}

// HTMLRewriter는 글자 속 엔티티(&amp; 등)를 풀지 않으므로 흔한 것만 푼다
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', trade: '™', copy: '©', reg: '®', middot: '·', hellip: '…', mdash: '—', ndash: '–', rarr: '→', larr: '←', won: '₩' };
export function decodeEntities(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

// 3xx의 Location을 현재 주소 기준으로 풀고 다시 검사한다.
// 내부 호스트·IP·http(s) 아닌 스킴이면 null — 호출 쪽은 {error:'host'}로 돌려준다 (두 번째 페이지 SSRF 막이).
// 통과하면 정규화 전의 풀린 주소를 그대로 따라간다 (끝 / 제거로 생기는 왕복 리다이렉트 방지).
export function redirectTarget(location, base) {
  if (!location) return null;
  let u;
  try { u = new URL(String(location), base); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (!normalizeUrl(u.href).ok) return null;
  return u.href;
}

// 본문 바이트를 최대 max까지만 모은다
async function readCapped(res, max) {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    const take = value.byteLength > max - total ? value.subarray(0, max - total) : value;
    chunks.push(take);
    total += take.byteLength;
  }
  if (total >= max) reader.cancel().catch(() => {});
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

// HTMLRewriter로 title, a[href], 본문 글자를 모은다 (script/style/noscript/svg 안은 버림)
async function parseHtml(bytes, contentType) {
  let title = '';
  const links = [];
  const parts = [];
  let textLen = 0;
  let skip = 0;
  const rewriter = new HTMLRewriter()
    .on('title', { text(t) { if (skip === 0 && title.length < 500) title += t.text; } })
    .on('a[href]', {
      element(el) {
        if (links.length < MAX_LINKS) {
          const href = el.getAttribute('href');
          if (href) links.push(href);
        }
      },
    })
    .on('script, style, noscript, svg', {
      element(el) {
        // <svg/>처럼 스스로 닫힌 태그는 안에 글자가 없다 (onEndTag도 못 단다)
        if (el.selfClosing) return;
        try { el.onEndTag(() => { skip--; }); skip++; } catch { /* 끝 태그 없는 요소는 건너뜀 */ }
      },
    })
    .onDocument({
      text(t) {
        if (skip > 0 || textLen >= MAX_BYTES) return;
        // 한 글자 덩어리가 여러 조각으로 올 수 있어서, 덩어리 끝에서만 띄어 쓴다
        parts.push(t.lastInTextNode ? t.text + ' ' : t.text);
        textLen += t.text.length;
      },
    });
  await rewriter.transform(new Response(bytes, { headers: { 'Content-Type': contentType } })).arrayBuffer();
  return { title: collapseSpace(decodeEntities(title)), text: collapseSpace(decodeEntities(parts.join(''))), links };
}

function isTimeout(err) {
  const n = err && err.name;
  return n === 'AbortError' || n === 'TimeoutError';
}

export async function fetchPage(url) {
  let current = url;
  // 리다이렉트를 몇 번 따라가든 한 번의 fetchPage 호출 전체가 8초 안에 끝나게 신호 하나를 같이 쓴다
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    for (let hop = 0; ; hop++) {
      const res = await fetch(current, {
        redirect: 'manual',
        signal,
        headers: HEADERS,
      });
      if (res.status >= 300 && res.status < 400) {
        const next = redirectTarget(res.headers.get('Location'), current);
        if (res.body) res.body.cancel().catch(() => {});
        if (!next) return { error: 'host' };
        if (hop >= MAX_REDIRECTS) return { error: 'network' };
        current = next;
        continue;
      }
      const ct = res.headers.get('Content-Type') || '';
      if (!/html/i.test(ct)) {
        if (res.body) res.body.cancel().catch(() => {});
        return { status: 415, title: '', text: '', links: [] };
      }
      const bytes = await readCapped(res, MAX_BYTES);
      const page = await parseHtml(bytes, ct);
      return { status: res.status, url: current, ...page }; // url: 리다이렉트를 따라간 최종 주소
    }
  } catch (err) {
    return { error: isTimeout(err) ? 'timeout' : 'network' };
  }
}
