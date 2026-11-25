// docs/worker/check.test.mjs — 오탈자 검사기 /check 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheck, buildCheckPrompt, parseFindings, _resetCheckLimit, CHECK_LIMIT } from './check.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };
const ENV = { CHECK_CODES: 'luka-aaa111, p1-bbb222' };
function post(body, code) {
  const b = Object.assign({ code: code === undefined ? 'luka-aaa111' : code }, body);
  return new Request('https://w.test/check', { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } });
}

test('정상: 울타리 친 JSON을 풀어 findings로', async () => {
  const ask = async () => '```json\n[{"page":3,"wrong":"할수있다","right":"할 수 있다","reason":"의존명사"}]\n```';
  const res = await handleCheck(post({ mode: 'article', text: '[[쪽 3]]\n할수있다' }), ENV, CORS, ask);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.findings[0], { page: 3, wrong: '할수있다', right: '할 수 있다', reason: '의존명사', unsure: false });
});

test('JSON 아닌 답 → 502 parse', async () => {
  const res = await handleCheck(post({ mode: 'article', text: '가' }), ENV, CORS, async () => '죄송하지만');
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'parse');
});

test('모델 오류 → 502 model', async () => {
  const res = await handleCheck(post({ mode: 'article', text: '가' }), ENV, CORS, async () => { throw new Error('x'); });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'model');
});

test('3501자 → 413, 모델 호출 안 함', async () => {
  let calls = 0;
  const res = await handleCheck(post({ mode: 'article', text: '가'.repeat(3501) }), ENV, CORS, async () => { calls++; return '[]'; });
  assert.equal(res.status, 413);
  assert.equal(calls, 0);
});

test('mode 이상 → 400, GET → 405', async () => {
  assert.equal((await handleCheck(post({ mode: 'poem', text: '가' }), ENV, CORS, async () => '[]')).status, 400);
  assert.equal((await handleCheck(new Request('https://w.test/check'), ENV, CORS, async () => '[]')).status, 405);
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

test('객체 응답: findings + joins(줄에서 잘린 단어)', async () => {
  const ask = async () => '{"findings":[{"page":1,"wrong":"몇일 동안","right":"며칠 동안","reason":"맞춤법"}],"joins":["마음을","내년",3]}';
  const res = await handleCheck(post({ mode: 'article', text: '[[쪽 1]]\n마음\n을' }), ENV, CORS, ask);
  const body = await res.json();
  assert.equal(body.findings.length, 1);
  assert.deepEqual(body.joins, ['마음을', '내년']);
});

test('배열만 온 옛 형식도 받되 joins는 빈 배열', async () => {
  const res = await handleCheck(post({ mode: 'article', text: '가' }), ENV, CORS, async () => '[]');
  assert.deepEqual(await res.json(), { findings: [], joins: [] });
});

test('프롬프트가 joins를 요구한다', () => {
  assert.ok(buildCheckPrompt('article').includes('joins'));
});

test('한 코드가 1시간에 CHECK_LIMIT번 넘게 부르면 429, 다른 코드는 괜찮다', async () => {
  _resetCheckLimit();
  const ask = async () => '[]';
  for (let i = 0; i < CHECK_LIMIT; i++) assert.equal((await handleCheck(post({ mode: 'article', text: '가' }), ENV, CORS, ask)).status, 200);
  assert.equal((await handleCheck(post({ mode: 'article', text: '가' }), ENV, CORS, ask)).status, 429);
  assert.equal((await handleCheck(post({ mode: 'article', text: '가' }, 'p1-bbb222'), ENV, CORS, ask)).status, 200);
  _resetCheckLimit();
});

test('입장 코드: 없거나 틀리면 401, 모델 호출 안 함', async () => {
  let calls = 0;
  const ask = async () => { calls++; return '[]'; };
  assert.equal((await handleCheck(post({ mode: 'article', text: '가' }, ''), ENV, CORS, ask)).status, 401);
  const res = await handleCheck(post({ mode: 'article', text: '가' }, 'p1-zzz999'), ENV, CORS, ask);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'code');
  assert.equal(calls, 0);
});

test('입장 코드: 앞뒤 공백은 봐주고, 코드 목록이 없으면 아무도 못 씀(503)', async () => {
  _resetCheckLimit();
  assert.equal((await handleCheck(post({ mode: 'article', text: '가' }, '  p1-bbb222 '), ENV, CORS, async () => '[]')).status, 200);
  assert.equal((await handleCheck(post({ mode: 'article', text: '가' }), {}, CORS, async () => '[]')).status, 503);
  _resetCheckLimit();
});
