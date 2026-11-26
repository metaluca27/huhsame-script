// docs/worker/reverse.js — 리버스 비즈니스 해부기 (/reverse) 흐름
// Origin → 주소 → 캐시 → 하루 상한 → 페이지 읽기 → ①(글자로 분석) / ②(주소만 주고 분석) → 저장.
// 네트워크·AI·KV는 deps로 주입받는다. 응답에는 가져온 페이지 원문을 절대 넣지 않는다.
import { normalizeUrl, isAllowedOrigin, findPricingLink, isBlockedPage } from './reverse-url.js';
import { MAX_MODEL_TEXT, buildPrompt, buildPageInput, parseReport } from './reverse-report.js';

export { MAX_MODEL_TEXT };
export const MIN_TEXT = 400;          // 이보다 글자가 적으면 ②(주소만)로 분석
export const REVERSE_DAILY_CAP = 100; // 하루(한국 날짜) 새 분석 상한

const COUNT_TTL = 172800; // 2일
const CACHE_TTL = 86400;  // 1일
const KST_MS = 9 * 60 * 60 * 1000;

const URL_DETAIL = {
  empty: '분석할 사이트 주소를 넣어 주세요.',
  scheme: 'http나 https로 시작하는 주소만 볼 수 있어요.',
  host: '공개된 사이트 주소만 볼 수 있어요.',
};
const FETCH_ERROR = {
  timeout: { status: 422, error: 'timeout', detail: '사이트가 너무 늦게 열려서 읽지 못했어요.' },
  network: { status: 422, error: 'network', detail: '사이트에 접속하지 못했어요. 주소를 다시 확인해 주세요.' },
  host: { status: 400, error: 'url', detail: URL_DETAIL.host },
};
const BLOCKED_DETAIL = '이 사이트는 읽을 수 없었어요. 접속을 막아 두었거나 로그인이 필요한 곳이에요.';

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

function kstDate(d) {
  return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10);
}

const isPage = (p) => p && !p.error && typeof p.status === 'number';
const textOf = (p) => String(p.text || '');

export async function handleReverse(request, env, cors, deps) {
  const { fetchPage, ask, askUrl, kv, now } = deps;
  if (request.method !== 'POST') return reply({ error: 'method', detail: 'POST로만 요청할 수 있어요.' }, 405, cors);
  if (!isAllowedOrigin(request.headers.get('Origin'))) {
    return reply({ error: 'origin', detail: '허용되지 않은 곳에서 온 요청이에요.' }, 403, cors);
  }

  const body = await request.json().catch(() => null);
  const norm = normalizeUrl(body && typeof body === 'object' ? body.url : '');
  if (!norm.ok) return reply({ error: 'url', detail: URL_DETAIL[norm.reason] || URL_DETAIL.host }, 400, cors);
  const url = norm.url;

  const at = now();
  const day = kstDate(at);
  const countKey = `rev:count:${day}`;
  const cacheKey = `rev:cache:${day}:${url}`;

  const cached = await kv.get(cacheKey, 'json');
  if (cached) return reply({ report: cached }, 200, cors);

  const count = Number(await kv.get(countKey, 'json')) || 0;
  if (count >= REVERSE_DAILY_CAP) {
    return reply({ error: 'cap', detail: '오늘 분석할 수 있는 횟수를 다 썼어요. 내일 다시 해 주세요.' }, 429, cors);
  }

  const first = await fetchPage(url).catch(() => ({ error: 'network' }));
  if (!isPage(first)) {
    const e = FETCH_ERROR[first && first.error] || FETCH_ERROR.network;
    return reply({ error: e.error, detail: e.detail }, e.status, cors);
  }
  if (isBlockedPage(first)) return reply({ error: 'blocked', detail: BLOCKED_DETAIL }, 422, cors);

  let askOnce;
  let partial = false;
  let pageCount = 0;
  if (textOf(first).length >= MIN_TEXT) {
    // ① 읽은 글자로 분석. 요금제 페이지가 보이면 한 장 더 (막히면 조용히 첫 장만)
    const pages = [{ url, title: String(first.title || ''), text: textOf(first) }];
    // 리다이렉트로 www. 등으로 옮겨 갔으면 최종 주소를 기준으로 링크를 푼다
    const link = findPricingLink(first.links, first.url || url);
    if (link) {
      const second = await fetchPage(link).catch(() => null);
      if (isPage(second) && !isBlockedPage(second)) {
        pages.push({ url: link, title: String(second.title || ''), text: textOf(second) });
      }
    }
    pageCount = pages.length;
    const input = buildPageInput(pages);
    askOnce = () => ask(buildPrompt('page'), input);
  } else if (first.status === 200) {
    // ② 정상으로 열렸는데 글자만 적은 곳(화면을 나중에 그리는 사이트)
    partial = true;
    askOnce = () => askUrl(buildPrompt('url'), url);
  } else {
    return reply({ error: 'blocked', detail: BLOCKED_DETAIL }, 422, cors);
  }

  // AI 답이 가끔 JSON이 깨져 온다 → 같은 입력으로 한 번만 더 묻는다. 모델 오류(throw)는 다시 묻지 않는다
  const opts = { url, partial, pages: pageCount, now: at.toISOString() };
  let report = null;
  for (let attempt = 0; attempt < 2 && !report; attempt++) {
    let raw;
    try { raw = await askOnce(); } catch {
      return reply({ error: 'model', detail: 'AI가 답을 주지 못했어요. 잠시 뒤에 다시 해 주세요.' }, 502, cors);
    }
    report = parseReport(raw, opts);
  }
  if (!report) return reply({ error: 'parse', detail: 'AI 답을 정리하지 못했어요. 다시 한 번 해 주세요.' }, 502, cors);

  await kv.put(countKey, JSON.stringify(count + 1), { expirationTtl: COUNT_TTL });
  await kv.put(cacheKey, JSON.stringify(report), { expirationTtl: CACHE_TTL });
  return reply({ report }, 200, cors);
}
