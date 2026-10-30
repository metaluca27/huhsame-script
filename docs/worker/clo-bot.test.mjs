// docs/worker/clo-bot.test.mjs — 클로 텔레그램 봇 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { Webhook } from 'standardwebhooks';
import { splitForTelegram, collectUndeliveredTurns, makeTelegram, handleCloTelegram, handleCloAgentWebhook, MSG } from './clo-bot.js';

async function* iter(list) { for (const x of list) yield x; }
const userMsg = (id, text) => ({ id, type: 'user.message', content: [{ type: 'text', text }] });
const agentMsg = (id, text) => ({ id, type: 'agent.message', content: [{ type: 'text', text }] });
const idle = (id, type, extra = {}) => ({ id, type: 'session.status_idle', stop_reason: { type, ...extra } });

test('짧은 글은 한 덩어리, 긴 글은 줄바꿈 기준으로 나눈다', () => {
  assert.deepEqual(splitForTelegram('안녕'), ['안녕']);
  const long = 'a'.repeat(30) + '\n' + 'b'.repeat(30);
  assert.deepEqual(splitForTelegram(long, 40), ['a'.repeat(30), 'b'.repeat(30)]);
  assert.deepEqual(splitForTelegram('c'.repeat(90), 40), ['c'.repeat(40), 'c'.repeat(40), 'c'.repeat(10)]);
});

test('턴 하나: 답과 idle을 뽑는다', async () => {
  const turns = await collectUndeliveredTurns(iter([idle('i1', 'end_turn'), agentMsg('a2', '둘'), agentMsg('a1', '하나'), userMsg('u1', 'q')]), null);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].idle.id, 'i1');
  assert.equal(turns[0].text, '하나\n\n둘');
});

test('루카가 중간에 또 말해도 아직 안 보낸 턴을 오래된 것부터 모두 돌려준다', async () => {
  const desc = [
    idle('iB', 'end_turn'), agentMsg('aB', '답B'), userMsg('uB', 'B'),
    idle('iA', 'end_turn'), agentMsg('aA', '답A'), userMsg('uA', 'A'),
  ];
  const turns = await collectUndeliveredTurns(iter(desc), null);
  assert.deepEqual(turns.map((t) => [t.idle.id, t.text]), [['iA', '답A'], ['iB', '답B']]);
});

test('이미 보낸 idle 앞에서 멈춘다 (그 idle은 포함 안 함)', async () => {
  const desc = [idle('i2', 'end_turn'), agentMsg('a2', '새 답'), idle('i1', 'end_turn'), agentMsg('a1', '옛 답'), userMsg('u1', 'q')];
  const turns = await collectUndeliveredTurns(iter(desc), 'i1');
  assert.deepEqual(turns.map((t) => [t.idle.id, t.text]), [['i2', '새 답']]);
});

test('requires_action idle 다음 end_turn idle 은 두 턴', async () => {
  const desc = [
    idle('i2', 'end_turn'), agentMsg('a2', '거절 뒤 글'),
    idle('i1', 'requires_action', { event_ids: ['t1'] }), agentMsg('a1', '멈추기 전 글'), userMsg('u1', 'q'),
  ];
  const turns = await collectUndeliveredTurns(iter(desc), null);
  assert.deepEqual(turns.map((t) => [t.idle.id, t.text]), [['i1', '멈추기 전 글'], ['i2', '거절 뒤 글']]);
});

test('maxTurns 만큼 모으면 더 읽지 않는다', async () => {
  let pulled = 0;
  async function* many() { for (let i = 10; i >= 1; i--) { pulled++; yield idle('i' + i, 'end_turn'); } }
  const turns = await collectUndeliveredTurns(many(), null, 3);
  assert.deepEqual(turns.map((t) => t.idle.id), ['i8', 'i9', 'i10']);
  assert.ok(pulled <= 4, 'pulled ' + pulled);
});

test('idle이 없으면 빈 배열', async () => {
  assert.deepEqual(await collectUndeliveredTurns(iter([agentMsg('a1', '작업 중'), userMsg('u1', 'q')]), null), []);
});

