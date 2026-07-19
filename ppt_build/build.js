const pptxgen = require("pptxgenjs");

// ---------- palette ----------
const WHITE = "FFFFFF";
const INK   = "1E2A38";   // dark slides
const INK2  = "27384A";   // dark panel
const CORAL = "E8604C";   // accent
const CORAL_SOFT = "FBE3DE"; // light coral tint
const BODY  = "33373D";
const MUTED = "6B7280";
const LINE  = "E3E6EA";
const PANEL = "F5F6F8";
const HEAD = "Malgun Gothic";
const BODYF = "Malgun Gothic";
const MONO = "Consolas";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Claude";
pres.title = "AI 활용법과 나만의 AI 에이전트 만들기";

const W = 13.3, H = 7.5, M = 0.8;
const CW = W - M * 2; // content width

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.10 });

let pageNo = 0;
function pageTag(s, light) {
  pageNo++;
  s.addText(String(pageNo).padStart(2, "0") + " / 18", {
    x: W - 2.0, y: 0.35, w: 1.6, h: 0.3, align: "right", margin: 0,
    fontFace: BODYF, fontSize: 10, color: light ? "9AA7B4" : MUTED,
  });
}

// standard content header: coral kicker + big title
function header(s, kicker, title) {
  s.addText(kicker, {
    x: M, y: 0.55, w: CW, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 13, bold: true, color: CORAL, charSpacing: 2,
  });
  s.addText(title, {
    x: M, y: 0.9, w: CW, h: 0.8, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: INK,
  });
}

function card(s, x, y, w, h, fill) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill || WHITE },
    line: { color: LINE, width: 1 }, shadow: shadow(),
  });
}

function newSlide(dark) {
  const s = pres.addSlide();
  s.background = { color: dark ? INK : WHITE };
  return s;
}

// ============================================================ 1. COVER
{
  const s = newSlide(true);
  // coral marker block
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 2.5, w: 0.7, h: 0.16, fill: { color: CORAL } });
  s.addText("실무자를 위한 입문 가이드", {
    x: M, y: 2.75, w: 10, h: 0.4, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: "9AA7B4", charSpacing: 1,
  });
  s.addText("AI 활용법과\n나만의 AI 에이전트 만들기", {
    x: M, y: 3.2, w: 11.5, h: 1.9, margin: 0, lineSpacingMultiple: 1.05,
    fontFace: HEAD, fontSize: 46, bold: true, color: WHITE,
  });
  s.addText([
    { text: "AI를 ", options: {} },
    { text: "도구처럼 쓰는 법", options: { color: CORAL, bold: true } },
    { text: "에서 ", options: {} },
    { text: "스스로 일하는 에이전트", options: { color: CORAL, bold: true } },
    { text: "로", options: {} },
  ], { x: M, y: 5.3, w: 11.5, h: 0.5, margin: 0, fontFace: BODYF, fontSize: 17, color: "C7D0DA" });
  s.addText("2026  ·  18 slides", {
    x: M, y: 6.7, w: 6, h: 0.3, margin: 0, fontFace: BODYF, fontSize: 12, color: "6E7C8A",
  });
}

// ============================================================ 2. AGENDA
{
  const s = newSlide();
  pageTag(s);
  header(s, "OVERVIEW", "오늘 다룰 내용");
  const items = [
    ["01", "AI 기초", "생성형 AI 개념과 지금 주목하는 이유"],
    ["02", "AI 활용법", "도구·프롬프트·업무별 실전 활용"],
    ["03", "에이전트 이해", "챗봇과 무엇이 다른가, 핵심 구조"],
    ["04", "에이전트 제작", "노코드·코드로 직접 만들어보기"],
    ["05", "사례와 한계", "활용 사례, 주의사항과 윤리"],
    ["06", "다음 단계", "오늘 이후 무엇을 해볼까"],
  ];
  const cols = 2, gx = 0.4, gy = 0.35;
  const cwid = (CW - gx) / cols, chei = 1.25;
  const startY = 2.0;
  items.forEach((it, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = M + c * (cwid + gx), y = startY + r * (chei + gy);
    card(s, x, y, cwid, chei);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.09, h: chei, fill: { color: CORAL } });
    s.addText(it[0], { x: x + 0.3, y: y + 0.18, w: 1.0, h: 0.6, margin: 0, fontFace: HEAD, fontSize: 28, bold: true, color: CORAL_SOFT });
    s.addText(it[1], { x: x + 1.35, y: y + 0.22, w: cwid - 1.6, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: INK });
    s.addText(it[2], { x: x + 1.35, y: y + 0.66, w: cwid - 1.6, h: 0.5, margin: 0, fontFace: BODYF, fontSize: 12.5, color: MUTED });
  });
}

