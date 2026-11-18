// 검사 진행 관리. 브라우저가 내용 하나씩 짧은 요청으로 워커에 보낸다.
// 그래야 워커 실행 시간 제한에 걸리지 않고, 진행 상황도 바로 보여 줄 수 있다.

export const MAX_CONCURRENCY = 3;
export const MAX_CLAIMS = 60;

// 글자가 이보다 적은 장은 글자가 그림 안에 들어 있을 가능성이 커서 그림도 읽는다.
export const IMAGE_TEXT_THRESHOLD = 120;
const MIN_IMAGE_BYTES = 8 * 1024; // 아이콘이나 로고는 읽지 않는다

/**
 * 이 장에서 모델에 보여 줄 그림을 고른다. 읽을 필요가 없으면 null.
 * 장 전체를 그림 한 장으로 내보낸 PPT 를 위한 장치라서 가장 큰 그림 하나만 고른다.
 */
export function pickImage(slide) {
  if ((slide?.text ?? '').trim().length >= IMAGE_TEXT_THRESHOLD) return null;
  const images = (slide?.images ?? []).filter((i) => i?.bytes?.length >= MIN_IMAGE_BYTES);
  if (images.length === 0) return null;
  return images.reduce((a, b) => (b.bytes.length > a.bytes.length ? b : a));
}

const FAILED_TASK = '검사 요청이 실패해서 확인하지 못했어요. 다시 검사하거나 직접 확인해 주세요.';

// items 를 최대 limit 개씩 동시에 처리한다. 중단 신호가 오면 새 일을 시작하지 않는다.
async function pool(items, limit, signal, work) {
  let next = 0;
  const runner = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      await work(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

/**
 * @param {Array<{ slide: number, text: string, notes: string, images?: Array }>} slides parsePptx 결과
 * @param {{ tier1: string[], tier2: string[] }} domains 사용자가 확인한 공식 사이트
 * @param {{ extract: Function, check: Function }} api 워커 호출 함수
 * @param {(event: object) => void} onProgress 진행 상황 알림
 * @param {{ signal?: AbortSignal, imageFor?: (slide: object) => Promise<string|null>, reuse?: { claims: object[], skipped?: number, failedSlides?: number[] } }} options
 *   reuse 를 주면 내용을 다시 뽑지 않고 그 목록을 검사한다
 * @returns {Promise<{ claims: object[], results: object[], elapsedMs: number, skipped: number, stopped: boolean, failedSlides: number[] }>}
 */
export async function runCheck(slides, domains, api, onProgress, options = {}) {
  const { signal, imageFor, reuse } = options;
  const started = Date.now();
  const notify = (event) => {
    try {
      onProgress?.(event);
    } catch {
      // 화면 쪽 오류로 검사가 멈추면 안 된다.
    }
  };

  // 제품 이름이 없는 장도 검색어를 제대로 만들 수 있게, 자료 첫 부분을 주제로 함께 보낸다.
  // 글자가 그림으로만 들어 있는 자료는 발표 노트를 대신 쓴다.
  const joined = (key) => slides.map((s) => (s[key] ?? '').trim()).filter(Boolean).join('\n');
  // 주제는 표지(글자가 있는 첫 장)에서만 가져온다. 여러 장의 문장을 넣으면, 모델이 그 장의 내용을
  // "이미 나온 것"으로 보고 뽑지 않는 일이 생긴다(장 수가 적은 자료에서 실제로 그랬다).
  const cover = slides.find((s) => (s.text ?? '').trim().length >= 4);
  const context = (cover ? cover.text : joined('notes')).trim().slice(0, 300);

  // 1) 장마다 낡을 수 있는 내용을 뽑는다.
  const targets = slides.filter((s) => (s.text ?? '').trim() || (s.notes ?? '').trim() || (imageFor && s.images?.length));
  const bySlide = new Map();
  const failedSlides = [];
  let extracted = 0;
  // 같은 자료를 공식 사이트만 바꿔 다시 검사할 때는 앞에서 뽑은 내용을 그대로 쓴다.
  // 다시 뽑으면 뽑히는 문장이 달라져서, 무엇이 달라졌는지 비교할 수 없다.
  await pool(reuse ? [] : targets, MAX_CONCURRENCY, signal, async (s) => {
    try {
      let imageDataUrl = null;
      if (imageFor) {
        try {
          imageDataUrl = await imageFor(s);
        } catch {
          imageDataUrl = null; // 그림 준비에 실패해도 글자와 노트는 검사한다.
        }
      }
      const out = await api.extract({ slide: s.slide, text: s.text ?? '', notes: s.notes ?? '', imageDataUrl, context: s === cover ? '' : context });
      bySlide.set(s.slide, Array.isArray(out?.claims) ? out.claims : []);
    } catch {
      failedSlides.push(s.slide);
    }
    notify({ phase: 'extract', done: ++extracted, total: targets.length, slide: s.slide });
  });

  let claims;
  let skipped;
  if (reuse) {
    claims = reuse.claims.slice(0, MAX_CLAIMS);
    skipped = reuse.skipped ?? 0;
    failedSlides.push(...(reuse.failedSlides ?? []));
  } else {
    const all = [...bySlide.keys()].sort((a, b) => a - b).flatMap((n) => bySlide.get(n));
    claims = all.slice(0, MAX_CLAIMS);
    skipped = all.length - claims.length;
  }

  // 2) 내용을 하나씩 검사한다.
  const slots = new Array(claims.length).fill(null);
  let checked = 0;
  await pool(claims, MAX_CONCURRENCY, signal, async (claim, i) => {
    let result;
    try {
      result = await api.check({ claim, domains });
      if (!result || typeof result !== 'object') throw new Error('bad result');
    } catch {
      result = { claimId: claim.id, verdict: 'unverified', evidence: [], references: [], suggestion: null, humanTask: FAILED_TASK, reason: 'api_error' };
    }
    slots[i] = result;
    notify({ phase: 'check', done: ++checked, total: claims.length, claim, result });
  });

  const out = {
    claims,
    results: slots.filter(Boolean),
    elapsedMs: Date.now() - started,
    skipped,
    stopped: Boolean(signal?.aborted),
    failedSlides: failedSlides.sort((a, b) => a - b),
  };
  notify({ phase: 'done', ...out });
  return out;
}