function fakeKV(initial) {
  const store = new Map(Object.entries(initial || {}));
  return { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); }, store };
}
function fakeTelegram() {
  const sent = [], typed = [];
  return { sent, typed, send: async (chatId, text) => { sent.push([chatId, text]); }, typing: async (chatId) => { typed.push(chatId); } };
}
function fakeClient({ sendError } = {}) {
  const calls = { create: [], send: [] };
  let n = 0;
  return {
    calls,
    beta: {
      sessions: {
        create: async (p) => { calls.create.push(p); return { id: `sesn_${++n}` }; },
        events: {
          send: async (id, p) => { if (sendError) throw sendError; calls.send.push([id, p]); },
          list: () => iter([]),
        },
      },
      webhooks: { unwrap: (body) => JSON.parse(body) },
    },
  };
}
const OWNER = '111';
const baseEnv = (kv) => ({ MERGE_RANK: kv, CLO_TELEGRAM_SECRET: 'tg-secret', CLO_OWNER_CHAT_ID: OWNER, CLO_AGENT_ID: 'agent_x', CLO_ENVIRONMENT_ID: 'env_x' });
function tgReq(message, secret = 'tg-secret') {
  return new Request('https://w.test/clo/telegram', { method: 'POST', body: JSON.stringify({ update_id: 1, message }),
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret } });
}
const fromOwner = (text) => ({ message_id: 1, from: { id: Number(OWNER) }, chat: { id: Number(OWNER) }, text });

test('텔레그램 비밀값이 틀리면 401, 아무것도 안 함', async () => {
  const kv = fakeKV(), client = fakeClient(), telegram = fakeTelegram();
  const r = await handleCloTelegram(tgReq(fromOwner('안녕'), 'nope'), baseEnv(kv), { client, telegram });
  assert.equal(r.status, 401);
  assert.equal(client.calls.send.length, 0);
});

test('루카가 아니면 200 주고 무시', async () => {
  const kv = fakeKV(), client = fakeClient(), telegram = fakeTelegram();
  const r = await handleCloTelegram(tgReq({ from: { id: 999 }, chat: { id: 999 }, text: '안녕' }), baseEnv(kv), { client, telegram });
  assert.equal(r.status, 200);
  assert.equal(client.calls.send.length + client.calls.create.length + telegram.sent.length, 0);
});

test('세션이 없으면 $3 상한으로 새로 만들고 메시지를 넘긴 뒤 입력 중 표시', async () => {
  const kv = fakeKV(), client = fakeClient(), telegram = fakeTelegram();
  const r = await handleCloTelegram(tgReq(fromOwner('안녕 클로')), baseEnv(kv), { client, telegram });
  assert.equal(r.status, 200);
  assert.deepEqual(client.calls.create[0].budget, { type: 'limit', max_list_cost: { amount: '300', currency: 'USD' } });
  assert.equal(client.calls.create[0].agent, 'agent_x');
  assert.equal(client.calls.create[0].environment_id, 'env_x');
  assert.equal(kv.store.get('clo:session'), 'sesn_1');
  assert.deepEqual(client.calls.send[0], ['sesn_1', { events: [{ type: 'user.message', content: [{ type: 'text', text: '안녕 클로' }] }] }]);
  assert.deepEqual(telegram.typed, [Number(OWNER)]);
});

test('세션이 있으면 그대로 이어 쓴다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_old' }), client = fakeClient(), telegram = fakeTelegram();
  await handleCloTelegram(tgReq(fromOwner('계속')), baseEnv(kv), { client, telegram });
  assert.equal(client.calls.create.length, 0);
  assert.equal(client.calls.send[0][0], 'sesn_old');
});

test('/새대화 는 새 세션을 만들고 안내만 보낸다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_old' }), client = fakeClient(), telegram = fakeTelegram();
  await handleCloTelegram(tgReq(fromOwner('/새대화')), baseEnv(kv), { client, telegram });
  assert.equal(kv.store.get('clo:session'), 'sesn_1');
  assert.ok(client.calls.send.every(([, p]) => p.events[0].type === 'user.interrupt'));   // 사용자 메시지는 안 넘긴다
  assert.deepEqual(telegram.sent, [[Number(OWNER), MSG.newSession]]);
});

test('글이 아닌 메시지는 안내만', async () => {
  const kv = fakeKV(), client = fakeClient(), telegram = fakeTelegram();
  await handleCloTelegram(tgReq({ ...fromOwner(undefined), photo: [{}] }), baseEnv(kv), { client, telegram });
  assert.deepEqual(telegram.sent, [[Number(OWNER), MSG.textOnly]]);
  assert.equal(client.calls.send.length, 0);
});

