# 리버스 비즈니스 해부기 (토스 미니앱 17호) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트 주소 하나를 넣으면 "누가 사요 / 얼마 받아요 / 어떻게 팔아요 / 왜 돈을 내요 + 내가 한다면 3줄" 리포트를 관찰·추정·모름으로 구분해 보여주는 토스 미니앱과, 그 뒤에서 사이트를 읽는 공용 워커 `/reverse`를 만든다.

**Architecture:** 공용 워커 `small-recipe-9345`에 `POST /reverse`를 붙인다. 워커는 페이지를 직접 읽고(①), 글자가 너무 적을 때만 Gemini의 주소 읽기로 보충하며(②, 결과는 전부 "추정"으로 강제), 막힌 사이트는 우회하지 않는다. 판단 로직은 순수 함수 파일 3개로 나눠 node 테스트로 고정하고, 실제 네트워크·HTMLRewriter는 주입받는다. 앱은 구독료 점검(`miniapp-subdiet`)과 같은 구조다. 루트 HTML 원본 한 벌을 `sync.mjs`로 미니앱 index.html로 바꾼다.

**Tech Stack:** Cloudflare Workers(무료 요금제 가정, HTMLRewriter, KV `MERGE_RANK`), Gemini `GEMINI_MODEL`(worker.js 상수), node:test, 앱인토스 web-framework 3.1.1 + vite.

**Spec:** `docs/superpowers/specs/2026-11-26-reverse-business-toss-design.md` (2026-11-26 루카 승인)

## Global Constraints

- 원문(가져온 HTML·글자)은 절대 응답에 넣지 않는다. 응답은 `{ report }` 또는 `{ error, detail }`뿐이다.
- 받을 수 있는 주소는 `http`/`https`만. IP 주소를 직접 쓴 주소, `localhost`, `.local`/`.internal`은 거절한다. 리다이렉트는 3번까지 따라가고 매번 같은 검사를 한다. 가져오기 8초, 크기 500KB로 상한을 둔다.
- 막힌 경우(403·401·429·5xx, 봇 확인 화면, 로그인 화면)는 ②로 넘기지 않고 `blocked`로 끝낸다.
- ②로 넘어가는 조건: 정상 응답(200)인데 뽑은 글자가 `MIN_TEXT = 400`자 미만일 때. ② 결과의 모든 항목은 `basis: "guess"`로 강제하고 `partial: true`로 표시한다.
- 요금제 페이지 추가 읽기: 같은 호스트의 요금제 링크 1장만. 주소 하나당 최대 2장.
- 하루 상한: 워커 전체 `REVERSE_DAILY_CAP = 100`회(KV `rev:count:<YYYY-MM-DD>`), 기기당 하루 3회(화면에서 계산, 성공했을 때만 차감). 같은 날 같은 주소는 캐시 `rev:cache:<YYYY-MM-DD>:<정규화 주소>`를 다시 쓰고, 횟수에서 빼지 않는다.
- KV 쓰기는 분석 1번에 최대 2번(횟수 + 캐시). 캐시 적중 시 쓰기는 0번.
- `/reverse`는 Origin이 `^https://[a-z0-9-]+\.(private-)?(apps|web)\.tossmini\.com$` 이거나 `http://localhost:<포트>`일 때만 받는다. 그 외는 403.
- 미니앱 밖으로 나가는 링크 금지. 추천 사이트 주소는 글자로만 보여준다. `sync.mjs`가 `href|src="https?://"`를 찾으면 빌드를 멈춘다.
- 배너 광고는 스크롤되는 리포트 화면 맨 아래에만. 진입 직후 전면 광고 금지.
- 모든 화면 문구는 해요체 한국어.
- 미니앱 작업 폴더는 `C:\Users\atlia\Documents\metaluca-fresh`뿐이다. 다른 클론 폴더에서 빌드하지 않는다. 빌드 전에 `pwd`로 경로를 확인한다.
- appName, 한글·영어 앱 이름, 카테고리는 루카가 정한다. 정하기 전까지 appName 자리는 `reverse-lab`(가칭)으로 두고, 콘솔 등록 전에 바꾼다.

## Review Focus

