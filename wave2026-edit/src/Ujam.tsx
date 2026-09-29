import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  continueRender,
  delayRender,
  useCurrentFrame,
} from "remotion";

// 명조체를 파일로 직접 불러온다 (시스템 글꼴 이름으로는 렌더러가 못 찾고 바탕체로 대체됨)
const fontHandle = delayRender("NotoSerifKR");
new FontFace("UjamSerif", `url(${staticFile("ujam/NotoSerifKR.ttf")})`, { weight: "200 900" })
  .load()
  .then((f) => {
    document.fonts.add(f);
    continueRender(fontHandle);
  })
  .catch(() => continueRender(fontHandle));

// 2026 울산 U잼 영상공모전 AI 부문 「굴뚝이 대나무가 되는 도시」
// 영상은 모핑 클립 7개를 ffmpeg로 이어붙인 ujam/video.mp4 (구성: 콘텐츠/U잼2026/rough_v3_구성.txt)
export const UJAM_FPS = 24;
export const UJAM_FRAMES = 938; // 39.08초

const TITLE_FROM = 6;
const TITLE_DUR = 84; // 새벽 공단이 대나무로 변하기 시작하기 전까지 (약 3.5초)
const END_FROM = 810; // 반딧불 대숲이 거의 다 드러난 뒤 (33.75초)

const SERIF = '"UjamSerif", "Noto Serif KR", "Batang", serif';
const SHADOW = "0 0 18px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.7)";

const fade = (f: number, dur: number, inF = 14, outF = 14) =>
  interpolate(f, [0, inF, dur - outF, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const o = fade(f, TITLE_DUR, 16, 18);
  const y = interpolate(f, [0, TITLE_DUR], [8, 0]);
  return (
    // 새벽 하늘 위쪽 가운데 — 고양이(왼쪽 아래)와 해(오른쪽)를 피한다
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 130, opacity: o }}>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: 82,
          color: "white",
          letterSpacing: 2,
          textShadow: SHADOW,
          transform: `translateY(${y}px)`,
        }}
      >
        굴뚝이 대나무가 되는 도시
      </div>
    </AbsoluteFill>
  );
};

const Ending: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const line = (delay: number) =>
    interpolate(f, [delay, delay + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const out = interpolate(f, [dur - 20, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    // 반딧불 장면 오른쪽의 비어 있는 별하늘
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-end",
        paddingRight: 170,
        paddingBottom: 140,
        opacity: out,
        fontFamily: SERIF,
        color: "white",
        textShadow: SHADOW,
        textAlign: "right",
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 500, lineHeight: 1.6, opacity: line(0) }}>
        굴뚝도, 대숲도, 빌딩도
      </div>
      <div style={{ fontSize: 88, fontWeight: 700, marginTop: 10, opacity: line(22) }}>
        전부 울산
      </div>
    </AbsoluteFill>
  );
};

export const Ujam: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <OffthreadVideo src={staticFile("ujam/video.mp4")} muted />
    <Sequence from={TITLE_FROM} durationInFrames={TITLE_DUR}>
      <Title />
    </Sequence>
    <Sequence from={END_FROM} durationInFrames={UJAM_FRAMES - END_FROM}>
      <Ending dur={UJAM_FRAMES - END_FROM} />
    </Sequence>
    <Audio src={staticFile("ujam/music.wav")} />
  </AbsoluteFill>
);