test('전달이 400으로 막히면(예산 소진 등) 루카에게 알린다', async () => {
  const err = new Anthropic.BadRequestError(400, {}, 'budget_reached', new Headers());
  const kv = fakeKV({ 'clo:session': 'sesn_old' }), client = fakeClient({ sendError: err }), telegram = fakeTelegram();
  const r = await handleCloTelegram(tgReq(fromOwner('안녕')), baseEnv(kv), { client, telegram });
  assert.equal(r.status, 200);
  assert.deepEqual(telegram.sent, [[Number(OWNER), MSG.cantSend]]);
});

const WH_KEY = 'whsec_' + Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
function agentReq(data, key = WH_KEY) {
  const body = JSON.stringify({ type: 'event', id: 'whe_1', created_at: new Date().toISOString(), data });
  const id = 'whe_1', ts = new Date();
  const sig = new Webhook(key).sign(id, ts, body);
  return new Request('https://w.test/clo/agent-webhook', { method: 'POST', body,
    headers: { 'webhook-id': id, 'webhook-timestamp': String(Math.floor(ts / 1000)), 'webhook-signature': sig } });
}
function clientWithEvents(desc) {
  const c = fakeClient();
  c.beta.sessions.events.list = (id, params) => { c.calls.list = [id, params]; return iter(desc); };
  c.beta.webhooks = new Anthropic({ apiKey: 'x' }).beta.webhooks;   // 진짜 서명 검증
  return c;
}
const hookEnv = (kv) => ({ ...baseEnv(kv), CLO_AGENT_WEBHOOK_SECRET: WH_KEY });
const idled = (id = 'sesn_1') => ({ type: 'session.status_idled', id });

test('서명이 틀리면 401', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const otherKey = 'whsec_' + Buffer.from('ffffffffffffffffffffffffffffffff').toString('base64');
  const r = await handleCloAgentWebhook(agentReq(idled(), otherKey), hookEnv(kv), { client: clientWithEvents([]), telegram });
  assert.equal(r.status, 401);
  assert.equal(telegram.sent.length, 0);
});

test('끝난 턴의 답을 최신순으로 읽어 루카에게 보낸다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'end_turn'), agentMsg('a1', '안녕하세요 루카!'), userMsg('u1', '안녕')]);
  const r = await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.equal(r.status, 204);
  assert.deepEqual(client.calls.list, ['sesn_1', { order: 'desc' }]);
  assert.deepEqual(telegram.sent, [[OWNER, '안녕하세요 루카!']]);
  assert.equal(kv.store.get('clo:delivered'), 'i1');
});

test('같은 idle은 두 번 보내지 않는다 (웹훅 재전송 대비)', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1', 'clo:delivered': 'i1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'end_turn'), agentMsg('a1', '답'), userMsg('u1', 'q')]);
  await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.equal(telegram.sent.length, 0);
});

test('지금 대화방이 아닌 세션, idle 이 아닌 이벤트는 무시', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'end_turn'), agentMsg('a1', '답'), userMsg('u1', 'q')]);
  await handleCloAgentWebhook(agentReq(idled('sesn_other')), hookEnv(kv), { client, telegram });
  await handleCloAgentWebhook(agentReq({ type: 'session.status_run_started', id: 'sesn_1' }), hookEnv(kv), { client, telegram });
  assert.equal(telegram.sent.length, 0);
});

test('확인이 필요한 도구 호출은 거절하고 루카에게 알린다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'requires_action', { event_ids: ['t1', 't2'] }), userMsg('u1', 'q')]);
  await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.deepEqual(client.calls.send[0], ['sesn_1', { events: [
    { type: 'user.tool_confirmation', tool_use_id: 't1', result: 'deny' },
    { type: 'user.tool_confirmation', tool_use_id: 't2', result: 'deny' },
  ] }]);
  assert.deepEqual(telegram.sent, [[OWNER, MSG.denied]]);
});

test('예산 소진·오류·거절은 각각 안내 문구', async () => {
  for (const [type, expected] of [['budget_reached', MSG.budget], ['retries_exhausted', MSG.failed], ['refusal', MSG.refusal]]) {
    const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
    const client = clientWithEvents([idle('i1', type), userMsg('u1', 'q')]);
    await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
    assert.deepEqual(telegram.sent, [[OWNER, expected]], type);
  }
});

