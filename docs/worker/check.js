// docs/worker/check.js — 오탈자 검사기 (/check)
// PDF에서 뽑은 글자 묶음을 받아 오탈자·띄어쓰기·맞춤법 지적 목록(JSON)을 돌려준다.
// 모델 호출은 ask(system, text) 로 주입받는다 (worker.js 의 askGeminiJson, 테스트에선 가짜).

const MAX_TEXT = 6000;

// 누구나 쓰는 공개 앱이라 요금 보호: 한 IP당 1시간에 CHECK_LIMIT 묶음까지 (책 200쪽 ≈ 70묶음)
// 워커 인스턴스 메모리라 완벽하진 않지만 마구 돌리는 건 막는다
export const CHECK_LIMIT = 150;
const WINDOW_MS = 60 * 60 * 1000;
let usage = new Map();
export function _resetCheckLimit() { usage = new Map(); }
function overLimit(ip, now) {
  if (usage.size > 5000) usage = new Map();
  const u = usage.get(ip);
  if (!u || now - u.start > WINDOW_MS) { usage.set(ip, { start: now, n: 1 }); return false; }
  if (u.n >= CHECK_LIMIT) return true;
  u.n++;
  return false;
}

const COMMON = `당신은 한국어 교정 전문가입니다. 출판·송고 직전 원고에서 오탈자, 띄어쓰기, 맞춤법 오류만 찾습니다.

[입력]
- 글은 PDF에서 뽑은 것입니다. "[[쪽 N]]" 줄은 그 아래 글이 N쪽이라는 표시이니, 지적마다 그 쪽 번호를 page 로 적으세요.
- 줄바꿈(\\n)은 인쇄할 때 생긴 줄바꿈입니다. 줄바꿈 자리의 띄어쓰기는 절대 판단하지 마세요(붙었는지 띄었는지 알 수 없습니다).

[규칙]
- 문장 다듬기, 윤문, 문체·어감 제안은 하지 않습니다. 틀린 것만 지적합니다.
- 지명·인명·가게·단체 이름 같은 고유명사가 틀렸는지 확신이 없으면 고치지 말고 unsure 를 true 로, right 는 빈칸("")으로 두세요.
- wrong 은 원문에서 글자 그대로 복사한 짧은 구절입니다. 같은 말이 여러 번 나와도 위치가 정해지도록 앞뒤 한두 어절을 포함하세요. 줄바꿈은 넣지 마세요.
- right 는 wrong 구절 전체를 고친 형태입니다.
- reason 은 짧게(예: "의존명사 띄어쓰기", "맞춤법: 며칠").
- 오류가 없으면 findings 를 [] 로 둡니다.

[줄에서 잘린 단어]
- 인쇄 줄바꿈이 한 단어(어절) 한가운데를 자른 곳이 있으면, 그 어절을 붙인 형태로 joins 에 적습니다. 예: "마음\\n을" → "마음을", "내\\n년에도" → "내년에도". 어절 사이에서 줄이 바뀐 곳은 적지 않습니다.

[출력] 아래 JSON 객체만 출력합니다. 다른 말은 쓰지 않습니다.
{"findings": [{"page": 1, "wrong": "...", "right": "...", "reason": "...", "unsure": false}], "joins": ["마음을"]}`;

const MODE_NOTES = {
  article: `

[원고 종류: 신문기사]
- 표준 맞춤법·띄어쓰기 규정대로 엄격하게 봅니다.`,
  book: `

[원고 종류: 책 원고]
- 따옴표 안 대사의 구어체, 사투리, 인물이 일부러 쓰는 말투는 오류로 보지 않습니다.
- 지문(서술 부분)은 표준 맞춤법·띄어쓰기대로 봅니다.`,
};

export function buildCheckPrompt(mode) {
  return COMMON + (MODE_NOTES[mode] || MODE_NOTES.article);
}

function parseRaw(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch { return undefined; }
}

// 줄에서 잘린 단어 목록 (문자열만)
export function parseJoins(raw) {
  const obj = parseRaw(raw);
  if (!obj || !Array.isArray(obj.joins)) return [];
  return obj.joins.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim());
}

export function parseFindings(raw) {
  const obj = parseRaw(raw);
  const arr = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.findings) ? obj.findings : null);
  if (!arr) return null;
  const out = [];
  for (const f of arr) {
    if (!f || typeof f.wrong !== 'string' || !f.wrong.trim()) continue;
    const item = {
      page: Number(f.page) || 0,
      wrong: f.wrong,
      right: typeof f.right === 'string' ? f.right : '',
      reason: typeof f.reason === 'string' ? f.reason : '',
      unsure: f.unsure === true,
    };
    if (!item.unsure && item.wrong === item.right) continue;
    out.push(item);
  }
  return out;
}

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

export async function handleCheck(request, env, cors, ask) {
  if (request.method !== 'POST') return reply({ error: 'method not allowed' }, 405, cors);
  const body = await request.json().catch(() => ({}));
  const mode = body.mode;
  const text = typeof body.text === 'string' ? body.text : '';
  if (!MODE_NOTES[mode] || !text.trim()) return reply({ error: 'mode(article|book)와 text가 필요해요' }, 400, cors);
  if (text.length > MAX_TEXT) return reply({ error: `글자가 너무 많아요 (최대 ${MAX_TEXT}자)` }, 413, cors);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (overLimit(ip, Date.now())) return reply({ error: 'limit', detail: '1시간에 검사할 수 있는 양을 다 썼어요. 잠시 뒤에 다시 해 주세요.' }, 429, cors);
  let raw;
  try { raw = await ask(buildCheckPrompt(mode), text); } catch (e) {
    return reply({ error: 'model', detail: String((e && e.message) || e) }, 502, cors);
  }
  const findings = parseFindings(raw);
  if (!findings) return reply({ error: 'parse' }, 502, cors);
  return reply({ findings, joins: parseJoins(raw) }, 200, cors);
}
