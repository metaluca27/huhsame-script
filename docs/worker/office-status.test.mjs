// docs/worker/office-status.test.mjs — 3D 사무실 직원 상태 워커 로직 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleOfficeStatus, validateReport } from './office-status.js';

function fakeKV(initial) {
  const store = new Map(Object.entries(initial || {}));
  let puts = 0;
  return {
    get: async (k, type) => { const v = store.get(k); if (v == null) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { puts++; store.set(k, v); },
    get puts() { return puts; },
  };
}
const CORS = { 'Access-Control-Allow-Origin': '*' };
const TOKEN = 'test-token';
function post(body, token = TOKEN) {
  return new Request('https://w.test/office/status', { method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Office-Token': token } });
}
const get = () => new Request('https://w.test/office/status');

test('출입증이 틀리면 403, 저장 안 함', async () => {
  const kv = fakeKV();
  const r = await handleOfficeStatus(post({ agents: { clo: Date.now() } }, 'nope'), { MERGE_RANK: kv, OFFICE_TOKEN: TOKEN }, CORS);
  assert.equal(r.status, 403);
  assert.equal(kv.puts, 0);
});

test('보고한 시각을 저장하고 GET 으로 읽힌다', async () => {
  const kv = fakeKV();
  const env = { MERGE_RANK: kv, OFFICE_TOKEN: TOKEN };
  const t = Date.now() - 60_000;
  const r = await handleOfficeStatus(post({ agents: { clo: t, pureum: t - 1000 } }), env, CORS);
  assert.equal((await r.json()).saved, true);
  const g = await (await handleOfficeStatus(get(), env, CORS)).json();
  assert.deepEqual(g.agents, { clo: t, pureum: t - 1000 });
  assert.ok(g.reportedAt > 0);
});

test('값이 그대로면 30분 안에는 다시 저장하지 않는다 (KV 쓰기 아끼기)', async () => {
  const kv = fakeKV();
  const env = { MERGE_RANK: kv, OFFICE_TOKEN: TOKEN };
  const t = Date.now() - 60_000;
  await handleOfficeStatus(post({ agents: { clo: t } }), env, CORS);
  const r = await handleOfficeStatus(post({ agents: { clo: t } }), env, CORS);
  assert.equal((await r.json()).saved, false);
  assert.equal(kv.puts, 1);
  await handleOfficeStatus(post({ agents: { clo: t + 5000 } }), env, CORS);
  assert.equal(kv.puts, 2);
});

test('모르는 이름이나 이상한 값은 거절, 너무 옛날 값은 버림', () => {
  const now = Date.now();
  assert.equal(validateReport({ agents: { hacker: now } }, now).ok, false);
  assert.equal(validateReport({ agents: { clo: 'now' } }, now).ok, false);
  assert.equal(validateReport({ agents: { clo: 1.5 } }, now).ok, false);
  assert.deepEqual(validateReport({ agents: { clo: now - 365 * 86400_000 } }, now).agents, {});
  assert.deepEqual(validateReport({ agents: { clo: now + 3600_000 } }, now).agents, {});
  assert.equal(validateReport(null, now).ok, false);
});