test('답 글이 없으면 빈 답 안내', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'end_turn'), userMsg('u1', 'q')]);
  await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.deepEqual(telegram.sent, [[OWNER, MSG.empty]]);
});

test('웹훅: 거절 전송이 실패하면 전달 표시를 남기지 않고 오류를 던진다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([idle('i1', 'requires_action', { event_ids: ['t1'] }), userMsg('u1', 'q')]);
  client.beta.sessions.events.send = async () => { throw new Error('boom'); };
  await assert.rejects(handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram }));
  assert.equal(kv.store.get('clo:delivered'), undefined);
});

test('웹훅: 안 보낸 턴이 둘이면 오래된 것부터 보내고 가장 새 idle을 기록', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([
    idle('iB', 'end_turn'), agentMsg('aB', '답B'), userMsg('uB', 'B'),
    idle('iA', 'end_turn'), agentMsg('aA', '답A'), userMsg('uA', 'A'),
  ]);
  await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.deepEqual(telegram.sent, [[OWNER, '답A'], [OWNER, '답B']]);
  assert.equal(kv.store.get('clo:delivered'), 'iB');
});

test('웹훅: 멈추기 전 글도 보내고, 가장 새 턴이 아닌 requires_action 은 다시 거절하지 않는다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_1' }), telegram = fakeTelegram();
  const client = clientWithEvents([
    idle('i2', 'end_turn'), agentMsg('a2', '거절 뒤'),
    idle('i1', 'requires_action', { event_ids: ['t1'] }), agentMsg('a1', '멈추기 전'), userMsg('u1', 'q'),
  ]);
  await handleCloAgentWebhook(agentReq(idled()), hookEnv(kv), { client, telegram });
  assert.equal(client.calls.send.length, 0);
  assert.deepEqual(telegram.sent, [[OWNER, '멈추기 전'], [OWNER, '거절 뒤']]);
});

test('텔레그램 처리 중 어떤 오류가 나도 200 + 안내 (재전송 방지)', async () => {
  for (const err of [new Error('boom'), new Anthropic.InternalServerError(500, {}, 'x', new Headers())]) {
    const kv = fakeKV({ 'clo:session': 'sesn_old' }), client = fakeClient({ sendError: err }), telegram = fakeTelegram();
    const r = await handleCloTelegram(tgReq(fromOwner('안녕')), baseEnv(kv), { client, telegram });
    assert.equal(r.status, 200);
    assert.deepEqual(telegram.sent, [[Number(OWNER), MSG.cantSend]]);
  }
});

test('/새대화 는 옛 세션에 중단을 보내고, 중단이 실패해도 새 세션을 만든다', async () => {
  const kv = fakeKV({ 'clo:session': 'sesn_old' }), client = fakeClient(), telegram = fakeTelegram();
  await handleCloTelegram(tgReq(fromOwner('/새대화')), baseEnv(kv), { client, telegram });
  assert.deepEqual(client.calls.send[0], ['sesn_old', { events: [{ type: 'user.interrupt' }] }]);
  const kv2 = fakeKV({ 'clo:session': 'sesn_old' }), client2 = fakeClient({ sendError: new Error('gone') }), tg2 = fakeTelegram();
  await handleCloTelegram(tgReq(fromOwner('/새대화')), baseEnv(kv2), { client: client2, telegram: tg2 });
  assert.equal(kv2.store.get('clo:session'), 'sesn_1');
  assert.deepEqual(tg2.sent, [[Number(OWNER), MSG.newSession]]);
});

test('makeTelegram: 나눠서 보내고, 실패 응답에도 던지지 않는다', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push([url, JSON.parse(init.body)]); return new Response('nope', { status: 500 }); };
  const tg = makeTelegram('TOK', fetchFn);
  await tg.send(5, 'x'.repeat(4500));
  await tg.typing(5);
  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'https://api.telegram.org/botTOK/sendMessage');
  assert.equal(calls[0][1].chat_id, 5);
  assert.equal(calls[0][1].text.length + calls[1][1].text.length, 4500);
  assert.equal(calls[2][1].action, 'typing');
});
