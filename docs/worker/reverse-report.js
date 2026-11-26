// docs/worker/reverse-report.js — 리버스 비즈니스 해부기 (/reverse)
// 모델에 보낼 프롬프트·입력을 만들고, 모델 답(JSON)을 믿을 수 있는 리포트 모양으로 정리한다.
// 순수 함수만 둔다. 모델 호출·페이지 가져오기는 다른 파일에서.

export const MAX_MODEL_TEXT = 20000; // 모델에 보내는 글자 상한 (페이지 2장 합계)

const BASES = ['seen', 'guess', 'unknown'];
const SECTION_KEYS = ['who', 'price', 'flow', 'why'];

const COMMON = `당신은 사업 모델 분석가입니다. 공개된 서비스 사이트를 보고 "누가 사는지(who), 얼마인지(price), 어떻게 팔리는지(flow), 왜 돈을 내는지(why)"를 정리합니다. 읽는 사람은 부업을 하는 사람, 1인 CEO입니다.

[규칙]
- 모든 글은 해요체 한국어로 씁니다.
- 항목마다 basis 를 붙입니다.
  - seen: 페이지 글자에 실제로 적혀 있는 것만. 
  - guess: 페이지에 근거가 있는 짐작. 근거를 reason 에 한 줄로 적습니다.
  - unknown: 알 수 없는 것(매출, 환불률, 가입자 수 등). 짐작으로 채우지 말고 unknown 으로 둡니다.
- 가격·숫자는 지어내지 마세요. 확인 안 되면 쓰지 않거나 unknown 으로 둡니다.
- plans(요금제 표)에는 페이지에 적힌 가격만 넣습니다. 없으면 [] 로 둡니다.
- ideas 는 부업러·1인 CEO 가 "나라면 이렇게" 바꿔 볼 3줄입니다. 예: 한국 대상으로 바꾸기, 가격 조정, 결제 단계 줄이기.
- highlight 는 가장 눈여겨볼 요금제나 장치 하나입니다. 모르면 "" 로 둡니다.

[출력] 아래 JSON 객체만 출력합니다. 다른 말은 쓰지 않습니다.
{"summary": "한두 문장 요약",
 "sections": {"who": [{"text": "...", "basis": "seen|guess|unknown", "reason": "guess일 때 근거, 아니면 \\"\\""}], "price": [], "flow": [], "why": []},
 "plans": [{"name": "Pro", "price": "$29/월", "basis": "seen"}],
 "highlight": "...",
 "ideas": ["...", "...", "..."]}`;

const URL_NOTE = `

[이번 입력: 주소만]
- 직접 읽은 글자가 없고 주소(와 알려진 일반 지식)뿐입니다. 그래서 모든 항목은 guess 또는 unknown 이어야 하고 seen 은 쓸 수 없습니다.
- plans 의 basis 도 guess 만 씁니다. 확실하지 않은 가격은 넣지 마세요.`;

const PAGE_NOTE = `

[이번 입력: 페이지 글자]
- 아래에 "[페이지 N]" 으로 시작하는 글이 실제로 읽어 온 페이지입니다. 그 글자에 있는 것만 seen 입니다.`;

export function buildPrompt(mode) {
  return COMMON + (mode === 'url' ? URL_NOTE : PAGE_NOTE);
}

