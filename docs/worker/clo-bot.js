// docs/worker/clo-bot.js
// 클로 텔레그램 봇 — 루카 전용. 두뇌는 클로드 관리형 에이전트(Managed Agents).
//   POST /clo/telegram      : 텔레그램 웹훅. 루카 메시지를 클로 세션에 넘기고 바로 200.
//   POST /clo/agent-webhook : 관리형 에이전트 웹훅(session.status_idled). 이번 턴 답을 텔레그램으로 보냄.
// KV: env.MERGE_RANK 를 같이 쓰고 키는 'clo:session'(지금 대화방), 'clo:delivered'(마지막으로 전달한 idle 이벤트).
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

// 이벤트를 최신순(desc)으로 받아 이번 턴을 정리한다.
// 마지막 user.message 를 만나면 멈춘다. idle 은 가장 최근 것, 답은 그 사이 agent.message 를 시간순으로 이어 붙인다.
export async function summarizeLatestTurn(eventsDesc) {
  let idle = null;
  const texts = [];
  for await (const ev of eventsDesc) {
    if (ev.type === 'user.message') break;
    if (ev.type === 'session.status_idle' && !idle) idle = ev;
    if (ev.type === 'agent.message') {
      const t = ev.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (t) texts.unshift(t);
    }
  }
  return { idle, text: texts.join('\n\n') };
}

const ok = () => new Response('ok', { status: 200 });

export function makeTelegram(token, fetchFn = fetch) {
  const call = (method, body) => fetchFn(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
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
    client: deps.client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
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

  const { client, telegram } = depsFor(env, deps);
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text) { await telegram.send(chatId, MSG.textOnly); return ok(); }
  if (text === '/새대화' || text === '/new') {
    await newSession(env, client);
    await telegram.send(chatId, MSG.newSession);
    return ok();
  }

  const sessionId = (await env.MERGE_RANK.get(SESSION_KEY)) || (await newSession(env, client));
  try {
    await client.beta.sessions.events.send(sessionId, {
      events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
    });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) { await telegram.send(chatId, MSG.cantSend); return ok(); }
    throw e;
  }
  await telegram.typing(chatId);
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

  const turn = await summarizeLatestTurn(client.beta.sessions.events.list(sessionId, { order: 'desc' }));
  if (!turn.idle) return noContent();
  if ((await env.MERGE_RANK.get(DELIVERED_KEY)) === turn.idle.id) return noContent();
  await env.MERGE_RANK.put(DELIVERED_KEY, turn.idle.id);

  const chatId = env.CLO_OWNER_CHAT_ID;
  const reason = turn.idle.stop_reason && turn.idle.stop_reason.type;
  if (reason === 'requires_action') {
    // 아무도 지켜보지 않는 봇이라 확인이 필요한 호출은 전부 거절한다
    await client.beta.sessions.events.send(sessionId, {
      events: turn.idle.stop_reason.event_ids.map((id) => ({ type: 'user.tool_confirmation', tool_use_id: id, result: 'deny' })),
    });
    await telegram.send(chatId, MSG.denied);
  } else if (reason === 'budget_reached') {
    await telegram.send(chatId, MSG.budget);
  } else if (reason === 'retries_exhausted') {
    await telegram.send(chatId, MSG.failed);
  } else if (reason === 'refusal') {
    await telegram.send(chatId, MSG.refusal);
  } else {
    await telegram.send(chatId, turn.text || MSG.empty);
  }
  return noContent();
}