// ============================================================ 3. AI란 무엇인가
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 기초 · 01", "AI란 무엇인가");
  // left text
  s.addText([
    { text: "생성형 AI(Generative AI)", options: { bold: true, color: INK } },
    { text: "는 사람이 만든 방대한 데이터를 학습해, ", options: {} },
    { text: "새로운 글·이미지·코드를 직접 만들어내는", options: { bold: true, color: CORAL } },
    { text: " 인공지능입니다.", options: {} },
  ], { x: M, y: 2.0, w: 6.3, h: 1.2, margin: 0, fontFace: BODYF, fontSize: 16, color: BODY, lineSpacingMultiple: 1.25 });

  const points = [
    ["대화로 작동", "복잡한 명령어 없이 사람의 말(자연어)로 지시"],
    ["맥락을 이해", "앞선 대화를 기억하고 이어서 답함"],
    ["범용 도구", "글쓰기·분석·번역·코딩까지 한 곳에서"],
  ];
  let py = 3.35;
  points.forEach((p) => {
    s.addShape(pres.shapes.OVAL, { x: M, y: py + 0.04, w: 0.18, h: 0.18, fill: { color: CORAL } });
    s.addText(p[0], { x: M + 0.32, y: py - 0.06, w: 6, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: INK });
    s.addText(p[1], { x: M + 0.32, y: py + 0.28, w: 6, h: 0.35, margin: 0, fontFace: BODYF, fontSize: 12.5, color: MUTED });
    py += 1.0;
  });

  // right panel
  const px = 7.6, pw = W - px - M;
  s.addShape(pres.shapes.RECTANGLE, { x: px, y: 2.0, w: pw, h: 4.7, fill: { color: PANEL } });
  s.addShape(pres.shapes.RECTANGLE, { x: px, y: 2.0, w: pw, h: 0.7, fill: { color: INK } });
  s.addText("기존 소프트웨어 vs 생성형 AI", { x: px + 0.3, y: 2.0, w: pw - 0.6, h: 0.7, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 14, bold: true, color: WHITE });
  const rows = [
    ["기존 SW", "정해진 규칙대로만 동작"],
    ["생성형 AI", "상황에 맞춰 새 결과를 생성"],
    ["입력 방식", "메뉴·버튼 → 자연어 대화"],
    ["잘하는 일", "반복 계산 → 창의·요약·초안"],
  ];
  let ry = 2.95;
  rows.forEach((r, i) => {
    if (i % 2 === 1) s.addShape(pres.shapes.RECTANGLE, { x: px + 0.15, y: ry, w: pw - 0.3, h: 0.82, fill: { color: WHITE } });
    s.addText(r[0], { x: px + 0.3, y: ry, w: 1.7, h: 0.82, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 12.5, bold: true, color: CORAL });
    s.addText(r[1], { x: px + 2.0, y: ry, w: pw - 2.2, h: 0.82, margin: 0, valign: "middle", fontFace: BODYF, fontSize: 12.5, color: BODY });
    ry += 0.9;
  });
}

