// 구글 안티그라비티 입문 강의 슬라이드 15장. 다음 순서로 돌린다:
// make_gifs.py → make_screens.py → build_deck.js → add_motion.py (build_all.sh)
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const OUT = process.argv[2];
const gif = (name) => path.join(__dirname, "gifs", name);
const screen = (name) => path.join(__dirname, "screens", name + ".png");

const COLORS = {
  bg: "0A0D14", panel: "151A26", line: "2A3446", text: "F2F5FA", muted: "A3AEC0",
  sky: "5AA9FF", coral: "FF7A59", amber: "FFC857",
};
const THEME = {
  name: "Antigravity Lecture", headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic",
  colors: {
    dk1: COLORS.bg, lt1: COLORS.text, dk2: COLORS.panel, lt2: COLORS.muted,
    accent1: COLORS.sky, accent2: COLORS.coral, accent3: COLORS.amber,
    accent4: COLORS.line, accent5: "5B6B85", accent6: "1C2433", hlink: COLORS.sky, folHlink: COLORS.coral,
  },
};
const FONT = "Malgun Gothic";
const TOTAL = 28;

async function icon(Comp, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "말 한마디로 일 시키는 구글 안티그라비티";
  pres.author = "메타루카";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

  const track = { x: 0.6, y: 7.1, w: 11.2, h: 0.05 };
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: COLORS.bg },
    objects: [
      { rect: { x: track.x, y: track.y, w: track.w, h: track.h, fill: { color: COLORS.line } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.68, w: 12.1, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: COLORS.text, margin: 0, valign: "middle", align: "left" }, text: "" } },
    ],
    slideNumber: { x: 12.1, y: 6.95, w: 0.65, h: 0.35, fontFace: FONT, fontSize: 11, color: COLORS.muted, align: "right" },
  });
  pres.defineSlideMaster({
    title: "COVER",
    background: { color: COLORS.bg },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.95, w: 7.1, h: 2.2, fontFace: FONT, fontSize: 46, bold: true, color: COLORS.text, margin: 0, valign: "top", align: "left" }, text: "" } },
    ],
  });

  // 슬라이드마다 자리를 옮기는 빛 덩어리와 진행 표시. 같은 이름이라 모핑 전환 때 이어서 움직인다. GIF 자리는 피한다.
  const orbSpots = [[1.6, 3.6], [9.8, -1.4], [-1.2, 3.6], [8.8, 3.9], [3.8, -1.8], [10.0, 0.6], [-1.6, 0.6], [9.2, 4.0], [-1.8, 3.6], [9.6, -1.2], [4.6, 4.0], [9.6, 4.0], [4.6, 4.0], [9.6, 4.0], [3.0, 4.2]];

  let slideNo = 0;
  function addSlide(_n, title, eyebrow, master = "CONTENT") {
    const s = pres.addSlide({ masterName: master });
    const n = ++slideNo;
    const [ox, oy] = orbSpots[(n - 1) % orbSpots.length];
    s.addShape(pres.ShapeType.ellipse, { x: ox, y: oy, w: 5.2, h: 5.2, fill: { color: n % 2 ? COLORS.coral : COLORS.sky, transparency: 94 }, line: { color: COLORS.bg, transparency: 100 }, objectName: "!!orb" });
    if (master === "CONTENT") {
      s.addShape(pres.ShapeType.rect, { x: track.x, y: track.y, w: track.w * n / TOTAL, h: track.h, fill: { color: COLORS.sky }, line: { color: COLORS.sky, width: 0 }, objectName: "!!progress" });
      s.addText(eyebrow, { x: 0.6, y: 0.36, w: 9, h: 0.32, fontFace: FONT, fontSize: 13, bold: true, color: COLORS.sky, charSpacing: 2, margin: 0, isTextBox: true, objectName: "eyebrow" });
    }
    s.addText(title, { placeholder: "title" });
    return s;
  }

  const card = (s, x, y, w, h, step, opt = {}) => s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.14, fill: { color: opt.fill || COLORS.panel }, line: { color: opt.line || COLORS.line, width: opt.lineW || 1 }, objectName: `A${step}|카드`,
  });
  const text = (s, t, x, y, w, h, step, opt = {}) => s.addText(t, {
    x, y, w, h, fontFace: FONT, fontSize: opt.size || 15, color: opt.color || COLORS.text, bold: !!opt.bold, margin: 0, valign: opt.valign || "top", align: opt.align || "left", isTextBox: true,
    lineSpacingMultiple: opt.spacing, objectName: step === null ? (opt.name || "글상자") : `A${step}|${opt.name || "글"}`,
  });
  async function badge(s, Comp, x, y, step, color = COLORS.sky, d = 0.62) {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color, transparency: 84 }, line: { color, width: 1 }, objectName: `A${step}|아이콘 원` });
    s.addImage({ data: await icon(Comp, color), x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5, objectName: `A${step}|아이콘`, altText: "아이콘" });
  }
  const moving = (s, name, x, y, w, h, step, alt) => s.addImage({ path: gif(name), x, y, w, h, objectName: `A${step}|움직이는 그림`, altText: alt });
  const shot = (s, name, x, y, w, h, step, alt) => s.addImage({ path: screen(name), x, y, w, h, objectName: `A${step}|앱 화면`, altText: alt });
  // 스샷 한 장을 크게 보여 주는 장. 왼쪽에 화면, 오른쪽에 짚어 줄 점을 놓는다.
  function shotSlide(title, eyebrow, name, pw, ph, alt, points, notes) {
    const s = addSlide(0, title, eyebrow);
    const scale = Math.min(8.35 / pw, 4.95 / ph);
    const w = pw * scale, h = ph * scale;
    shot(s, name, 0.6, 1.72, w, h, 0, alt);
    const x = 0.6 + w + 0.25, pw2 = 12.73 - x;
    const rowH = (4.95 - 0.12 * (points.length - 1)) / points.length;
    points.forEach(([head, body], i) => {
      const y = 1.72 + i * (rowH + 0.12);
      card(s, x, y, pw2, rowH, i + 1);
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.15, y: y + 0.17, w: 0.38, h: 0.38, fill: { color: COLORS.sky }, line: { color: COLORS.sky, width: 0 }, objectName: `A${i + 1}|번호 원` });
      text(s, String(i + 1), x + 0.15, y + 0.17, 0.38, 0.38, i + 1, { size: 13, bold: true, color: COLORS.bg, align: "center", valign: "middle", name: "번호" });
      text(s, head, x + 0.63, y + 0.14, pw2 - 0.75, 0.44, i + 1, { size: 15, bold: true, valign: "middle" });
      text(s, body, x + 0.2, y + 0.66, pw2 - 0.35, rowH - 0.72, i + 1, { size: 13, color: COLORS.muted, spacing: 1.1 });
    });
    s.addNotes(notes);
    return s;
  }

  const source = (s, t) => text(s, t, 0.6, 6.68, 11.3, 0.28, null, { size: 11, color: COLORS.muted, name: "출처" });
  const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));

  // 표지
  {
    const s = addSlide(1, "말 한마디로\n일 시키는\n구글 안티그라비티", "", "COVER");
    text(s, "GOOGLE ANTIGRAVITY  ·  2.0", 0.7, 1.4, 7, 0.35, 1, { size: 14, bold: true, color: COLORS.sky, name: "머리말" });
    text(s, "사용법부터 플러그인 마켓, 무료와 유료 차이까지", 0.7, 4.45, 7, 0.4, 2, { size: 18, color: COLORS.muted, name: "부제" });
    text(s, "2026년 11월 기준", 0.7, 5.0, 7, 0.35, 3, { size: 14, color: COLORS.muted, name: "기준일" });
    moving(s, "hub.gif", 7.55, 1.2, 5.1, 5.1, 2, "가운데 에이전트와 바깥 도구들 사이로 신호가 오가는 애니메이션");
    s.addNotes("안녕하세요. 오늘은 구글의 안티그라비티를 같이 써 볼 거예요. 코딩을 몰라도 말로 일을 시키면 AI가 파일을 만들고, 웹페이지를 띄우고, 배포까지 해 주는 도구예요. 끝나고 나면 설치부터 첫 결과물, 플러그인 연결, 요금제 고르는 법까지 스스로 할 수 있게 돼요.");
  }

  // 정의
  {
    const s = addSlide(2, "챗봇은 답하고, 안티그라비티는 일해요", "WHAT IS IT");
    const rows = [
      [fa.FaComments, "일반 챗봇", "답을 글로 알려 줘요.\n실행은 내가 해야 해요.", COLORS.muted],
      [fa.FaRobot, "안티그라비티", "계획을 세우고 파일을 만들고\n브라우저로 직접 확인해요.", COLORS.sky],
      [fa.FaUserCheck, "나의 역할", "목표를 말하고, 계획과\n위험한 작업을 승인해요.", COLORS.coral],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 1.85, 3.9, 2.6, i, i === 1 ? { line: COLORS.sky, lineW: 1.75 } : {});
      await badge(s, rows[i][0], x + 0.3, 2.1, i, rows[i][3]);
      text(s, rows[i][1], x + 0.3, 2.85, 3.3, 0.45, i, { size: 21, bold: true });
      text(s, rows[i][2], x + 0.3, 3.35, 3.35, 0.9, i, { size: 15, color: COLORS.muted, spacing: 1.15 });
    }
    text(s, "말하기", 0.6, 5.15, 1.0, 0.4, 3, { size: 18, bold: true, align: "center", valign: "middle" });
    moving(s, "route.gif", 1.6, 4.85, 9.6, 1.0, 3, "말한 내용이 결과물이 되기까지 진행되는 애니메이션");
    text(s, "결과물", 11.25, 5.15, 1.45, 0.4, 3, { size: 18, bold: true, valign: "middle" });
    text(s, "코드를 몰라도 시작할 수 있지만, 결과 확인은 사람 몫이에요", 0.6, 6.05, 12.1, 0.45, 4, { size: 19, bold: true, color: COLORS.sky, align: "center" });
    s.addNotes("챗봇은 '이렇게 하세요'라고 알려 주는 선생님이고, 안티그라비티는 내 컴퓨터에서 직접 일하는 비서예요. 그래서 편한 대신 내 파일을 건드릴 수 있어요. 처음에는 연습용 폴더에서 시작하고, 계획과 결과를 꼭 눈으로 확인하는 습관을 들이세요.");
  }

  // 제품 구성
  {
    const s = addSlide(3, "이름은 하나, 쓰는 방법은 네 가지", "PRODUCTS");
    const items = [
      [fa.FaDesktop, "데스크톱 앱", "에이전트를 띄우고\n관리하는 중심 화면", "입문자 추천", COLORS.sky],
      [fa.FaTerminal, "CLI", "까만 터미널 창에서\n쓰는 버전", "익숙해진 뒤에", COLORS.muted],
      [fa.FaCode, "IDE", "코드 편집기 형태의\n원래 버전", "개발자용", COLORS.muted],
      [fa.FaCubes, "SDK", "나만의 에이전트를\n만드는 도구", "개발자용", COLORS.muted],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 3.08;
      const hi = i === 0;
      card(s, x, 1.95, 2.87, 3.75, i, hi ? { line: COLORS.sky, lineW: 1.75 } : {});
      await badge(s, items[i][0], x + 0.25, 2.2, i, hi ? COLORS.sky : COLORS.coral, 0.7);
      text(s, items[i][1], x + 0.25, 3.1, 2.45, 0.5, i, { size: 22, bold: true });
      text(s, items[i][2], x + 0.25, 3.68, 2.4, 1.0, i, { size: 15, color: COLORS.muted, spacing: 1.15 });
      text(s, items[i][3], x + 0.25, 4.98, 2.4, 0.4, i, { size: 15, bold: true, color: items[i][4], name: "대상" });
    }
    text(s, "오늘은 데스크톱 앱만 쓸게요. 윈도우, 맥, 리눅스 모두 지원해요.", 0.6, 6.0, 12.1, 0.4, 4, { size: 18, bold: true, color: COLORS.sky, align: "center" });
    s.addNotes("2026년 5월 구글 I/O에서 2.0이 나오면서 데스크톱 앱이 중심이 되었어요. 터미널에서 쓰는 CLI, 원래의 코드 편집기 IDE, 에이전트를 만드는 SDK가 따로 있어요. 코딩을 안 하시는 분은 데스크톱 앱 하나면 충분해요.\n\n[참고] 윈도우 10 이상, 맥 Monterey 이상, 리눅스를 지원해요. 위키백과 정리 기준이에요.");
  }

  // 최신 소식
  {
    const s = addSlide(4, "지금까지 달라진 것들", "WHAT'S NEW");
    moving(s, "flow.gif", 0.6, 2.03, 12.13, 0.606, 0, "왼쪽에서 오른쪽으로 흐르는 입자 애니메이션");
    const items = [
      ["2025.11", "첫 공개", "제미나이 3와 함께\n무료 미리보기로 출시", COLORS.coral],
      ["2026.5", "안티그라비티 2.0", "데스크톱 앱, CLI, SDK\n예약 작업까지", COLORS.coral],
      ["10월 27일", "내장 브라우저", "옆 패널에서 웹 보기,\n20MB까지 파일 첨부", COLORS.sky],
      ["10월 29일", "플러그인 마켓", "캔바, 피그마 같은 도구를\n누르고 로그인으로 연결", COLORS.sky],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 3.08;
      const [when, head, body, color] = items[i];
      text(s, when, x, 1.65, 2.85, 0.42, i + 1, { size: 20, bold: true, color, name: "시기" });
      card(s, x, 2.8, 2.87, 2.95, i + 1, i === 3 ? { line: COLORS.sky, lineW: 1.75 } : {});
      text(s, head, x + 0.22, 3.05, 2.45, 0.85, i + 1, { size: 20, bold: true });
      text(s, body, x + 0.22, 3.98, 2.5, 1.5, i + 1, { size: 15, color: COLORS.muted, spacing: 1.25 });
    }
    source(s, "출처: 안티그라비티 공식 변경 기록(v2.28.0, v2.28.2), TechCrunch, 위키백과");
    s.addNotes("안티그라비티는 정말 빨리 바뀌어요. 10월에만 버전이 여러 번 나왔어요. 오늘의 주인공은 10월 29일에 나온 2.28.2 버전의 플러그인 마켓이에요. 강의 자료의 메뉴 이름도 금방 달라질 수 있어요.\n\n[강사 확인 필요] 참고 영상은 '플러그인 60개'라고 소개했지만 공식 문서에서 숫자를 확인하지 못했어요. 슬라이드에는 숫자를 넣지 않았어요. 강의 전에 마켓에서 직접 세어 보고 말씀해 주세요.");
  }

  // 사용법 지도
  {
    const s = addSlide(5, "사용법은 딱 4단계예요", "HOW TO");
    const steps = [
      ["01", "설치·로그인", "앱을 깔고\n구글 계정으로 들어가요", fa.FaDownload],
      ["02", "폴더 열기", "일할 폴더를 정해\n프로젝트로 열어요", fa.FaFolderOpen],
      ["03", "말로 시키기", "목표와 결과물 모양을\n채팅으로 말해요", fa.FaComment],
      ["04", "확인·승인", "계획과 결과를 보고\n승인하거나 고쳐요", fa.FaCircleCheck],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 3.08;
      card(s, x, 2.1, 2.87, 3.75, i);
      text(s, steps[i][0], x + 0.25, 2.3, 1.6, 0.9, i, { size: 44, bold: true, color: COLORS.sky, name: "번호" });
      await badge(s, steps[i][3], x + 1.95, 2.4, i, COLORS.coral);
      text(s, steps[i][1], x + 0.25, 3.55, 2.45, 0.5, i, { size: 22, bold: true });
      text(s, steps[i][2], x + 0.25, 4.2, 2.45, 1.3, i, { size: 16, color: COLORS.muted, spacing: 1.2 });
    }
    s.addNotes("깔고, 폴더 열고, 말하고, 확인하면 끝이에요. 네 번째 단계가 제일 중요해요. AI가 만든 결과를 그대로 믿지 않고 눈으로 확인하는 게 이 도구를 잘 쓰는 비결이에요.");
  }

  // 설치·화면
  {
    const s = addSlide(6, "1~2단계: 설치하고 폴더 열기", "STEP 1-2");
    const list = [
      ["공식 사이트에서 설치", "antigravity.google에서 내 운영체제용 파일을 받아요."],
      ["구글 계정으로 로그인", "개인 구글 계정이면 무료로 시작할 수 있어요."],
      ["연습용 폴더부터 열기", "처음에는 중요한 파일이 없는 새 폴더로 시작해요."],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 1.95 + i * 1.5;
      card(s, 0.6, y, 7.0, 1.3, i);
      text(s, String(i + 1), 0.85, y + 0.25, 0.6, 0.8, i, { size: 30, bold: true, color: COLORS.sky, valign: "middle", name: "번호" });
      text(s, list[i][0], 1.5, y + 0.17, 5.95, 0.42, i, { size: 19, bold: true });
      text(s, list[i][1], 1.5, y + 0.66, 5.95, 0.4, i, { size: 14, color: COLORS.muted });
    }
    const px = 8.0, py = 1.95, st = 3;
    card(s, px, py, 4.73, 4.3, st);
    shot(s, "sidebar", px + 0.72, py + 0.2, 3.3, 3.3 * 200 / 392, st, "왼쪽 메뉴 화면. New Conversation, Automations, Customizations");
    const menus = [["New Conversation", "새 일 시키기"], ["Automations", "정해진 시간에 자동 실행"], ["Customizations", "플러그인과 스킬 관리"]];
    menus.forEach(([name, desc], i) => {
      const y = py + 2.05 + i * 0.7;
      text(s, name, px + 0.3, y, 4.15, 0.34, st + 1 + i, { size: 15, bold: true, color: i === 2 ? COLORS.sky : COLORS.text, name: "메뉴 이름" });
      text(s, desc, px + 0.3, y + 0.33, 4.15, 0.3, st + 1 + i, { size: 13, color: COLORS.muted, name: "메뉴 설명" });
    });
    s.addNotes("공식 사이트 antigravity.google에서 내려받아 설치하고, 구글 계정으로 로그인해요. 처음에는 꼭 빈 연습용 폴더를 여세요. 에이전트가 그 폴더의 파일을 만들고 고치기 때문이에요. 왼쪽 메뉴에서는 세 곳만 기억하면 돼요. 새 대화, 자동 실행, 커스터마이제이션이에요.\n\n[참고] 회사나 학교 계정은 이용 조건이 다를 수 있어요.");
  }

  // 화면 둘러보기
  {
    const s = shotSlide("앱 화면은 이렇게 생겼어요", "SCREEN TOUR", "full", 1516, 1021, "안티그라비티 전체 화면. 왼쪽 메뉴, 가운데 대화, 아래 입력창", [
      ["왼쪽 메뉴", "새 대화, 자동 실행, 플러그인 관리가 있어요."],
      ["가운데 대화", "AI의 답과 일한 결과가 여기에 쌓여요."],
      ["입력창", "말하듯 적어요. @는 지정, /는 명령이에요."],
      ["입력창 아랫줄", "모델, 권한(Default), 음성 입력 버튼이 있어요."],
    ], "전체 화면을 먼저 눈에 익혀 볼게요. 왼쪽은 메뉴, 가운데는 대화, 아래는 입력창이에요. 처음에는 입력창만 보면 돼요. 입력창 아랫줄에서 AI 모델과 권한을 고르고, 마이크 버튼으로 말로 입력할 수도 있어요. 다만 음성 입력 버튼은 화면에서 본 것이고, 직접 시험하지는 않았어요.\n\n[참고] 강사 계정 화면이라 대화 목록이 보여요. 공개 자료로 쓰려면 확인해 주세요.");
    const k = 4.95 / 1021;
    const marks = [[0, 118, 385, 170], [408, 125, 1095, 710], [408, 893, 1095, 125]];
    marks.forEach(([mx, my, mw, mh], i) => {
      const x = 0.6 + mx * k, y = 1.72 + my * k;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: mw * k, h: mh * k, rectRadius: 0.06, fill: { color: COLORS.sky, transparency: 100 }, line: { color: COLORS.sky, width: 2 }, objectName: `A${i + 1}|강조 표시` });
    });
  }

  // 말로 시키기
  {
    const s = addSlide(7, "3단계: 이렇게 말하면 잘 알아들어요", "STEP 3");
    const parts = [["목표", "무엇을 만들까", COLORS.sky], ["재료", "어떤 자료를 쓸까", COLORS.coral], ["모양", "어떤 형태로 받을까", COLORS.amber]];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 1.85, 3.9, 1.25, i);
      text(s, parts[i][0], x + 0.28, 1.98, 1.1, 1.0, i, { size: 28, bold: true, color: parts[i][2], valign: "middle", name: "요소" });
      text(s, parts[i][1], x + 1.42, 1.98, 2.35, 1.0, i, { size: 16, valign: "middle", name: "설명" });
    }
    card(s, 0.6, 3.35, 12.13, 1.5, 3, { line: COLORS.sky, lineW: 1.75 });
    text(s, "이렇게 말해 보세요", 0.9, 3.5, 6, 0.36, 3, { size: 14, bold: true, color: COLORS.sky, name: "예시 제목" });
    text(s, "\"우리 동네 빵집 소개 페이지를 만들어 줘. 이 폴더의 메뉴판 사진을 쓰고, 폰에서 보기 좋은 한 장짜리 HTML로 해 줘.\"", 0.9, 3.88, 11.55, 0.85, 3, { size: 18, bold: true, spacing: 1.2, name: "예시" });
    const tips = [
      [fa.FaLayerGroup, "한 번에 하나씩", "큰 일은 잘게 나눠서 시켜요"],
      [fa.FaImage, "자료는 첨부해요", "파일은 20MB까지 붙일 수 있어요"],
      [fa.FaRotateLeft, "고칠 땐 또 말해요", "\"글자를 더 크게\"처럼 짧게 해도 돼요"],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      await badge(s, tips[i][0], x, 5.15, 4 + i, COLORS.coral, 0.62);
      text(s, tips[i][1], x + 0.78, 5.1, 3.1, 0.38, 4 + i, { size: 16, bold: true, name: "팁" });
      text(s, tips[i][2], x + 0.78, 5.5, 3.2, 0.6, 4 + i, { size: 13, color: COLORS.muted, name: "팁 설명" });
    }
    s.addNotes("어렵게 생각하지 마세요. 목표, 재료, 모양 세 가지만 말하면 돼요. 코드 용어를 몰라도 괜찮아요. 결과가 마음에 안 들면 사람에게 말하듯 '글자를 더 크게 해 줘'라고 다시 말하면 돼요. 대화가 길어지면 /compact 명령으로 앞 내용을 줄일 수 있어요.\n\n[참고] 20MB 첨부와 /compact는 공식 변경 기록(v2.28.0, v2.24.0) 기준이에요.");
  }

  // 편하게 말하기
  shotSlide("정말 편하게 말해도 알아들어요", "REAL TALK", "chat_casual", 1194, 700, "기억안남? 영상 주면 텍스트로 변환 시키는거 라고 말하자 예전 작업을 찾아 답하는 대화 화면", [
    ["\"기억안남?\"", "이렇게 짧게 물어도 괜찮아요."],
    ["\"영상 주면 텍스트로…\"", "말이 끝까지 안 다듬어져도 돼요."],
    ["전에 한 일을 찾아서 답해요", "다만 맞는지는 내가 확인해요."],
  ], "제가 실제로 나눈 대화예요. '기억안남? 영상 주면 텍스트로 변환 시키는거'라고만 했는데 예전에 만든 프로그램을 찾아서 답했어요. 맞춤법이나 전문 용어를 걱정하지 않아도 돼요. 다만 AI가 틀리게 기억할 수도 있으니 답이 맞는지는 꼭 확인하세요.");

  // 확인·승인
  {
    const s = addSlide(8, "4단계: 일하는 동안 나는 확인만", "STEP 4");
    const labels = [["에이전트 1", "자료 조사"], ["에이전트 2", "페이지 제작"], ["에이전트 3", "브라우저 확인"]];
    labels.forEach(([a, b], i) => {
      const y = 1.95 + i * 0.77;
      text(s, a, 0.6, y, 1.5, 0.34, 0, { size: 14, bold: true, name: "에이전트" });
      text(s, b, 0.6, y + 0.32, 1.5, 0.3, 0, { size: 13, color: COLORS.muted, name: "할 일" });
    });
    moving(s, "bars.gif", 2.1, 1.85, 5.2, 2.35, 0, "세 에이전트의 작업 진행 막대가 동시에 차오르는 애니메이션");
    const flow = [["계획 확인", "무엇을 할지 먼저 읽어요", fa.FaListCheck], ["권한 고르기", "어디까지 맡길지 정해요", fa.FaShieldHalved], ["결과 보기", "내장 브라우저로 바로 봐요", fa.FaGlobe], ["고쳐 말하기", "다시 채팅으로 요청해요", fa.FaPen]];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 3.42, y = 4.4 + row * 1.08;
      card(s, x, y, 3.3, 0.96, i + 1);
      await badge(s, flow[i][2], x + 0.14, y + 0.2, i + 1, COLORS.sky, 0.56);
      text(s, flow[i][0], x + 0.82, y + 0.12, 2.42, 0.36, i + 1, { size: 15, bold: true });
      text(s, flow[i][1], x + 0.82, y + 0.5, 2.42, 0.34, i + 1, { size: 13, color: COLORS.muted });
    }
    card(s, 7.65, 1.85, 5.08, 4.47, 5, { line: COLORS.coral, lineW: 1.75 });
    await badge(s, fa.FaClock, 7.95, 2.1, 5, COLORS.coral, 0.7);
    text(s, "자동 실행도 돼요", 8.8, 2.1, 3.8, 0.7, 5, { size: 22, bold: true, valign: "middle" });
    text(s, bullets(["Automations에서 예약해요", "\"매일 아침 뉴스 요약\" 같은 반복 일에 좋아요", "자동 실행에 쓸 모델도 고를 수 있어요", "사용량이 나가니 꼭 필요한 일만 걸어요"]), 7.95, 3.0, 4.55, 3.1, 5, { size: 16, spacing: 1.3 });
    s.addNotes("에이전트 여러 개가 동시에 일할 수 있어요. 그동안 내가 할 일은 계획을 읽고, 권한을 정하고, 결과를 확인하는 거예요. 파일을 쓰기 전에는 허용할지 물어봐요. 그 화면은 다음 장에서 볼게요. 10월부터 내장 브라우저가 들어와서 결과 페이지를 앱 안에서 바로 볼 수 있어요. Automations에 걸어 두면 정해진 시간에 알아서 돌아가요.\n\n[참고] 권한 선택기(v2.23.0), 자동 실행 모델 선택(v2.24.0), 내장 브라우저(v2.28.0)는 공식 변경 기록 기준이에요. '매일 아침 뉴스 요약'은 예시이고 직접 시험한 것은 아니에요.");
  }

  // 허용 창 읽기
  {
    const s = addSlide(0, "이 창이 뜨면 이렇게 읽어요", "PERMISSION");
    shot(s, "permission", 0.6, 1.8, 6.9, 6.9 * 375 / 1145, 0, "파일을 쓰기 전에 허용 여부를 묻는 화면");
    card(s, 0.6, 4.35, 6.9, 2.1, 6, { line: COLORS.sky, lineW: 1.75 });
    text(s, "처음에는 1번을 고르세요", 0.9, 4.53, 6.3, 0.45, 6, { size: 20, bold: true, color: COLORS.sky });
    text(s, "어떤 파일을 쓰려는지 위쪽 경로를 먼저 읽어요.\n익숙해지면 그때 2번을 써도 늦지 않아요.", 0.9, 5.05, 6.3, 1.2, 6, { size: 16, spacing: 1.25 });
    const opts = [["1", "이번만 허용", COLORS.sky], ["2", "이 대화에서는 항상 허용", COLORS.text], ["3", "프로젝트 밖에서는 항상 허용", COLORS.text], ["4", "언제나 허용", COLORS.amber], ["5", "거절하고 다른 방법 말하기", COLORS.coral]];
    opts.forEach(([no, label, color], i) => {
      const y = 1.8 + i * 0.95;
      card(s, 7.8, y, 4.93, 0.8, i + 1, i === 0 ? { line: COLORS.sky, lineW: 1.75 } : {});
      text(s, no, 8.0, y, 0.45, 0.8, i + 1, { size: 22, bold: true, color, valign: "middle", name: "번호" });
      text(s, label, 8.5, y, 4.1, 0.8, i + 1, { size: 16, bold: true, valign: "middle", name: "뜻" });
    });
    s.addNotes("AI가 파일을 쓰기 전에 이런 창이 떠요. 영어라 당황하기 쉬운데 오른쪽 뜻만 알면 돼요. 처음에는 1번 '이번만 허용'을 고르고, 위쪽 경로에서 어떤 파일을 건드리는지 확인하세요. 4번 '언제나 허용'은 편하지만 확인 없이 진행되니 입문 단계에서는 권하지 않아요.\n\n[참고] 경로의 PC 사용자 이름은 지운 화면이에요.");
  }

  // 플러그인 마켓
  {
    const s = addSlide(9, "새 기능: 플러그인 마켓으로 한 번에 연결", "PLUGINS");
    const list = [
      ["Customizations 열기", "왼쪽 메뉴에서 Marketplace 탭을 눌러요."],
      ["+ 버튼 누르기", "쓸 도구의 카드에서 +나 Add를 눌러요."],
      ["브라우저에서 로그인", "권한을 확인하고 허용하면 연결돼요."],
      ["채팅에 이름 말하기", "\"캔바로 만들어 줘\"처럼 부르면 돼요."],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 1.85 + i * 1.17;
      card(s, 0.6, y, 6.55, 1.05, i);
      text(s, String(i + 1), 0.82, y + 0.14, 0.5, 0.78, i, { size: 28, bold: true, color: COLORS.sky, valign: "middle", name: "번호" });
      text(s, list[i][0], 1.4, y + 0.14, 5.6, 0.38, i, { size: 18, bold: true });
      text(s, list[i][1], 1.4, y + 0.56, 5.6, 0.36, i, { size: 14, color: COLORS.muted });
    }
    shot(s, "marketplace", 7.45, 1.85, 5.28, 5.28 * 1008 / 1186, 2, "Customizations의 Marketplace 화면. 추천 플러그인 Context7과 Google Docs, Sheets, Slides, Drive 카드");
    text(s, "API 키를 찾아 복사해 붙이는 일이 크게 줄었어요", 0.6, 6.56, 6.55, 0.3, 4, { size: 13, bold: true, color: COLORS.sky, name: "핵심" });
    text(s, "Customizations의 Marketplace 화면", 7.45, 6.48, 5.28, 0.26, 2, { size: 12, color: COLORS.muted, align: "center", name: "화면 설명" });
    s.addNotes("예전에는 도구를 연결할 때마다 API 키를 찾아 복사하고 설정 파일을 고쳐야 했어요. 10월 29일 업데이트로 스마트폰 앱스토어처럼 바뀌었어요. Customizations에서 Marketplace를 열고 +를 누른 뒤 로그인하면 끝이에요. 구글 문서, 시트, 드라이브와 피그마, 노션, 스트라이프, 버셀 같은 도구가 있어요. 쓰지 않을 때는 ⋮ 메뉴에서 끄거나 지울 수 있어요.\n\n[참고] 일부 플러그인은 여전히 API 토큰이 필요해요. 공식 문서에 'API 토큰이 필요한 플러그인은 설정 창에서 입력'한다고 안내해요.");
  }

  // 마켓 살펴보기
  shotSlide("마켓에서 + 와 ⋮ 만 구분하면 돼요", "MARKETPLACE", "market_google", 1186, 800, "Marketplace의 Build with Google 목록. 플러그인마다 더하기 또는 점 세 개 표시", [
    ["+ 는 아직 안 깐 것", "누르면 내 앱에 추가돼요."],
    ["⋮ 는 이미 깐 것", "끄거나 지울 때 눌러요."],
    ["위에서 검색해요", "쓰는 도구 이름을 찾아봐요."],
  ], "마켓 목록이에요. 오른쪽 끝 표시만 보면 돼요. +는 아직 안 깐 것, 점 세 개는 이미 깐 것이에요. 필요한 도구만 하나씩 깔아 보세요. 설치 전에 카드를 눌러 무엇이 들어 있는지 확인하는 습관도 들이세요.");

  // 플러그인 5요소
  {
    const s = addSlide(10, "플러그인 하나에 다섯 가지가 들어 있어요", "INSIDE A PLUGIN");
    const items = [
      [fa.FaBook, "스킬", "작업 설명서", "필요할 때 꺼내 보는\n업무 매뉴얼", COLORS.sky],
      [fa.FaPlug, "MCP 서버", "연결 통로", "캔바, 피그마 같은\n바깥 도구와 연결", COLORS.sky],
      [fa.FaScaleBalanced, "규칙", "지켜야 할 약속", "항상 지킬 기준을\n미리 정해 둬요", COLORS.coral],
      [fa.FaShieldHalved, "훅", "자동 검문소", "작업 전후에 자동으로\n검사를 돌려요", COLORS.coral],
      [fa.FaUserGear, "맞춤 에이전트", "전담 직원", "역할과 도구가 정해진\n전문 도우미", COLORS.amber],
    ];
    const w = (12.13 - 0.2 * 4) / 5;
    for (let i = 0; i < 5; i++) {
      const x = 0.6 + i * (w + 0.2);
      card(s, x, 1.95, w, 3.75, i);
      await badge(s, items[i][0], x + 0.2, 2.18, i, items[i][4], 0.7);
      text(s, items[i][1], x + 0.2, 3.05, w - 0.3, 0.42, i, { size: 18, bold: true });
      text(s, items[i][2], x + 0.2, 3.5, w - 0.3, 0.36, i, { size: 14, bold: true, color: items[i][4], name: "비유" });
      text(s, items[i][3], x + 0.2, 3.98, w - 0.28, 1.4, i, { size: 13, color: COLORS.muted, spacing: 1.2 });
    }
    text(s, "다 들어 있는 건 아니에요. 플러그인마다 구성이 달라요.", 0.6, 6.0, 12.1, 0.4, 5, { size: 18, bold: true, color: COLORS.sky, align: "center" });
    source(s, "출처: 안티그라비티 공식 문서 Plugins");
    s.addNotes("플러그인은 묶음 상품이에요. 스킬은 설명서, MCP 서버는 바깥 도구와 잇는 통로, 규칙은 약속, 훅은 자동 검문소, 맞춤 에이전트는 전담 직원이에요. 예전에는 하나씩 설정했는데 이제는 한 번에 설치돼요. 다만 공식 문서의 예시를 보면 플러그인마다 구성이 달라요. 어떤 건 스킬 하나만 있어요. 설치 전에 카드를 열어 무엇이 들어 있는지 보세요.");
  }

  // 실전
  {
    const s = addSlide(11, "실전: 말로 내 플러그인까지 만들었어요", "IN PRACTICE");
    const cols = [
      ["plugin_list", 1192, 701, "1. 지금 뭐가 깔렸지?", "/plugin 한 줄이면 돼요", "설치된 플러그인 목록과\n할 수 있는 일을 알려 줘요", COLORS.sky, "plugin 명령으로 설치된 플러그인 네 개를 보여 주는 채팅 화면"],
      ["plugin_built", 1181, 695, "2. 전속 플러그인 만들어 줘", "약 2분 만에 완성", "규칙, 스킬 2개, 로고까지\n폴더로 만들어 줬어요", COLORS.coral, "대화로 만든 전속 플러그인의 폴더 구조를 보여 주는 채팅 화면"],
      ["plugin_detail", 1133, 667, "3. 재시작하면 내 메뉴로", "마켓 플러그인처럼 보여요", "상세 화면에 추천 요청과\n스킬, 규칙이 정리돼요", COLORS.amber, "직접 만든 Lucian Architect Core 플러그인의 상세 화면"],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      const [name, iw, ih, head, verdict, body, color, alt] = cols[i];
      card(s, x, 1.72, 3.9, 4.15, i * 2, i === 1 ? { line: COLORS.coral, lineW: 1.75 } : {});
      const w = 3.6, h = w * ih / iw;
      shot(s, name, x + 0.15, 1.87, w, h, i * 2, alt);
      text(s, head, x + 0.22, 4.03, 3.5, 0.38, i * 2, { size: 17, bold: true });
      text(s, verdict, x + 0.22, 4.42, 3.5, 0.32, i * 2, { size: 14, bold: true, color, name: "포인트" });
      text(s, body, x + 0.22, 4.8, 3.5, 0.9, i * 2, { size: 13, color: COLORS.muted, spacing: 1.15 });
    }
    text(s, "다른 사람 후기: 버셀 배포는 채팅으로 편했고, 캔바는 새로 만들면 품질이 들쭉날쭉했대요", 0.6, 6.05, 12.13, 0.4, 6, { size: 15, bold: true, color: COLORS.sky, align: "center", name: "후기" });
    s.addNotes("제가 직접 해 본 과정이에요. 먼저 /plugin을 치면 지금 깔린 플러그인을 알려 줘요. 그다음 '특화된 스킬과 MCP를 묶은 전속 플러그인을 직접 만들자'고 말했더니 방향을 세 가지 제안했고, 하나를 고르자 약 2분 만에 규칙, 스킬 2개, 로고가 든 플러그인을 만들어 줬어요. 파일을 쓰기 전에는 허용할지 물어봤어요. 새 플러그인은 앱을 재시작해야 적용된다고 안내했고, Customizations에 마켓 플러그인처럼 상세 화면이 생겼어요. 마지막에 '오늘 한 거 저장해 놔'라고 하니 작업 기록 파일도 남겨 줬어요. 코드를 몰라도 말로 나만의 도구를 만들 수 있다는 게 핵심이에요.\n\n[참고] 맨 아래 버셀과 캔바 이야기는 참고 영상 제작자의 후기예요. 제가 직접 시험한 것은 아니에요. 만든 플러그인이 실제 작업에서 얼마나 쓸모 있는지는 앞으로 써 봐야 알아요.");
  }

  // 실전 과정 크게 보기
  shotSlide("실전 1: 지금 뭐가 깔렸는지 물어봐요", "IN PRACTICE", "plugin_list", 1192, 701, "plugin 명령으로 설치된 플러그인 네 개를 보여 주는 채팅 화면", [
    ["/plugin 입력", "입력창에 한 줄만 치면 돼요."],
    ["설치 목록이 나와요", "제 앱에는 4개가 깔려 있었어요."],
    ["기능까지 설명해요", "무엇을 할 수 있는지 함께 알려 줘요."],
  ], "실전 과정을 한 단계씩 볼게요. 입력창에 /plugin이라고 치면 지금 깔린 플러그인과 각각 무엇을 할 수 있는지 알려 줘요. 처음 쓰는 분은 여기부터 시작하면 좋아요.");

  shotSlide("실전 2: 만들자고 하면 먼저 제안해요", "IN PRACTICE", "proposal", 1184, 800, "전속 플러그인 만들기 요청에 세 가지 기획안을 제안하는 화면", [
    ["내 말은 한 줄", "\"전속 플러그인을 직접 빌드 하자\""],
    ["기획안 3가지", "내 상황에 맞춰 방향을 제안했어요."],
    ["나는 고르기만", "2번째 안을 골랐어요."],
  ], "'특화된 스킬과 MCP를 묶은 전속 플러그인을 직접 빌드 하자'고 한 줄 말했어요. 그랬더니 바로 만들지 않고 기획안 세 가지를 먼저 제안했어요. 저는 그중 하나의 이름을 말해 골랐어요. 좋은 결과를 얻으려면 AI의 제안을 읽고 고르는 시간이 중요해요.");

  shotSlide("실전 3: 일하는 과정이 다 보여요", "IN PRACTICE", "progress", 1199, 740, "plugin.json, AGENTS.md, SKILL.md, logo.svg 파일을 차례로 만드는 진행 화면", [
    ["Thought", "AI가 생각한 시간이에요."],
    ["Created", "새로 만든 파일이에요."],
    ["+15 -0", "더한 줄과 지운 줄 수예요."],
  ], "AI가 일하는 동안 화면에 과정이 그대로 보여요. Thought는 생각한 시간, Created는 새로 만든 파일이에요. 옆의 +15 -0은 15줄을 더하고 지운 줄은 없다는 뜻이에요. 뭘 하는지 몰라 불안할 때는 이 줄만 읽어도 흐름이 보여요.");

  shotSlide("실전 4: 약 2분 뒤, 플러그인 완성", "IN PRACTICE", "plugin_built", 1181, 695, "완성된 플러그인의 폴더 구조를 설명하는 화면", [
    ["Worked for 2m", "약 2분 동안 일했어요."],
    ["폴더째로 만들어요", "규칙, 스킬 2개, 로고가 들어 있어요."],
    ["끝나면 재시작", "새 플러그인은 재시작해야 적용돼요."],
  ], "약 2분 뒤에 완성됐다고 알려 줬어요. 화면의 나무 모양 그림이 폴더 구조예요. 규칙 파일, 스킬 2개, 로고가 들어 있어요. AI가 앱을 재시작하면 적용된다고 안내해 줬어요.");

  shotSlide("실전 5: 내 플러그인이 메뉴에 생겼어요", "IN PRACTICE", "detail_big", 1133, 740, "직접 만든 Lucian Architect Core 플러그인의 상세 화면", [
    ["마켓 플러그인과 똑같이", "Customizations에 상세 화면이 생겨요."],
    ["추천 요청 3개", "눌러서 바로 일을 시킬 수 있어 보여요."],
    ["Overview, Skills, Rules", "탭을 눌러 구성을 볼 수 있어요."],
  ], "제가 만든 플러그인이 마켓 플러그인처럼 상세 화면을 갖게 됐어요. 어떤 일을 시키면 좋은지 추천 요청도 세 개 보여요. 코드를 몰라도 이런 도구를 말로 만들 수 있다는 게 놀라운 부분이에요.\n\n[강사 확인 필요] 추천 요청을 누르면 어떻게 되는지는 스샷으로 확인하지 못했어요. 시연 전에 눌러 보세요.");

  shotSlide("실전 6: 스킬은 명령어로 불러요", "IN PRACTICE", "commands", 1138, 890, "플러그인의 Commands, Rules, Context usage 화면", [
    ["Commands", "/architecture-audit처럼 슬래시로 불러요."],
    ["Rules", "AI가 항상 지킬 규칙이에요."],
    ["Context usage", "규칙과 스킬이 차지하는 양이에요."],
  ], "상세 화면을 내려 보면 구성이 보여요. Commands는 슬래시로 부르는 명령이에요. Rules는 항상 지키는 규칙이고, Context usage는 이런 설정이 AI의 작업 공간을 얼마나 쓰는지 보여 줘요. 플러그인을 많이 켜면 이 양이 늘어나요.\n\n[참고] 경로의 PC 사용자 이름은 지운 화면이에요.");

  shotSlide("실전 7: \"오늘 한 거 저장해놔\"", "IN PRACTICE", "save", 1132, 780, "오늘 한 작업을 정리해 메모리와 작업 일지에 저장했다고 보고하는 화면", [
    ["말 한마디로 정리", "오늘 한 일을 항목별로 정리해 줘요."],
    ["기록 위치까지 알려 줘요", "작업 일지 파일을 남겼어요."],
    ["끝날 때 습관으로", "다음에 이어서 하기 쉬워요."],
  ], "일을 마칠 때 '오늘 한 거 저장해놔'라고 했더니 무엇을 했는지 항목별로 정리하고 작업 일지 파일까지 남겼어요. 다음에 이어서 할 때 큰 도움이 돼요. 작업을 끝낼 때 습관으로 말해 보세요.");

  // 안전
  {
    const s = addSlide(12, "맡기기 전에 꼭 알아 둘 안전 수칙", "SAFETY");
    const rows = [
      [fa.FaShieldHalved, "훅은 직접 켜고 쓰는 검문소예요", "도구 실행 직전에 검사해 막거나(deny) 물어볼(ask) 수 있어요. 어떤 훅이 도는지는 설정에 따라 달라요."],
      [fa.FaEyeSlash, "비밀번호는 알아서 가려 준다고 믿지 마세요", "자동 가림은 공식 문서에서 확인하지 못했어요. 비밀번호와 카드 번호는 채팅에 넣지 마세요."],
      [fa.FaMagnifyingGlass, "설치 전에 구성품을 읽어요", "훅은 내 PC에서 명령을 실행하고, MCP는 바깥 서비스에 접속해요. 믿을 수 있는 것만 깔아요."],
      [fa.FaFolderOpen, "연습용 폴더와 작은 권한으로 시작해요", "결제, 삭제, 배포 같은 일은 내가 직접 확인하고 승인해요."],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 1.8 + i * 1.22;
      card(s, 0.6, y, 12.13, 1.08, i, i === 1 ? { line: COLORS.amber, lineW: 1.75 } : {});
      await badge(s, rows[i][0], 0.85, y + 0.22, i, i === 1 ? COLORS.amber : COLORS.sky, 0.64);
      text(s, rows[i][1], 1.75, y + 0.14, 10.75, 0.4, i, { size: 18, bold: true });
      text(s, rows[i][2], 1.75, y + 0.58, 10.75, 0.38, i, { size: 14, color: COLORS.muted });
    }
    source(s, "출처: 안티그라비티 공식 문서 Hooks, Plugins");
    s.addNotes("가장 중요한 장이에요. 안티그라비티는 내 컴퓨터에서 진짜로 일해요. 훅은 작업 전후에 자동으로 도는 검문소인데, 직접 설정하거나 플러그인에 들어 있어야 작동해요. 공식 문서를 보면 도구 실행 직전에 막거나 사람에게 물어보게 할 수 있어요. 설치한 플러그인의 훅은 켜져 있는 동안 배경에서 자동으로 돌아요. 그러니 설치 전에 무엇이 들어 있는지 꼭 보세요.\n\n[참고] 참고 영상과 블로그는 '보안 훅이 비밀번호와 API 키를 자동으로 가려 준다'고 소개했지만 공식 Hooks 문서에서는 확인하지 못했어요. 강의에서는 자동으로 보호된다고 단정하지 말아 주세요.");
  }

  // 권한 설정 화면
  shotSlide("권한은 Settings에서 정해요", "SAFETY", "settings", 1070, 790, "Settings의 General 화면. Permission Preset, Tool Permissions, Network Access Rules, Plan Review Policy", [
    ["Permission Preset", "AI가 할 수 있는 범위의 기본값이에요."],
    ["Tool Permissions", "파일, 터미널, 외부 도구 권한을 정해요."],
    ["Network Access Rules", "읽어도 되는 인터넷 주소를 정해요."],
    ["Plan Review Policy", "계획을 나에게 보여 줄지 정해요."],
  ], "왼쪽 아래 Settings의 General에서 권한을 정해요. 처음에는 기본값을 그대로 두고, 무엇이 있는지만 봐 두세요. Plan Review Policy는 AI가 계획을 나에게 검토받을지 묻는 설정인데, 제 화면은 Always Ask로 되어 있어요.\n\n[참고] 이메일이 보이는 프로필 부분은 잘라 낸 화면이에요.");

  // 비교표
  {
    const s = addSlide(13, "무료와 유료, 한눈에 비교", "PLANS");
    const head = (t, hi) => ({ text: t, options: { bold: true, color: hi ? COLORS.bg : COLORS.text, fill: { color: hi ? COLORS.sky : COLORS.line }, align: "center", fontSize: 18 } });
    const label = (t) => ({ text: t, options: { bold: true, color: COLORS.muted, fill: { color: COLORS.bg }, fontSize: 15 } });
    const cell = (t, hi) => ({ text: t, options: { align: "center", color: COLORS.text, bold: !!hi, fill: { color: COLORS.panel }, fontSize: 15 } });
    const rows = [
      [{ text: "", options: { fill: { color: COLORS.bg } } }, head("무료", true), head("Plus"), head("Pro"), head("Ultra")],
      [label("월 요금"), cell("0원", true), cell("7,500원"), cell("약 29,000원*"), cell("119,000원 또는\n300,000원")],
      [label("사용량 충전"), cell("일주일마다", true), cell("일주일마다"), cell("5시간마다\n(주간 한도 있음)"), cell("5시간마다\n(가장 넉넉함)")],
      [label("제미나이 모델"), cell("3.8 Flash", true), cell("3.8 Flash"), cell("3.8 Flash\n+ 4 Argon"), cell("3.8 Flash\n+ 4 Argon")],
      [label("클로드 5.5"), cell("불가", true), cell("불가"), cell("가능(체험 제외)"), cell("가능")],
      [label("추가 크레딧"), cell("불가", true), cell("불가"), cell("가능"), cell("가능")],
    ];
    s.addTable(rows, { x: 0.6, y: 1.72, w: 12.13, colW: [2.33, 2.45, 2.45, 2.45, 2.45], rowH: [0.52, 0.76, 0.76, 0.76, 0.6, 0.6], fontFace: FONT, valign: "middle", border: { type: "solid", color: COLORS.bg, pt: 3 }, objectName: "A0|요금제 비교표" });
    source(s, "공식 문서 Plans·Models, 구글 구독 페이지, 앱 안내 기준(2026.11.3 확인). *Pro 가격은 2차 자료 값, 결제 전 확인하세요.");
    s.addNotes("무료로도 모든 기능을 쓸 수 있어요. 공식 문서에 예약 작업과 CLI 같은 기능은 모든 요금제에서 쓸 수 있다고 나와요. 차이는 얼마나 자주 충전되는지와 어떤 모델을 쓰는지예요. Pro부터는 5시간마다 충전되고 최신 모델을 쓸 수 있어요.\n\n[강사 확인 필요] 제 Plus 계정의 앱 화면에 'Google AI Plus 사용자는 최소 기본 한도를 받는다'고 나와요. 안티그라비티만 보고 Plus를 결제하지는 마세요. Pro 약 29,000원은 2026년 5월 기준 2차 자료예요. Claude 4.6과 GPT-OSS는 무료·Plus에서도 쓸 수 있지만 2026년 11월 18일 제거 예정이라 표에서 뺐어요. 강의가 그 전이면 말로 보태 주세요.");
  }

  // 내 사용량 보기
  shotSlide("내 사용량은 여기서 봐요", "USAGE", "usage", 1025, 790, "Models and Usage 화면. Plus는 최소 기본 한도라는 안내, 주간 한도 91퍼센트와 100퍼센트 남음", [
    ["Your Plan", "Plus는 최소 기본 한도라고 나와요."],
    ["Weekly Limit Remaining", "일주일 한도가 얼마나 남았는지 보여요."],
    ["모델별로 따로", "제미나이와 클로드·GPT가 나뉘어 있어요."],
    ["AI Credit Overages", "한도 뒤 크레딧을 쓸지 정해요. 꺼 두면 안전해요."],
  ], "Settings의 Models에 들어가면 볼 수 있어요. 제 Plus 계정인데 맨 위에 'Plus 사용자는 최소 기본 한도를 받는다'고 나와요. 아래에는 일주일 한도가 얼마나 남았는지 모델별로 보여요. 제 화면은 제미나이 91퍼센트, 클로드와 GPT 100퍼센트가 남아 있었어요. 크레딧 초과 사용 스위치는 켜면 돈이 더 나갈 수 있으니 처음에는 꺼 두세요.\n\n[강사 확인 필요] 공식 Plans 문서는 추가 크레딧이 Pro와 Ultra 전용이라고 하는데, 제 Plus 화면에도 이 스위치가 보여요. 비교표의 Plus 칸은 공식 문서 기준이에요. 켜면 실제로 결제되는지는 확인하지 못했으니 함부로 켜지 마세요.");

  // 추천과 문제 해결
  {
    const s = addSlide(14, "어떤 요금제로, 막히면 어떻게", "RECOMMEND");
    moving(s, "refill.gif", 1.15, 1.9, 2.5, 2.5, 0, "사용량 고리가 줄었다가 다시 차오르는 애니메이션");
    text(s, "한도", 1.35, 2.72, 2.1, 0.55, 1, { size: 26, bold: true, align: "center", valign: "middle", name: "글" });
    text(s, "바닥나면 기다려요", 1.35, 3.26, 2.1, 0.3, 1, { size: 12, color: COLORS.muted, align: "center", name: "글" });
    text(s, "무거운 일일수록\n한도가 빨리 줄어요", 0.6, 4.6, 3.6, 0.75, 1, { size: 15, bold: true, color: COLORS.sky, align: "center", name: "글" });
    const plans = [
      ["무료", "처음 배울 때", "연습에는 충분해요. 먼저 무료로 시작하세요.", COLORS.sky],
      ["Pro", "매일 작업할 때", "5시간 충전과 최신 모델이 필요할 때 올려요.", COLORS.text],
      ["Ultra", "일로 많이 돌릴 때", "입문 단계에서는 필요 없어요.", COLORS.amber],
    ];
    plans.forEach(([name, when, why, color], i) => {
      const y = 1.85 + i * 0.86;
      card(s, 4.45, y, 8.28, 0.75, i + 2, i === 0 ? { line: COLORS.sky, lineW: 1.75 } : {});
      text(s, name, 4.65, y, 0.95, 0.75, i + 2, { size: 19, bold: true, color, valign: "middle" });
      text(s, when, 5.6, y, 2.15, 0.75, i + 2, { size: 15, bold: true, valign: "middle" });
      text(s, why, 7.75, y, 4.85, 0.75, i + 2, { size: 13, color: COLORS.muted, valign: "middle" });
    });
    const fixes = [
      ["느려졌어요", "안 쓰는 플러그인을 ⋮ 메뉴에서 꺼요."],
      ["권한 오류가 나요", "로그인한 계정의 권한을 다시 확인해요."],
      ["대화가 길어요", "/compact로 줄이거나 새 대화로 시작해요."],
      ["플러그인이 안 보여요", "앱을 한 번 재시작해 봐요."],
    ];
    fixes.forEach(([q, a2], i) => {
      const y = 4.45 + i * 0.57;
      card(s, 4.45, y, 8.28, 0.5, i + 5);
      text(s, q, 4.65, y, 2.6, 0.5, i + 5, { size: 14, bold: true, color: COLORS.coral, valign: "middle", name: "문제" });
      text(s, a2, 7.3, y, 5.3, 0.5, i + 5, { size: 13, valign: "middle", name: "해결" });
    });
    s.addNotes("추천은 무료로 시작하기예요. 한도에 자주 걸리고 매일 쓰게 되면 그때 Pro로 올리세요. 한도는 작업 내용과 구글 쪽 여유에 따라 달라지고, 공식 문서에도 바뀔 수 있다고 나와요. 플러그인을 많이 켜 두면 느려질 수 있으니 안 쓰는 건 꺼 두세요. 연결 오류가 나면 대부분 권한 문제예요. 어느 계정으로 로그인했는지 확인하고 다시 승인해 보세요.\n\n[참고] 플러그인 20개 이상이면 느려진다는 이야기와 해결법은 참고 영상의 설명이에요. 공식 수치는 아니에요.");
  }

  // 실습과 마무리
  {
    const s = addSlide(15, "실습 3·4: 말로 내 첫 웹페이지 만들기", "PRACTICE");
    const steps = [
      "앱을 열고 빈 연습 폴더를 프로젝트로 열어요",
      "New Conversation을 눌러요",
      "\"내 소개 웹페이지를 한 장으로 만들어 줘\"",
      "계획을 읽고 진행을 승인해요",
      "결과를 보고 \"글자를 더 크게\"라고 고쳐요",
    ];
    for (let i = 0; i < 5; i++) {
      const y = 1.85 + i * 0.93;
      card(s, 0.6, y, 7.6, 0.8, i);
      s.addShape(pres.ShapeType.ellipse, { x: 0.8, y: y + 0.14, w: 0.52, h: 0.52, fill: { color: COLORS.sky }, line: { color: COLORS.sky, width: 0 }, objectName: `A${i}|번호 원` });
      text(s, String(i + 1), 0.8, y + 0.14, 0.52, 0.52, i, { size: 16, bold: true, color: COLORS.bg, align: "center", valign: "middle", name: "번호" });
      text(s, steps[i], 1.52, y, 6.55, 0.8, i, { size: 15, bold: true, valign: "middle" });
    }
    moving(s, "hub.gif", 9.25, 1.65, 2.85, 2.85, 5, "가운데 에이전트와 바깥 도구들 사이로 신호가 오가는 애니메이션");
    text(s, "오늘의 3줄", 8.55, 4.55, 4.2, 0.4, 6, { size: 18, bold: true, color: COLORS.sky });
    text(s, bullets(["챗봇과 달리 직접 일하는 AI예요", "허용 창은 읽고 나서 눌러요", "무료로 시작하고 결과는 눈으로 확인해요"]), 8.55, 4.97, 4.2, 1.45, 6, { size: 14, spacing: 1.25 });
    s.addNotes("이제 직접 해 볼게요. 한 단계씩 같이 갈 테니 막히면 손 들어 주세요. 실습 3은 20분이에요. 빈 폴더를 열고 소개 웹페이지를 만들어 달라고 말해 보세요. 계획을 읽고 승인하면 AI가 일을 시작해요. 실습 4는 15분이에요. 결과를 내장 브라우저로 보고 글자 크기, 색, 내용을 말로 고쳐 달라고 해 보세요. 다 되면 옆 사람 페이지도 구경해요. 먼저 끝낸 분은 사진을 넣어 달라고 하거나 취미 소개 페이지를 새로 부탁해 보세요. 오늘 배운 건 세 줄이에요. 직접 일하는 AI, 허용 창은 읽고 나서 누르기, 무료로 시작해 눈으로 확인하기. 수고하셨어요! 끝나면 구글 계정 로그아웃을 꼭 해 주세요.\n\n[강사 준비물] 컴퓨터실 PC에 앱이 미리 깔려 있는지, 재부팅 뒤에도 남아 있는지 확인해 주세요. 구글 계정 로그인과 컴퓨터실 인터넷도 확인하고, 수강생별 빈 연습 폴더 위치를 정해 두세요. 무료 한도가 금방 찰 수 있으니 강사 계정의 시연도 준비해 두세요.");
  }

  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
