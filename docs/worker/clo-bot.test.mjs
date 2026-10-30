// docs/worker/clo-bot.test.mjs — 클로 텔레그램 봇 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { Webhook } from 'standardwebhooks';
import { splitForTelegram, summarizeLatestTurn, handleCloTelegram, handleCloAgentWebhook, MSG } from './clo-bot.js';

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

test('최신순 이벤트에서 마지막 루카 메시지 이후의 답과 가장 최근 idle을 뽑는다', async () => {
  const desc = [
    idle('i2', 'end_turn'),
    agentMsg('a2', '두 번째'),
    idle('i1', 'requires_action', { event_ids: ['t1'] }),
    agentMsg('a1', '첫 번째'),
    userMsg('u2', '질문2'),
    agentMsg('a0', '지난 턴 답'),
    userMsg('u1', '질문1'),
  ];
  const turn = await summarizeLatestTurn(iter(desc));
  assert.equal(turn.idle.id, 'i2');
  assert.equal(turn.text, '첫 번째\n\n두 번째');
});

test('idle이 없으면 idle은 null', async () => {
  const turn = await summarizeLatestTurn(iter([agentMsg('a1', '작업 중'), userMsg('u1', 'q')]));
  assert.equal(turn.idle, null);
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
  assert.equal(client.calls.send.length, 0);
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