// ============================================================ 4. 왜 지금 AI인가 (chart)
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 기초 · 02", "왜 지금, AI인가");
  // left: 3 reasons
  const reasons = [
    ["성능의 도약", "최근 모델은 전문가 수준의 글·코드 작성이 가능"],
    ["누구나 접근", "무료·저가 도구로 진입장벽이 사라짐"],
    ["생산성 효과", "반복 업무 시간을 크게 단축"],
  ];
  let ry = 2.15;
  reasons.forEach((r) => {
    card(s, M, ry, 5.6, 1.15);
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: ry, w: 0.09, h: 1.15, fill: { color: CORAL } });
    s.addText(r[0], { x: M + 0.32, y: ry + 0.16, w: 5.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(r[1], { x: M + 0.32, y: ry + 0.58, w: 5.1, h: 0.45, margin: 0, fontFace: BODYF, fontSize: 12.5, color: MUTED });
    ry += 1.35;
  });
  // right: bar chart of adoption
  s.addText("기업의 생성형 AI 도입률 (%)", { x: 6.9, y: 2.0, w: 6, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 13, bold: true, color: INK });
  s.addChart(pres.charts.BAR, [{
    name: "도입률", labels: ["2022", "2023", "2024", "2025"], values: [23, 41, 58, 72],
  }], {
    x: 6.9, y: 2.45, w: 5.6, h: 3.9, barDir: "col",
    chartColors: [CORAL],
    chartArea: { fill: { color: WHITE } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: BODYF, valAxisLabelFontFace: BODYF,
    valGridLine: { color: LINE, size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontFace: BODYF, dataLabelFontBold: true,
    showLegend: false, showTitle: false, valAxisHidden: true, valAxisMaxVal: 90,
  });
}

// ============================================================ 5. 대표 AI 도구
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 활용법 · 01", "대표 AI 도구 한눈에 보기");
  const tools = [
    ["ChatGPT", "OpenAI", "범용 대화·작문에 강함. 가장 널리 쓰임"],
    ["Claude", "Anthropic", "긴 문서 분석·코딩·신중한 답변에 강점"],
    ["Gemini", "Google", "검색·구글 서비스 연동과 멀티모달"],
    ["이미지 생성", "Midjourney 등", "텍스트로 그림·디자인 제작"],
  ];
  const gx = 0.35, cwid = (CW - gx * 3) / 4, top = 2.2, chei = 3.6;
  tools.forEach((t, i) => {
    const x = M + i * (cwid + gx);
    card(s, x, top, cwid, chei);
    s.addShape(pres.shapes.RECTANGLE, { x, y: top, w: cwid, h: 0.12, fill: { color: CORAL } });
    s.addShape(pres.shapes.OVAL, { x: x + cwid / 2 - 0.45, y: top + 0.55, w: 0.9, h: 0.9, fill: { color: CORAL_SOFT } });
    s.addText(t[0].slice(0, 2), { x: x + cwid / 2 - 0.45, y: top + 0.55, w: 0.9, h: 0.9, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 18, bold: true, color: CORAL });
    s.addText(t[0], { x: x + 0.2, y: top + 1.65, w: cwid - 0.4, h: 0.4, margin: 0, align: "center", fontFace: HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(t[1], { x: x + 0.2, y: top + 2.05, w: cwid - 0.4, h: 0.3, margin: 0, align: "center", fontFace: BODYF, fontSize: 11, color: CORAL });
    s.addText(t[2], { x: x + 0.25, y: top + 2.45, w: cwid - 0.5, h: 0.95, margin: 0, align: "center", fontFace: BODYF, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.15 });
  });
  s.addText("도구마다 강점이 다릅니다. 한 가지에 익숙해진 뒤 목적에 맞게 갈아타며 쓰는 것을 추천합니다.", {
    x: M, y: 6.3, w: CW, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 12.5, italic: true, color: MUTED,
  });
}

// ============================================================ 6. 프롬프트 기본 원칙
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 활용법 · 02", "프롬프트 기본 원칙");
  const principles = [
    ["역할을 준다", "“너는 마케팅 카피라이터야”처럼 입장을 지정"],
    ["맥락을 준다", "대상·목적·배경 정보를 함께 제공"],
    ["형식을 정한다", "표·목록·글자 수 등 원하는 출력 형태 명시"],
    ["예시를 보인다", "원하는 결과의 샘플을 하나 보여준다"],
    ["단계로 나눈다", "한 번에 다 시키지 말고 쪼개서 요청"],
  ];
  let y = 2.15;
  principles.forEach((p, i) => {
    s.addShape(pres.shapes.OVAL, { x: M, y, w: 0.7, h: 0.7, fill: { color: CORAL } });
    s.addText(String(i + 1), { x: M, y, w: 0.7, h: 0.7, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 20, bold: true, color: WHITE });
    s.addText(p[0], { x: M + 1.0, y: y - 0.02, w: 4, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: INK });
    s.addText(p[1], { x: M + 5.0, y: y + 0.05, w: CW - 5.0, h: 0.55, margin: 0, valign: "middle", fontFace: BODYF, fontSize: 13.5, color: BODY });
    if (i < principles.length - 1) s.addShape(pres.shapes.LINE, { x: M, y: y + 0.9, w: CW, h: 0, line: { color: LINE, width: 1 } });
    y += 0.95;
  });
}

// ============================================================ 7. 좋은 vs 나쁜 프롬프트
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 활용법 · 03", "좋은 프롬프트 vs 나쁜 프롬프트");
  const colW = (CW - 0.5) / 2;
  // bad
  let x = M, top = 2.1;
  card(s, x, top, colW, 4.3);
  s.addShape(pres.shapes.RECTANGLE, { x, y: top, w: colW, h: 0.7, fill: { color: "8A8F98" } });
  s.addText("✕   막연한 요청", { x: x + 0.3, y: top, w: colW - 0.6, h: 0.7, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 16, bold: true, color: WHITE });
  s.addText("“여행 글 좀 써줘”", { x: x + 0.35, y: top + 0.95, w: colW - 0.7, h: 0.5, margin: 0, fontFace: BODYF, fontSize: 14, italic: true, color: BODY });
  s.addText([
    { text: "누구를 위한 글인지 모름", options: { bullet: true, breakLine: true } },
    { text: "길이·형식 기준이 없음", options: { bullet: true, breakLine: true } },
    { text: "결과가 매번 들쭉날쭉", options: { bullet: true } },
  ], { x: x + 0.4, y: top + 1.6, w: colW - 0.8, h: 2.4, margin: 0, fontFace: BODYF, fontSize: 13, color: MUTED, paraSpaceAfter: 8 });

  // good
  x = M + colW + 0.5;
  card(s, x, top, colW, 4.3);
  s.addShape(pres.shapes.RECTANGLE, { x, y: top, w: colW, h: 0.7, fill: { color: CORAL } });
  s.addText("✓   구체적인 요청", { x: x + 0.3, y: top, w: colW - 0.6, h: 0.7, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 16, bold: true, color: WHITE });
  s.addText("“20대 대상 제주 2박3일 일정을 표로, 하루 3곳씩 추천해줘”", { x: x + 0.35, y: top + 0.95, w: colW - 0.7, h: 0.7, margin: 0, fontFace: BODYF, fontSize: 14, italic: true, color: BODY, lineSpacingMultiple: 1.1 });
  s.addText([
    { text: "대상(20대)이 명확함", options: { bullet: true, breakLine: true } },
    { text: "출력 형식(표)을 지정", options: { bullet: true, breakLine: true } },
    { text: "분량 기준(하루 3곳)이 있음", options: { bullet: true } },
  ], { x: x + 0.4, y: top + 1.85, w: colW - 0.8, h: 2.2, margin: 0, fontFace: BODYF, fontSize: 13, color: BODY, paraSpaceAfter: 8 });
}

