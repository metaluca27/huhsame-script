// docs/worker/clo-bot.js
// 클로 텔레그램 봇 — 루카 전용. 두뇌는 클로드 관리형 에이전트(Managed Agents).
//   POST /clo/telegram      : 텔레그램 웹훅. 루카 메시지를 클로 세션에 넘기고 바로 200.
//   POST /clo/agent-webhook : 관리형 에이전트 웹훅(session.status_idled). 아직 안 보낸 턴의 답을 오래된 순으로 텔레그램에 보냄.
// KV: env.MERGE_RANK 를 같이 쓰고 키는 'clo:session'(지금 대화방), 'clo:delivered'(마지막으로 전달을 끝낸 idle 이벤트, 전송이 다 성공한 뒤에만 기록).
// 시크릿: ANTHROPIC_API_KEY, CLO_TELEGRAM_BOT_TOKEN, CLO_TELEGRAM_SECRET, CLO_AGENT_WEBHOOK_SECRET, CLO_OWNER_CHAT_ID
// vars(wrangler.toml): CLO_AGENT_ID, CLO_ENVIRONMENT_ID

import Anthropic from '@anthropic-ai/sdk';

const SESSION_KEY = 'clo:session';
const DELIVERED_KEY = 'clo:delivered';
const BUDGET_CENTS = '300';   // 대화방 하나당 $3 (정가 기준 상한)

export const MSG = {
  newSession: '새 대화를 시작했어요. 이전 얘기는 잊었어요!',
  textOnly: '아직은 글만 읽을 수 있어요.',
  cantSend: '클로한테 전달을 못 했어요. 대화방 예산($3)을 다 썼을 수 있어요. /새대화 로 새로 시작해 보세요.',
  budget: '이 대화방 예산($3)을 다 썼어요. /새대화 로 새로 시작해 주세요.',
  denied: '클로가 확인이 필요한 작업을 하려다 멈췄어요. 그 작업은 건너뛰고 계속할게요.',
  failed: '클로 쪽에 오류가 나서 답을 못 했어요. 잠시 뒤 다시 말 걸어 주세요.',
  refusal: '이 요청에는 클로가 답할 수 없대요.',
  empty: '(클로가 말없이 작업만 했어요)',
};

const TG_LIMIT = 4000;   // 텔레그램 한 메시지 4096자 제한보다 조금 작게

export function splitForTelegram(text, limit = TG_LIMIT) {
  const parts = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  if (rest) parts.push(rest);
  return parts;
}

// 이벤트를 최신순(desc)으로 받아 아직 안 보낸 턴을 모은다.
// 턴의 기준은 session.status_idle 이다. 각 idle 뒤(= 더 오래된 쪽)에 나온 agent.message 가 그 턴의 답이고,
// 다음(더 오래된) idle 을 만나면 그 턴은 끝난다. user.message 는 경계가 아니다
// (루카가 앞 질문의 답을 기다리는 중에 또 말해도 앞 턴의 답이 유실되지 않게).
// 이미 보낸 idle(deliveredIdleId) 앞에서 멈추고, maxTurns 개를 모으면 더 읽지 않는다. 결과는 오래된 턴부터.
export async function collectUndeliveredTurns(eventsDesc, deliveredIdleId, maxTurns = 5) {
  const turns = [];   // 최신 → 과거 순으로 쌓는다
  let cur = null;
  const finish = () => { if (cur) { cur.text = cur.texts.reverse().join('\n\n'); delete cur.texts; } };
  for await (const ev of eventsDesc) {
    if (ev.type === 'session.status_idle') {
      if (ev.id === deliveredIdleId) break;
      finish();
      if (turns.length >= maxTurns) { cur = null; break; }
      cur = { idle: ev, texts: [] };
      turns.push(cur);
    } else if (cur && ev.type === 'agent.message') {
      const t = ev.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (t) cur.texts.push(t);
    }
  }
  finish();
  return turns.reverse();
}

const ok = () => new Response('ok', { status: 200 });

export function makeTelegram(token, fetchFn = fetch) {
  const call = async (method, body) => {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) console.log('telegram ' + method + ' failed', res.status, await res.text());
    return res;
  };
  return {
    async send(chatId, text) {
      for (const part of splitForTelegram(text)) await call('sendMessage', { chat_id: chatId, text: part });
    },
    async typing(chatId) { await call('sendChatAction', { chat_id: chatId, action: 'typing' }); },
  };
}

// 테스트에서는 deps 로 가짜를 넣는다
function depsFor(env, deps = {}) {
  return {
    // 느린 API 가 요청을 몇 분씩 붙잡지 않게 재시도 1번, 15초 제한
    client: deps.client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 15000 }),
    telegram: deps.telegram || makeTelegram(env.CLO_TELEGRAM_BOT_TOKEN),
  };
}

