// docs/worker/check.test.mjs — 오탈자 검사기 /check 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheck, buildCheckPrompt, parseFindings } from './check.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };
function post(body) {
  return new Request('https://w.test/check', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

test('정상: 울타리 친 JSON을 풀어 findings로', async () => {
  const ask = async () => '```json\n[{"page":3,"wrong":"할수있다","right":"할 수 있다","reason":"의존명사"}]\n```';
  const res = await handleCheck(post({ mode: 'article', text: '[[쪽 3]]\n할수있다' }), {}, CORS, ask);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.findings[0], { page: 3, wrong: '할수있다', right: '할 수 있다', reason: '의존명사', unsure: false });
});

test('JSON 아닌 답 → 502 parse', async () => {
  const res = await handleCheck(post({ mode: 'article', text: '가' }), {}, CORS, async () => '죄송하지만');
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'parse');
});

test('모델 오류 → 502 model', async () => {
  const res = await handleCheck(post({ mode: 'article', text: '가' }), {}, CORS, async () => { throw new Error('x'); });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'model');
});

test('6001자 → 413, 모델 호출 안 함', async () => {
  let calls = 0;
  const res = await handleCheck(post({ mode: 'article', text: '가'.repeat(6001) }), {}, CORS, async () => { calls++; return '[]'; });
  assert.equal(res.status, 413);
  assert.equal(calls, 0);
});

test('mode 이상 → 400, GET → 405', async () => {
  assert.equal((await handleCheck(post({ mode: 'poem', text: '가' }), {}, CORS, async () => '[]')).status, 400);
  assert.equal((await handleCheck(new Request('https://w.test/check'), {}, CORS, async () => '[]')).status, 405);
});

test('프롬프트: 공통 규칙 + 책 모드만 대사 규칙', () => {
  const a = buildCheckPrompt('article'), b = buildCheckPrompt('book');
  for (const w of ['줄바꿈', '고유명사', 'unsure', '[[쪽']) assert.ok(a.includes(w), w);
  assert.ok(b.includes('대사'));
  assert.ok(!a.includes('대사'));
});

test('parseFindings: 같은 말 지적은 버리고 page는 숫자로', () => {
  assert.deepEqual(parseFindings('[{"page":"2","wrong":"a","right":"a"}]'), []);
  assert.equal(parseFindings('[{"page":"2","wrong":"a","right":"b"}]')[0].page, 2);
  assert.equal(parseFindings('{"x":1}'), null);
});