// ============================================================ 8. 업무별 활용법 (2x3)
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 활용법 · 04", "업무별 AI 활용법");
  const uses = [
    ["문서 작성", "보고서·이메일 초안을 빠르게"],
    ["요약·정리", "긴 자료를 핵심만 추려서"],
    ["번역", "맥락을 살린 자연스러운 번역"],
    ["코딩", "코드 생성·오류 수정·설명"],
    ["이미지", "발표·홍보용 그림 제작"],
    ["아이디어", "브레인스토밍과 기획 발상"],
  ];
  const cols = 3, gx = 0.4, gy = 0.4;
  const cwid = (CW - gx * 2) / cols, chei = 1.85, top = 2.1;
  uses.forEach((u, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = M + c * (cwid + gx), y = top + r * (chei + gy);
    card(s, x, y, cwid, chei, PANEL);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55, fill: { color: CORAL } });
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 15, bold: true, color: WHITE });
    s.addText(u[0], { x: x + 1.05, y: y + 0.32, w: cwid - 1.2, h: 0.5, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(u[1], { x: x + 0.32, y: y + 1.0, w: cwid - 0.6, h: 0.7, margin: 0, fontFace: BODYF, fontSize: 12.5, color: MUTED, lineSpacingMultiple: 1.15 });
  });
}