async function newSession(env, client) {
  const s = await client.beta.sessions.create({
    agent: env.CLO_AGENT_ID,
    environment_id: env.CLO_ENVIRONMENT_ID,
    title: '클로 텔레그램',
    budget: { type: 'limit', max_list_cost: { amount: BUDGET_CENTS, currency: 'USD' } },
  });
  await env.MERGE_RANK.put(SESSION_KEY, s.id);
  return s.id;
}

export async function handleCloTelegram(request, env, deps) {
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.CLO_TELEGRAM_SECRET) {
    return new Response('forbidden', { status: 401 });
  }
  let update;
  try { update = await request.json(); } catch (e) { return ok(); }
  const msg = update && update.message;
  if (!msg || !msg.from || String(msg.from.id) !== String(env.CLO_OWNER_CHAT_ID)) return ok();

  const chatId = msg.chat.id;
  let telegram;
  // 텔레그램은 2xx 가 아니면 같은 메시지를 다시 보내므로(중복 전달·중복 세션), 여기서는 절대 500 을 내지 않는다
  try {
    const d = depsFor(env, deps);
    const client = d.client;
    telegram = d.telegram;
    const text = (msg.text || '').trim();
    if (!text) { await telegram.send(chatId, MSG.textOnly); return ok(); }
    if (text === '/새대화' || text === '/new') {
      const old = await env.MERGE_RANK.get(SESSION_KEY);
      if (old) {
        // 돌고 있는 옛 대화는 멈춘다 (실패해도 새 대화는 만든다)
        try { await client.beta.sessions.events.send(old, { events: [{ type: 'user.interrupt' }] }); } catch (e) { /* 무시 */ }
      }
      await newSession(env, client);
      await telegram.send(chatId, MSG.newSession);
      return ok();
    }

    const sessionId = (await env.MERGE_RANK.get(SESSION_KEY)) || (await newSession(env, client));
    await client.beta.sessions.events.send(sessionId, {
      events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
    });
    await telegram.typing(chatId);
  } catch (e) {
    console.log('clo telegram error', String((e && e.message) || e));
    try { await (telegram || makeTelegram(env.CLO_TELEGRAM_BOT_TOKEN)).send(chatId, MSG.cantSend); } catch (e2) { /* 무시 */ }
  }
  return ok();
}

const noContent = () => new Response(null, { status: 204 });

export async function handleCloAgentWebhook(request, env, deps) {
  const { client, telegram } = depsFor(env, deps);
  const body = await request.text();   // 서명 검증은 받은 그대로의 글자로 해야 한다
  let event;
  try {
    event = client.beta.webhooks.unwrap(body, {
      headers: Object.fromEntries(request.headers), key: env.CLO_AGENT_WEBHOOK_SECRET,
    });
  } catch (e) {
    return new Response('invalid signature', { status: 401 });
  }
  if (!event.data || event.data.type !== 'session.status_idled') return noContent();
  const sessionId = await env.MERGE_RANK.get(SESSION_KEY);
  if (event.data.id !== sessionId) return noContent();

  const turns = await collectUndeliveredTurns(
    client.beta.sessions.events.list(sessionId, { order: 'desc' }),
    await env.MERGE_RANK.get(DELIVERED_KEY),
  );
  if (!turns.length) return noContent();

  const chatId = env.CLO_OWNER_CHAT_ID;
  const newest = turns[turns.length - 1];
  // 하나라도 던지면 그대로 던진다(라우터가 500 → 앤트로픽이 재시도). 전달 표시는 전부 성공한 뒤에만 남긴다.
  for (const turn of turns) {
    const reason = turn.idle.stop_reason && turn.idle.stop_reason.type;
    if (turn.text) await telegram.send(chatId, turn.text);
    if (reason === 'requires_action') {
      // 더 오래된 requires_action 은 이미 처리된 것이라 글만 보낸다
      if (turn === newest) {
        // 이 에이전트엔 커스텀 도구가 없어서 event_ids 는 agent.tool_use / agent.mcp_tool_use 뿐이다.
        // (커스텀 도구였다면 user.custom_tool_result 를 보내야 한다.)
        // 아무도 지켜보지 않는 봇이라 확인이 필요한 호출은 전부 거절한다
        await client.beta.sessions.events.send(sessionId, {
          events: turn.idle.stop_reason.event_ids.map((id) => ({ type: 'user.tool_confirmation', tool_use_id: id, result: 'deny' })),
        });
        await telegram.send(chatId, MSG.denied);
      }
    } else if (reason === 'budget_reached') {
      await telegram.send(chatId, MSG.budget);
    } else if (reason === 'retries_exhausted') {
      await telegram.send(chatId, MSG.failed);
    } else if (reason === 'refusal') {
      await telegram.send(chatId, MSG.refusal);
    } else if (!turn.text) {
      await telegram.send(chatId, MSG.empty);
    }
  }
  await env.MERGE_RANK.put(DELIVERED_KEY, newest.idle.id);
  return noContent();
}
