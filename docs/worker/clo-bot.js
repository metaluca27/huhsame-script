// docs/worker/clo-bot.js
// 클로 텔레그램 봇 — 루카 전용. 두뇌는 클로드 관리형 에이전트(Managed Agents).
//   POST /clo/telegram      : 텔레그램 웹훅. 루카 메시지를 클로 세션에 넘기고 바로 200.
//   POST /clo/agent-webhook : 관리형 에이전트 웹훅(session.status_idled). 이번 턴 답을 텔레그램으로 보냄.
// KV: env.MERGE_RANK 를 같이 쓰고 키는 'clo:session'(지금 대화방), 'clo:delivered'(마지막으로 전달한 idle 이벤트).
// 시크릿: ANTHROPIC_API_KEY, CLO_TELEGRAM_BOT_TOKEN, CLO_TELEGRAM_SECRET, CLO_AGENT_WEBHOOK_SECRET, CLO_OWNER_CHAT_ID
// vars(wrangler.toml): CLO_AGENT_ID, CLO_ENVIRONMENT_ID

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