// ============================================================ 9. 실전 워크플로우
{
  const s = newSlide();
  pageTag(s);
  header(s, "AI 활용법 · 05", "AI 활용 실전 워크플로우");
  const steps = [
    ["목표 정의", "무엇을 얻고 싶은지 한 문장으로"],
    ["맥락 제공", "자료·예시·조건을 함께 입력"],
    ["초안 생성", "AI에게 첫 결과물을 요청"],
    ["피드백·수정", "부족한 점을 짚어 다시 요청"],
    ["검토·마무리", "사실 확인 후 사람이 최종 책임"],
  ];
  const n = steps.length, gx = 0.3;
  const cwid = (CW - gx * (n - 1)) / n, top = 2.5, chei = 2.6;
  steps.forEach((st, i) => {
    const x = M + i * (cwid + gx);
    card(s, x, top, cwid, chei);
    s.addText("STEP " + (i + 1), { x: x + 0.2, y: top + 0.25, w: cwid - 0.4, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 11, bold: true, color: CORAL, charSpacing: 1 });
    s.addText(st[0], { x: x + 0.2, y: top + 0.65, w: cwid - 0.4, h: 0.8, margin: 0, fontFace: HEAD, fontSize: 15.5, bold: true, color: INK });
    s.addText(st[1], { x: x + 0.2, y: top + 1.45, w: cwid - 0.4, h: 1.0, margin: 0, fontFace: BODYF, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.15 });
    if (i < n - 1) s.addText("→", { x: x + cwid - 0.05, y: top, w: gx + 0.1, h: chei, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 18, bold: true, color: CORAL });
  });
  s.addText("핵심은 ‘한 번에 완성’이 아니라 ‘대화하며 다듬기’입니다.", { x: M, y: 6.4, w: CW, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 13, italic: true, color: MUTED });
}

// ============================================================ 10. 에이전트란
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 이해 · 01", "AI 에이전트란 무엇인가");
  s.addText([
    { text: "AI 에이전트", options: { bold: true, color: CORAL } },
    { text: "는 목표만 주면 ", options: {} },
    { text: "스스로 계획을 세우고, 도구를 사용해, 여러 단계를 거쳐 일을 끝내는", options: { bold: true, color: INK } },
    { text: " AI입니다.", options: {} },
  ], { x: M, y: 2.1, w: CW, h: 1.0, margin: 0, fontFace: BODYF, fontSize: 18, color: BODY, lineSpacingMultiple: 1.3 });

  // analogy cards
  const cmp = [
    ["일반 AI 사용", "내가 묻고 → AI가 답하고 → 내가 다음 행동", "사람이 매 단계를 운전"],
    ["AI 에이전트", "목표만 전달 → AI가 알아서 단계를 실행 → 결과 보고", "AI가 스스로 운전"],
  ];
  const colW = (CW - 0.5) / 2, top = 3.5, chei = 2.7;
  cmp.forEach((c, i) => {
    const x = M + i * (colW + 0.5);
    card(s, x, top, colW, chei, i === 1 ? CORAL_SOFT : PANEL);
    s.addText(c[0], { x: x + 0.35, y: top + 0.3, w: colW - 0.7, h: 0.5, margin: 0, fontFace: HEAD, fontSize: 18, bold: true, color: i === 1 ? CORAL : INK });
    s.addText(c[1], { x: x + 0.35, y: top + 1.0, w: colW - 0.7, h: 1.0, margin: 0, fontFace: BODYF, fontSize: 14, color: BODY, lineSpacingMultiple: 1.25 });
    s.addText(c[2], { x: x + 0.35, y: top + 2.05, w: colW - 0.7, h: 0.5, margin: 0, fontFace: BODYF, fontSize: 13, italic: true, bold: true, color: i === 1 ? CORAL : MUTED });
  });
}

// ============================================================ 11. 에이전트 vs 챗봇
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 이해 · 02", "에이전트 vs 단순 챗봇");
  const rows = [
    [{ text: "구분", options: { bold: true, color: WHITE, fill: { color: INK } } },
     { text: "단순 챗봇", options: { bold: true, color: WHITE, fill: { color: INK } } },
     { text: "AI 에이전트", options: { bold: true, color: WHITE, fill: { color: CORAL } } }],
    ["하는 일", "질문에 답변", "목표를 향해 작업을 수행"],
    ["행동 범위", "대화 한 번", "여러 단계를 연속 실행"],
    ["외부 연결", "없음 (대화만)", "검색·앱·코드 등 도구 사용"],
    ["기억", "보통 대화 내에서만", "메모리로 정보를 누적·활용"],
    ["사람의 개입", "매번 필요", "최소한, 필요할 때만"],
  ];
  const data = rows.map((r, ri) =>
    r.map((c) => {
      if (typeof c === "object") return { text: c.text, options: { ...c.options, align: "left", valign: "middle", fontFace: HEAD, fontSize: 14 } };
      const isLabel = ri > 0 && r.indexOf(c) === 0;
      return { text: c, options: { color: isLabel ? INK : BODY, bold: isLabel, fontFace: isLabel ? HEAD : BODYF, fontSize: 13.5, align: "left", valign: "middle", fill: { color: ri % 2 === 0 ? PANEL : WHITE } } };
    })
  );
  s.addTable(data, {
    x: M, y: 2.2, w: CW, colW: [2.6, 4.5, 4.6], rowH: 0.72,
    border: { type: "solid", pt: 1, color: LINE }, margin: [4, 10, 4, 10],
  });
}

