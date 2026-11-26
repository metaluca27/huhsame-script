// docs/worker/reverse.test.mjs — 리버스 비즈니스 해부기 /reverse 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, isAllowedOrigin, findPricingLink, isBlockedPage } from './reverse-url.js';
import { buildPrompt, buildPageInput, parseReport, MAX_MODEL_TEXT } from './reverse-report.js';

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
