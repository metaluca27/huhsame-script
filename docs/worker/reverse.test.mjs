// docs/worker/reverse.test.mjs — 리버스 비즈니스 해부기 /reverse 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, isAllowedOrigin, findPricingLink, isBlockedPage } from './reverse-url.js';
import { buildPrompt, buildPageInput, parseReport, MAX_MODEL_TEXT } from './reverse-report.js';
import { handleReverse, MIN_TEXT, REVERSE_DAILY_CAP, MAX_MODEL_TEXT as REV_MAX } from './reverse.js';

test('주소 정규화: 스킴 없으면 https, 해시·utm 제거, 끝 / 제거, 호스트 소문자', () => {
  assert.deepEqual(normalizeUrl('InteriorAI.com/?utm_source=x#top'), { ok: true, url: 'https://interiorai.com' });
  assert.deepEqual(normalizeUrl('https://a.com/pricing/?b=1&utm_medium=y'), { ok: true, url: 'https://a.com/pricing?b=1' });
  assert.equal(normalizeUrl('https://a.com/').url, normalizeUrl('https://A.com').url);
});
test('주소 거절: 빈칸, ftp, IP, localhost, .local, .internal', () => {
  assert.equal(normalizeUrl('  ').reason, 'empty');
  assert.equal(normalizeUrl('ftp://a.com').reason, 'scheme');
  for (const u of ['http://127.0.0.1', 'http://10.0.0.1/x', 'http://[::1]', 'http://localhost:8787', 'http://nas.local', 'http://x.internal'])
    assert.equal(normalizeUrl(u).reason, 'host', u);
});
test('주소 경계: 끝점·십진/16진 IP·IPv4 매핑 IPv6 거절, 스킴·인증정보 처리', () => {
  for (const u of ['http://localhost./', 'http://nas.local./', 'http://x.internal./', 'http://2130706433', 'http://0x7f.1', 'http://[::ffff:7f00:1]'])
    assert.equal(normalizeUrl(u).reason, 'host', u);
  for (const u of ['file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,x'])
    assert.equal(normalizeUrl(u).reason, 'scheme', u);
  assert.equal(normalizeUrl('HTTPS://A.com').url, 'https://a.com');
  assert.equal(normalizeUrl('http://u:p@a.com/x').url, 'http://a.com/x');
  assert.equal(normalizeUrl('https://a.com./').url, normalizeUrl('https://a.com').url);
  assert.equal(normalizeUrl('a.com:8080/x').url, 'https://a.com:8080/x');
});
test('Origin: 토스 4종과 localhost만', () => {
  for (const o of ['https://reverse-lab.apps.tossmini.com', 'https://reverse-lab.private-apps.tossmini.com',
                   'https://reverse-lab.web.tossmini.com', 'https://reverse-lab.private-web.tossmini.com', 'http://localhost:5189'])
    assert.equal(isAllowedOrigin(o), true, o);
  for (const o of [null, '', 'https://evil.com', 'https://apps.tossmini.com.evil.com', 'http://reverse-lab.apps.tossmini.com'])
    assert.equal(isAllowedOrigin(o), false, String(o));
});
test('요금제 링크: 같은 호스트의 pricing/plans/요금 1개, 다른 호스트·자기 자신은 무시', () => {
  assert.equal(findPricingLink(['/about', 'https://other.com/pricing', '/pricing'], 'https://a.com'), 'https://a.com/pricing');
  assert.equal(findPricingLink(['/ko/plans?x=1'], 'https://a.com/ko'), 'https://a.com/ko/plans?x=1');
  assert.equal(findPricingLink(['/%EC%9A%94%EA%B8%88'], 'https://a.com'), 'https://a.com/%EC%9A%94%EA%B8%88');
  assert.equal(findPricingLink(['/pricing'], 'https://a.com/pricing'), null);
  assert.equal(findPricingLink(['/blog'], 'https://a.com'), null);
});
test('차단 판정: 4xx·5xx, 봇 확인, 로그인 화면', () => {
  for (const s of [401, 403, 429, 500, 503]) assert.equal(isBlockedPage({ status: s, title: '', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Just a moment...', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Attention Required! | Cloudflare', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: '로그인', text: '아이디 비밀번호 로그인' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Interior AI', text: '' }), false); // 글자 적음 ≠ 막힘
});

const OPTS = { url: 'https://a.com', partial: false, pages: 1, now: '2026-11-26T00:00:00.000Z' };
const GOOD = JSON.stringify({ summary: '요약', sections: { who: [{ text: '실무자', basis: 'guess', reason: '상업 라이선스' }], price: [], flow: [], why: [] },
  plans: [{ name: 'Pro', price: '$29/월', basis: 'seen' }, { name: 'Team', price: '' }], highlight: 'Pro', ideas: ['a', 'b', 'c', 'd'] });

test('정상: 울타리 친 JSON → Report, ideas는 3개로 자름, basis 없는 plan은 버림', () => {
  const r = parseReport('```json\n' + GOOD + '\n```', OPTS);
  assert.equal(r.summary, '요약');
  assert.deepEqual(r.ideas, ['a', 'b', 'c']);
  assert.deepEqual(r.plans, [{ name: 'Pro', price: '$29/월', basis: 'seen' }]);
  assert.equal(r.url, 'https://a.com'); assert.equal(r.createdAt, OPTS.now);
});
test('이상한 basis·빠진 칸 → unknown과 빈 배열로 정리', () => {
  const r = parseReport(JSON.stringify({ summary: 's', sections: { who: [{ text: 'x', basis: 'maybe' }] } }), OPTS);
  assert.deepEqual(r.sections.who, [{ text: 'x', basis: 'unknown', reason: '' }]);
  assert.deepEqual(r.sections.price, []); assert.deepEqual(r.plans, []); assert.equal(r.highlight, '');
});
test('partial이면 seen이 하나도 안 남음', () => {
  const seenAll = JSON.stringify({ summary: 's', sections: { who: [{ text: 'x', basis: 'seen' }], price: [], flow: [], why: [] },
    plans: [{ name: 'Pro', price: '$29', basis: 'seen' }] });
  for (const raw of [GOOD, seenAll]) {
    const r = parseReport(raw, { ...OPTS, partial: true, pages: 0 });
    assert.equal(r.partial, true);
    assert.ok(r.plans.every((p) => p.basis === 'guess'));
    assert.ok(Object.values(r.sections).flat().every((i) => i.basis !== 'seen'));
  }
});
test('JSON 아님·summary 없음 → null', () => {
  assert.equal(parseReport('죄송해요', OPTS), null);
  assert.equal(parseReport('{"sections":{}}', OPTS), null);
});
test('buildPageInput: 2장 합쳐도 20000자 이하', () => {
  const s = buildPageInput([{ url: 'u1', title: 't', text: '가'.repeat(30000) }, { url: 'u2', title: 't', text: '나'.repeat(30000) }]);
  assert.ok(s.length <= MAX_MODEL_TEXT); assert.equal(MAX_MODEL_TEXT, 20000); assert.ok(s.includes('나'));
  assert.ok(s.includes('[페이지 1] u1') && s.includes('[페이지 2] u2'));
});
test('프롬프트에 정직 규칙이 들어 있음', () => {
  const p = buildPrompt('page');
  for (const w of ['seen', 'guess', 'unknown', '지어내지', 'ideas']) assert.ok(p.includes(w), w);
  assert.ok(buildPrompt('url').includes('guess'));
  assert.ok(buildPrompt('url').includes('직접 읽은 글자가 없'));
  assert.ok(!buildPrompt('page').includes('직접 읽은 글자가 없'));
});

// ---------- handleReverse 흐름 ----------
const ORIGIN = 'https://reverse-lab.apps.tossmini.com';
const CORS = { 'Access-Control-Allow-Origin': '*' };
const NOW = new Date('2026-11-26T16:30:00.000Z'); // 한국 시간으로는 2026-11-27 01:30
const DAY = '2026-11-27';
const GOOD_RAW = JSON.stringify({
  summary: '인테리어 사진을 AI로 바꿔 주는 구독 서비스예요.',
  sections: { who: [{ text: '집주인', basis: 'seen', reason: '' }], price: [], flow: [], why: [] },
  plans: [{ name: 'Pro', price: '$29/월', basis: 'seen' }],
  highlight: 'Pro', ideas: ['한국판', '가격 낮추기', '결제 줄이기'],
});
const LONG = 'SECRET-RAW-123 ' + '가'.repeat(600);

function makeKv(init = {}) {
  const store = new Map(Object.entries(init));
  const puts = [];
  return {
    puts,
    async get(key, type) {
      if (!store.has(key)) return null;
      const v = store.get(key);
      return type === 'json' ? JSON.parse(v) : v;
    },
    async put(key, value, opts) { puts.push({ key, value, opts }); store.set(key, value); },
  };
}

function makeDeps(over = {}) {
  const calls = { fetchPage: 0, ask: 0, askUrl: 0, fetched: [], askText: [] };
  const deps = {
    kv: makeKv(),
    now: () => NOW,
    pages: { 'https://a.com': { status: 200, title: 'A', text: LONG, links: ['/about'] } },
    raw: GOOD_RAW,
    ...over,
    calls,
  };
  deps.fetchPage = over.fetchPage || (async (url) => {
    calls.fetchPage++; calls.fetched.push(url);
    return deps.pages[url] || { error: 'network' };
  });
  deps.ask = over.ask || (async (system, text) => { calls.ask++; calls.askText.push(text); return deps.raw; });
  deps.askUrl = over.askUrl || (async () => { calls.askUrl++; return deps.raw; });
  return deps;
}

function req(body, { method = 'POST', origin = ORIGIN } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  return new Request('https://w.example/reverse', {
    method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

async function run(deps, body = { url: 'a.com' }, opt) {
  const res = await handleReverse(req(body, opt), {}, CORS, deps);
  const text = await res.text();
  return { res, text, json: JSON.parse(text) };
}

test('상수: MIN_TEXT=400, REVERSE_DAILY_CAP=100, MAX_MODEL_TEXT=20000', () => {
  assert.equal(MIN_TEXT, 400); assert.equal(REVERSE_DAILY_CAP, 100); assert.equal(REV_MAX, 20000);
});
test('정상 ①: 200, report.pages=1, partial=false, kv 쓰기 2번(횟수·캐시)', async () => {
  const d = makeDeps();
  const { res, json } = await run(d);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(json.report.pages, 1);
  assert.equal(json.report.partial, false);
  assert.equal(json.report.url, 'https://a.com');
  assert.equal(json.report.createdAt, NOW.toISOString());
  assert.equal(d.calls.ask, 1); assert.equal(d.calls.askUrl, 0);
  assert.equal(d.kv.puts.length, 2);
  const count = d.kv.puts.find((p) => p.key === `rev:count:${DAY}`);
  const cache = d.kv.puts.find((p) => p.key === `rev:cache:${DAY}:https://a.com`);
  assert.equal(JSON.parse(count.value), 1); assert.equal(count.opts.expirationTtl, 172800);
  assert.deepEqual(JSON.parse(cache.value), json.report); assert.equal(cache.opts.expirationTtl, 86400);
});
test('요금제 링크가 있으면 2장 읽고 pages=2, fetchPage 2번, ask에 두 주소가 다 들어감', async () => {
  const d = makeDeps({ pages: {
    'https://a.com': { status: 200, title: 'A', text: LONG, links: ['/pricing'] },
    'https://a.com/pricing': { status: 200, title: 'P', text: 'Pro $29', links: [] },
  } });
  const { res, json } = await run(d);
  assert.equal(res.status, 200);
  assert.equal(json.report.pages, 2);
  assert.equal(d.calls.fetchPage, 2);
  assert.ok(d.calls.askText[0].includes('https://a.com\n') && d.calls.askText[0].includes('https://a.com/pricing'));
});
test('두 번째 장이 막히거나 오류면 조용히 첫 장만 씀', async () => {
  for (const second of [{ status: 403, title: 'x', text: '', links: [] }, { error: 'timeout' }]) {
    const d = makeDeps({ pages: {
      'https://a.com': { status: 200, title: 'A', text: LONG, links: ['/pricing'] },
      'https://a.com/pricing': second,
    } });
    const { res, json } = await run(d);
    assert.equal(res.status, 200);
    assert.equal(json.report.pages, 1);
    assert.equal(d.calls.fetchPage, 2);
    assert.ok(!d.calls.askText[0].includes('[페이지 2]'));
  }
});
test('글자 399자 → askUrl 1번, ask 0번, report.partial=true', async () => {
  const d = makeDeps({ pages: { 'https://a.com': { status: 200, title: 'A', text: 'x'.repeat(399), links: ['/pricing'] } } });
  const { res, json } = await run(d);
  assert.equal(res.status, 200);
  assert.equal(d.calls.askUrl, 1); assert.equal(d.calls.ask, 0);
  assert.equal(d.calls.fetchPage, 1);
  assert.equal(json.report.partial, true);
  assert.equal(json.report.pages, 0);
  assert.equal(d.kv.puts.length, 2);
});
test('403 또는 "Just a moment" → 422 blocked, ask·askUrl 0번, 횟수 안 늘어남', async () => {
  for (const page of [{ status: 403, title: 'Forbidden', text: '', links: [] },
                      { status: 200, title: 'Just a moment...', text: 'x', links: [] }]) {
    const d = makeDeps({ pages: { 'https://a.com': page } });
    const { res, json } = await run(d);
    assert.equal(res.status, 422); assert.equal(json.error, 'blocked'); assert.ok(json.detail);
    assert.equal(d.calls.ask, 0); assert.equal(d.calls.askUrl, 0);
    assert.equal(d.kv.puts.length, 0);
  }
});
test('200이 아닌데 글자가 적으면 ②로 넘기지 않고 422 blocked', async () => {
  const d = makeDeps({ pages: { 'https://a.com': { status: 204, title: '', text: '', links: [] } } });
  const { res, json } = await run(d);
  assert.equal(res.status, 422); assert.equal(json.error, 'blocked');
  assert.equal(d.calls.askUrl, 0);
});
test('fetchPage가 {error:"timeout"} → 422 timeout, 횟수 안 늘어남', async () => {
  for (const error of ['timeout', 'network']) {
    const d = makeDeps({ pages: { 'https://a.com': { error } } });
    const { res, json } = await run(d);
    assert.equal(res.status, 422); assert.equal(json.error, error); assert.ok(json.detail);
    assert.equal(d.calls.ask + d.calls.askUrl, 0);
    assert.equal(d.kv.puts.length, 0);
  }
});
test('fetchPage가 {error:"host"} → 400 url', async () => {
  const d = makeDeps({ pages: { 'https://a.com': { error: 'host' } } });
  const { res, json } = await run(d);
  assert.equal(res.status, 400); assert.equal(json.error, 'url'); assert.ok(json.detail);
  assert.equal(d.kv.puts.length, 0);
});
test('같은 날 같은 주소(끝 / 다름) 두 번째 → 캐시 응답, fetchPage·ask 0번, kv 쓰기 0번', async () => {
  const first = makeDeps();
  const a = await run(first, { url: 'https://a.com' });
  const putsBefore = first.kv.puts.length;
  const second = makeDeps({ kv: first.kv });
  const b = await run(second, { url: 'https://a.com/' });
  assert.equal(b.res.status, 200);
  assert.deepEqual(b.json.report, a.json.report);
  assert.equal(second.calls.fetchPage, 0); assert.equal(second.calls.ask, 0); assert.equal(second.calls.askUrl, 0);
  assert.equal(first.kv.puts.length, putsBefore);
});
test('캐시가 있으면 상한이 차 있어도 캐시 응답', async () => {
  const report = { url: 'https://a.com', summary: 's' };
  const d = makeDeps({ kv: makeKv({ [`rev:count:${DAY}`]: '100', [`rev:cache:${DAY}:https://a.com`]: JSON.stringify(report) }) });
  const { res, json } = await run(d);
  assert.equal(res.status, 200); assert.deepEqual(json.report, report);
  assert.equal(d.kv.puts.length, 0);
});
test('rev:count가 100이면 → 429 cap, fetchPage 0번', async () => {
  const d = makeDeps({ kv: makeKv({ [`rev:count:${DAY}`]: '100' }) });
  const { res, json } = await run(d);
  assert.equal(res.status, 429); assert.equal(json.error, 'cap'); assert.ok(json.detail);
  assert.equal(d.calls.fetchPage, 0);
  assert.equal(d.kv.puts.length, 0);
});
test('rev:count 99 → 성공 후 100으로 저장', async () => {
  const d = makeDeps({ kv: makeKv({ [`rev:count:${DAY}`]: '99' }) });
  const { res } = await run(d);
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(d.kv.puts.find((p) => p.key === `rev:count:${DAY}`).value), 100);
});
test('Origin 없음·evil.com → 403, POST 아님 → 405, 주소 이상 → 400 url', async () => {
  for (const origin of [null, 'https://evil.com']) {
    const d = makeDeps();
    const { res, json } = await run(d, { url: 'a.com' }, { origin });
    assert.equal(res.status, 403); assert.equal(json.error, 'origin');
    assert.equal(d.calls.fetchPage, 0);
  }
  const r405 = await handleReverse(req(null, { method: 'GET' }), {}, CORS, makeDeps());
  assert.equal(r405.status, 405);
  for (const body of [{ url: '' }, { url: 'ftp://a.com' }, { url: 'http://127.0.0.1' }, {}]) {
    const d = makeDeps();
    const { res, json } = await run(d, body);
    assert.equal(res.status, 400); assert.equal(json.error, 'url'); assert.ok(json.detail);
    assert.equal(d.calls.fetchPage, 0);
  }
  const bad = await handleReverse(new Request('https://w.example/reverse', {
    method: 'POST', headers: { Origin: ORIGIN }, body: 'not json' }), {}, CORS, makeDeps());
  assert.equal(bad.status, 400);
});
test('ask가 throw → 502 model / JSON 아님 → 502 parse, 둘 다 횟수 안 늘어남', async () => {
  const t = makeDeps({ ask: async () => { throw new Error('boom'); } });
  const a = await run(t);
  assert.equal(a.res.status, 502); assert.equal(a.json.error, 'model');
  assert.equal(t.kv.puts.length, 0);
  const p = makeDeps({ raw: '죄송해요, 못 하겠어요' });
  const b = await run(p);
  assert.equal(b.res.status, 502); assert.equal(b.json.error, 'parse');
  assert.equal(p.kv.puts.length, 0);
  const u = makeDeps({ pages: { 'https://a.com': { status: 200, title: 'A', text: '', links: [] } },
    askUrl: async () => { throw new Error('boom'); } });
  const c = await run(u);
  assert.equal(c.res.status, 502); assert.equal(c.json.error, 'model');
  assert.equal(u.kv.puts.length, 0);
});
test('응답 본문에 페이지 원문 문자열이 없음', async () => {
  const outs = [];
  outs.push((await run(makeDeps())).text);
  outs.push((await run(makeDeps({ raw: 'nope' }))).text);
  outs.push((await run(makeDeps({ ask: async () => { throw new Error('SECRET-RAW-123'); } }))).text);
  for (const s of outs) assert.ok(!s.includes('SECRET-RAW-123'), s);
});
test('40000자 페이지 → ask에 넘긴 text ≤ 20000자', async () => {
  const d = makeDeps({ pages: { 'https://a.com': { status: 200, title: 'A', text: '가'.repeat(40000), links: [] } } });
  const { res } = await run(d);
  assert.equal(res.status, 200);
  assert.ok(d.calls.askText[0].length <= 20000);
});

// ----- reverse-fetch.js 순수 도우미 (fetchPage 자체는 HTMLRewriter라 wrangler dev 스모크로 확인) -----
import { collapseSpace, redirectTarget, decodeEntities } from './reverse-fetch.js';

test('공백 줄이기: 줄바꿈·탭·nbsp를 하나로, 앞뒤 자르기', () => {
  assert.equal(collapseSpace('  a\n\n\tb \u00a0 c  '), 'a b c');
  assert.equal(collapseSpace(null), '');
});
test('리다이렉트 대상: 상대 주소는 풀고, 내부 호스트·IP·비http 스킴은 null', () => {
  assert.equal(redirectTarget('/pricing/', 'https://a.com/x'), 'https://a.com/pricing/');
  assert.equal(redirectTarget('https://www.a.com/', 'https://a.com'), 'https://www.a.com/');
  for (const loc of ['http://127.0.0.1/', 'http://localhost:8787/', 'http://[::1]/', 'http://nas.local/', 'file:///etc/passwd',
    'javascript:alert(1)', 'ftp://a.com', 'http://2130706433/', 'http://user:pw@a.com/', '', null])
    assert.equal(redirectTarget(loc, 'https://a.com'), null, String(loc));
});
test('엔티티 풀기: 이름·숫자 엔티티, 모르는 건 그대로', () => {
  assert.equal(decodeEntities('AI &trade; &amp; &#8361;9,900 &#x20A9; &bogus;'), 'AI ™ & ₩9,900 ₩ &bogus;');
});