// 몫보다 긴 글은 앞 25%(소개) + 뒤쪽에서 가격 표시가 가장 많이 몰린 연속 구간으로 채운다.
// 요금표가 홈 끝쪽에 있는 사이트를 위해서. 가격 표시가 하나도 없으면 그냥 앞에서 자른다.
// 위치를 한 번 훑고(정규식 1회) 500자 걸음으로 창을 미는 두 포인터 방식이라 O(n) — 워커 CPU 한도용.
// 가격 표시는 숫자에 붙은 것만 센다 (회원·지원·원하는·2024년 같은 한글 속 원/월/년 오인 방지) + 요금 낱말
const PRICE_TOKEN = /\d[\d,.]*\s*(?:원|만\s*원|달러)|[$€£₩]\s*\d|\d\s*\/\s*(?:mo|month|yr|year|월|년)|(?:월|연)\s*\d|pricing|요금제?|price/gi;
const GAP_MARK = '\n…(중략)…\n';
const WINDOW_STEP = 500;
export function fitText(text, budget) {
  const s = String(text || '');
  if (s.length <= budget) return s;
  const headLen = Math.floor(budget * 0.25);
  const winLen = budget - headLen - GAP_MARK.length;
  if (winLen <= 0) return s.slice(0, budget);
  const pos = [];
  PRICE_TOKEN.lastIndex = headLen;
  for (let m; (m = PRICE_TOKEN.exec(s));) pos.push(m.index);
  if (!pos.length) return s.slice(0, budget);
  const lastStart = s.length - winLen;
  let best = -1;
  let bestCount = 0;
  let lo = 0;
  let hi = 0;
  for (let start = headLen; ; start = Math.min(start + WINDOW_STEP, lastStart)) {
    while (lo < pos.length && pos[lo] < start) lo++;
    while (hi < pos.length && pos[hi] < start + winLen) hi++;
    if (hi - lo > bestCount) { bestCount = hi - lo; best = start; }
    if (start >= lastStart) break;
  }
  if (best < 0) return s.slice(0, budget);
  return s.slice(0, headLen) + GAP_MARK + s.slice(best, best + winLen);
}

// 페이지 여러 장을 한 덩어리 글로 (합쳐서 MAX_MODEL_TEXT 이하).
// 1장이면 전부, 2장이면 첫 장 8000자 + 요금제 장 12000자 (홈 끝쪽 요금표가 잘리지 않게 요금제 장에 더 준다)
const TWO_PAGE_SHARE = [8000, 12000];
export function buildPageInput(pages) {
  const list = Array.isArray(pages) ? pages : [];
  if (!list.length) return '';
  const sep = '\n\n';
  const shares = list.length === 1 ? [MAX_MODEL_TEXT]
    : list.length === 2 ? [TWO_PAGE_SHARE[0], TWO_PAGE_SHARE[1] - sep.length]
    : list.map(() => Math.floor((MAX_MODEL_TEXT - sep.length * (list.length - 1)) / list.length));
  const blocks = list.map((p, i) => {
    const head = `[페이지 ${i + 1}] ${p.url}\n${p.title}\n`;
    return (head + fitText(String(p.text || ''), Math.max(0, shares[i] - head.length))).slice(0, shares[i]);
  });
  return blocks.join(sep).slice(0, MAX_MODEL_TEXT);
}

// check.js 의 parseRaw 와 같은 방식: 울타리(```json) 제거 → JSON.parse
function parseRaw(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch { return undefined; }
}

const str = (v) => (typeof v === 'string' ? v : '');

function cleanItems(arr, partial) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const it of arr) {
    if (!it || typeof it.text !== 'string' || !it.text.trim()) continue;
    let basis = BASES.includes(it.basis) ? it.basis : 'unknown';
    if (partial && basis === 'seen') basis = 'guess'; // 직접 못 읽었으면 "봤다"는 없다
    out.push({ text: it.text, basis, reason: str(it.reason) });
  }
  return out;
}

function cleanPlans(arr, partial) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const p of arr) {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) continue;
    if (p.basis !== 'seen' && p.basis !== 'guess') continue; // 근거 표시 없는 가격은 버림
    out.push({ name: p.name, price: str(p.price), basis: partial ? 'guess' : p.basis });
  }
  return out;
}

export function parseReport(raw, opts) {
  const obj = parseRaw(raw);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) return null;
  const partial = opts.partial === true;
  const src = obj.sections && typeof obj.sections === 'object' ? obj.sections : {};
  const sections = {};
  for (const k of SECTION_KEYS) sections[k] = cleanItems(src[k], partial);
  const ideas = (Array.isArray(obj.ideas) ? obj.ideas : [])
    .filter((x) => typeof x === 'string' && x.trim()).slice(0, 3);
  return {
    url: opts.url,
    summary: obj.summary,
    sections,
    plans: cleanPlans(obj.plans, partial),
    highlight: str(obj.highlight),
    ideas,
    partial,
    pages: opts.pages,
    createdAt: opts.now,
  };
}
