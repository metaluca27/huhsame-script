import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

export const FPS = 30;
export const TOTAL_FRAMES = 900; // 30초

const XF = 9; // 장면 전환 겹침 0.3초

// 장면별 길이(프레임)와 소스 클립 시작 지점. 합계 - 전환 겹침 = 900
// 소스 클립은 5.04초 = 151프레임
const SCENES = [
  { src: "s1.mp4", dur: 99, from: 52 }, // 0~3.3s  일러스트, 고래 솟아오름으로 끝남
  { src: "s2.mp4", dur: 138, from: 0 }, // 변신 폭발
  { src: "s3.mp4", dur: 150, from: 0 }, // 울산대교 질주
  { src: "s4.mp4", dur: 150, from: 0 }, // 조선소
  { src: "s5.mp4", dur: 150, from: 0 }, // 수소 항구
  { src: "s6.mp4", dur: 138, from: 0 }, // 태화강 브리칭
  { src: "s7.mp4", dur: 129, from: 0 }, // 엔딩
];

// 절대 타임라인 시작 프레임: 0, 90, 219, 360, 501, 642, 771
const starts = SCENES.reduce<number[]>((acc, s, i) => {
  if (i === 0) return [0];
  return [...acc, acc[i - 1] + SCENES[i - 1].dur - XF];
}, []);

type Sub = { from: number; to: number; text: string; sub?: string };
const SUBS: Sub[] = [
  { from: 15, to: 80, text: "고래가 깨우는 울산" },
  { from: 235, to: 350, text: "파도를 타고, WAVE" },
  { from: 375, to: 490, text: "세계 1등 조선,\n다음 파도는 자율운항" },
  { from: 515, to: 630, text: "수소로 숨 쉬는 도시" },
  { from: 655, to: 760, text: "AI가 그리는 울산의 미래" },
  {
    from: 795,
    to: 900,
    text: "WAVE 2026 울산세계미래산업박람회",
    sub: "#WAVE2026  #울산세계미래산업박람회",
  },
];

const FONT =
  '"Pretendard", "Pretendard Variable", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif';

const Subtitle: React.FC<{ s: Sub }> = ({ s }) => {
  const frame = useCurrentFrame();
  if (frame < s.from || frame > s.to) return null;
  const opacity = interpolate(
    frame,
    [s.from, s.from + 8, s.to - 8, s.to],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const rise = interpolate(frame, [s.from, s.from + 8], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isEnd = Boolean(s.sub);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: isEnd ? 300 : 330,
        opacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${rise}px)`,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          color: "white",
          fontSize: isEnd ? 54 : 64,
          lineHeight: 1.3,
          padding: "0 60px",
          textShadow:
            "0 0 12px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.8), 0 0 2px #000",
          WebkitTextStroke: "2px rgba(0,0,0,0.75)",
          letterSpacing: -1,
        }}
      >
        <div style={{ whiteSpace: "pre-line" }}>{s.text}</div>
        {s.sub ? (
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              marginTop: 18,
              color: "#DDF3FF",
              WebkitTextStroke: "1.5px rgba(0,0,0,0.75)",
            }}
          >
            {s.sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// 장면1→2 경계(프레임 90 부근)에 흰 플래시. 일러스트→실사 변신을 가려준다.
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const c = starts[1] + Math.round(XF / 2);
  const opacity = interpolate(frame, [c - 6, c, c + 8], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: "white", opacity }} />;
};

export const Wave2026: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const items = [
            <TransitionSeries.Sequence key={s.src} durationInFrames={s.dur}>
              <OffthreadVideo
                src={staticFile(s.src)}
                startFrom={s.from}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </TransitionSeries.Sequence>,
          ];
          if (i < SCENES.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: XF })}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      <Flash />
      {SUBS.map((s) => (
        <Subtitle key={s.from} s={s} />
      ))}
      <Audio src={staticFile("music.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