// ============================================================ 12. 핵심 구성요소 (2x2)
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 이해 · 03", "에이전트의 핵심 구성요소");
  const comps = [
    ["LLM (두뇌)", "언어모델이 상황을 판단하고 무엇을 할지 결정"],
    ["도구 (손발)", "검색·계산·파일·API 등 실제 행동 수단"],
    ["메모리 (기억)", "과거 대화와 결과를 저장해 맥락 유지"],
    ["계획 (전략)", "목표를 작은 단계로 쪼개 순서대로 실행"],
  ];
  const cols = 2, gx = 0.4, gy = 0.4;
  const cwid = (CW - gx) / cols, chei = 1.95, top = 2.1;
  comps.forEach((c, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = M + col * (cwid + gx), y = top + r * (chei + gy);
    card(s, x, y, cwid, chei);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.12, h: chei, fill: { color: CORAL } });
    s.addText(c[0], { x: x + 0.4, y: y + 0.3, w: cwid - 0.7, h: 0.5, margin: 0, fontFace: HEAD, fontSize: 18, bold: true, color: INK });
    s.addText(c[1], { x: x + 0.4, y: y + 0.9, w: cwid - 0.7, h: 0.9, margin: 0, fontFace: BODYF, fontSize: 13.5, color: MUTED, lineSpacingMultiple: 1.2 });
  });
}

// ============================================================ 13. 동작 원리 (루프)
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 이해 · 04", "동작 원리: 생각–행동 루프");
  const loop = [
    ["① 생각", "목표를 보고 다음에\n무엇을 할지 판단"],
    ["② 행동", "필요한 도구를\n호출해 실행"],
    ["③ 관찰", "도구의 결과를\n확인하고 반영"],
    ["④ 반복", "목표 달성까지\n①~③을 되풀이"],
  ];
  const n = 4, gx = 0.55, cwid = (CW - gx * (n - 1)) / n, top = 2.7, chei = 2.4;
  loop.forEach((l, i) => {
    const x = M + i * (cwid + gx);
    s.addShape(pres.shapes.RECTANGLE, { x, y: top, w: cwid, h: chei, fill: { color: i === 3 ? CORAL : PANEL }, line: { color: LINE, width: 1 } });
    s.addText(l[0], { x: x + 0.2, y: top + 0.4, w: cwid - 0.4, h: 0.6, margin: 0, align: "center", fontFace: HEAD, fontSize: 20, bold: true, color: i === 3 ? WHITE : CORAL });
    s.addText(l[1], { x: x + 0.2, y: top + 1.15, w: cwid - 0.4, h: 1.0, margin: 0, align: "center", fontFace: BODYF, fontSize: 13, color: i === 3 ? WHITE : BODY, lineSpacingMultiple: 1.15 });
    if (i < n - 1) s.addText("→", { x: x + cwid, y: top, w: gx, h: chei, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 22, bold: true, color: CORAL });
  });
  s.addText("예) “경쟁사 가격 조사해줘” → 검색(행동) → 결과 읽기(관찰) → 표로 정리(행동) → 보고", {
    x: M, y: 6.0, w: CW, h: 0.5, margin: 0, align: "center", fontFace: BODYF, fontSize: 13.5, italic: true, color: MUTED,
  });
}

