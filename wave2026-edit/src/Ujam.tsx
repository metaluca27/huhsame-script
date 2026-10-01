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

// 2026 울산 U잼 영상공모전 AI 부문 「멍 때리는 사이, 울산」
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
        멍 때리는 사이, 울산
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

// 효과음: 전부 -30 LUFS로 맞춘 파일(n_*.wav). 음악(-14 LUFS)보다 16dB쯤 작게 깔리는 배경 소리 (루카: "크지 않게")
// [이름, 시작 초, 길이 초, 볼륨] — 장면 전환 시각은 rough_v3 기준
const SFX: [string, number, number, number][] = [
  ["factory", 0, 6.8, 0.8], // 새벽 공단 수증기·기계음
  ["bamboo", 5.2, 6.5, 0.8], // 대숲 바람·새소리
  ["shipyard", 10.8, 6, 0.7], // 조선소 먼 쇳소리
  ["shatter", 17.0, 4, 0.8], // 크레인이 부서져 백로로 날아가는 순간
  ["whale", 19.8, 4, 0.7], // 고래 물 뿜기
  ["waves", 21.8, 7, 0.7], // 노을 파도
  ["night", 28.4, 10.7, 0.9], // 밤 풀벌레
];

const Sfx: React.FC<{ name: string; dur: number; vol: number }> = ({ name, dur, vol }) => {
  const frames = Math.round(dur * UJAM_FPS);
  return (
    <Audio
      src={staticFile(`ujam/sfx/n_${name}.wav`)}
      volume={(f) =>
        vol *
        interpolate(f, [0, 18, frames - 24, frames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

// clean=true: 수상 시 제출할 무자막 원본 (공고문: "수상작의 경우 원본파일(무자막) 반드시 제출")
export const Ujam: React.FC<{ clean?: boolean }> = ({ clean = false }) => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <OffthreadVideo src={staticFile("ujam/video.mp4")} muted />
    {clean ? null : (
      <>
        <Sequence from={TITLE_FROM} durationInFrames={TITLE_DUR}>
          <Title />
        </Sequence>
        <Sequence from={END_FROM} durationInFrames={UJAM_FRAMES - END_FROM}>
          <Ending dur={UJAM_FRAMES - END_FROM} />
        </Sequence>
      </>
    )}
    <Audio src={staticFile("ujam/music.wav")} />
    {SFX.map(([name, from, dur, vol]) => (
      <Sequence
        key={name}
        from={Math.round(from * UJAM_FPS)}
        durationInFrames={Math.min(Math.round(dur * UJAM_FPS), UJAM_FRAMES - Math.round(from * UJAM_FPS))}
      >
        <Sfx name={name} dur={Math.min(dur, UJAM_FRAMES / UJAM_FPS - from)} vol={vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
