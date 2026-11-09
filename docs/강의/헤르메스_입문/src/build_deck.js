// 헤르메스 입문 강의 슬라이드 15장. 다음 순서로 돌린다:
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
  blue: "5B8CFF", amber: "E8B04A",
};
const THEME = {
  name: "Hermes Lecture", headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic",
  colors: {
    dk1: COLORS.bg, lt1: COLORS.text, dk2: COLORS.panel, lt2: COLORS.muted,
    accent1: COLORS.blue, accent2: COLORS.muted, accent3: COLORS.amber,
    accent4: COLORS.line, accent5: "5B6B85", accent6: "1C2433", hlink: COLORS.blue, folHlink: COLORS.muted,
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
  pres.title = "나 대신 일하는 AI 비서, 헤르메스";
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

  // 슬라이드 위 작은 머리말은 헤르메스 명령어 모양 /주제로 쓴다. 진행 표시는 모핑 전환 때 이어서 늘어난다.
  function addSlide(n, title, eyebrow, master = "CONTENT") {
    const s = pres.addSlide({ masterName: master });
    if (master === "CONTENT") {
      s.addShape(pres.ShapeType.rect, { x: track.x, y: track.y, w: track.w * n / TOTAL, h: track.h, fill: { color: COLORS.blue }, line: { color: COLORS.blue, width: 0 }, objectName: "!!progress" });
      s.addText(`/${eyebrow}`, { x: 0.6, y: 0.36, w: 9, h: 0.32, fontFace: CODE, fontSize: 13, color: COLORS.muted, margin: 0, isTextBox: true, objectName: "eyebrow" });
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
  // 헤르메스 실제 화면. 상자 안에 비율을 지켜 가운데로 넣고, 실제로 차지한 자리를 돌려준다.
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
    const s = addSlide(1, "나 대신 일하는\nAI 비서,\n헤르메스", "", "COVER");
    text(s, "Hermes Agent 0.23", 0.7, 1.4, 7, 0.35, 1, { size: 14, font: CODE, color: COLORS.muted, name: "머리말" });
    text(s, "설치부터 대화, 메신저 연결, 예약 작업까지", 0.7, 4.45, 7, 0.4, 2, { size: 18, color: COLORS.muted, name: "부제" });
    text(s, "2026년 11월 기준", 0.7, 5.0, 7, 0.35, 3, { size: 14, color: COLORS.muted, name: "기준일" });
    await shot(s, "home", { x: 7.2, y: 1.5, w: 5.55, h: 4.5 }, 2, "헤르메스 데스크탑 첫 화면");
    s.addNotes("오늘은 헤르메스라는 AI 에이전트를 배워 볼게요. 챗GPT처럼 대화도 하지만, 정해진 시간에 알아서 일하고 결과를 텔레그램으로 보내 주는 비서에 가까워요. 오늘 보여 드리는 화면은 전부 제가 매일 쓰는 헤르메스를 찍은 거예요.");
  }

  // 2. 무엇이 다른가
  {
    const s = addSlide(2, "챗봇과 다른 점 네 가지", "무엇인가");
    const rows = [
      [fa.FaClock, "정해진 시간에 혼자 일해요", "매일 아침 9시 브리핑처럼\n예약해 두면 알아서 해요."],
      [fa.FaPaperPlane, "메신저로 결과를 보내요", "텔레그램, 디스코드, 슬랙으로\n받아 보고 거기서 지시해요."],
      [fa.FaBrain, "쓸수록 배워요", "한 일을 기억하고, 자주 하는 일은\n스킬로 만들어 다음에 써요."],
      [fa.FaCodeBranch, "무료 오픈소스", "앱은 무료(MIT)예요.\n모델은 원하는 걸 골라 써요."],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + (i % 2) * 6.16, y = 1.8 + Math.floor(i / 2) * 2.3;
      card(s, x, y, 5.96, 2.1, i);
      await badge(s, rows[i][0], x + 0.3, y + 0.3, i);
      text(s, rows[i][1], x + 1.1, y + 0.32, 4.6, 0.45, i, { size: 20, bold: true });
      text(s, rows[i][2], x + 1.1, y + 0.9, 4.6, 1.0, i, { size: 15, color: COLORS.muted, spacing: 1.2 });
    }
    source(s, "출처: 헤르메스 공식 GitHub README(NousResearch/hermes-agent), 2026.11.9 확인");
    s.addNotes("챗봇은 내가 물어볼 때만 답하죠. 헤르메스는 네 가지가 달라요. 예약해 두면 정해진 시간에 혼자 일하고, 결과를 텔레그램 같은 메신저로 보내 줘요. 한 일을 기억하고, 자주 하는 일은 스킬로 만들어 다음에 다시 써요. 그리고 앱 자체는 무료 오픈소스예요. 돈은 어떤 AI 모델을 쓰느냐에 따라 들어요.");
  }

  // 3. 설치
  {
    const s = addSlide(3, "1단계: 설치하고 모델 고르기", "설치");
    steps(s, [
      ["설치 파일이나 스토어로", "공식 사이트의 데스크탑 설치 파일, 또는 Microsoft Store에서 받아요."],
      ["처음 설정 마법사", "처음 열면 안내대로 로그인하고 쓸 AI 모델을 골라요."],
      ["상태 확인", "왼쪽 아래 'Gateway ready'가 보이면 준비 끝이에요."],
    ], 0.7, 1.9, 6.4, 1.35, 0);
    card(s, 7.5, 1.85, 5.25, 3.9, 3, { fill: "0F141E" });
    text(s, "터미널이 편하면 (Windows PowerShell)", 7.75, 2.0, 4.8, 0.34, 3, { size: 13, bold: true, color: COLORS.muted });
    text(s, "iex (irm https://hermes-agent.\n  nousresearch.com/install.ps1)\n\nhermes setup     # 처음 설정\nhermes model     # 모델 고르기\nhermes doctor    # 문제 점검\nhermes update    # 최신으로", 7.75, 2.45, 4.85, 3.1, 3, { size: 14, font: CODE, spacing: 1.2, name: "명령어" });
    source(s, "출처: 헤르메스 공식 README 설치 안내. Windows는 WSL 없이 바로 설치돼요.");
    s.addNotes("설치는 두 가지 길이 있어요. 처음이면 공식 사이트의 데스크탑 설치 파일이나 마이크로소프트 스토어가 편해요. 터미널이 익숙하면 오른쪽 한 줄로 설치할 수 있어요. 처음 열면 설정 마법사가 나오는데, 로그인하고 쓸 모델을 고르면 돼요. 왼쪽 아래에 Gateway ready라고 뜨면 준비 끝이에요.\n\n[강사 확인 필요] 첫 설정 화면은 버전에 따라 달라요. 강사 PC는 0.20.6이라 최신 0.23과 메뉴가 조금 다를 수 있어요.");
  }

  // 4. 화면 둘러보기
  {
    const s = addSlide(4, "화면은 이렇게 생겼어요", "화면");
    await shot(s, "tour", { x: 0.6, y: 1.65, w: 7.9, h: 5.0 }, 0, "헤르메스 데스크탑 전체 화면에 번호 일곱 개를 표시한 그림", "left");
    const items = [
      ["새 대화", "질문을 새로 시작해요."],
      ["Capabilities", "스킬과 도구를 켜고 꺼요."],
      ["Messaging", "텔레그램 같은 메신저를 연결해요."],
      ["Artifacts", "모은 자료와 만든 파일이 쌓여요."],
      ["Scheduled jobs", "예약 작업을 만들고 관리해요."],
      ["모델 선택", "이번 대화에 쓸 AI를 골라요."],
      ["상태", "Gateway ready면 정상이에요."],
    ];
    items.forEach(([h, b], i) => {
      const y = 1.7 + i * 0.7;
      numDot(s, i + 1, 8.85, y, i + 1, 0.4);
      text(s, h, 9.4, y - 0.02, 3.4, 0.32, i + 1, { size: 15, bold: true });
      text(s, b, 9.4, y + 0.3, 3.4, 0.3, i + 1, { size: 12, color: COLORS.muted });
    });
    s.addNotes("화면은 왼쪽 메뉴 다섯 개만 알면 돼요. 새 대화, 스킬과 도구를 관리하는 Capabilities, 메신저를 연결하는 Messaging, 모은 자료가 쌓이는 Artifacts, 예약 작업을 관리하는 Scheduled jobs예요. 아래 입력창 오른쪽에서는 모델을 고르고, 왼쪽 맨 아래에서 상태를 봐요.");
  }

  // 5. 대화하기
  {
    const s = addSlide(5, "2단계: 말로 물어보기", "대화");
    const r = await shot(s, "chat", { x: 0.6, y: 1.65, w: 7.6, h: 4.95 }, 0, "헤르메스에게 아침 뉴스 브리핑 받는 법을 물어본 실제 대화", "left");
    caption(s, "무료 모델로 물어본 실제 화면: 4분 넘게 생각만 하다 멈췄어요", r, 0);
    steps(s, [
      ["새 대화를 눌러요", "가운데 입력창에 하고 싶은 일을 써요."],
      ["생각하는 과정이 보여요", "회색 글씨로 무엇을 할지 먼저 정리해요."],
      ["멈추면 바꿔요", "오래 걸리면 오른쪽 아래 ■로 멈추고 다른 모델로 다시 물어요."],
    ], 8.6, 1.85, 4.2, 1.45, 1);
    s.addNotes("새 대화를 누르고 하고 싶은 일을 그냥 말로 쓰면 돼요. 저는 '매일 아침 뉴스 브리핑을 받으려면 어떻게 해?'라고 물어봤어요. 회색 글씨로 생각하는 과정이 먼저 보이고, 이 화면은 강의 자료를 만들면서 실제로 물어본 건데요, 무료 모델이 4분 넘게 생각만 하다 멈췄어요. 무료 모델은 이럴 때가 있어요. 오래 걸리면 오른쪽 아래 멈춤 버튼을 누르고 다른 모델로 다시 물어보면 돼요.\n\n[강사 준비] 강의 때는 답이 끝까지 나온 대화를 미리 하나 만들어 두세요.");
  }

  // 6. 모델
  {
    const s = addSlide(6, "모델은 입력창 오른쪽에서 골라요", "모델");
    text(s, "무료 모델", 0.6, 1.8, 6, 0.4, 0, { size: 18, bold: true });
    const a = await shot(s, "model_free", { x: 0.6, y: 2.3, w: 12.12, h: 0.75 }, 0, "입력창 오른쪽에 무료 모델 Step 3.7 Flash가 선택된 화면", "left");
    text(s, "ChatGPT 구독 연결 모델", 0.6, 3.35, 6, 0.4, 1, { size: 18, bold: true });
    await shot(s, "model_codex", { x: 0.6, y: 3.85, w: 12.12, h: 0.75 }, 1, "입력창 오른쪽에 GPT-5.6-terra가 선택된 화면", "left");
    const notes = [
      ["무료로 시작", "무료 모델은 느리고 가끔 멈춰요."],
      ["구독 연결", "ChatGPT 구독 같은 계정을 로그인으로 연결해요."],
      ["모델이 사라지면", "답이 없을 때 기본 모델부터 바꿔 봐요."],
    ];
    notes.forEach(([h, b], i) => {
      const x = 0.6 + i * 4.11;
      card(s, x, 5.0, 3.9, 1.35, i + 2);
      text(s, h, x + 0.25, 5.13, 3.4, 0.38, i + 2, { size: 16, bold: true });
      text(s, b, x + 0.25, 5.55, 3.45, 0.7, i + 2, { size: 13, color: COLORS.muted, spacing: 1.15 });
    });
    s.addNotes("헤르메스는 AI 모델을 골라 쓰는 구조예요. 위는 무료 모델, 아래는 ChatGPT 구독을 연결한 모델이에요. 무료로 시작하면 되는데, 무료 모델은 느리고 가끔 멈춰요. 제가 겪은 일인데요, 쓰던 무료 모델이 어느 날 사라져서 헤르메스가 아무 답을 안 했어요. 그럴 땐 기본 모델부터 다른 걸로 바꿔 보세요.");
  }

  // 7. Capabilities
  {
    const s = addSlide(7, "스킬: 헤르메스의 작업 설명서", "스킬");
    const r = await shot(s, "caps", { x: 0.6, y: 1.65, w: 7.0, h: 4.95 }, 0, "스킬 목록과 스킬 허브 화면. research 스킬에 learned 표시가 있다", "left");
    caption(s, "강사 헤르메스의 실제 Capabilities 화면", r, 0);
    steps(s, [
      ["스킬 = 작업 설명서", "자료 조사, 예약 작업 관리처럼 일하는 방법을 적어 둔 묶음이에요."],
      ["'learned'는 스스로 배운 것", "여러 번 한 일을 헤르메스가 스킬로 만들어 둔 거예요."],
      ["스킬 허브에서 더 받기", "필요한 스킬을 찾아 설치하고 스위치로 켜고 꺼요."],
    ], 8.0, 1.85, 4.75, 1.45, 1);
    s.addNotes("Capabilities에 들어가면 스킬 목록이 나와요. 스킬은 헤르메스가 일하는 방법을 적어 둔 설명서예요. 테두리 친 곳을 보면 learned라는 표시가 있는데, 제가 시킨 일을 여러 번 하면서 헤르메스가 스스로 만든 스킬이라는 뜻이에요. 아래 스킬 허브에서 남이 만든 스킬을 받아 쓸 수도 있어요.");
  }

  // 8. 메신저 연결
  {
    const s = addSlide(8, "3단계: 텔레그램으로 연결하기", "메신저");
    const r = await shot(s, "messaging", { x: 0.6, y: 1.65, w: 7.0, h: 4.95 }, 0, "Messaging 화면. 텔레그램이 연결됨으로 표시되고 토큰 칸은 가려져 있다", "left");
    caption(s, "실제 연결 화면(토큰은 가렸어요)", r, 0);
    steps(s, [
      ["봇 만들기", "텔레그램에서 @BotFather에게 /newbot을 보내요."],
      ["토큰 붙여넣기", "받은 토큰을 Bot token 칸에 붙여 넣어요."],
      ["내 ID만 허용", "@userinfobot에서 받은 내 번호를 넣어요. 안 넣으면 아무나 말을 걸 수 있어요."],
    ], 8.0, 1.85, 4.75, 1.5, 1);
    s.addNotes("Messaging에서 텔레그램을 고르면 연결 방법이 화면에 나와 있어요. 텔레그램에서 BotFather라는 봇에게 newbot을 보내면 내 봇이 생기고 토큰을 줘요. 그 토큰을 붙여 넣고, userinfobot에서 받은 내 번호를 허용 칸에 넣어요. 이걸 안 넣으면 아무나 내 비서한테 말을 걸 수 있으니 꼭 넣으세요. 디스코드, 슬랙, 왓츠앱도 같은 화면에서 연결해요.\n\n[주의] 토큰은 비밀번호예요. 화면을 캡처해서 올리면 안 돼요. 노출되면 BotFather에서 바로 폐기하세요.");
  }

  // 9. 예약 작업 목록
  {
    const s = addSlide(9, "4단계: 예약 작업으로 알아서 일하게", "예약");
    const r = await shot(s, "cron_list", { x: 0.6, y: 1.65, w: 7.6, h: 4.95 }, 0, "예약 작업 일곱 개가 켜져 있는 실제 목록", "left");
    caption(s, "강사가 실제로 돌리는 예약 작업 7개", r, 0);
    text(s, "7", 8.65, 1.7, 1.2, 1.1, 1, { size: 70, bold: true, color: COLORS.blue, name: "숫자" });
    text(s, "개가 알아서 돌아요", 9.55, 2.1, 3.3, 0.5, 1, { size: 18, bold: true });
    steps(s, [
      ["말로 만들어요", "\"매주 월요일 9시에 앱 시장 정리해서 보내 줘\""],
      ["스위치로 켜고 꺼요", "오른쪽 스위치 하나로 잠시 멈출 수 있어요."],
      ["다음 실행이 보여요", "'next 7일 후'처럼 언제 돌지 알려 줘요."],
    ], 8.65, 3.2, 4.15, 1.12, 2);
    s.addNotes("헤르메스의 진짜 힘은 예약 작업이에요. 제 헤르메스에는 지금 7개가 돌아가요. 매일 오후에 SNS 트렌드를 정리하고, 매주 월요일에는 앱 시장 분석을 해서 텔레그램으로 보내 줘요. 만드는 건 말로 하면 되고, 오른쪽 스위치로 켜고 끌 수 있어요.");
  }

  // 10. 예약 작업 상세
  {
    const s = addSlide(10, "예약 작업 하나를 열어 보면", "예약");
    const r = await shot(s, "cron_detail", { x: 0.6, y: 1.6, w: 8.0, h: 4.8 }, 0, "예약 작업 상세 화면. 빈도, 다음 실행, 받을 곳, 모델, 지시문, 실행 기록이 보인다", "left");
    caption(s, "실제 '노바 위클리' 작업(받는 곳 번호는 가렸어요)", r, 0);
    const rows = [
      ["Frequency", "언제 돌지. 20 9 * * 1 = 매주 월요일 9시 20분"],
      ["Deliver to", "결과를 받을 곳(텔레그램)"],
      ["Prompt", "매번 시킬 일. 말투와 기준까지 적어요"],
      ["Run history", "지난 실행 기록"],
      ["Blueprints", "테두리 친 아침 브리핑 같은 견본으로 바로 시작"],
    ];
    rows.forEach(([k, v], i) => {
      const y = 1.7 + i * 0.95;
      card(s, 8.95, y, 3.8, 0.82, i + 1);
      text(s, k, 9.15, y + 0.06, 3.4, 0.3, i + 1, { size: 14, font: CODE, color: COLORS.text });
      text(s, v, 9.15, y + 0.38, 3.5, 0.4, i + 1, { size: 11, color: COLORS.muted });
    });
    s.addNotes("예약 작업 하나를 열면 이렇게 생겼어요. Frequency는 언제 돌지예요. 숫자 다섯 개가 어려워 보이는데, 이건 매주 월요일 9시 20분이라는 뜻이고 말로 시키면 헤르메스가 알아서 적어 줘요. Deliver to는 결과를 받을 곳, Prompt는 매번 시킬 일이에요. 왼쪽 아래 Blueprints에는 아침 브리핑, 주간 정리 같은 견본이 있어서 처음엔 여기서 골라 시작하면 쉬워요.");
  }

  // 11. Artifacts
  {
    const s = addSlide(11, "Artifacts: 모은 자료가 저절로 쌓여요", "자료");
    const r = await shot(s, "artifacts", { x: 0.6, y: 1.65, w: 7.6, h: 4.95 }, 0, "예약 작업이 모은 기사 링크와 파일 104개가 쌓인 목록", "left");
    caption(s, "예약 작업이 모은 실제 자료 목록", r, 0);
    text(s, "104", 8.65, 1.7, 2.4, 1.1, 1, { size: 64, bold: true, color: COLORS.blue, name: "숫자" });
    text(s, "개 자료", 10.7, 2.1, 2.0, 0.5, 1, { size: 18, bold: true });
    steps(s, [
      ["링크와 파일", "읽은 기사 링크, 만든 보고서 파일이 모여요."],
      ["어느 작업이 모았는지", "오른쪽 SESSION 칸에 출처 작업이 적혀 있어요."],
      ["다시 찾기 쉬워요", "위쪽 Images·Files·Links로 골라 봐요."],
    ], 8.65, 3.2, 4.15, 1.12, 2);
    s.addNotes("예약 작업이 일하면서 읽은 기사와 만든 파일은 Artifacts에 저절로 쌓여요. 제 헤르메스에는 104개가 모여 있어요. 어느 작업이 모았는지도 같이 적혀 있어서, 지난주 브리핑의 출처를 다시 찾을 때 편해요.");
  }

  // 12. 문제 해결
  {
    const s = addSlide(12, "답이 없을 때, 이렇게 고쳤어요", "문제 해결");
    const cases = [
      ["갑자기 아무 답이 없어요", "쓰던 무료 모델이 사라졌어요(404).", "기본 모델을 다른 무료 모델로 바꿨어요."],
      ["예약 작업이 멈췄어요", "연결한 계정의 로그인이 풀렸어요.", "hermes auth add로 다시 로그인했어요."],
      ["어디가 문제인지 모를 때", "설정과 연결 상태를 한 번에 봐요.", "hermes doctor, hermes status를 실행해요."],
    ];
    cases.forEach(([q, why, fix], i) => {
      const y = 1.8 + i * 1.6;
      card(s, 0.6, y, 12.12, 1.4, i);
      text(s, q, 0.9, y + 0.18, 3.9, 0.45, i, { size: 18, bold: true });
      text(s, "원인", 4.95, y + 0.2, 0.8, 0.35, i, { size: 13, color: COLORS.muted });
      text(s, why, 5.7, y + 0.18, 6.8, 0.4, i, { size: 15 });
      text(s, "해결", 4.95, y + 0.74, 0.8, 0.35, i, { size: 13, color: COLORS.muted });
      text(s, fix, 5.7, y + 0.72, 6.8, 0.4, i, { size: 15, bold: true, color: COLORS.blue });
    });
    s.addNotes("제가 실제로 겪은 문제 세 가지예요. 어느 날 헤르메스가 아무 답을 안 했는데, 쓰던 무료 모델이 서비스에서 사라진 게 원인이었어요. 기본 모델을 바꾸니 바로 살아났어요. 예약 작업이 멈췄을 때는 연결한 계정 로그인이 풀린 거였어요. 어디가 문제인지 모르겠으면 hermes doctor부터 돌려 보세요.");
  }

  // 13. 최신 업데이트
  {
    const s = addSlide(13, "11월 5일 최신 0.23에서 달라진 것", "새 기능");
    const items = [
      [fa.FaGlobe, "브라우저로 열기", "데스크탑 화면을 웹 브라우저 탭에서 그대로 써요(기본은 꺼짐)."],
      [fa.FaLink, "대화가 하나로", "앱, 터미널, 메신저 어디서 열어도 같은 대화예요."],
      [fa.FaRotateLeft, "되감기", "/rewind로 앞 메시지로 돌아가 고쳐 다시 보내요."],
      [fa.FaUsers, "그룹 채팅", "여러 봇이 있는 방에서 누가 답할지 알아서 정해요."],
      [fa.FaWallet, "유료 도구 가격 표시", "돈 드는 도구는 값과 한도를 먼저 물어요."],
      [fa.FaPuzzlePiece, "플러그인 1,050개", "자동 업데이트도 켤 수 있어요."],
    ];
    for (let i = 0; i < 6; i++) {
      const x = 0.6 + (i % 3) * 4.11, y = 1.8 + Math.floor(i / 3) * 2.25;
      card(s, x, y, 3.9, 2.05, i);
      await badge(s, items[i][0], x + 0.25, y + 0.25, i, 0.55);
      text(s, items[i][1], x + 0.95, y + 0.3, 2.8, 0.42, i, { size: 17, bold: true });
      text(s, items[i][2], x + 0.25, y + 0.95, 3.45, 0.95, i, { size: 13, color: COLORS.muted, spacing: 1.15 });
    }
    source(s, "출처: GitHub NousResearch/hermes-agent 릴리스 v0.23.0 'The Hearth Release'(2026.11.5). 강사 PC 화면은 0.20.6이에요.");
    s.addNotes("11월 5일에 0.23 버전이 나왔어요. 데스크탑 화면을 브라우저 탭에서도 쓸 수 있게 됐고, 앱이든 터미널이든 메신저든 어디서 열어도 같은 대화로 이어져요. 보낸 메시지를 되감아 고치는 기능, 여러 봇이 함께 있는 그룹 채팅, 돈 드는 도구의 가격과 한도 표시도 생겼어요. 오늘 보여 드린 화면은 제 PC의 0.20.6 버전이라 최신과 조금 다를 수 있어요.\n\n[참고] 0.23부터 옛 브라우저 도구 이름이 browser_exec 하나로 바뀌었어요. 직접 만든 스킬에서 옛 이름을 쓰면 고쳐야 해요.");
  }

  // 14. 안전
  {
    const s = addSlide(14, "맡기기 전에 꼭 알아 둘 것", "안전");
    const rules = [
      ["토큰과 키는 비밀번호", "화면 캡처에 찍히지 않게 해요. 노출되면 바로 폐기하고 새로 받아요."],
      ["허용 ID를 꼭 넣기", "메신저 봇에 내 번호만 허용해야 남이 내 비서를 못 써요."],
      ["승인 모드 켜 두기", "위험한 명령은 실행 전에 물어보게 두세요. 전부 자동(YOLO)은 익숙해진 뒤에."],
      ["비상 정지", "이상하면 hermes pause로 예약 작업과 새 대화를 한꺼번에 멈춰요."],
    ];
    rules.forEach(([h, b], i) => {
      const y = 1.8 + i * 1.18;
      card(s, 0.6, y, 12.12, 1.02, i);
      numDot(s, i + 1, 0.85, y + 0.28, i);
      text(s, h, 1.5, y + 0.1, 3.6, 0.82, i, { size: 17, bold: true, valign: "middle" });
      text(s, b, 5.1, y + 0.1, 7.4, 0.82, i, { size: 14, color: COLORS.muted, valign: "middle" });
    });
    s.addNotes("에이전트는 내 대신 움직이니까 몇 가지는 꼭 지켜야 해요. 토큰과 키는 비밀번호예요. 저도 토큰이 찍힌 화면을 올렸다가 두 번이나 폐기하고 새로 받았어요. 메신저 봇에는 내 번호만 허용하고, 위험한 명령은 실행 전에 물어보게 두세요. 뭔가 이상하면 hermes pause 한 줄로 전부 멈출 수 있어요.");
  }

  // 15. 실습과 요금
  {
    const s = addSlide(15, "지금 실습, 그리고 비용 한눈에", "실습");
    const list = [
      "헤르메스를 설치하고 무료 모델을 골라요",
      "새 대화에서 \"오늘 날씨에 맞는 옷 추천해 줘\"",
      "Scheduled jobs → Blueprints에서 Morning briefing",
      "시간을 내일 아침 8시로 바꿔 저장해요",
      "(선택) 텔레그램 봇을 연결해 결과 받기",
    ];
    list.forEach((t, i) => {
      const y = 1.8 + i * 0.93;
      card(s, 0.6, y, 7.3, 0.8, i);
      numDot(s, i + 1, 0.8, y + 0.17, i);
      text(s, t, 1.52, y, 6.25, 0.8, i, { size: 15, bold: true, valign: "middle" });
    });
    card(s, 8.3, 1.8, 4.45, 4.52, 5);
    text(s, "비용", 8.55, 1.95, 3.9, 0.42, 5, { size: 19, bold: true });
    const plans = [["헤르메스 앱", "무료", "오픈소스(MIT)"], ["무료 모델", "0원", "느리고 가끔 멈춰요"], ["구독·API 모델", "쓴 만큼", "ChatGPT 구독 연결 등"]];
    plans.forEach(([n, p, d], i) => {
      const y = 2.5 + i * 0.95;
      text(s, n, 8.55, y, 2.2, 0.38, 6 + i, { size: 16, bold: true });
      text(s, p, 10.5, y, 2.1, 0.38, 6 + i, { size: 16, bold: true, color: i === 0 ? COLORS.blue : COLORS.text, align: "right" });
      text(s, d, 8.55, y + 0.4, 4.0, 0.34, 6 + i, { size: 13, color: COLORS.muted });
    });
    text(s, "돈은 헤르메스가 아니라 어떤 AI 모델을 쓰느냐에서 나가요. 무료 모델로 연습하고 필요할 때 올리세요.", 8.55, 5.35, 4.0, 0.9, 9, { size: 12, color: COLORS.muted, spacing: 1.1 });
    s.addNotes("이제 직접 해 볼게요. 설치하고 무료 모델을 고른 다음, 새 대화에서 아무거나 물어보세요. 그다음 Scheduled jobs에서 Morning briefing 견본을 골라 내일 아침 8시로 바꿔 저장하면, 내일 아침에 첫 브리핑이 와요. 텔레그램까지 연결하면 폰으로 받아 볼 수 있어요.\n\n비용은 간단해요. 헤르메스 앱은 무료고, 돈은 쓰는 AI 모델에서 나가요. 무료 모델로 충분히 연습할 수 있어요.\n\n[강사 확인 필요] Blueprints의 Morning briefing으로 실제 예약이 만들어지는지 강의 전에 한 번 해 보세요.");
  }

  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
