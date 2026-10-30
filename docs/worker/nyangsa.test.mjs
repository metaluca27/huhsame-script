// docs/worker/nyangsa.test.mjs — 냥사 방 로직·고민 공양 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room, handleNyangsa, fallbackReply, isCrisis, CRISIS_LINE, _resetRateLimit } from './nyangsa.js';

const ID_A = 'aaaaaaaa-1111';
const ID_B = 'bbbbbbbb-2222';
const CORS = { 'Access-Control-Allow-Origin': '*' };

test('처음 들어오면 앉고 입장 알림이 생긴다', () => {
  const r = new Room();
  const out = r.ping({ id: ID_A, name: '말랑한 젤리', coat: 'cheese', since: 0 }, 1000);
  assert.equal(out.ok, true);
  assert.equal(out.count, 1);
  assert.equal(out.cats[0].name, '말랑한 젤리');
  assert.equal(out.events.length, 1);
  assert.equal(out.events[0].type, 'join');
});

test('since 이후 알림만 돌려준다', () => {
  const r = new Room();
  const first = r.ping({ id: ID_A, name: 'A', coat: 'black', since: 0 }, 1000);
  r.ping({ id: ID_B, name: 'B', coat: 'black', since: 0 }, 2000);
  const again = r.ping({ id: ID_A, name: 'A', coat: 'black', since: first.seq }, 3000);
  assert.deepEqual(again.events.map(e => e.name), ['B']);
});

test('since가 없으면 지난 알림은 주지 않는다', () => {
  const r = new Room();
  r.ping({ id: ID_A, name: 'A', coat: 'black' }, 1000);
  const out = r.ping({ id: ID_B, name: 'B', coat: 'black' }, 2000);
  assert.equal(out.events.length, 0);
});

test('10분 넘게 소식 없으면 방석에서 내려간다', () => {
  const r = new Room();
  r.ping({ id: ID_A, name: 'A', coat: 'black', since: 0 }, 0);
  const out = r.ping({ id: ID_B, name: 'B', coat: 'black', since: 0 }, 10 * 60 * 1000 + 1);
  assert.equal(out.count, 1);
  assert.equal(out.cats[0].id, ID_B);
});

test('이상한 id·이름·털색은 걸러낸다', () => {
  const r = new Room();
  assert.equal(r.ping({ id: 'x', name: 'A' }, 0).ok, false);
  assert.equal(r.ping({ id: ID_A, name: '   ' }, 0).ok, false);
  const out = r.ping({ id: ID_A, name: '<b>엄청나게긴이름입니다아아아</b>', coat: 'rainbow' }, 0);
  assert.equal(out.cats[0].name, 'b엄청나게긴이름입니다아'.slice(0, 12));
  assert.equal(out.cats[0].coat, 'cheese');
});

test('꾹꾹이는 공덕을 올리고 연타는 막는다', () => {
  const r = new Room(5);
  r.ping({ id: ID_A, name: 'A', coat: 'black' }, 0);
  assert.equal(r.act({ id: ID_A, type: 'kkuk' }, 1000).merit, 6);
  assert.equal(r.act({ id: ID_A, type: 'kkuk' }, 1100).error, 'too_fast');
  assert.equal(r.act({ id: ID_A, type: 'kkuk' }, 1700).merit, 7);
});

test('앉지 않은 집사는 꾹꾹이 못 한다', () => {
  const r = new Room();
  assert.equal(r.act({ id: ID_A, type: 'kkuk' }, 0).error, 'not_seated');
});

test('고민 공양 알림에는 이름이 남지 않는다', () => {
  const r = new Room();
  const s = r.ping({ id: ID_A, name: '비밀냥', coat: 'black', since: 0 }, 0);
  r.act({ id: ID_A, type: 'gongyang' }, 10);
  const out = r.ping({ id: ID_B, name: 'B', coat: 'black', since: s.seq }, 20);
  const g = out.events.find(e => e.type === 'gongyang');
  assert.equal(g.name, '');
  assert.equal(g.from, '');
});