1. 가격이 "문의", 원화, 연간 가격만 있는 사이트: 요금제 표가 비거나 "모름"으로 나와야 하고, AI가 월 가격을 지어내면 안 된다. → Task 2의 `parseReport` 테스트(plans 항목에 basis가 없으면 버림)와 프롬프트 규칙.
2. 같은 주소인데 끝 `/`, `#`, `utm_*`, 대소문자 호스트만 다른 경우: 같은 캐시를 써야 한다. → Task 1의 `normalizeUrl` 테스트.
3. AI가 basis에 `"seen"`/`"guess"`/`"unknown"` 밖의 값을 넣거나 칸을 빼먹은 경우: 화면이 깨지지 말고 `unknown`으로 정리돼야 한다. → Task 2 테스트.
4. 분석 실패(차단·시간 초과·네트워크 끊김·워커 429): 기기 하루 횟수가 줄면 안 되고, 원인별 한국어 안내가 나와야 한다. → Task 6의 `consumeQuota`는 성공 때만 부른다는 테스트와 `errorMessage` 테스트.
5. 500KB를 넘는 큰 페이지와 글자가 엄청 많은 페이지: 워커가 죽지 말고 잘라서 분석해야 한다. → Task 3 테스트(모델에 넘기는 글자 ≤ `MAX_MODEL_TEXT = 20000`), Task 4 스모크 테스트.

---

## 파일 구조

**워커** — `C:\Users\atlia\Desktop\huhsame-script\docs\worker\`
- `reverse-url.js` (새 파일): 주소 검사·정규화, Origin 허용, 요금제 링크 찾기, 차단 화면 판정. 순수 함수만.
- `reverse-report.js` (새 파일): 프롬프트, AI 답 → 리포트 정리. 순수 함수만.
- `reverse.js` (새 파일): `handleReverse` 흐름(Origin → 주소 → 캐시 → 상한 → 읽기 → ①/② → 저장). 네트워크·AI·KV는 주입받는다.
- `reverse-fetch.js` (새 파일): 실제 `fetchPage`(리다이렉트 검사, 시간·크기 상한, HTMLRewriter). 워커에서만 돌아서 스모크 테스트로 확인한다.
- `reverse.test.mjs` (새 파일): 위 세 순수 파일과 handleReverse 테스트.
- `worker.js` (고침): import, `/reverse` 경로, `askGeminiUrl` 추가, 맨 위 주석 목록에 한 줄.

**앱** — `C:\Users\atlia\Documents\metaluca-fresh\`
- `reverse-core.js` (새 파일, 클래식 스크립트 + `module.exports`): 기기 하루 횟수, 저장 목록, 공유 문구, 오류 문구, basis 꼬리표.
- `reverse-samples.js` (새 파일): 추천 사이트 리포트(미리 만든 것).
- `reverse-business.html` (새 파일): 화면 원본(홈, 해부 중, 리포트, 내 리포트, 오류).
- `test/reverse.test.js` (새 파일).
- `miniapp-reverse/` (새 폴더): `package.json`, `apps-in-toss.config.ts`, `sync.mjs`, `src/ait-bridge.js`, `make-samples.mjs`. 모두 `miniapp-subdiet`를 본떠 만든다.

## 리포트 모양 (워커 ↔ 앱 약속)

```js
// Item
{ text: string, basis: "seen" | "guess" | "unknown", reason: string }  // reason: 추정 근거, 없으면 ""
// Report
{
  url: string,            // 정규화된 주소
  summary: string,        // 한 줄 요약
  sections: { who: Item[], price: Item[], flow: Item[], why: Item[] },
  plans: [{ name: string, price: string, basis: "seen" | "guess" }],  // 요금제 표, 없으면 []
  highlight: string,      // 가장 미는 요금제 이름, 모르면 ""
  ideas: [string, string, string], // 내가 한다면 3줄
  partial: boolean,       // ②를 썼으면 true
  pages: number,          // 읽은 장수 1~2 (② 사용 시 0)
  createdAt: string       // ISO
}
```

---

### Task 1: 주소 검사·정규화·차단 판정 (`reverse-url.js`)

**Files:**
- Create: `docs/worker/reverse-url.js`
- Test: `docs/worker/reverse.test.mjs`

**Interfaces:**
- Produces:
  - `normalizeUrl(input: string) -> { ok: true, url: string } | { ok: false, reason: "empty" | "scheme" | "host" }`
  - `isAllowedOrigin(origin: string | null) -> boolean`
  - `findPricingLink(links: string[], pageUrl: string) -> string | null`
  - `isBlockedPage({ status: number, title: string, text: string }) -> boolean`

- [ ] **Step 1: 실패하는 테스트 쓰기**

```js
import { normalizeUrl, isAllowedOrigin, findPricingLink, isBlockedPage } from './reverse-url.js';

