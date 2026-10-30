// docs/worker/clo-bot.test.mjs — 클로 텔레그램 봇 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitForTelegram, summarizeLatestTurn } from './clo-bot.js';

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
