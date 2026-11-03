// 제미나이 노트북 모바일 강의 슬라이드 15장. 다음 순서로 돌린다:
// make_gifs.py → build_deck.js → add_motion.py
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const OUT = process.argv[2];
const GIFS = path.join(__dirname, "gifs");
const gif = (name) => path.join(GIFS, name);
const screen = (name) => path.join(__dirname, "screens", name + ".png");

const COLORS = {
  bg: "0A0D14", panel: "141A26", line: "2A3446", text: "F2F5FA", muted: "A3AEC0",
  mint: "3DF5C4", violet: "8B7BFF", amber: "FFC857",
};
const THEME = {
  name: "Gemini Notebook Lecture", headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic",
  colors: {
    dk1: COLORS.bg, lt1: COLORS.text, dk2: COLORS.panel, lt2: COLORS.muted,
    accent1: COLORS.mint, accent2: COLORS.violet, accent3: COLORS.amber,
    accent4: COLORS.line, accent5: "5B6B85", accent6: "1C2433", hlink: COLORS.mint, folHlink: COLORS.violet,
  },
};
const FONT = "Malgun Gothic";
const TOTAL = 15;

async function icon(Comp, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "출퇴근길이 1:1 과외가 되는 제미나이 노트북";
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

  // 슬라이드마다 자리를 옮겨 다니는 빛 덩어리와 진행 표시. 같은 이름이라 모핑 전환 때 이어서 움직인다.
  const orbSpots = [[1.6, 3.6], [9.8, -1.4], [-1.2, 3.6], [8.8, 3.9], [3.8, -1.8], [10.0, 0.6], [-1.6, 0.6], [-1.8, 4.0], [4.0, 4.2], [9.6, -1.2], [4.6, 4.0], [9.6, 4.0], [9.6, 4.0], [-1.5, 3.6], [3.0, 4.2]];

  function addSlide(n, title, eyebrow, master = "CONTENT") {
    const s = pres.addSlide({ masterName: master });
    const [ox, oy] = orbSpots[n - 1];
    s.addShape(pres.ShapeType.ellipse, { x: ox, y: oy, w: 5.2, h: 5.2, fill: { color: n % 2 ? COLORS.violet : COLORS.mint, transparency: 94 }, line: { color: COLORS.bg, transparency: 100 }, objectName: "!!orb" });
    if (master === "CONTENT") {
      s.addShape(pres.ShapeType.rect, { x: track.x, y: track.y, w: track.w * n / TOTAL, h: track.h, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 }, objectName: "!!progress" });
      s.addText(eyebrow, { x: 0.6, y: 0.36, w: 9, h: 0.32, fontFace: FONT, fontSize: 13, bold: true, color: COLORS.mint, charSpacing: 2, margin: 0, isTextBox: true, objectName: "eyebrow" });
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
  async function badge(s, Comp, x, y, step, color = COLORS.mint, d = 0.62) {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color, transparency: 84 }, line: { color, width: 1 }, objectName: `A${step}|아이콘 원` });
    s.addImage({ data: await icon(Comp, color), x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5, objectName: `A${step}|아이콘`, altText: "아이콘" });
  }
  const moving = (s, name, x, y, w, h, step, alt) => s.addImage({ path: gif(name), x, y, w, h, objectName: `A${step}|움직이는 그림`, altText: alt });
  // 폰 화면 캡처. 크기 비율은 make_screens.py의 자르는 범위(1080x2200)와 맞춘다.
  const PHONE_W = 2.26, PHONE_H = 2.26 * 2200 / 1080, PHONE_Y = 1.72;
  const shot = (s, name, x, step, alt) => s.addImage({ path: screen(name), x, y: PHONE_Y, w: PHONE_W, h: PHONE_H, objectName: `A${step}|앱 화면`, altText: alt });
  const ring = (s, x, y, w, h, step) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: COLORS.mint, transparency: 100 }, line: { color: COLORS.mint, width: 2.5 }, objectName: `A${step}|강조 표시` });
  const caption = (s, t, x, step) => text(s, t, x - 0.2, PHONE_Y + PHONE_H + 0.05, PHONE_W + 0.4, 0.26, step, { size: 12, color: COLORS.muted, align: "center", name: "화면 설명" });
  const source = (s, t) => text(s, t, 0.6, 6.62, 11.3, 0.3, null, { size: 11, color: COLORS.muted, name: "출처" });

  // 1. 표지
  {
    const s = addSlide(1, "출퇴근길이\n1:1 과외가 되는\n제미나이 노트북", "", "COVER");
    text(s, "GEMINI NOTEBOOK  ·  MOBILE", 0.7, 1.4, 7, 0.35, 1, { size: 14, bold: true, color: COLORS.mint, name: "머리말" });
    text(s, "구 노트북LM 사용법부터 최신 기능, 무료와 유료 차이까지", 0.7, 4.45, 7, 0.4, 2, { size: 18, color: COLORS.muted, name: "부제" });
    text(s, "2026년 11월 기준", 0.7, 5.0, 7, 0.35, 3, { size: 14, color: COLORS.muted, name: "기준일" });
    moving(s, "orbit.gif", 7.55, 1.2, 5.1, 5.1, 2, "자료 조각들이 가운데 노트북 주위를 도는 애니메이션");
    s.addNotes("안녕하세요. 오늘은 구글의 제미나이 노트북, 예전 이름으로 노트북LM을 스마트폰에서 제대로 쓰는 법을 같이 해 볼 거예요. 출퇴근길 40분을 나만의 과외 시간으로 바꾸는 게 오늘의 목표예요. 끝나고 나면 앱 설치, 자료 넣기, 녹음, 질문까지 직접 해 보고, 무료로 충분한지 유료가 필요한지도 스스로 판단할 수 있게 돼요.");
  }

  // 2. 문제
  {
    const s = addSlide(2, "이동 중에 자료 보기, 왜 이렇게 힘들까요", "PROBLEM");
    const rows = [
      [fa.FaMobileScreen, "작은 화면", "출퇴근 40분~1시간,\n긴 보고서는 폰으로 읽기 벅차요"],
      [fa.FaEye, "눈의 피로", "빽빽한 글씨를 계속 읽으면\n내용보다 눈이 먼저 지쳐요"],
      [fa.FaCircleQuestion, "믿어도 될까", "일반 챗봇 답변은 어느 자료에서\n나왔는지 바로 확인하기 어려워요"],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 1.85, 3.9, 2.6, i);
      await badge(s, rows[i][0], x + 0.3, 2.1, i);
      text(s, rows[i][1], x + 0.3, 2.85, 3.3, 0.45, i, { size: 21, bold: true });
      text(s, rows[i][2], x + 0.3, 3.35, 3.35, 0.9, i, { size: 15, color: COLORS.muted });
    }
    text(s, "집", 0.6, 5.15, 0.8, 0.4, 3, { size: 18, bold: true, align: "center", valign: "middle" });
    moving(s, "route.gif", 1.4, 4.85, 9.8, 1.0, 3, "집에서 회사로 가는 길 위를 지나가는 점 애니메이션");
    text(s, "회사", 11.25, 5.15, 1.45, 0.4, 3, { size: 18, bold: true, valign: "middle" });
    text(s, "이 40분을 듣고 묻는 시간으로 바꿔 볼게요", 0.6, 6.05, 12.1, 0.45, 4, { size: 20, bold: true, color: COLORS.mint, align: "center" });
    s.addNotes("다들 출퇴근길에 '이 자료 봐야 하는데' 하면서 폰 켰다가 금방 닫아 본 적 있으시죠? 화면은 작고, 눈은 아프고, 챗봇에 물어보면 이 답이 어디서 나온 건지 찜찜해요. 오늘 배울 앱은 이 세 가지를 듣기와 말하기, 그리고 내 자료 기반 답변으로 풀어 줘요.");
  }

  // 3. 정의
  {
    const s = addSlide(3, "내가 넣은 자료를 읽고 답하는 AI", "WHAT IS IT");
    card(s, 0.6, 1.85, 5.9, 3.55, 0);
    text(s, "일반 챗봇", 0.95, 2.1, 5, 0.5, 0, { size: 22, bold: true, color: COLORS.muted });
    text(s, [
      { text: "넓은 지식과 웹을 바탕으로 답해요", options: { bullet: true, breakLine: true } },
      { text: "근거를 내가 따로 찾아봐야 해요", options: { bullet: true, breakLine: true } },
      { text: "내 회의록과 내 PDF는 잘 몰라요", options: { bullet: true } },
    ], 0.95, 2.8, 5.2, 2.4, 0, { size: 19, color: COLORS.muted, spacing: 1.6 });
    card(s, 6.83, 1.85, 5.9, 3.55, 1, { line: COLORS.mint, lineW: 1.75 });
    text(s, "제미나이 노트북", 7.18, 2.1, 5, 0.5, 1, { size: 22, bold: true, color: COLORS.mint });
    text(s, [
      { text: "내가 넣은 자료를 중심으로 답해요", options: { bullet: true, breakLine: true } },
      { text: "답변에 근거 자료 위치가 표시돼요", options: { bullet: true, breakLine: true } },
      { text: "PDF, 링크, 사진, 녹음까지 넣어요", options: { bullet: true } },
    ], 7.18, 2.8, 5.2, 2.4, 1, { size: 19, spacing: 1.6 });
    await badge(s, fa.FaArrowsRotate, 0.6, 5.68, 2, COLORS.violet, 0.58);
    text(s, "이름이 바뀌었어요", 1.35, 5.62, 4, 0.36, 2, { size: 18, bold: true });
    text(s, "2026년 7월부터 NotebookLM은 Gemini Notebook이에요. 쓰던 노트북은 그대로 남아 있어요.", 1.35, 6.0, 11.3, 0.36, 2, { size: 15, color: COLORS.muted });
    s.addNotes("가장 큰 차이는 '어디를 보고 답하느냐'예요. 제미나이 노트북은 내가 넣은 자료를 중심으로 답하고, 답변 옆에 근거 표시를 눌러 원문 위치를 확인할 수 있어요. 예전에 노트북LM이라는 이름으로 쓰셨다면 같은 서비스예요. 앱 스토어에서는 Gemini Notebook으로 찾으시면 돼요.\n\n[참고] 이름 변경 시점은 2026년 7월 16일로 보도되었어요. 구글 원문이 아니라 해외 IT 매체와 가이드 글 기준이에요.");
  }

  // 4. 최신 소식
  {
    const s = addSlide(4, "2026년에 달라진 것들", "WHAT'S NEW");
    moving(s, "flow.gif", 0.6, 2.03, 12.13, 0.606, 0, "왼쪽에서 오른쪽으로 흐르는 자료 입자 애니메이션");
    const items = [
      ["7월", "이름 변경", "NotebookLM에서\nGemini Notebook으로", COLORS.violet],
      ["8~9월", "사용량 규칙 개편", "하루 횟수 대신\n5시간마다 다시 충전", COLORS.violet],
      ["9월", "실시간 음성·녹음기", "폰에서 말로 묻고\n현장 녹음을 바로 소스로", COLORS.mint],
      ["9월 이후", "학습 기능 추가", "학습 개요, 새 퀴즈,\n60초 쇼트 비디오", COLORS.mint],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 3.08;
      const [when, head, body, color] = items[i];
      text(s, when, x, 1.65, 2.85, 0.42, i + 1, { size: 20, bold: true, color, name: "시기" });
      card(s, x, 2.8, 2.87, 2.95, i + 1);
      text(s, head, x + 0.22, 3.05, 2.45, 0.85, i + 1, { size: 20, bold: true });
      text(s, body, x + 0.22, 3.98, 2.5, 1.5, i + 1, { size: 16, color: COLORS.muted, spacing: 1.25 });
    }
    source(s, "출처: 구글 공식 블로그(2026.8.28, 9.15~16). 이름 변경 날짜는 IT 매체 보도 기준이에요.");
    s.addNotes("올해 변화를 네 덩어리로 보면 돼요. 7월에 이름이 바뀌었고, 8월 말에 사용량 규칙이 바뀌어 9월 2일부터 적용되었어요. 9월 중순에는 오늘의 주인공인 실시간 음성과 녹음기가 모바일 앱에 들어왔어요. 그 뒤로 학습 개요와 새 퀴즈 형식, 약 60초 분량의 쇼트 비디오 개요도 순차적으로 들어오고 있어요.\n\n[참고] 쇼트 비디오 개요는 80개 이상 언어 지원으로 발표되었어요.");
  }

  // 5. 사용법 지도
  {
    const s = addSlide(5, "사용법은 딱 4단계예요", "HOW TO");
    const steps = [
      ["01", "설치·로그인", "앱을 깔고\n구글 계정으로 들어가요", fa.FaDownload],
      ["02", "소스 넣기", "PDF, 링크, 사진을\n노트북에 담아요", fa.FaFolderPlus],
      ["03", "녹음하기", "회의나 강의를\n바로 소스로 만들어요", fa.FaMicrophoneLines],
      ["04", "묻고 만들기", "질문하고 요약과\n오디오를 뽑아요", fa.FaWandMagicSparkles],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 3.08;
      card(s, x, 2.1, 2.87, 3.75, i);
      text(s, steps[i][0], x + 0.25, 2.3, 1.6, 0.9, i, { size: 44, bold: true, color: COLORS.mint, name: "번호" });
      await badge(s, steps[i][3], x + 1.95, 2.4, i, COLORS.violet);
      text(s, steps[i][1], x + 0.25, 3.55, 2.45, 0.5, i, { size: 22, bold: true });
      text(s, steps[i][2], x + 0.25, 4.2, 2.45, 1.3, i, { size: 16, color: COLORS.muted, spacing: 1.2 });
    }
    s.addNotes("어렵지 않아요. 깔고, 넣고, 녹음하고, 물어보면 끝이에요. 지금부터 한 단계씩 화면과 함께 볼 거고, 맨 마지막에 5분 실습으로 직접 해 볼 거예요.");
  }

  // 6. 설치·화면
  {
    const s = addSlide(6, "1단계: 설치하고 화면 익히기", "STEP 1");
    const list = [
      ["스토어에서 검색", "Play 스토어나 앱 스토어에서 Gemini Notebook을 찾아 설치해요."],
      ["구글 계정 로그인", "PC에서 만든 노트북이 폰에도 그대로 들어와 있어요."],
      ["아래쪽 세 버튼 기억하기", "카메라, 마이크, 새로 만들기가 시작 버튼이에요."],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 1.95 + i * 1.5;
      card(s, 0.6, y, 7.9, 1.3, i);
      text(s, String(i + 1), 0.85, y + 0.25, 0.6, 0.8, i, { size: 30, bold: true, color: COLORS.mint, valign: "middle", name: "번호" });
      text(s, list[i][0], 1.5, y + 0.17, 6.8, 0.42, i, { size: 19, bold: true });
      text(s, list[i][1], 1.5, y + 0.66, 6.8, 0.4, i, { size: 15, color: COLORS.muted });
    }
    shot(s, "home", 9.5, 2, "Gemini Notebook 앱의 첫 화면. 위쪽에 전체, 내 노트북, 공유됨, 다운로드됨 탭이 있고 아래쪽에 카메라, 마이크, 새로 만들기 버튼이 있어요");
    ring(s, 9.87, PHONE_Y + 4.14, 1.52, 0.37, 3);
    caption(s, "앱 첫 화면", 9.5, 2);
    s.addNotes("스토어에서 Gemini Notebook을 검색해 설치하세요. 로그인하면 PC에서 쓰던 노트북이 그대로 보여요. 위쪽에는 전체, 내 노트북, 공유됨, 다운로드됨 탭이 있고, 표시한 아래쪽에는 카메라, 마이크, 새로 만들기 버튼이 있어요. 카메라는 사진을, 마이크는 녹음을 바로 소스로 넣는 지름길이에요.");
  }

  // 7. 소스
  {
    const s = addSlide(7, "2단계: 소스 넣기", "STEP 2");
    text(s, "새로 만들기 → 소스 추가 → 오른쪽 화면에서 고르면 끝이에요", 0.6, 1.5, 7, 0.36, null, { size: 15, color: COLORS.muted, name: "설명" });
    const tiles = [
      [fa.FaFile, "파일", "PDF 같은 내 문서"],
      [fa.FaImage, "사진", "보고서를 찍어서"],
      [fa.FaLink, "웹사이트·유튜브", "링크 붙여 넣기"],
      [fa.FaPaste, "복사된 텍스트", "메모나 글 붙여 넣기"],
      [fa.FaBookOpen, "Play 북", "구글 플레이 도서"],
      [fa.FaGoogleDrive, "Drive", "구글 드라이브 파일"],
    ];
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 3.5, y = 2.0 + row * 1.27;
      card(s, x, y, 3.35, 1.14, i);
      await badge(s, tiles[i][0], x + 0.18, y + 0.28, i, i < 3 ? COLORS.mint : COLORS.violet, 0.58);
      text(s, tiles[i][1], x + 0.92, y + 0.2, 2.35, 0.38, i, { size: 17, bold: true });
      text(s, tiles[i][2], x + 0.92, y + 0.62, 2.35, 0.34, i, { size: 14, color: COLORS.muted });
    }
    text(s, "꿀팁: 주제 하나에 노트북 하나. 섞어 넣으면 답도 섞여요.", 0.6, 5.85, 6.95, 0.36, 6, { size: 16, bold: true, color: COLORS.mint, name: "꿀팁" });
    text(s, "유튜브는 공개 영상의 스크립트만 가져오고, 유료 기사는 안 돼요.", 0.6, 6.25, 6.95, 0.32, 6, { size: 14, color: COLORS.muted, name: "주의" });
    shot(s, "add_source", 7.85, 1, "소스 추가 화면. 파일, 사진, 웹사이트, 복사된 텍스트, Play 북, Drive 버튼이 세로로 나열되어 있어요");
    caption(s, "소스 추가 화면", 7.85, 1);
    shot(s, "url", 10.45, 3, "웹사이트 또는 YouTube URL을 붙여 넣는 화면과 주의 사항");
    caption(s, "링크 붙여 넣기", 10.45, 3);
    s.addNotes("소스는 AI가 읽을 교재라고 생각하면 돼요. 파일, 사진, 웹사이트와 유튜브 링크, 복사한 텍스트, Play 북, 드라이브까지 넣을 수 있어요. 맨 위 검색창에서 웹 자료를 찾아 넣을 수도 있어요. 출근 전에 유튜브 링크 하나, 보고서 PDF 하나 넣어 두면 지하철에서 바로 질문할 수 있어요. 드라이브 파일은 자동 동기화돼요. 링크 화면의 안내를 보면 웹사이트는 텍스트만, 유튜브는 공개 영상의 스크립트만 가져와요. 유료 기사는 안 되고, 최근 올라온 영상은 못 가져올 수 있어요.\n\n[참고] 노트북당 소스 개수는 요금제마다 달라요. 뒤쪽 비교표에서 볼게요.");
  }

  // 8. 녹음
  {
    const s = addSlide(8, "3단계: 녹음 한 번이면 소스가 돼요", "STEP 3");
    moving(s, "wave.gif", 0.6, 1.72, 6.85, 1.6, 0, "녹음 중 소리 파형 애니메이션");
    const flow = [["마이크 누르기", fa.FaMicrophone], ["말하기·현장 녹음", fa.FaComments], ["체크로 끝내기", fa.FaCircleCheck], ["소스에 자동 등록", fa.FaFileAudio]];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + (i % 2) * 3.5, y = 3.45 + Math.floor(i / 2) * 1.02;
      card(s, x, y, 3.35, 0.9, i + 1);
      await badge(s, flow[i][1], x + 0.16, y + 0.17, i + 1, COLORS.mint, 0.56);
      text(s, flow[i][0], x + 0.85, y, 2.4, 0.9, i + 1, { size: 16, bold: true, valign: "middle" });
    }
    await badge(s, fa.FaTriangleExclamation, 0.6, 5.6, 5, COLORS.amber, 0.5);
    text(s, "녹음 전에 참석자에게 알리고 동의를 받으세요.", 1.25, 5.55, 6.3, 0.32, 5, { size: 15, bold: true });
    text(s, "최대 1시간. 한국어 처리는 먼저 짧게 시험해 보세요.", 1.25, 5.92, 6.3, 0.32, 5, { size: 14, color: COLORS.muted });
    shot(s, "mic", 7.85, 2, "새 노트북 화면. 아래쪽에 카메라, 마이크, 소스 추가 버튼이 있어요");
    ring(s, 7.85 + 0.72, PHONE_Y + 3.68, 0.42, 0.42, 3);
    caption(s, "여기를 눌러 녹음", 7.85, 2);
    shot(s, "source_list", 10.45, 4, "소스 탭 화면. 추가한 자료가 목록으로 쌓여 있어요");
    caption(s, "소스 목록에 쌓여요", 10.45, 4);
    s.addNotes("아래쪽 마이크를 누르면 바로 녹음이 시작돼요. 화면 안내대로 최대 1시간까지 녹음할 수 있어요. 말을 마치고 체크 버튼을 누르면 m4a 파일이 소스 목록에 자동으로 들어가요. 녹음을 소스로 넣으면 그 내용으로 채팅과 인용, 스튜디오 결과물까지 이어져요. 사람이 있는 자리에서는 꼭 먼저 알리고 녹음하세요.\n\n[강사 확인 필요] 구글 공식 글에는 언어 제한이 없지만 Android Authority 기사는 녹음기를 영어 전용으로 적었어요. 참고 영상도 한국어로 녹음해 소스 등록 중 화면까지만 보여 줬어요. 강의 전에 강사 폰으로 한국어 녹음 후 내용 질문까지 되는지 시험해 주세요. 오른쪽 소스 목록 화면의 예시는 유튜브 소스예요. 녹음 중 화면을 찍으면 그걸로 바꿔도 좋아요.");
  }

  // 9. 묻기
  {
    const s = addSlide(9, "4단계: 글로 묻고, 말로도 묻기", "STEP 4");
    moving(s, "ripple.gif", 0.5, 2.85, 1.75, 1.75, 2, "마이크에서 음성 물결이 퍼지는 애니메이션");
    card(s, 2.35, 1.85, 5.25, 2.1, 0);
    text(s, "채팅: 지금 누구나", 2.6, 2.03, 4.8, 0.42, 0, { size: 19, bold: true });
    text(s, [
      { text: "핵심 3가지를 중학생도 알게 설명해 줘", options: { bullet: true, breakLine: true } },
      { text: "오늘 회의에서 내 할 일만 뽑아 줘", options: { bullet: true, breakLine: true } },
      { text: "이 내용으로 예상 질문 5개 만들어 줘", options: { bullet: true } },
    ], 2.6, 2.52, 4.85, 1.3, 0, { size: 14, color: COLORS.muted, spacing: 1.25 });
    card(s, 2.35, 4.1, 5.25, 2.45, 2, { line: COLORS.mint, lineW: 1.75 });
    text(s, "실시간 음성: 순차 제공 중", 2.6, 4.28, 4.8, 0.42, 2, { size: 19, bold: true, color: COLORS.mint });
    text(s, [
      { text: "입력창의 음성 버튼을 누르면 시작", options: { bullet: true, breakLine: true } },
      { text: "말로 끼어들어 꼬리 질문 가능", options: { bullet: true, breakLine: true } },
      { text: "Plus 계정에서도 연결됐어요", options: { bullet: true, breakLine: true } },
      { text: "한국어로 말하면 한국어로 답해요", options: { bullet: true, breakLine: true } },
      { text: "첫 인사는 영어로 나올 수 있어요", options: { bullet: true } },
    ], 2.6, 4.75, 4.85, 1.65, 2, { size: 14, spacing: 1.2 });
    shot(s, "chat", 7.85, 1, "채팅 탭 화면. 입력창 오른쪽에 음성 버튼이 있고 아래쪽에 소스, 채팅, 스튜디오 탭이 있어요");
    ring(s, 9.62, PHONE_Y + 3.69, 0.36, 0.36, 3);
    caption(s, "채팅 탭과 음성 버튼", 7.85, 1);
    shot(s, "live", 10.45, 3, "실시간 음성 화면. 토스 미니앱을 쉽게 만드는 방법을 한국어로 답하고 있고, 아래쪽에 마이크와 종료 버튼이 있어요");
    caption(s, "한국어로 답하는 화면", 10.45, 3);
    s.addNotes("노트북을 열면 아래쪽에 소스, 채팅, 스튜디오 탭이 있어요. 채팅은 지금 모두가 쓸 수 있어요. 좋은 질문은 대상과 형식을 함께 말하는 거예요. 입력창 오른쪽의 동그란 음성 버튼을 누르면 전화 과외처럼 말로 묻고 듣는 실시간 음성이 시작돼요. 처음에는 안내 창이 뜨는데, 주변 음성을 인식할 수 있으니 다른 사람을 대화에 참여시키려면 먼저 허락을 구하라고 나와요. 구글 발표로는 Ultra부터 열렸고 다른 요금제는 순차 제공이에요. 그래서 내 앱에 버튼이 없으면 고장이 아니라 아직 안 온 거예요. 그때는 채팅과 AI 오디오 오버뷰로 충분히 시작할 수 있어요. 처음 인사가 영어로 나와도 당황하지 마세요. 한국어로 말하면 한국어로 답해요.\n\n[참고] 2026년 11월 3일 강사 Plus 계정에서 시험한 결과예요. 첫 답변은 영어였고, 한국어로 말하니 한국어로 답했어요. 일부 글은 음성 출력이 영어 전용이라고 적었지만 이 시험에서는 그렇지 않았어요. Pro 계정은 확인하지 못했어요.");
  }

  // 10. 스튜디오
  {
    const s = addSlide(10, "스튜디오: 자료 하나로 이만큼 나와요", "STUDIO");
    const items = [
      ["studio", "스튜디오 탭", "7가지 중에서 골라요", "스튜디오 탭. AI 오디오 오버뷰, AI 동영상 오버뷰, 슬라이드 자료, 플래시카드, 퀴즈, 인포그래픽, 보고서 버튼"],
      ["result_audio", "AI 오디오 오버뷰", "▶ 눌러서 재생 · 전체 21분", "AI 오디오 오버뷰 재생 녹화 영상. 길이 21분 28초, 재생 속도와 10초 이동 버튼", 1078],
      ["result_video", "AI 동영상 오버뷰", "▶ 눌러서 재생 · 전체 1분 13초", "짧은 형식 동영상 재생 녹화 영상. 제목은 1%만 살아남는 미니앱의 생존 공식", 1104],
      ["result_report", "보고서", "브리핑 문서로 정리", "보고서 화면. 앱인토스 생태계를 분석한 브리핑 문서"],
      ["result_infographic", "인포그래픽", "한 장으로 정리", "인포그래픽 화면. 상위 1% 미니앱만 살아남는 5가지 핵심 원칙"],
    ];
    const gap = (12.13 - PHONE_W * 5) / 4;
    items.forEach(([name, head, sub, alt, videoH], i) => {
      const x = 0.6 + i * (PHONE_W + gap);
      if (videoH) {
        const poster = fs.readFileSync(path.join(__dirname, "videos", `poster_${name.replace("result_", "")}.png`)).toString("base64");
        s.addMedia({ type: "video", path: path.join(__dirname, "videos", `${name}.mp4`), cover: "image/png;base64," + poster, x, y: PHONE_Y, w: PHONE_W, h: PHONE_W * videoH / 540, objectName: `A${i}|${head} 영상` });
      } else {
        shot(s, name, x, i, alt);
      }
      text(s, head, x - 0.1, PHONE_Y + PHONE_H + 0.03, PHONE_W + 0.2, 0.28, i, { size: 14, bold: true, color: i === 1 ? COLORS.mint : COLORS.text, align: "center", name: "결과물 이름" });
      text(s, sub, x - 0.1, PHONE_Y + PHONE_H + 0.3, PHONE_W + 0.2, 0.24, i, { size: 12, color: COLORS.muted, align: "center", name: "결과물 설명" });
    });
    s.addNotes("앱 아래쪽 탭은 소스, 채팅, 스튜디오예요. 왼쪽 첫 화면이 스튜디오 탭이고, 나머지 네 개는 유튜브 영상 하나를 소스로 넣어 제가 실제로 만든 결과물이에요. 두 번째와 세 번째는 녹화 영상이라 눌러서 소리와 함께 보여 줄 수 있어요. 둘 다 한국어로 나왔어요. 오디오 오버뷰는 21분 28초로 나왔어요. 재생 속도를 바꾸고 10초씩 앞뒤로 옮길 수 있어서 출퇴근길에 가장 추천해요. 동영상은 짧은 형식이 1분 13초, 보고서는 브리핑 문서, 인포그래픽은 한 장 요약으로 나왔어요. 이 밖에 슬라이드 자료, 퀴즈, 플래시카드도 있어요. 학습할 때는 퀴즈와 플래시카드, 업무에는 보고서와 슬라이드 자료가 좋아요. 보고서는 브리핑 문서, 학습 가이드, 블로그 게시물 형식 중에서 고르고, 동영상은 짧은 형식도 한국어로 고를 수 있어요. 만들기 전 화면 아래쪽 막대에서 예상 사용량을 보여 주고, 무거운 결과물일수록 사용량을 많이 써요.\n\n[참고] 도움말에 따르면 한국 거주 사용자에게는 생성 이미지와 동영상에 눈에 보이는 워터마크가 자동으로 붙어요. 상업적으로 쓰려는 분께 알려 주세요.");
  }

  // 11. 비교표
  {
    const s = addSlide(11, "무료와 유료, 한눈에 비교", "PLANS");
    const head = (t, hi) => ({ text: t, options: { bold: true, color: hi ? COLORS.bg : COLORS.text, fill: { color: hi ? COLORS.mint : COLORS.line }, align: "center", fontSize: 18 } });
    const label = (t) => ({ text: t, options: { bold: true, color: COLORS.muted, fill: { color: COLORS.bg }, fontSize: 15 } });
    const cell = (t, hi) => ({ text: t, options: { align: "center", color: COLORS.text, bold: !!hi, fill: { color: COLORS.panel }, fontSize: 16 } });
    const rows = [
      [{ text: "", options: { fill: { color: COLORS.bg } } }, head("무료", true), head("Plus"), head("Pro"), head("Ultra")],
      [label("월 요금"), cell("0원", true), cell("7,500원"), cell("약 29,000원*"), cell("119,000원 또는\n300,000원")],
      [label("노트북 수"), cell("100개", true), cell("200개"), cell("500개"), cell("500개")],
      [label("노트북당 소스"), cell("50개", true), cell("100개"), cell("300개"), cell("500~600개")],
      [label("사용량"), cell("기본", true), cell("기본의 2배"), cell("기본의 4배"), cell("Pro의 5배\n또는 20배")],
      [label("실시간 음성"), cell("미정", true), cell("연결 확인†"), cell("순차 제공"), cell("먼저 제공")],
    ];
    s.addTable(rows, { x: 0.6, y: 1.75, w: 12.13, colW: [2.33, 2.45, 2.45, 2.45, 2.45], rowH: [0.55, 0.78, 0.62, 0.62, 0.78, 0.62], fontFace: FONT, valign: "middle", border: { type: "solid", color: COLORS.bg, pt: 3 }, objectName: "A0|요금제 비교표" });
    source(s, "구글 공식 페이지 기준(2026.11.3 확인). *Pro 가격은 2차 자료 값, 결제 전 확인하세요. †강사 Plus 계정에서 시험한 결과예요.");
    s.addNotes("표에서 볼 건 세 줄이에요. 소스를 얼마나 넣을 수 있는지, 얼마나 자주 쓸 수 있는지, 실시간 음성이 되는지예요. 무료도 노트북 100개, 노트북당 소스 50개라 입문자에게는 넉넉해요. 소스 한 개의 크기 제한은 요금제와 무관하게 같은 걸로 안내되어 있어요.\n\n[강사 확인 필요] Plus 7,500원, Ultra 119,000원과 300,000원은 gemini.google 구독 페이지의 한국 표기예요. Pro 약 29,000원은 2026년 5월 기준 2차 자료라서 강의 직전에 결제 화면에서 확인해 주세요. Ultra 소스 500개와 600개는 저장 공간 20TB와 30TB 요금제별 값이에요. 실시간 음성은 구글 발표상 Ultra부터 순차 제공이고, Plus의 연결 확인은 2026년 11월 3일 강사 계정 결과라 계정마다 다를 수 있어요.");
  }

  // 12. 사용량
  {
    const s = addSlide(12, "유료의 핵심 차이는 사용량이에요", "USAGE");
    moving(s, "refill.gif", 0.6, 1.95, 2.9, 2.9, 0, "사용량 고리가 줄었다가 다시 차오르는 애니메이션");
    text(s, "5시간", 0.8, 2.92, 2.5, 0.65, 1, { size: 30, bold: true, align: "center", valign: "middle", name: "숫자" });
    text(s, "마다 다시 충전", 0.8, 3.56, 2.5, 0.36, 1, { size: 14, color: COLORS.muted, align: "center", name: "숫자 설명" });
    text(s, "주간 한도는 따로 있어요", 0.45, 5.05, 3.2, 0.4, 1, { size: 15, bold: true, color: COLORS.mint, align: "center" });
    const rows = [
      [fa.FaGaugeHigh, "무엇이 사용량을 쓰나요", "질문 복잡도, 채팅 길이, 소스 수,\n쓰는 기능에 따라 달라요."],
      [fa.FaMagnifyingGlassChart, "어디서 확인하나요", "설정 > 사용량에서 봐요.\n채팅창 아래에도 남은 양이 보여요."],
      [fa.FaBatteryQuarter, "다 쓰면 어떡하나요", "초기화를 기다리거나 '나중에 생성'으로\n예약해요. 자주 부족하면 요금제를 올려요."],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 1.85 + i * 1.6;
      card(s, 3.75, y, 6.4, 1.45, i + 2);
      await badge(s, rows[i][0], 3.95, y + 0.4, i + 2, COLORS.violet, 0.62);
      text(s, rows[i][1], 4.78, y + 0.17, 5.25, 0.4, i + 2, { size: 18, bold: true });
      text(s, rows[i][2], 4.78, y + 0.6, 5.25, 0.72, i + 2, { size: 14, color: COLORS.muted });
    }
    shot(s, "reset", 10.45, 5, "앱 안내 화면. 5시간마다 한도 초기화, AI 한도가 24시간이 아니라 5시간마다 새로고침된다는 설명");
    caption(s, "앱 안내 화면", 10.45, 5);
    s.addNotes("이제 '하루 몇 번' 방식이 아니에요. 앱에서도 'AI 한도가 24시간이 아니라 5시간마다 새로고침된다'고 안내해요. 휴대폰 배터리처럼 생각하면 쉬워요. 복잡한 질문이나 동영상 같은 무거운 작업은 많이 쓰고, 5시간마다 다시 차요. 다만 주간 한도는 따로 있어요. 유료 요금제는 이 배터리 크기를 키우는 거예요. 내 사용량은 설정 메뉴에서 바로 확인할 수 있어요. 스튜디오 화면에는 지금 생성과 나중에 생성 버튼이 있어서, 한도가 빠듯하면 예약해 둘 수 있어요.\n\n[참고] 출처: 구글 공식 블로그(2026.8.28), Gemini Notebook 도움말 '사용량 한도', 앱 화면.");
  }

  // 13. 추천
  {
    const s = addSlide(13, "나에게 맞는 요금제 고르기", "RECOMMEND");
    const plans = [
      ["무료", "처음 시작한다면", "먼저 2주는 무료로 써 보세요. 대부분 이걸로 충분해요.", COLORS.mint, true],
      ["Plus", "한도에 자주 걸린다면", "월 7,500원에 사용량 2배, 소스 100개.", COLORS.text, false],
      ["Pro", "매일 업무에 쓴다면", "사용량 4배, 소스 300개. 구글 AI 기능도 함께 커져요.", COLORS.text, false],
      ["Ultra", "음성 하나 때문이라면 보류", "Plus 계정에서도 음성이 연결됐어요. 음성만 보고 결제할 필요는 없어요.", COLORS.amber, false],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 1.8 + i * 0.98;
      const [name, when, why, color, hi] = plans[i];
      card(s, 0.6, y, 12.13, 0.86, i, hi ? { line: COLORS.mint, lineW: 1.75 } : {});
      text(s, name, 0.9, y, 1.4, 0.86, i, { size: 22, bold: true, color, valign: "middle", name: "요금제" });
      text(s, when, 2.3, y, 3.5, 0.86, i, { size: 17, bold: true, valign: "middle" });
      text(s, why, 5.8, y, 6.75, 0.86, i, { size: 14, color: COLORS.muted, valign: "middle" });
    }
    await badge(s, fa.FaGraduationCap, 0.6, 5.84, 4, COLORS.violet, 0.58);
    text(s, "대학생이라면 먼저 확인하세요", 1.35, 5.76, 11, 0.36, 4, { size: 17, bold: true });
    text(s, "자격이 되는 국내 대학생은 AI Plus 1년 무료 혜택이 있어요. 2026년 12월 31일까지 신청이에요.", 1.35, 6.14, 11.3, 0.36, 4, { size: 14, color: COLORS.muted });
    s.addNotes("제 추천은 무료로 시작하기예요. 2주 정도 써 보고 한도에 자주 걸리면 그때 올려도 늦지 않아요. 실시간 음성이 궁금해도 Ultra를 바로 결제할 필요는 없어요. 제 Plus 계정에서도 실시간 음성이 연결됐고요. 영상 속 발표자도 Ultra는 지금 가성비가 안 나온다고 했는데, 저도 같은 의견이에요. 녹음과 AI 오디오 오버뷰만으로도 출퇴근길 활용은 충분해요. 학생이라면 대학생 혜택부터 확인하세요.\n\n[참고] 대학생 혜택: 구글 코리아 블로그와 구글 영문 블로그 기준. 체험 뒤 자동 결제 여부는 신청 화면에서 확인하도록 안내해 주세요.");
  }

  // 14. 활용
  {
    const s = addSlide(14, "이렇게 쓰면 이동 시간이 일하는 시간이 돼요", "USE CASE");
    const nodes = [["현장 녹음", "대화나 강의를 담아요"], ["소스 등록", "노트북으로 자동으로"], ["결론·할 일", "질문해서 바로 뽑아요"]];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.47;
      card(s, x, 1.85, 3.2, 1.3, i * 2, { line: COLORS.mint });
      text(s, nodes[i][0], x + 0.2, 2.02, 2.8, 0.45, i * 2, { size: 20, bold: true, color: COLORS.mint, align: "center" });
      text(s, nodes[i][1], x + 0.2, 2.52, 2.8, 0.4, i * 2, { size: 14, color: COLORS.muted, align: "center" });
      if (i < 2) moving(s, "flow_short.gif", x + 3.25, 2.3, 1.17, 0.39, i * 2 + 1, "다음 단계로 흐르는 자료 입자 애니메이션");
    }
    const scenes = [
      [fa.FaUsers, "회의 끝나고", "녹음을 넣고 \"결정 사항과\n내 할 일만\" 물어봐요."],
      [fa.FaGraduationCap, "시험·공부", "수업 자료를 넣고\n오디오 오버뷰를 들으며 등교해요."],
      [fa.FaCamera, "출장·외근", "받은 보고서를 찍어 넣고\n핵심을 바로 물어봐요."],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.11;
      card(s, x, 3.45, 3.9, 2.25, i + 5);
      await badge(s, scenes[i][0], x + 0.25, 3.68, i + 5, COLORS.violet);
      text(s, scenes[i][1], x + 1.02, 3.72, 2.7, 0.5, i + 5, { size: 19, bold: true, valign: "middle" });
      text(s, scenes[i][2], x + 0.25, 4.5, 3.4, 1.0, i + 5, { size: 15, color: COLORS.muted, spacing: 1.2 });
    }
    await badge(s, fa.FaCarSide, 0.6, 5.92, 8, COLORS.amber, 0.5);
    text(s, "운전 중에는 듣기만 하세요. 화면 조작은 꼭 멈춘 뒤에 해요.", 1.25, 5.95, 11.4, 0.45, 8, { size: 17, bold: true, valign: "middle" });
    s.addNotes("흐름은 녹음, 소스 등록, 결론 뽑기예요. 회의가 끝나면 지하철에서 할 일을 뽑고, 학생은 수업 자료를 오디오로 듣고, 외근 중에는 받은 종이 보고서를 사진으로 찍어 넣으면 돼요. 운전 중에는 안전이 먼저예요. 미리 받아 둔 오디오를 듣는 정도로만 쓰고, 조작은 차를 세운 뒤에 하세요.");
  }

  // 15. 실습과 마무리
  {
    const s = addSlide(15, "지금 5분 실습, 오늘 출근길부터 시작", "PRACTICE");
    const steps = [
      "앱을 설치하고 로그인해요",
      "새 노트북을 하나 만들어요",
      "유튜브 링크 1개와 사진 1장을 넣어요",
      "마이크로 30초만 녹음해요",
      "\"핵심 3가지를 쉽게 설명해 줘\"라고 물어봐요",
    ];
    for (let i = 0; i < 5; i++) {
      const y = 1.85 + i * 0.93;
      card(s, 0.6, y, 7.6, 0.8, i);
      s.addShape(pres.ShapeType.ellipse, { x: 0.8, y: y + 0.14, w: 0.52, h: 0.52, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 }, objectName: `A${i}|번호 원` });
      text(s, String(i + 1), 0.8, y + 0.14, 0.52, 0.52, i, { size: 16, bold: true, color: COLORS.bg, align: "center", valign: "middle", name: "번호" });
      text(s, steps[i], 1.52, y, 6.55, 0.8, i, { size: 16, bold: true, valign: "middle" });
    }
    moving(s, "orbit.gif", 9.25, 1.65, 2.85, 2.85, 5, "자료 조각들이 가운데 노트북 주위를 도는 애니메이션");
    text(s, "오늘의 3줄", 8.55, 4.55, 4.2, 0.4, 6, { size: 18, bold: true, color: COLORS.mint });
    text(s, [
      { text: "내 자료로 답하는 AI예요", options: { bullet: true, breakLine: true } },
      { text: "폰에서 녹음과 음성까지 돼요", options: { bullet: true, breakLine: true } },
      { text: "무료로 시작하고 한도 보고 올려요", options: { bullet: true } },
    ], 8.55, 4.97, 4.2, 1.45, 6, { size: 15, spacing: 1.25 });
    s.addNotes("이제 직접 해 볼게요. 5분만 드릴게요. 막히면 손 들어 주세요. 다 하신 분은 만든 노트북에서 AI 오디오 오버뷰도 눌러 보세요. 생성에는 시간이 조금 걸리니까 돌아가는 길에 들으시면 딱이에요. 오늘 배운 건 세 줄이에요. 내 자료로 답하는 AI, 폰에서 녹음과 음성, 무료로 시작해 한도를 보고 올리기. 수고하셨어요!\n\n[강사 준비물] 실습용 유튜브 링크 하나와 사진으로 찍을 예시 문서, 강사 폰 화면 미러링, 실습실 와이파이를 미리 확인해 주세요.");
  }

  await pres.writeFile({ fileName: OUT });
  const applyThemePath = process.env.PPTX_SKILL + "/scripts/apply_theme.js";
  const { applyTheme } = require(applyThemePath);
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
