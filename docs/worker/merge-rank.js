// docs/worker/merge-rank.js
// 다락방 합체 게임 랭킹 — GET /merge/rank(상위 100), POST /merge/rank(닉네임 등록)
// KV: env.MERGE_RANK, 키 'top' 하나에 [{ name, score, combo, at }] 저장.

const TOP_N = 100;
const NAME_MAX = 10;
const MAX_MULT = 3;
const LEGEND_BONUS = 100;
// landing/merge/merge-core.js 의 STAGES[i].score 와 동일해야 한다(테스트로 확인).
const STAGE_SCORES = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

export function scoreCap(stages) {
  let sum = 0;
  for (let i = 0; i < STAGE_SCORES.length; i++) sum += (stages[i] || 0) * STAGE_SCORES[i];
  return sum * MAX_MULT + (stages[10] || 0) * LEGEND_BONUS;
}

function isInt(v) { return typeof v === 'number' && Number.isInteger(v); }

export function validateSubmission(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'bad_body' };
  const name = String(body.name == null ? '' : body.name).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (name.length < 1 || name.length > NAME_MAX) return { ok: false, error: 'bad_name' };
  const { score, combo, merges, stages } = body;
  if (!isInt(score) || score < 0) return { ok: false, error: 'bad_score' };
  if (!isInt(combo) || combo < 0) return { ok: false, error: 'bad_combo' };
  if (!isInt(merges) || merges < 0) return { ok: false, error: 'bad_merges' };
  if (!Array.isArray(stages) || stages.length !== STAGE_SCORES.length || !stages.every(n => isInt(n) && n >= 0)) {
    return { ok: false, error: 'bad_stages' };
  }
  if (stages.reduce((a, b) => a + b, 0) !== merges) return { ok: false, error: 'merges_mismatch' };
  if (combo > merges) return { ok: false, error: 'combo_over_merges' };
  if (score > scoreCap(stages)) return { ok: false, error: 'score_over_cap' };
  return { ok: true, entry: { name, score, combo } };
}

export function insertTop(top, entry, now) {
  const list = top.slice();
  let idx = list.length;
  for (let i = 0; i < list.length; i++) { if (entry.score > list[i].score) { idx = i; break; } }
  if (idx >= TOP_N) return { top: list.slice(0, TOP_N), rank: null };
  list.splice(idx, 0, { name: entry.name, score: entry.score, combo: entry.combo, at: now });
  return { top: list.slice(0, TOP_N), rank: idx + 1 };
}

// 같은 IP 1초 1회 — 워커 인스턴스 메모리(최선 노력, 인스턴스 간 공유 안 됨)
let lastByIp = new Map();
export function _resetRateLimit() { lastByIp = new Map(); }
function rateLimited(ip, now) {
  const last = lastByIp.get(ip) || 0;
  if (now - last < 1000) return true;
  lastByIp.set(ip, now);
  if (lastByIp.size > 5000) lastByIp = new Map();
  return false;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });
}

async function readTop(env) {
  const v = await env.MERGE_RANK.get('top', 'json');
  return Array.isArray(v) ? v : [];
}

export async function handleMergeRank(request, env, cors) {
  if (!env.MERGE_RANK) return json({ ok: false, error: 'kv_missing' }, 500, cors);
  const now = Date.now();
  if (request.method === 'GET') {
    const top = await readTop(env);
    return json({ ok: true, top, updatedAt: now }, 200, cors);
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimited(ip, now)) return json({ ok: false, error: 'too_fast' }, 429, cors);
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400, cors); }
  const v = validateSubmission(body);
  if (!v.ok) return json({ ok: false, error: v.error }, 400, cors);
  const top = await readTop(env);
  const r = insertTop(top, v.entry, now);
  if (r.rank == null) {
    const cutoff = top.length ? top[top.length - 1].score + 1 : 0;
    return json({ ok: true, ranked: false, cutoff }, 200, cors);
  }
  await env.MERGE_RANK.put('top', JSON.stringify(r.top));
  return json({ ok: true, ranked: true, rank: r.rank }, 200, cors);
}