// ============================================================ 14. 노코드로 만들기
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 제작 · 01", "노코드로 에이전트 만들기");
  s.addText("코딩 없이도, 화면에서 블록을 연결해 나만의 에이전트를 만들 수 있습니다.", {
    x: M, y: 2.0, w: CW, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 15, color: BODY,
  });
  const steps = [
    ["역할 설정", "에이전트가 할 일과 말투를 글로 정의"],
    ["도구 연결", "검색·이메일·시트 등을 클릭으로 추가"],
    ["흐름 구성", "어떤 순서로 동작할지 블록 연결"],
    ["테스트·배포", "실행해 보고 공유 링크로 배포"],
  ];
  let y = 2.7;
  steps.forEach((st, i) => {
    s.addShape(pres.shapes.OVAL, { x: M, y, w: 0.65, h: 0.65, fill: { color: CORAL_SOFT } });
    s.addText(String(i + 1), { x: M, y, w: 0.65, h: 0.65, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 18, bold: true, color: CORAL });
    s.addText(st[0], { x: M + 0.95, y: y - 0.02, w: 3.5, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(st[1], { x: M + 4.4, y: y + 0.03, w: CW - 4.4, h: 0.55, margin: 0, valign: "middle", fontFace: BODYF, fontSize: 13.5, color: BODY });
    y += 0.95;
  });
  s.addText("대표 도구:  ChatGPT GPTs · Claude Projects · Dify · n8n · Make", {
    x: M, y: 6.55, w: CW, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 13, bold: true, color: CORAL,
  });
}

// ============================================================ 15. 코드로 만들기
{
  const s = newSlide();
  pageTag(s);
  header(s, "에이전트 제작 · 02", "코드로 만들기 (간단 예시)");
  s.addText("Python으로는 몇 줄이면 ‘도구를 쓰는 에이전트’의 뼈대를 만들 수 있습니다.", {
    x: M, y: 2.0, w: CW, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 14, color: BODY,
  });
  // code panel
  const cx = M, cy = 2.55, cwid = 7.3, chei = 4.0;
  s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cwid, h: chei, fill: { color: INK } });
  s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cwid, h: 0.45, fill: { color: INK2 } });
  s.addText("agent.py", { x: cx + 0.3, y: cy, w: 4, h: 0.45, margin: 0, valign: "middle", fontFace: MONO, fontSize: 11, color: "9AA7B4" });
  const code = [
    { text: "# 1) 도구 정의\n", options: { color: "8FB7A0", breakLine: true } },
    { text: "def search(q): ...   # 웹 검색\n", options: { color: "D6E0EA", breakLine: true } },
    { text: "\n", options: { breakLine: true } },
    { text: "# 2) 에이전트에 도구를 연결\n", options: { color: "8FB7A0", breakLine: true } },
    { text: "agent = Agent(\n", options: { color: "E6B17E", breakLine: true } },
    { text: "    model=\"claude\",\n", options: { color: "D6E0EA", breakLine: true } },
    { text: "    tools=[search],\n", options: { color: "D6E0EA", breakLine: true } },
    { text: ")\n", options: { color: "E6B17E", breakLine: true } },
    { text: "\n", options: { breakLine: true } },
    { text: "# 3) 목표만 주면 알아서 실행\n", options: { color: "8FB7A0", breakLine: true } },
    { text: "agent.run(\"경쟁사 가격을 조사해 표로 정리해줘\")", options: { color: "F2A98E" } },
  ];
  s.addText(code, { x: cx + 0.35, y: cy + 0.6, w: cwid - 0.7, h: chei - 0.8, margin: 0, fontFace: MONO, fontSize: 12.5, color: "D6E0EA", lineSpacingMultiple: 1.25 });

  // right notes
  const nx = cx + cwid + 0.5, nw = W - nx - M;
  const notes = [
    ["도구(tools)", "에이전트가 쓸 수 있는 기능 목록"],
    ["모델(model)", "판단을 담당하는 두뇌(LLM)"],
    ["run(목표)", "나머지는 에이전트가 스스로 처리"],
  ];
  let ny = 2.7;
  notes.forEach((nt) => {
    card(s, nx, ny, nw, 1.15);
    s.addShape(pres.shapes.RECTANGLE, { x: nx, y: ny, w: 0.09, h: 1.15, fill: { color: CORAL } });
    s.addText(nt[0], { x: nx + 0.3, y: ny + 0.18, w: nw - 0.5, h: 0.4, margin: 0, fontFace: MONO, fontSize: 14, bold: true, color: INK });
    s.addText(nt[1], { x: nx + 0.3, y: ny + 0.6, w: nw - 0.5, h: 0.45, margin: 0, fontFace: BODYF, fontSize: 12.5, color: MUTED });
    ny += 1.35;
  });
}