test('주소 정규화: 스킴 없으면 https, 해시·utm 제거, 끝 / 제거, 호스트 소문자', () => {
  assert.deepEqual(normalizeUrl('InteriorAI.com/?utm_source=x#top'), { ok: true, url: 'https://interiorai.com' });
  assert.deepEqual(normalizeUrl('https://a.com/pricing/?b=1&utm_medium=y'), { ok: true, url: 'https://a.com/pricing?b=1' });
  assert.equal(normalizeUrl('https://a.com/').url, normalizeUrl('https://A.com').url);
});
test('주소 거절: 빈칸, ftp, IP, localhost, .local, .internal', () => {
  assert.equal(normalizeUrl('  ').reason, 'empty');
  assert.equal(normalizeUrl('ftp://a.com').reason, 'scheme');
  for (const u of ['http://127.0.0.1', 'http://10.0.0.1/x', 'http://[::1]', 'http://localhost:8787', 'http://nas.local', 'http://x.internal'])
    assert.equal(normalizeUrl(u).reason, 'host', u);
});
test('Origin: 토스 4종과 localhost만', () => {
  for (const o of ['https://reverse-lab.apps.tossmini.com', 'https://reverse-lab.private-apps.tossmini.com',
                   'https://reverse-lab.web.tossmini.com', 'https://reverse-lab.private-web.tossmini.com', 'http://localhost:5189'])
    assert.equal(isAllowedOrigin(o), true, o);
  for (const o of [null, '', 'https://evil.com', 'https://apps.tossmini.com.evil.com', 'http://reverse-lab.apps.tossmini.com'])
    assert.equal(isAllowedOrigin(o), false, String(o));
});
test('요금제 링크: 같은 호스트의 pricing/plans/요금 1개, 다른 호스트·자기 자신은 무시', () => {
  assert.equal(findPricingLink(['/about', 'https://other.com/pricing', '/pricing'], 'https://a.com'), 'https://a.com/pricing');
  assert.equal(findPricingLink(['/ko/plans?x=1'], 'https://a.com/ko'), 'https://a.com/ko/plans?x=1');
  assert.equal(findPricingLink(['/%EC%9A%94%EA%B8%88'], 'https://a.com'), 'https://a.com/%EC%9A%94%EA%B8%88');
  assert.equal(findPricingLink(['/pricing'], 'https://a.com/pricing'), null);
  assert.equal(findPricingLink(['/blog'], 'https://a.com'), null);
});
test('차단 판정: 4xx·5xx, 봇 확인, 로그인 화면', () => {
  for (const s of [401, 403, 429, 500, 503]) assert.equal(isBlockedPage({ status: s, title: '', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Just a moment...', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Attention Required! | Cloudflare', text: '' }), true);
  assert.equal(isBlockedPage({ status: 200, title: '로그인', text: '아이디 비밀번호 로그인' }), true);
  assert.equal(isBlockedPage({ status: 200, title: 'Interior AI', text: '' }), false); // 글자 적음 ≠ 막힘
});
```

- [ ] **Step 2: 실패 확인** — `cd docs/worker && node --test reverse.test.mjs` → 모듈이 없어서 FAIL.
- [ ] **Step 3: 구현** — `URL` 객체로 처리한다. IP는 IPv4 점 4개 숫자와 `[`로 시작하는 IPv6로 판정한다. 요금제 링크는 경로를 `decodeURIComponent`한 뒤 `/(pricing|plans?|price|요금|가격|구독)/i`로 찾는다. 차단 화면 제목은 `just a moment|attention required|access denied|verify you are human|captcha`, 로그인 화면은 제목 또는 앞 300자에 `log ?in|sign ?in|로그인`이 있고 본문이 300자 미만일 때로 판정한다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS.
- [ ] **Step 5: 커밋** — `git add docs/worker/reverse-url.js docs/worker/reverse.test.mjs` → `git commit -m "해부기 워커: 주소 검사·요금제 링크·차단 판정"`

### Task 2: 프롬프트와 리포트 정리 (`reverse-report.js`)

**Files:**
- Create: `docs/worker/reverse-report.js`
- Test: `docs/worker/reverse.test.mjs` (이어 쓰기)

**Interfaces:**
- Produces:
  - `buildPrompt(mode: "page" | "url") -> string` (system 문)
  - `buildPageInput(pages: { url: string, title: string, text: string }[]) -> string` (합쳐서 `MAX_MODEL_TEXT = 20000`자 이하)
  - `parseReport(raw: string, opts: { url: string, partial: boolean, pages: number, now: string }) -> Report | null`

- [ ] **Step 1: 실패하는 테스트 쓰기**

```js
const OPTS = { url: 'https://a.com', partial: false, pages: 1, now: '2026-11-26T00:00:00.000Z' };
const GOOD = JSON.stringify({ summary: '요약', sections: { who: [{ text: '실무자', basis: 'guess', reason: '상업 라이선스' }], price: [], flow: [], why: [] },
  plans: [{ name: 'Pro', price: '$29/월', basis: 'seen' }, { name: 'Team', price: '' }], highlight: 'Pro', ideas: ['a', 'b', 'c', 'd'] });

test('정상: 울타리 친 JSON → Report, ideas는 3개로 자름, basis 없는 plan은 버림', () => {
  const r = parseReport('```json\n' + GOOD + '\n```', OPTS);
  assert.equal(r.summary, '요약');
  assert.deepEqual(r.ideas, ['a', 'b', 'c']);
  assert.deepEqual(r.plans, [{ name: 'Pro', price: '$29/월', basis: 'seen' }]);
  assert.equal(r.url, 'https://a.com'); assert.equal(r.createdAt, OPTS.now);
});
test('이상한 basis·빠진 칸 → unknown과 빈 배열로 정리', () => {
  const r = parseReport(JSON.stringify({ summary: 's', sections: { who: [{ text: 'x', basis: 'maybe' }] } }), OPTS);
  assert.deepEqual(r.sections.who, [{ text: 'x', basis: 'unknown', reason: '' }]);
  assert.deepEqual(r.sections.price, []); assert.deepEqual(r.plans, []); assert.equal(r.highlight, '');
});
test('partial이면 seen이 하나도 안 남음', () => {
  const r = parseReport(GOOD, { ...OPTS, partial: true, pages: 0 });
  assert.equal(r.partial, true);
  assert.ok(r.plans.every((p) => p.basis === 'guess'));
  assert.ok(Object.values(r.sections).flat().every((i) => i.basis !== 'seen'));
});
test('JSON 아님·summary 없음 → null', () => {
  assert.equal(parseReport('죄송해요', OPTS), null);
  assert.equal(parseReport('{"sections":{}}', OPTS), null);
});
test('buildPageInput: 2장 합쳐도 20000자 이하', () => {
  const s = buildPageInput([{ url: 'u1', title: 't', text: '가'.repeat(30000) }, { url: 'u2', title: 't', text: '나'.repeat(30000) }]);
  assert.ok(s.length <= 20000); assert.ok(s.includes('나'));
});
test('프롬프트에 정직 규칙이 들어 있음', () => {
  const p = buildPrompt('page');
  for (const w of ['seen', 'guess', 'unknown', '지어내지', 'ideas']) assert.ok(p.includes(w), w);
  assert.ok(buildPrompt('url').includes('guess'));
});
```

- [ ] **Step 2: 실패 확인** — `node --test reverse.test.mjs` → FAIL.
- [ ] **Step 3: 구현** — `parseRaw`는 check.js와 같은 방식(울타리 제거 → JSON.parse)으로 이 파일 안에 둔다. `buildPageInput`은 장마다 `[페이지 N] url\n제목\n본문` 형태로 쓰고, 한 장에 10000자씩 배분한다. 프롬프트 규칙:
  - 해요체 한국어로 쓴다.
  - 페이지 글자에 실제로 있는 것만 `seen`으로 쓴다.
  - 근거가 있는 짐작은 `guess`로 쓰고, 근거를 `reason`에 적는다.
  - 알 수 없는 것(매출, 환불률 등)은 `unknown`으로 쓴다.
  - 가격·숫자를 지어내지 않는다.
  - 요금제 표(`plans`)에는 페이지에 적힌 가격만 넣는다.
  - `ideas`는 부업러·1인 CEO가 "나라면 이렇게"로 바꿔 볼 3줄로 쓴다. 예: 한국 대상, 가격 조정, 결제 단계 축소.
  - 출력 JSON 모양은 위 "리포트 모양"에서 url·partial·pages·createdAt을 뺀 것이다.

  `url` 모드에는 "직접 읽은 글자가 없으니 모든 항목은 guess 또는 unknown"이라는 규칙을 더한다.
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: 커밋** — `git commit -m "해부기 워커: 프롬프트와 리포트 정리"`

### Task 3: `/reverse` 흐름 (`reverse.js`)

**Files:**
- Create: `docs/worker/reverse.js`
- Test: `docs/worker/reverse.test.mjs` (이어 쓰기)

**Interfaces:**
- Consumes: Task 1·2의 함수 전부.
- Produces: `handleReverse(request: Request, env, cors: object, deps: { fetchPage, ask, askUrl, kv, now: () => Date }) -> Promise<Response>`
  - `fetchPage(url) -> Promise<{ status: number, title: string, text: string, links: string[] } | { error: "timeout" | "network" | "host" }>`
  - `ask(system, text) -> Promise<string>`, `askUrl(system, url) -> Promise<string>`
  - `kv`: `{ get(key, "json"), put(key, value, { expirationTtl }) }` (KV 모양)
  - 응답 200 `{ report }` / 400 `{ error: "url", detail }` / 403 `{ error: "origin" }` / 405 / 422 `{ error: "blocked" | "timeout" | "network" }` / 429 `{ error: "cap" }` / 502 `{ error: "model" | "parse" }`

- [ ] **Step 1: 실패하는 테스트 쓰기** — 가짜 deps 모음 `makeDeps(over)`(호출 횟수와 ask에 넘긴 text를 기록, 메모리 kv)를 만들고, 요청 헤더에 `Origin: https://reverse-lab.apps.tossmini.com`을 넣는다. 테스트 이름과 단언:
  - `정상 ①: 200, report.pages=1, partial=false, kv 쓰기 2번(횟수·캐시)`
  - `요금제 링크가 있으면 2장 읽고 pages=2, fetchPage 2번, ask에 두 주소가 다 들어감`
  - `글자 399자 → askUrl 1번, ask 0번, report.partial=true`
  - `403 또는 "Just a moment" → 422 blocked, ask·askUrl 0번, 횟수 안 늘어남`
  - `fetchPage가 {error:"timeout"} → 422 timeout, 횟수 안 늘어남`
  - `같은 날 같은 주소(끝 / 다름) 두 번째 → 캐시 응답, fetchPage·ask 0번, kv 쓰기 0번`
  - `rev:count가 100이면 → 429 cap, fetchPage 0번`
  - `Origin 없음·evil.com → 403, POST 아님 → 405, 주소 이상 → 400 url`
  - `ask가 throw → 502 model / JSON 아님 → 502 parse, 둘 다 횟수 안 늘어남`
  - `응답 본문에 페이지 원문 문자열이 없음` (fetchPage text에 `SECRET-RAW-123`을 넣고 `await res.text()`에 없음을 확인)
  - `40000자 페이지 → ask에 넘긴 text ≤ 20000자`
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 순서는 이렇게 한다.
  1. method 검사
  2. `isAllowedOrigin(request.headers.get('Origin'))`
  3. body의 `url` → `normalizeUrl`
  4. 날짜 키는 `now()`의 UTC+9 날짜
  5. 캐시 get
  6. count get → `REVERSE_DAILY_CAP`
  7. fetchPage → 차단 판정
  8. 글자가 `MIN_TEXT` 이상이면 `findPricingLink`로 한 장 더 읽는다(두 번째 장이 막히면 조용히 첫 장만 쓴다)
  9. ask 또는 askUrl
  10. parseReport
  11. 성공했을 때만 count put(TTL 2일)과 cache put(TTL 1일)

  상수 `MIN_TEXT=400`, `REVERSE_DAILY_CAP=100`, `MAX_MODEL_TEXT=20000`은 export한다. 응답 헤더는 check.js의 `reply`와 같이 만든다.
- [ ] **Step 4: 통과 확인** — `node --test` (폴더 전체, 기존 테스트 포함) → 모두 PASS.
- [ ] **Step 5: 커밋** — `git commit -m "해부기 워커: /reverse 흐름(캐시·하루 상한·①/② 전환)"`

### Task 4: 실제 페이지 읽기와 워커 연결 (`reverse-fetch.js`, `worker.js`)

**Files:**
- Create: `docs/worker/reverse-fetch.js`
- Modify: `docs/worker/worker.js` (1~6줄 import, 22줄 근처 주석 목록, 141줄 `/check` 옆에 경로, 219줄 `askGeminiJson` 옆에 `askGeminiUrl`)

**Interfaces:**
- Produces: `fetchPage(url: string) -> Promise<{status,title,text,links} | {error}>`, `askGeminiUrl(env, system, url) -> Promise<string>`
- 연결: `handleReverse(request, env, cors, { fetchPage, ask: (s,t)=>askGeminiJson(env,s,t), askUrl: (s,u)=>askGeminiUrl(env,s,u), kv: env.MERGE_RANK, now: () => new Date() })`

- [ ] **Step 1: `fetchPage` 구현**
  - `fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReverseLab/1.0)', 'Accept-Language': 'ko,en;q=0.8' } })`로 가져온다.
  - 3xx면 `Location`을 `normalizeUrl`로 다시 검사하고 최대 3번 따라간다.
  - `Content-Type`이 html이 아니면 `{ status: 415, ... }`로 처리해 차단으로 보낸다.
  - 본문은 `HTMLRewriter`로 읽는다. `title` 글자, `a[href]` 목록(최대 200개), 본문 글자(`script, style, noscript, svg` 안은 버림)를 모은다.
  - 누적 500KB를 넘으면 그만 읽는다. 공백은 하나로 줄인다.
  - `AbortError`는 `{error:'timeout'}`, 그 밖의 예외는 `{error:'network'}`로 돌려준다.
- [ ] **Step 2: `askGeminiUrl` 구현** — `askGeminiJson`과 같은 주소를 쓰되 body에 `tools: [{ url_context: {} }]`를 넣는다. `responseMimeType`은 빼고(도구와 함께 쓸 수 없음), 사용자 글은 `"이 주소를 읽고 분석해 주세요: " + url`로 보낸다. 답 글자만 돌려준다.
- [ ] **Step 3: worker.js 연결** — `/reverse` 경로는 공용 `cors` 대신 `{ ...cors, 'Access-Control-Allow-Origin': (허용된 Origin이면 그 값) }`로 응답한다. OPTIONS도 같은 방식으로 처리한다.
- [ ] **Step 4: 기존 테스트 확인** — `node --test` → 모두 PASS.
- [ ] **Step 5: 로컬 스모크 테스트** — `npx wrangler dev --remote --port 8787`을 백그라운드로 띄우고, 한글이 든 요청은 파일로 보낸다(`--data-binary @body.json`, `-H "Origin: http://localhost:5189"`).
  - 확인할 곳 4곳:
    - `interiorai.com` (영상 속 예시)
    - 요금제가 별도 페이지인 사이트 하나
    - 화면을 나중에 그려서 글자가 적은 사이트 하나 → `partial:true`
    - 요금이 원화로 적힌 한국 사이트 하나
  - 통과 기준:
    - 각각 60초 안에 응답한다.
    - plans 가격이 실제 페이지와 같다(직접 열어 대조).
    - 응답에 원문이 없다.
    - 같은 요청을 다시 보내면 즉시 응답한다(캐시).
  - 결과는 표로 정리해 루카에게 보고한다.
- [ ] **Step 6: 커밋** — `git add docs/worker/reverse-fetch.js docs/worker/worker.js` → `git commit -m "해부기 워커: 실제 페이지 읽기와 /reverse 연결"`

### Task 5: 워커 배포 (루카 실행)

- [ ] **Step 1:** 클로가 배포 명령을 안내한다. 자동 모드가 배포 명령을 막으므로 루카가 직접 실행한다.

```powershell
cd C:\Users\atlia\Desktop\huhsame-script\docs\worker; npx wrangler deploy
```
- [ ] **Step 2:** 클로가 실제 주소 `https://small-recipe-9345.atlia0318.workers.dev/reverse`에 Task 4의 4곳 중 1곳으로 요청한다. 200과 리포트를 확인한다. Origin 없이 보낸 요청은 403이 나와야 한다.
- [ ] **Step 3:** 기존 경로 `/check`, `/tarot`에 OPTIONS 요청을 보내 204가 나오는지 확인한다. 다른 앱이 깨지지 않았는지 보는 것이다.

### Task 6: 앱 두뇌 (`reverse-core.js`)

**Files:**
- Create: `metaluca-fresh/reverse-core.js`
- Test: `metaluca-fresh/test/reverse.test.js` (실행: `node --test test/reverse.test.js`)

**Interfaces:**
- Produces (`window.ReverseCore` 와 `module.exports` 둘 다):
  - `DAILY_LIMIT = 3`, `MAX_SAVED = 20`
  - `remainingToday(store, now: Date) -> number` / `consumeQuota(store, now) -> void` (KST 날짜 기준, 키 `rev.quota`)
  - `saveReport(store, report) -> void` (같은 url이면 새것으로 교체, 최신순, 20개 초과분 삭제, 키 `rev.saved`) / `listReports(store) -> Report[]`
  - `shareText(report, link: string) -> string` (한 줄 요약 + 내가 한다면 3줄 + 링크, 500자 이하)
  - `errorMessage(code: string) -> string` (`url`, `blocked`, `timeout`, `network`, `cap`, `model`, `parse`, `quota`, 알 수 없음)
  - `basisLabel(basis) -> { text: "봤어요" | "추정" | "모름", cls: "seen" | "guess" | "unknown" }`
  - `store`는 `{ getItem, setItem }` 모양(localStorage 또는 테스트용 가짜)

- [ ] **Step 1: 실패하는 테스트 쓰기** — 테스트 이름과 단언:
  - `처음엔 3회, consumeQuota 3번 뒤 0회`
  - `KST 자정 넘으면 다시 3회` (`2026-11-26T14:59:00Z` → 1회 쓰면 2, `2026-11-26T15:00:00Z` → 3)
  - `저장값이 깨진 JSON이어도 3회로 시작하고 throw 안 함`
  - `같은 url 저장 2번 → 1개, 21개 저장 → 20개이고 가장 오래된 것이 빠짐`
  - `shareText에 요약·ideas 3줄·링크가 들어가고 http 외부 주소(report.url)는 안 들어감`
  - `errorMessage('blocked')에 "읽을 수 없었어요", ('cap')에 "내일", 모르는 코드도 빈 문자열 아님`
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 클래식 스크립트 끝에 `if (typeof module !== 'undefined') module.exports = ReverseCore;`를 붙인다(구독료 점검 `subscription-math.js` 방식).
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: 커밋** — metaluca-fresh에서 `git add reverse-core.js test/reverse.test.js` → `git commit -m "해부기 앱: 하루 횟수·저장·공유 문구"`

### Task 7: 화면 (`reverse-business.html`)

**Files:**
- Create: `metaluca-fresh/reverse-business.html`, `metaluca-fresh/reverse-samples.js` (이 단계에서는 Task 2 테스트의 GOOD 모양 견본 1개만, `window.REVERSE_SAMPLES = [{ name, url, report }]`)

**Interfaces:**
- Consumes: `window.ReverseCore`(Task 6), `window.REVERSE_SAMPLES`, `window.AppsInToss?.{share, getTossShareLink, attachAdBanner}`(Task 9, 없으면 공유 버튼은 숨기지 않고 클립보드 복사로 대체)
- 워커 주소 상수 `const WORKER = 'https://small-recipe-9345.atlia0318.workers.dev/reverse'`

- [ ] **Step 1: 화면 만들기** — 구독료 점검의 색·글꼴 변수를 그대로 쓰고, 화면 5개를 `hidden`으로 전환한다.
  - **홈:** 제목, 한 줄 설명, 주소 입력칸, [해부하기], "오늘 남은 해부 N회", 추천 카드 목록(이름 + 주소 글자, 링크 아님), [내 리포트].
  - **해부 중:** 진행 문구가 3초마다 바뀐다(예: "페이지 읽는 중이에요" → "요금제 찾는 중이에요" → "돈 흐름 정리 중이에요").
  - **리포트:** 설계 5장 그림 순서대로 놓는다.
    - 항목마다 basisLabel 꼬리표를 붙이고, 추정은 근거를 작은 글씨로 단다.
    - partial이면 맨 위에 "이 사이트는 직접 읽기가 어려워 일부를 추정했어요" 띠를 둔다.
    - 그 아래 [리포트 저장], [공유하기]를 두고, 맨 아래에 `#adSlot`을 둔다.
  - **내 리포트:** 저장 목록. 누르면 리포트 화면으로 간다.
  - **오류:** `errorMessage`와 [다시 해보기]를 보여준다.
  - 동작 규칙:
    - 남은 횟수가 0이면 [해부하기]를 막고 `errorMessage('quota')`를 보여준다.
    - 추천 카드는 횟수를 쓰지 않는다.
    - 분석은 성공했을 때만 `consumeQuota`를 부른다.
    - 네이티브 `prompt`/`alert`는 쓰지 않는다.
- [ ] **Step 2: 브라우저 확인** — `.claude/launch.json`에 metaluca-fresh 정적 서버 설정을 추가하고 preview로 연다. 375×812 크기에서 아래 다섯 가지를 확인한다.
  - 추천 카드를 누르면 리포트가 그려진다.
  - 저장 → 내 리포트 목록에 나온다.
  - 잘못된 주소를 넣으면 오류 화면이 나온다.
  - 워커가 응답할 때(배포 후) 실제 해부 1회가 되고 남은 횟수가 줄어든다.
  - 콘솔 오류가 없다.

  확인 화면은 스크린샷으로 루카에게 보여준다.
- [ ] **Step 3: 커밋** — `git add reverse-business.html reverse-samples.js` → `git commit -m "해부기 앱: 화면 원본"`

### Task 8: 추천 사이트 리포트 미리 만들기

**Files:**
- Create: `metaluca-fresh/miniapp-reverse/make-samples.mjs`
- Modify: `metaluca-fresh/reverse-samples.js`

- [ ] **Step 1: 후보 고르기** — 1인 기업·부업과 관련 있고 요금제가 공개된 해외·국내 서비스 8~10곳을 고른다. 이름·주소·고른 이유 한 줄을 표로 만들어 **루카에게 확인받는다.** 확인 전에는 다음 단계로 가지 않는다.
- [ ] **Step 2: 스크립트** — `node make-samples.mjs` 한 번 실행으로 끝나게 만든다.
  - 승인된 목록을 순서대로 워커 `/reverse`에 요청한다(`Origin: http://localhost:5189` 헤더).
  - 성공한 것만 `reverse-samples.js`에 `window.REVERSE_SAMPLES = [...]`로 쓴다. 실패한 곳은 이름과 오류를 출력한다.
  - 하루 상한 100회 중 10회 정도만 쓴다.
- [ ] **Step 3: 눈으로 검수** — 리포트마다 가격 칸을 실제 사이트와 대조한다. 틀린 것이 있으면 그 사이트는 빼고 루카에게 알린다.
- [ ] **Step 4: 커밋** — `git commit -m "해부기 앱: 추천 사이트 리포트 N곳"`

### Task 9: 미니앱 포장과 출시 (`miniapp-reverse/`)

**Files:**
- Create: `miniapp-reverse/package.json`(subdiet 복사, name `reverse-lab-miniapp`, dev 포트 5189), `apps-in-toss.config.ts`(appName은 루카가 정한 값, primaryColor `#3182f6`), `sync.mjs`(원본 `../reverse-business.html`, 복사 파일 `reverse-core.js`·`reverse-samples.js`, 교체 3개와 외부 링크 검사는 subdiet와 같다), `src/ait-bridge.js`(subdiet 복사, `AD_GROUP_ID = ''`, 공유 링크 `intoss://<appName>`)

- [ ] **Step 1: 루카에게 정할 것 받기** — 한글·영어 앱 이름, appName, 카테고리를 정한다. 루카가 콘솔에 앱을 등록한다.
- [ ] **Step 2: 포장 파일 만들기** — 경로는 반드시 `C:\Users\atlia\Documents\metaluca-fresh\miniapp-reverse`. `npm install` → `npm run build` → `.ait` 파일이 생기고, sync 단계의 외부 링크 검사를 통과해야 한다.
- [ ] **Step 3: 웹 확인** — `npm run web:dev`(5189)를 preview로 열어 Task 7 Step 2의 다섯 가지를 다시 확인한다. 이 포트가 워커 Origin 허용 목록에 있어서 실제 해부까지 된다.
- [ ] **Step 4: 커밋** — `git add miniapp-reverse` (node_modules, dist, .ait 제외. subdiet의 .gitignore 규칙을 따른다) → `git commit -m "해부기 미니앱 포장"`
- [ ] **Step 5: 배포·실기기 확인 (루카)** — 루카가 `npm run deploy`를 실행한다(배포 키는 루카가 직접 입력). 나온 `intoss-private://` 링크로 폰에서 확인한다.
  - 추천 카드 → 리포트가 열린다.
  - 실제 해부 1회가 된다.
  - 공유하면 카톡 미리보기가 나온다.
  - 뒤로가기가 정상 동작한다.
- [ ] **Step 6: 검토 요청 준비** — 클로가 콘솔 상세설명 초안을 쓴다. "무엇을 보고 누르고 경험하는지"를 구체적으로, 복제 기능이 없다는 점과 분석만 한다는 점을 분명히 적는다. 루카가 붙여넣고 [검토 요청하기]를 누른다.
- [ ] **Step 7: 기록** — 메모리에 앱 메모(appName, 폴더, 워커 경로, 상한 숫자)를 새로 만들고, `apps-in-toss-workflow` 목록에 17호를 추가한다.
