// docs/worker/office-status.js
// 디지털 다락방 3D 사무실(/office) — 직원(에이전트) 7명이 마지막으로 일한 시각
//   GET  /office/status : { ok, agents: { hermi: ms, ... }, reportedAt }  (누구나 읽기)
//   POST /office/status : 미니PC 보고원(tools/ai-office-3d/reporter)만 — X-Office-Token 헤더 = OFFICE_TOKEN 시크릿
// KV: env.MERGE_RANK 를 같이 쓰고 키는 'office:status' 하나.
// 무료 KV 쓰기는 하루 1000번이라, 값이 그대로면 30분에 한 번만 저장한다(보고원이 살아 있다는 표시).

export const OWNERS = ['hermi', 'jujuya', 'luna', 'nova', 'pureum', 'rurik', 'clo'];
const KEY = 'office:status';
const KEEPALIVE_MS = 30 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const MAX_PAST_MS = 60 * 24 * 60 * 60 * 1000;   // 60일보다 옛날 값은 버림

// 보고 내용 검사: 아는 직원 이름 + 그럴듯한 시각(ms 정수)만 남긴다. 그 밖의 내용은 받지 않는다.
export function validateReport(body, now) {
  if (!body || typeof body !== 'object' || !body.agents || typeof body.agents !== 'object') {
    return { ok: false, error: 'bad_body' };
  }
  const agents = {};
  for (const owner of OWNERS) {
    const v = body.agents[owner];
    if (v == null) continue;
    if (typeof v !== 'number' || !Number.isInteger(v)) return { ok: false, error: `bad_time_${owner}` };
    if (v > now + MAX_FUTURE_MS || v < now - MAX_PAST_MS) continue;
    agents[owner] = v;
  }
  for (const k of Object.keys(body.agents)) {
    if (!OWNERS.includes(k)) return { ok: false, error: 'unknown_owner' };
  }
  return { ok: true, agents };
}

export function sameAgents(a, b) {
  return OWNERS.every((o) => (a && a[o]) === (b && b[o]));
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

export async function handleOfficeStatus(request, env, cors) {
  if (!env.MERGE_RANK) return json({ ok: false, error: 'kv_missing' }, 500, cors);
  const now = Date.now();
  const stored = (await env.MERGE_RANK.get(KEY, 'json')) || { agents: {}, reportedAt: 0 };
  if (request.method === 'GET') {
    return json({ ok: true, agents: stored.agents || {}, reportedAt: stored.reportedAt || 0, now }, 200, cors);
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
  if (!env.OFFICE_TOKEN) return json({ ok: false, error: 'OFFICE_TOKEN 미설정' }, 500, cors);
  if (request.headers.get('X-Office-Token') !== env.OFFICE_TOKEN) return json({ ok: false, error: 'forbidden' }, 403, cors);
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400, cors); }
  const v = validateReport(body, now);
  if (!v.ok) return json({ ok: false, error: v.error }, 400, cors);
  if (sameAgents(v.agents, stored.agents) && now - (stored.reportedAt || 0) < KEEPALIVE_MS) {
    return json({ ok: true, saved: false }, 200, cors);
  }
  await env.MERGE_RANK.put(KEY, JSON.stringify({ agents: v.agents, reportedAt: now }));
  return json({ ok: true, saved: true }, 200, cors);
}