// ============================================================ 16. 활용 사례
{
  const s = newSlide();
  pageTag(s);
  header(s, "사례와 한계 · 01", "에이전트 활용 사례");
  const cases = [
    ["고객 응대", "문의를 이해하고 자료를 찾아 자동 답변·티켓 분류"],
    ["리서치 비서", "주제를 주면 자료 검색·요약·보고서 초안까지"],
    ["코딩 보조", "이슈를 받아 코드 수정·테스트·정리 제안"],
    ["업무 자동화", "메일·일정·문서를 연결해 반복 업무 처리"],
  ];
  const cols = 2, gx = 0.4, gy = 0.4;
  const cwid = (CW - gx) / cols, chei = 1.9, top = 2.1;
  cases.forEach((c, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = M + col * (cwid + gx), y = top + r * (chei + gy);
    card(s, x, y, cwid, chei);
    s.addShape(pres.shapes.OVAL, { x: x + 0.35, y: y + 0.35, w: 0.6, h: 0.6, fill: { color: CORAL } });
    s.addText(String(i + 1), { x: x + 0.35, y: y + 0.35, w: 0.6, h: 0.6, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 16, bold: true, color: WHITE });
    s.addText(c[0], { x: x + 1.15, y: y + 0.38, w: cwid - 1.4, h: 0.5, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 17, bold: true, color: INK });
    s.addText(c[1], { x: x + 0.4, y: y + 1.05, w: cwid - 0.8, h: 0.7, margin: 0, fontFace: BODYF, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.2 });
  });
}

// ============================================================ 17. 주의사항/한계/윤리
{
  const s = newSlide();
  pageTag(s);
  header(s, "사례와 한계 · 02", "주의사항 · 한계 · 윤리");
  const items = [
    ["환각(거짓 정보)", "그럴듯하지만 틀린 답을 낼 수 있음 → 사실 확인 필수"],
    ["개인정보·보안", "민감 정보는 입력 주의, 자료 유출 경계"],
    ["저작권·표절", "생성물의 출처와 권리를 반드시 확인"],
    ["편향", "학습 데이터의 편향이 결과에 반영될 수 있음"],
    ["사람의 책임", "최종 판단과 책임은 사람에게 있음"],
  ];
  let y = 2.1;
  items.forEach((it) => {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: 0.09, h: 0.78, fill: { color: CORAL } });
    s.addText(it[0], { x: M + 0.35, y: y, w: 4.2, h: 0.78, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 15.5, bold: true, color: INK });
    s.addText(it[1], { x: M + 4.7, y: y, w: CW - 4.7, h: 0.78, margin: 0, valign: "middle", fontFace: BODYF, fontSize: 13.5, color: BODY });
    y += 0.92;
  });
}

// ============================================================ 18. 마무리
{
  const s = newSlide(true);
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 1.6, w: 0.7, h: 0.16, fill: { color: CORAL } });
  s.addText("WRAP-UP", { x: M, y: 1.85, w: 6, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 13, bold: true, color: "9AA7B4", charSpacing: 2 });
  s.addText("작게 시작해서, 매일 써보세요", { x: M, y: 2.25, w: 11.5, h: 1.0, margin: 0, fontFace: HEAD, fontSize: 38, bold: true, color: WHITE });

  const next = [
    ["오늘 바로", "익숙한 도구 하나로 업무 한 가지를 AI에게 맡겨보기"],
    ["이번 주", "좋은 프롬프트 패턴(역할·맥락·형식)을 적용해 보기"],
    ["다음 단계", "노코드 도구로 나만의 간단한 에이전트 만들기"],
  ];
  let y = 3.7;
  next.forEach((nx, i) => {
    s.addShape(pres.shapes.OVAL, { x: M, y, w: 0.55, h: 0.55, fill: { color: CORAL } });
    s.addText(String(i + 1), { x: M, y, w: 0.55, h: 0.55, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 14, bold: true, color: WHITE });
    s.addText(nx[0], { x: M + 0.85, y: y - 0.02, w: 3, h: 0.55, margin: 0, valign: "middle", fontFace: HEAD, fontSize: 16, bold: true, color: CORAL });
    s.addText(nx[1], { x: M + 3.6, y: y, w: 9, h: 0.55, margin: 0, valign: "middle", fontFace: BODYF, fontSize: 14, color: "C7D0DA" });
    y += 0.85;
  });
  s.addText("질문은 언제든 — AI는 가장 인내심 많은 선생님입니다.", { x: M, y: 6.6, w: 11.5, h: 0.4, margin: 0, fontFace: BODYF, fontSize: 13, italic: true, color: "8B98A6" });
}

const out = "C:/Users/atlia/Desktop/AI활용법과_에이전트만들기.pptx";
pres.writeFile({ fileName: out }).then((f) => console.log("SAVED:", f)).catch((e) => { console.error(e); process.exit(1); });
