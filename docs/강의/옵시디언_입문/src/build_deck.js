// 옵시디언 입문 강의 슬라이드 15장. 다음 순서로 돌린다:
// make_screens.py → build_deck.js → add_motion.py
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const OUT = process.argv[2];
const screen = (name) => path.join(__dirname, "screens", name + ".png");

const COLORS = {
  bg: "0A0D14", panel: "141A26", line: "2A3446", text: "F2F5FA", muted: "A3AEC0",
  purple: "A88BFA", amber: "E8B04A",
};
const THEME = {
  name: "Obsidian Lecture", headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic",
  colors: {
    dk1: COLORS.bg, lt1: COLORS.text, dk2: COLORS.panel, lt2: COLORS.muted,
    accent1: COLORS.purple, accent2: COLORS.muted, accent3: COLORS.amber,
    accent4: COLORS.line, accent5: "5B6B85", accent6: "1C2433", hlink: COLORS.purple, folHlink: COLORS.muted,
  },
};
const FONT = "Malgun Gothic";
const CODE = "Consolas";
const TOTAL = 15;

async function icon(Comp, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "생각을 잇는 나만의 노트, 옵시디언";
  pres.author = "메타루카";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

  const track = { x: 0.6, y: 7.1, w: 11.2, h: 0.05 };
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: COLORS.bg },
    objects: [
      { rect: { x: track.x, y: track.y, w: track.w, h: track.h, fill: { color: COLORS.line } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.68, w: 12.1, h: 0.8, fontFace: FONT, fontSize: 34, bold: false, color: COLORS.text, margin: 0, valign: "middle", align: "left" }, text: "" } },
    ],
    slideNumber: { x: 12.1, y: 6.95, w: 0.65, h: 0.35, fontFace: FONT, fontSize: 11, color: COLORS.muted, align: "right" },
  });
  pres.defineSlideMaster({
    title: "COVER",
    background: { color: COLORS.bg },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.95, w: 7.1, h: 2.2, fontFace: FONT, fontSize: 46, bold: false, color: COLORS.text, margin: 0, valign: "top", align: "left" }, text: "" } },
    ],
  });

  // 슬라이드 위 작은 머리말은 옵시디언 링크 모양 [[주제]]로 쓴다. 진행 표시는 모핑 전환 때 이어서 늘어난다.
  function addSlide(n, title, eyebrow, master = "CONTENT") {
    const s = pres.addSlide({ masterName: master });
    if (master === "CONTENT") {
      s.addShape(pres.ShapeType.rect, { x: track.x, y: track.y, w: track.w * n / TOTAL, h: track.h, fill: { color: COLORS.purple }, line: { color: COLORS.purple, width: 0 }, objectName: "!!progress" });
      s.addText(`[[${eyebrow}]]`, { x: 0.6, y: 0.36, w: 9, h: 0.32, fontFace: CODE, fontSize: 13, color: COLORS.muted, margin: 0, isTextBox: true, objectName: "eyebrow" });
    }
    s.addText(title, { placeholder: "title" });
    return s;
  }

  const card = (s, x, y, w, h, step, opt = {}) => s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.14, fill: { color: opt.fill || COLORS.panel }, line: { color: opt.line || COLORS.line, width: opt.lineW || 1 }, objectName: `A${step}|카드`,
  });
  const text = (s, t, x, y, w, h, step, opt = {}) => s.addText(t, {
    x, y, w, h, fontFace: opt.font || FONT, fontSize: opt.size || 15, color: opt.color || COLORS.text, bold: !!opt.bold, margin: 0, valign: opt.valign || "top", align: opt.align || "left", isTextBox: true,
    lineSpacingMultiple: opt.spacing, objectName: step === null ? (opt.name || "글상자") : `A${step}|${opt.name || "글"}`,
  });
  const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));
  async function badge(s, Comp, x, y, step, d = 0.62) {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: COLORS.bg }, line: { color: COLORS.line, width: 1 }, objectName: `A${step}|아이콘 원` });
    s.addImage({ data: await icon(Comp, COLORS.muted), x: x + d * 0.27, y: y + d * 0.27, w: d * 0.46, h: d * 0.46, objectName: `A${step}|아이콘`, altText: "아이콘" });
  }
  const numDot = (s, n, x, y, step, d = 0.46) => {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: COLORS.panel }, line: { color: COLORS.line, width: 1 }, objectName: `A${step}|번호 원` });
    text(s, String(n), x, y, d, d, step, { size: 13, font: CODE, color: COLORS.text, align: "center", valign: "middle", name: "번호" });
  };
  // 옵시디언 실제 화면. 상자 안에 비율을 지켜 가운데로 넣고, 실제로 차지한 자리를 돌려준다.
  async function shot(s, name, box, step, alt, align = "center") {
    const { width, height } = await sharp(screen(name)).metadata();
    const scale = Math.min(box.w / width, box.h / height);
    const w = width * scale, h = height * scale;
    const x = align === "left" ? box.x : box.x + (box.w - w) / 2;
    const y = box.y + (box.h - h) / 2;
    s.addImage({ path: screen(name), x, y, w, h, objectName: `A${step}|앱 화면`, altText: alt });
    return { x, y, w, h };
  }
  const caption = (s, t, r, step) => text(s, t, r.x, r.y + r.h + 0.06, r.w, 0.28, step, { size: 12, color: COLORS.muted, align: "center", name: "화면 설명" });
  const source = (s, t) => text(s, t, 0.6, 6.62, 11.3, 0.3, null, { size: 11, color: COLORS.muted, name: "출처" });
  // 번호 붙은 짧은 설명 목록. 슬라이드 오른쪽 설명 칸에 쓴다.
  function steps(s, items, x, y, w, gap, startStep) {
    items.forEach(([head, body], i) => {
      const yy = y + i * gap;
      numDot(s, i + 1, x, yy, startStep + i);
      text(s, head, x + 0.62, yy - 0.02, w - 0.62, 0.4, startStep + i, { size: 18, bold: true });
      text(s, body, x + 0.62, yy + 0.4, w - 0.62, gap - 0.45, startStep + i, { size: 14, color: COLORS.muted, spacing: 1.15 });
    });
  }

  // 1. 표지
  {
    const s = addSlide(1, "생각을 잇는\n나만의 노트,\n옵시디언", "", "COVER");
    text(s, "옵시디언 1.14", 0.7, 1.4, 7, 0.35, 1, { size: 14, font: CODE, color: COLORS.muted, name: "머리말" });
    text(s, "설치부터 링크, 대시보드, AI와 함께 쓰기까지", 0.7, 4.45, 7, 0.4, 2, { size: 18, color: COLORS.muted, name: "부제" });
    text(s, "2026년 11월 기준", 0.7, 5.0, 7, 0.35, 3, { size: 14, color: COLORS.muted, name: "기준일" });
    await shot(s, "graph", { x: 7.3, y: 1.3, w: 5.45, h: 4.9 }, 2, "강사 보관함의 실제 그래프 뷰");
    s.addNotes("이번에는 옵시디언이라는 노트 앱을 배워 볼게요. 앞에서 안티그라비티로 AI에게 일을 시켜 봤는데요, 옵시디언은 그 AI가 일한 결과와 내 생각을 차곡차곡 모아 두는 창고예요. 오늘 보여 드리는 화면은 전부 제가 실제로 쓰는 보관함을 찍은 거예요.");
  }

  // 2. 무엇이 다른가
  {
    const s = addSlide(2, "메모 앱과 다른 점 세 가지", "무엇인가");
    const rows = [
      [fa.FaFolderOpen, "내 컴퓨터에 저장", "노트가 글자 파일(.md)로 내 폴더에\n저장돼요. 회사 서버에 갇히지 않아요."],
      [fa.FaLink, "링크로 연결", "[[ ]]로 노트끼리 이으면\n생각이 지도처럼 연결돼요."],
      [fa.FaGift, "무료", "가입 없이 무료로 써요.\n일에 써도 돈을 안 내도 돼요."],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 1.85, 3.9, 2.75, i);
      await badge(s, rows[i][0], x + 0.3, 2.1, i);
      text(s, rows[i][1], x + 0.3, 2.85, 3.3, 0.45, i, { size: 21, bold: true });
      text(s, rows[i][2], x + 0.3, 3.4, 3.4, 1.0, i, { size: 15, color: COLORS.muted, spacing: 1.2 });
    }
    card(s, 0.6, 4.95, 12.12, 1.35, 3);
    await badge(s, fa.FaRobot, 0.9, 5.3, 3);
    text(s, "그래서 AI와 궁합이 좋아요", 1.75, 5.18, 10.5, 0.42, 3, { size: 19, bold: true });
    text(s, "노트가 그냥 글자 파일이라 안티그라비티 같은 AI가 바로 읽고, 고치고, 새로 써 줄 수 있어요.", 1.75, 5.65, 10.7, 0.4, 3, { size: 15 });
    source(s, "출처: obsidian.md 요금 안내(2026.11.6 확인). 상업적 사용도 라이선스 구매가 필수가 아니라고 안내해요.");
    s.addNotes("옵시디언은 메모 앱처럼 보이지만 세 가지가 달라요. 첫째, 노트가 내 컴퓨터 폴더에 평범한 글자 파일로 저장돼요. 둘째, 노트끼리 링크로 이을 수 있어요. 셋째, 무료예요. 그리고 이게 오늘 강의와 연결되는 포인트인데요, 파일이 평범한 글자라서 AI가 아주 잘 읽고 써요. 안티그라비티에게 옵시디언 폴더를 맡기면 노트 정리를 대신 해 줘요.");
  }

  // 3. 설치
  {
    const s = addSlide(3, "1단계: 설치하고 보관함 만들기", "설치");
    steps(s, [
      ["obsidian.md에서 설치", "가입 없이 내 운영체제용 파일을 받아 설치해요."],
      ["보관함 만들기", "노트를 모아 둘 폴더예요. 이름과 위치만 정하면 돼요."],
      ["새 노트 쓰기", "파일 목록 위 연필 버튼(①)을 누르면 새 노트가 생겨요."],
    ], 0.7, 2.0, 7.6, 1.4, 0);
    card(s, 0.6, 6.0, 7.8, 0.55, 3, { fill: COLORS.bg, line: COLORS.line });
    text(s, "보관함 = 내 노트가 들어 있는 폴더 하나. 영어로는 볼트(Vault)라고 해요.", 0.85, 6.06, 7.4, 0.42, 3, { size: 14, color: COLORS.muted, valign: "middle" });
    const r = await shot(s, "explorer", { x: 9.0, y: 1.6, w: 3.7, h: 4.85 }, 4, "옵시디언 왼쪽 파일 목록과 새 노트 버튼");
    caption(s, "실제 파일 목록 화면", r, 4);
    s.addNotes("공식 사이트 obsidian.md에서 내려받아 설치해요. 처음 열면 보관함을 만들라고 하는데요, 보관함은 그냥 노트를 모아 둘 폴더예요. 이름은 내 노트 정도로 정하면 돼요. 그다음 파일 목록 위에 있는 연필 모양 버튼을 누르면 새 노트가 생겨요.\n\n[강사 확인 필요] 첫 실행 화면의 버튼 이름은 설치 버전에 따라 조금 다를 수 있어요. 강의 PC에서 미리 한 번 열어 보세요.");
  }

  // 4. 화면 둘러보기
  {
    const s = addSlide(4, "화면은 이렇게 생겼어요", "화면");
    await shot(s, "tour", { x: 0.6, y: 1.65, w: 7.9, h: 5.2 }, 0, "옵시디언 전체 화면에 번호 다섯 개를 표시한 그림", "left");
    steps(s, [
      ["파일 목록", "보관함 안의 노트가 다 모여 있어요."],
      ["노트", "가운데에서 글을 쓰고 읽어요."],
      ["그래프 버튼", "노트 연결 지도를 열어요."],
      ["읽기 보기", "책 아이콘으로 편집과 읽기를 오가요."],
      ["상태줄", "백링크 수와 글자 수가 보여요."],
    ], 8.85, 1.75, 4.0, 1.03, 1);
    s.addNotes("화면은 크게 다섯 군데만 알면 돼요. 왼쪽에 파일 목록, 가운데에 노트, 맨 왼쪽 세로줄에 그래프 버튼, 오른쪽 위에 읽기 보기 버튼, 그리고 오른쪽 아래 상태줄이에요. 상태줄의 백링크는 조금 뒤에 링크를 배울 때 다시 볼게요.");
  }

  // 5. 노트 쓰기
  {
    const s = addSlide(5, "기호 몇 개면 노트가 깔끔해져요", "노트 쓰기");
    const rows = [
      ["# 제목", "큰 제목"],
      ["- 내용", "목록"],
      ["- [ ] 할 일", "체크박스"],
      ["> [!tip] 제목", "강조 상자"],
      ["#태그", "태그"],
    ];
    text(s, "이렇게 치면", 0.75, 1.75, 3.2, 0.36, 0, { size: 14, bold: true, color: COLORS.muted });
    text(s, "이렇게 보여요", 4.3, 1.75, 2.5, 0.36, 0, { size: 14, bold: true, color: COLORS.muted });
    rows.forEach(([code, look], i) => {
      const y = 2.2 + i * 0.86;
      card(s, 0.6, y, 6.4, 0.72, i + 1);
      text(s, code, 0.85, y, 3.3, 0.72, i + 1, { size: 18, font: CODE, color: COLORS.text, valign: "middle", name: "기호" });
      text(s, look, 4.3, y, 2.5, 0.72, i + 1, { size: 17, bold: true, valign: "middle" });
    });
    const r = await shot(s, "note_basic", { x: 7.35, y: 1.7, w: 5.4, h: 4.75 }, 6, "체크박스와 강조 상자, 태그가 들어간 실제 노트");
    caption(s, "위 기호로 쓴 실제 노트", r, 6);
    s.addNotes("옵시디언 노트는 마크다운이라는 간단한 기호로 꾸며요. 다 외울 필요 없고 다섯 개면 충분해요. 샵 하나에 띄어쓰기를 하면 제목, 줄표는 목록, 줄표 대괄호는 체크박스예요. 꺾쇠에 느낌표 tip을 쓰면 오른쪽처럼 색깔 상자가 생겨요. 띄어쓰기 없이 샵을 붙이면 태그가 돼요.");
  }

  // 6. 링크
  {
    const s = addSlide(6, "[[ ]] 두 번이면 노트가 이어져요", "링크");
    const r = await shot(s, "links", { x: 0.6, y: 1.7, w: 6.9, h: 4.75 }, 0, "파란 링크 세 개에 테두리를 친 실제 노트", "left");
    caption(s, "테두리 친 파란 글자가 링크예요", r, 0);
    steps(s, [
      ["[[ 를 두 번 쳐요", "노트 이름 목록이 떠요."],
      ["목록에서 골라요", "파란 링크가 생기고, 누르면 그 노트로 가요."],
      ["없는 이름도 괜찮아요", "링크를 누르면 그 이름으로 새 노트가 생겨요."],
      ["백링크로 거꾸로 봐요", "상태줄의 'n개 백링크'는 나를 가리키는 노트 수예요."],
    ], 7.95, 1.8, 4.8, 1.18, 1);
    s.addNotes("옵시디언의 핵심이 링크예요. 대괄호를 두 번 치면 노트 목록이 뜨고, 고르면 파란 링크가 돼요. 아직 없는 노트 이름을 써도 괜찮아요. 링크를 누르는 순간 새 노트가 만들어져요. 반대로 나를 가리키는 노트가 몇 개인지는 상태줄의 백링크 숫자로 볼 수 있어요.");
  }

  // 7. 그래프 뷰
  {
    const s = addSlide(7, "그래프 뷰: 한눈에 보는 내 지식 지도", "그래프 뷰");
    const r = await shot(s, "graph", { x: 0.6, y: 1.65, w: 7.2, h: 5.0 }, 0, "실제 보관함의 그래프 뷰. 프로젝트별로 색이 다른 점들이 선으로 이어져 있다", "left");
    caption(s, "강사 보관함의 실제 그래프 뷰", r, 0);
    const items = [
      ["점 하나 = 노트 하나", COLORS.text],
      ["선 = 링크", COLORS.text],
      ["큰 점 = 많이 연결된 노트", COLORS.text],
      ["색 = 라벨별로 칠할 수 있어요", COLORS.text],
    ];
    items.forEach(([t, c], i) => {
      card(s, 8.2, 1.75 + i * 0.86, 4.55, 0.7, i + 1);
      text(s, t, 8.45, 1.75 + i * 0.86, 4.2, 0.7, i + 1, { size: 17, bold: true, color: c, valign: "middle" });
    });
    text(s, "토스 미니앱 파랑 · 웹앱 초록 · 웹소설 분홍\n전자책 주황 · 대시보드 금색", 8.2, 5.35, 4.6, 0.8, 5, { size: 14, color: COLORS.muted, spacing: 1.2 });
    s.addNotes("왼쪽 세로줄의 그래프 버튼을 누르면 이런 지도가 나와요. 점 하나가 노트 하나, 선이 링크예요. 선이 많이 모인 큰 점은 여러 노트를 묶는 대시보드예요. 저는 라벨별로 색을 칠해 뒀어요. 토스 미니앱은 파랑, 웹앱은 초록, 웹소설은 분홍이에요. 노트가 쌓일수록 내 관심사가 어디에 몰려 있는지 눈에 보여요.");
  }

  // 8. 속성
  {
    const s = addSlide(8, "속성: 노트에 라벨 붙이기", "속성");
    const r = await shot(s, "props", { x: 0.6, y: 1.75, w: 6.6, h: 4.3 }, 0, "type, 상태, 플랫폼, 분류 속성이 붙은 실제 노트", "left");
    caption(s, "실제 노트 「심연의 타로」의 속성", r, 0);
    const rows = [
      ["type", "무슨 노트?", "프로젝트, 배움, 회고"],
      ["상태", "어디까지?", "진행중, 완결, 배포완료"],
      ["플랫폼", "어디에?", "앱인토스, 문피아"],
    ];
    rows.forEach(([k, q, ex], i) => {
      const y = 1.8 + i * 1.05;
      card(s, 7.6, y, 5.15, 0.9, i + 1);
      text(s, k, 7.85, y, 1.4, 0.9, i + 1, { size: 18, font: CODE, color: COLORS.text, valign: "middle" });
      text(s, q, 9.25, y + 0.1, 3.3, 0.36, i + 1, { size: 16, bold: true });
      text(s, ex, 9.25, y + 0.47, 3.4, 0.34, i + 1, { size: 13, color: COLORS.muted });
    });
    text(s, "노트 위 '+ 속성 추가'를 누르면 붙일 수 있어요.\n이 라벨이 다음 장 대시보드의 재료예요.", 7.6, 5.05, 5.2, 0.8, 4, { size: 15, color: COLORS.muted, spacing: 1.2 });
    s.addNotes("속성은 노트에 붙이는 이름표예요. 저는 세 가지만 써요. type은 무슨 노트인지, 상태는 어디까지 왔는지, 플랫폼은 어디에 올렸는지예요. 노트 위에 있는 속성 추가를 누르면 붙일 수 있어요. 이 이름표가 다음 장에서 볼 대시보드의 재료가 돼요.");
  }

  // 9. 대시보드 원리
  {
    const s = addSlide(9, "대시보드: 라벨만 붙이면 표가 저절로", "대시보드");
    card(s, 0.6, 1.75, 5.6, 2.9, 0, { fill: "0F141E" });
    text(s, "대시보드 노트에 이 코드를 붙여요", 0.85, 1.9, 5.2, 0.34, 0, { size: 13, bold: true, color: COLORS.muted });
    text(s, "```dataview\ntable 상태, 날짜, 별점\nfrom \"강의 예시\"\nwhere type = \"배움\"\nsort 날짜 asc\n```", 0.85, 2.35, 5.2, 2.15, 0, { size: 16, font: CODE, color: COLORS.text, spacing: 1.2, name: "코드" });
    const r = await shot(s, "dash_mine", { x: 6.6, y: 1.75, w: 6.15, h: 3.15 }, 1, "type이 배움인 노트 네 개가 표로 모인 대시보드");
    caption(s, "코드가 만든 실제 표", r, 1);
    const flow = [
      ["Dataview 설치", "설정 → 커뮤니티 플러그인에서\n찾아 설치하고 켜요"],
      ["코드 붙이기", "대시보드 노트에\n위 코드를 붙여요"],
      ["라벨만 붙이기", "새 노트에 type: 배움을 달면\n표에 저절로 들어와요"],
    ];
    flow.forEach(([h, b], i) => {
      const x = 0.6 + i * 4.11;
      card(s, x, 5.0, 3.9, 1.45, i + 2);
      numDot(s, i + 1, x + 0.22, 5.18, i + 2, 0.42);
      text(s, h, x + 0.78, 5.15, 3.0, 0.4, i + 2, { size: 17, bold: true });
      text(s, b, x + 0.25, 5.65, 3.5, 0.75, i + 2, { size: 13, color: COLORS.muted, spacing: 1.15 });
    });
    s.addNotes("대시보드는 표가 자동으로 만들어지는 노트예요. Dataview라는 플러그인을 쓰는데요, 설정의 커뮤니티 플러그인에서 찾아 설치하고 켜면 돼요. 대시보드 노트에 이 짧은 코드를 붙이면, type이 배움인 노트를 전부 찾아서 표로 보여 줘요. 그다음부터는 새 노트에 라벨만 달면 끝이에요. 표를 손으로 고칠 일이 없어요.\n\n[참고] 코드는 외우지 않아도 돼요. AI에게 '이런 표를 만들어 줘'라고 하면 써 줘요.");
  }

  // 10. 사례: 토스 미니앱
  {
    const s = addSlide(10, "실제 사례: 토스 미니앱 16개를 한 표로", "실제 사례");
    const r = await shot(s, "dash_toss", { x: 0.6, y: 1.65, w: 6.2, h: 5.0 }, 0, "토스 미니앱 16개의 상태와 분류가 한 표로 정리된 대시보드", "left");
    caption(s, "강사의 실제 「토스 미니앱」 대시보드", r, 0);
    text(s, "16", 7.4, 1.7, 2.4, 1.3, 1, { size: 80, bold: true, color: COLORS.purple, name: "숫자" });
    text(s, "개 앱, 전부 배포완료", 8.85, 2.25, 3.9, 0.6, 1, { size: 22, bold: true });
    steps(s, [
      ["앱 하나 = 노트 하나", "앱마다 노트를 하나씩 만들었어요."],
      ["라벨 세 줄", "type, 상태, 플랫폼: 앱인토스만 적었어요."],
      ["표는 저절로", "새 앱 노트를 만들면 이 표에 바로 들어와요."],
    ], 7.45, 3.35, 5.3, 1.05, 2);
    s.addNotes("이건 제가 실제로 쓰는 대시보드예요. 토스에 올린 미니앱 16개가 한 표에 다 모여 있어요. 제가 한 일은 앱마다 노트를 만들고 라벨 세 줄을 단 것뿐이에요. 표는 옵시디언이 알아서 만들어요. 앱을 하나 더 만들면 노트 하나만 추가하면 돼요.");
  }

  // 11. 사례: 웹소설
  {
    const s = addSlide(11, "새 연재를 넣었더니 표가 알아서 늘었어요", "실제 사례");
    const r = await shot(s, "dash_novel", { x: 0.6, y: 1.7, w: 7.2, h: 4.6 }, 0, "웹소설 여섯 편이 정리된 대시보드. 새로 추가한 작품 줄에 테두리가 있다", "left");
    caption(s, "테두리 친 줄이 오늘 넣은 새 연재예요", r, 0);
    text(s, "5편", 8.3, 1.75, 1.7, 1.0, 1, { size: 50, bold: true, color: COLORS.muted, name: "전" });
    text(s, "→", 9.85, 1.75, 0.8, 1.0, 1, { size: 44, bold: true, color: COLORS.muted, align: "center", name: "화살표" });
    text(s, "6편", 10.6, 1.75, 2.2, 1.0, 1, { size: 50, bold: true, color: COLORS.purple, name: "후" });
    steps(s, [
      ["노트 하나 추가", "「이름없는 제물에게 신이 내렸다」 노트에 플랫폼: 네이버웹소설을 적었어요."],
      ["상태만 바꾸기", "끝난 작품은 상태를 '완결'로 바꿨어요."],
      ["표는 손 안 댐", "대시보드 표는 한 글자도 고치지 않았어요."],
    ], 8.3, 3.05, 4.5, 1.15, 2);
    s.addNotes("이 장은 강의 자료를 만들던 바로 그날 생긴 일이에요. 네이버에 새 연재를 시작해서 노트를 하나 추가했더니, 웹소설 대시보드가 5편에서 6편으로 저절로 늘었어요. 완결된 작품들은 상태만 완결로 바꿨고요. 표 자체는 한 글자도 안 고쳤어요. 이게 대시보드를 쓰는 이유예요.");
  }

  // 12. 대시보드 여러 개
  {
    const s = addSlide(12, "대시보드를 여러 개로 나눠 써요", "대시보드 나누기");
    // 점 색은 그래프 뷰의 묶음 색과 맞춘다
    const hubs = [["내 프로젝트", "전체", "E8B04A"], ["토스 미니앱", "16", "4F8EF7"], ["내 웹앱", "9", "3FB950"], ["내 웹소설", "6", "D86FD0"], ["내 전자책", "1", "F0883E"]];
    hubs.forEach(([name, n, c], i) => {
      const x = 0.6 + i * 2.45;
      card(s, x, 1.7, 2.25, 1.1, i);
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.22, y: 1.92, w: 0.14, h: 0.14, fill: { color: c }, line: { color: c, width: 0 }, objectName: `A${i}|그래프 색` });
      text(s, name, x + 0.46, 1.8, 1.7, 0.4, i, { size: 16, bold: true });
      text(s, n === "전체" ? "모든 대시보드의 위" : n + "개", x + 0.22, 2.25, 1.9, 0.4, i, { size: 14, color: COLORS.muted });
    });
    const boxes = [["dash_web", "「내 웹앱」 9개"], ["dash_channel", "「내 채널」 역할별 정리"], ["dash_ebook", "「내 전자책」"]];
    for (let i = 0; i < 3; i++) {
      const r = await shot(s, boxes[i][0], { x: 0.6 + i * 4.11, y: 3.1, w: 3.9, h: 3.0 }, 5 + i, boxes[i][1] + " 대시보드 화면");
      caption(s, boxes[i][1], r, 5 + i);
    }
    s.addNotes("저는 대시보드를 하나로 몰아 두지 않고 주제별로 나눠요. 맨 위에 내 프로젝트가 있고, 그 아래에 토스 미니앱, 웹앱, 웹소설, 전자책 대시보드가 있어요. 각 노트 맨 아래에 '상위: 어느 대시보드'라고 링크를 달아 두면 그래프 뷰에서도 묶음이 예쁘게 보여요. 블로그와 SNS 채널도 이렇게 따로 정리해요.");
  }

  // 13. Bases
  {
    const s = addSlide(13, "플러그인 없이 쓰는 표, 베이스(Bases)", "베이스");
    const r = await shot(s, "bases", { x: 0.6, y: 1.65, w: 12.12, h: 3.45 }, 0, "상태별로 묶인 베이스 표 화면. 위쪽에 정렬, 그룹, 필터 버튼이 있다");
    caption(s, "상태별로 묶은 실제 베이스 화면", r, 0);
    const cards = [
      [fa.FaCube, "기본 기능", "설치 없이 옵시디언에\n들어 있어요."],
      [fa.FaArrowDownWideShort, "버튼으로 정리", "정렬·그룹·필터를\n눌러서 바꿔요."],
      [fa.FaTableColumns, "보기 바꾸기", "표, 카드에 1.14부터\n칸반 보기도 생겼어요."],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 5.55, 3.9, 1.3, i + 1);
      await badge(s, cards[i][0], x + 0.22, 5.78, i + 1, 0.55);
      text(s, cards[i][1], x + 0.95, 5.66, 2.8, 0.38, i + 1, { size: 17, bold: true });
      text(s, cards[i][2], x + 0.95, 6.05, 2.85, 0.75, i + 1, { size: 13, color: COLORS.muted, spacing: 1.1 });
    }
    s.addNotes("코드가 부담스러우면 베이스를 쓰면 돼요. 옵시디언에 기본으로 들어 있는 표 기능이라 플러그인을 안 깔아도 돼요. 위쪽 버튼으로 정렬하고, 상태별로 묶고, 필터를 걸 수 있어요. 10월에 나온 1.14 버전부터는 칸반 보기도 생겼어요. 처음 시작하는 분은 베이스부터, 익숙해지면 Dataview를 써 보세요.\n\n[출처] obsidian.md 변경 기록 1.14(2026.10.5) 칸반 보기 추가.");
  }

  // 14. AI와 함께
  {
    const s = addSlide(14, "안티그라비티와 함께 쓰기", "AI와 함께");
    steps(s, [
      ["보관함 폴더를 열어요", "안티그라비티에서 옵시디언 보관함 폴더를 프로젝트로 열어요."],
      ["말로 부탁해요", "\"오늘 한 일을 회고 노트로 써 줘\"\n\"노트마다 type 라벨 붙여 줘\""],
      ["옵시디언에서 바로 봐요", "AI가 만든 노트가 파일 목록과 대시보드에 바로 나타나요."],
    ], 0.7, 1.85, 6.6, 1.35, 0);
    card(s, 0.6, 5.9, 6.8, 0.65, 3);
    text(s, "처음엔 보관함을 복사해서 연습하고, 허용 창은 읽고 누르세요.", 0.85, 5.9, 6.4, 0.65, 3, { size: 14, color: COLORS.amber, valign: "middle" });
    const r = await shot(s, "retro", { x: 7.75, y: 1.65, w: 5.0, h: 4.75 }, 4, "AI가 써 준 회고 노트. 속성과 제목, 요약이 정리되어 있다");
    caption(s, "AI가 써 준 실제 회고 노트", r, 4);
    s.addNotes("앞에서 배운 안티그라비티와 합치면 더 편해져요. 안티그라비티에서 옵시디언 보관함 폴더를 열고 말로 부탁하면, AI가 노트를 쓰고 라벨까지 붙여 줘요. 오른쪽은 실제로 AI가 써 준 제 회고 노트예요. 옵시디언에서 열면 바로 보여요. 다만 처음에는 보관함을 복사해서 연습하시고, 허용 창은 꼭 읽고 누르세요.\n\n[강사 확인 필요] 오른쪽 회고 노트와 강의 예시 노트는 클로드 코드로 만들었어요. 안티그라비티도 폴더의 파일을 만들고 고치는 방식이라 똑같이 쓸 수 있어요. 강의 전에 안티그라비티로 한 번 직접 해 보고 화면을 찍어 두면 더 좋아요.");
  }

  // 15. 실습과 요금
  {
    const s = addSlide(15, "지금 실습, 그리고 요금 한눈에", "실습");
    const list = [
      "새 보관함을 하나 만들어요",
      "노트 3개: 오늘 수업, 노트북LM, 안티그라비티",
      "[[ ]]로 세 노트를 서로 이어요",
      "왼쪽 그래프 버튼으로 지도를 열어요",
      "노트에 type: 배움 속성을 붙여요",
    ];
    list.forEach((t, i) => {
      const y = 1.8 + i * 0.93;
      card(s, 0.6, y, 7.3, 0.8, i);
      numDot(s, i + 1, 0.8, y + 0.17, i);
      text(s, t, 1.52, y, 6.25, 0.8, i, { size: 16, bold: true, valign: "middle" });
    });
    card(s, 8.3, 1.8, 4.45, 4.52, 5);
    text(s, "요금", 8.55, 1.95, 3.9, 0.42, 5, { size: 19, bold: true });
    const plans = [["옵시디언 앱", "무료", "일에 써도 무료"], ["Sync", "월 4달러", "기기끼리 동기화(연 결제)"], ["Publish", "월 8달러", "웹에 공개(연 결제)"]];
    plans.forEach(([n, p, d], i) => {
      const y = 2.5 + i * 0.95;
      text(s, n, 8.55, y, 2.0, 0.38, 6 + i, { size: 16, bold: true });
      text(s, p, 10.5, y, 2.1, 0.38, 6 + i, { size: 16, bold: true, color: i === 0 ? COLORS.purple : COLORS.text, align: "right" });
      text(s, d, 8.55, y + 0.4, 4.0, 0.34, 6 + i, { size: 13, color: COLORS.muted });
    });
    text(s, "무료로 맞추려면 보관함을 원드라이브나 구글 드라이브 폴더에 두세요. 두 기기에서 같은 노트를 동시에 고치지는 마세요.", 8.55, 5.35, 4.0, 0.9, 9, { size: 12, color: COLORS.muted, spacing: 1.1 });
    source(s, "요금 출처: obsidian.md/pricing(2026.11.6 확인, 연 결제 기준 달러 가격). 결제 전 다시 확인하세요.");
    s.addNotes("이제 직접 해 볼게요. 새 보관함을 만들고, 오늘 배운 세 가지로 노트 세 개를 만들어요. 대괄호 두 번으로 서로 이은 다음 그래프 버튼을 눌러 보세요. 점 세 개가 선으로 이어져 있으면 성공이에요. 마지막으로 type: 배움 속성을 붙여 보세요. 먼저 끝낸 분은 베이스로 표를 만들어 보세요.\n\n요금은 간단해요. 앱은 무료고 일에 써도 돼요. 여러 기기에서 쓰고 싶으면 Sync가 월 4달러인데, 원드라이브 같은 폴더에 보관함을 두면 무료로도 맞출 수 있어요. 다만 두 기기에서 같은 노트를 동시에 고치면 충돌이 날 수 있어요.\n\n[강사 준비물] 컴퓨터실 PC에 옵시디언이 깔려 있는지, 커뮤니티 플러그인 설치가 막혀 있지 않은지 확인해 주세요.");
  }

  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
