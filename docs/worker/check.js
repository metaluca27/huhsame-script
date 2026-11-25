// docs/worker/check.js — 오탈자 검사기 (/check)
// PDF에서 뽑은 글자 묶음을 받아 오탈자·띄어쓰기·맞춤법 지적 목록(JSON)을 돌려준다.
// 모델 호출은 ask(system, text) 로 주입받는다 (worker.js 의 askGeminiJson, 테스트에선 가짜).

const MAX_TEXT = 6000;

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
- 오류가 없으면 [] 를 출력합니다.

[출력] JSON 배열만 출력합니다. 다른 말은 쓰지 않습니다.
[{"page": 1, "wrong": "...", "right": "...", "reason": "...", "unsure": false}]`;

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

export function parseFindings(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  let arr;
  try { arr = JSON.parse(s); } catch { return null; }
  if (!Array.isArray(arr)) return null;
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
  let raw;
  try { raw = await ask(buildCheckPrompt(mode), text); } catch (e) {
    return reply({ error: 'model', detail: String((e && e.message) || e) }, 502, cors);
  }
  const findings = parseFindings(raw);
  if (!findings) return reply({ error: 'parse' }, 502, cors);
  return reply({ findings }, 200, cors);
}