test('위기 신호에는 109 안내', () => {
  assert.equal(isCrisis('요즘 죽고 싶어'), true);
  assert.equal(isCrisis('시험이 걱정돼'), false);
  assert.equal(fallbackReply('그냥 사라지고 싶다'), CRISIS_LINE);
  assert.ok(fallbackReply('회사 가기 싫어', () => 0).length > 0);
});

function gongyang(text, ip) {
  return new Request('https://w.test/nyangsa/gongyang', {
    method: 'POST', body: JSON.stringify({ id: ID_A, text }),
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip || '1.1.1.1' },
  });
}
const fakeEnv = { NYANGSA: { idFromName: () => 'main', get: () => ({ fetch: async () => new Response('{}') }) } };

test('공양: AI 대답을 그대로 돌려준다', async () => {
  _resetRateLimit();
  const res = await handleNyangsa(gongyang('회사 가기 싫어'), new URL('https://w.test/nyangsa/gongyang'), fakeEnv, CORS, async () => '캔 따는 날까지만 버티자옹');
  assert.equal((await res.json()).reply, '캔 따는 날까지만 버티자옹');
});

test('공양: AI가 실패하면 푸름이 기본 대답', async () => {
  _resetRateLimit();
  const res = await handleNyangsa(gongyang('회사 가기 싫어'), new URL('https://w.test/nyangsa/gongyang'), fakeEnv, CORS, async () => { throw new Error('x'); });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.reply.length > 0);
});

test('공양: 위기 글인데 AI가 109를 빠뜨리면 덧붙인다', async () => {
  _resetRateLimit();
  const res = await handleNyangsa(gongyang('죽고 싶어'), new URL('https://w.test/nyangsa/gongyang'), fakeEnv, CORS, async () => '힘들었구나');
  assert.ok((await res.json()).reply.includes('109'));
});

test('공양: 같은 IP 10초 안에 또 오면 막는다', async () => {
  _resetRateLimit();
  const url = new URL('https://w.test/nyangsa/gongyang');
  await handleNyangsa(gongyang('하나', '9.9.9.9'), url, fakeEnv, CORS, async () => '응');
  const res = await handleNyangsa(gongyang('둘', '9.9.9.9'), url, fakeEnv, CORS, async () => '응');
  assert.equal(res.status, 429);
});

test('마당에 나가면 place가 yard로 바뀐다', () => {
  const r = new Room();
  r.ping({ id: ID_A, name: 'A', coat: 'black' }, 0);
  const out = r.ping({ id: ID_A, name: 'A', coat: 'black', place: 'yard' }, 10);
  assert.equal(out.cats[0].place, 'yard');
  assert.equal(r.ping({ id: ID_B, name: 'B', place: 'roof' }, 20).cats.find(c => c.id === ID_B).place, 'hall');
});

test('탑돌이 한 바퀴는 공덕 +1, 8초 안에 또 돌면 막는다', () => {
  const r = new Room();
  r.ping({ id: ID_A, name: 'A', coat: 'black', place: 'yard' }, 0);
  assert.equal(r.act({ id: ID_A, type: 'lap' }, 20000).merit, 1);
  assert.equal(r.act({ id: ID_A, type: 'lap' }, 25000).error, 'too_fast');
  assert.equal(r.act({ id: ID_A, type: 'kkuk' }, 25000).merit, 2);
  assert.equal(r.act({ id: ID_A, type: 'lap' }, 29000).merit, 3);
});

test('절은 공덕 없이 알림만', () => {
  const r = new Room();
  const s = r.ping({ id: ID_A, name: 'A', coat: 'black', since: 0 }, 0);
  assert.equal(r.act({ id: ID_A, type: 'bow' }, 1000).merit, 0);
  const out = r.ping({ id: ID_B, name: 'B', coat: 'black', since: s.seq }, 2000);
  assert.ok(out.events.some(e => e.type === 'bow' && e.name === 'A'));
});
