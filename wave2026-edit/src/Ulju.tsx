import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const ULJU_FPS = 30;

// 「돌에서 나온 고래」 최소 완성본: 컷 1→2→3→4→8→9(엔딩 카드)
// 컷 1 영상이 아직 없으면 hasCut1=false 로 렌더 (컷 2부터 시작)
const C1 = 39; // 1.3초 — 금이 가는 구간(원본 3.2~4.5초)
const C2 = 150;
const C3 = 105; // 앞 3.5초만 (이후 꼬리가 하얗게 변함)
const C4 = 75; // 앞 2.5초만 (이후 바닥에 금빛 고리)
const C8_RATE = 0.8; // 컷 8은 0.8배속으로 늘려서 엔딩 카드까지 고래가 계속 헤엄치게 한다 (정지 프레임 쓰면 고래가 튐)
const C8 = 188; // 151프레임 / 0.8
const END_FROM = 113; // 컷 8 안에서 엔딩 카드가 뜨기 시작하는 프레임
const END = 0;

export const uljuDuration = (hasCut1: boolean) =>
  (hasCut1 ? C1 : 0) + C2 + C3 + C4 + C8 + END;

const FONT =
  '"Pretendard", "Pretendard Variable", "Malgun Gothic", "맑은 고딕", sans-serif';

const Clip: React.FC<{
  src: string;
  dur: number;
  // 편집에서 주는 움직임: 시작→끝 배율과 가로 이동(%)
  zoom?: [number, number];
  panX?: [number, number];
  rate?: number;
}> = ({ src, dur, zoom = [1, 1], panX = [0, 0], rate = 1 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], zoom, { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, dur], panX, { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        playbackRate={rate}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${s}) translateX(${x}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string; dur: number; top?: boolean }> = ({
  text,
  dur,
  top,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [4, 12, dur - 10, dur - 2], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: top ? "flex-start" : "flex-end",
        alignItems: "center",
        paddingTop: top ? 330 : 0,
        paddingBottom: top ? 0 : 360,
        opacity: o,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 68,
          color: "white",
          letterSpacing: -1,
          textAlign: "center",
          padding: "0 70px",
          textShadow: "0 0 14px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.8)",
          WebkitTextStroke: "2px rgba(0,0,0,0.7)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [8, 30], [0, 1], { extrapolateRight: "clamp" });
  const dim = interpolate(f, [0, 30], [0, 0.35], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: dim }} />
      <AbsoluteFill
        style={{
          // 글자가 고래 몸통과 겹치지 않게 고래 아래 바다 위에 둔다
          justifyContent: "flex-start",
          paddingTop: 900,
          alignItems: "center",
          opacity: o,
          fontFamily: FONT,
          color: "white",
          textAlign: "center",
          textShadow: "0 0 18px rgba(0,0,0,0.9)",
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 600, marginBottom: 24 }}>
          고래가 7천 년을 기다린 곳
        </div>
        <div style={{ fontSize: 190, fontWeight: 900, letterSpacing: 8 }}>
          울주
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, marginTop: 40, opacity: 0.9 }}>
          반구천의 암각화 · 간월재 · 간절곶
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Ulju: React.FC<{
  hasCut1?: boolean;
  music?: string | null;
  sfx?: boolean;
}> = ({ hasCut1 = false, music = null, sfx = false }) => {
  let t = 0;
  const seq = (dur: number) => {
    const from = t;
    t += dur;
    return from;
  };
  const s1 = hasCut1 ? seq(C1) : -1;
  const s2 = seq(C2);
  const s3 = seq(C3);
  const s4 = seq(C4);
  const s8 = seq(C8);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {hasCut1 ? (
        <Sequence from={s1} durationInFrames={C1}>
          <Clip src="ulju/c1.mp4" dur={C1} zoom={[1, 1.04]} />
        </Sequence>
      ) : null}
      <Sequence from={s2} durationInFrames={C2}>
        <Clip src="ulju/c2.mp4" dur={C2} />
        <Sequence from={45} durationInFrames={100}>
          <Caption text="7천 년 만에" dur={100} />
        </Sequence>
      </Sequence>
      <Sequence from={s3} durationInFrames={C3}>
        {/* 원본 왼쪽(꼬리가 절벽에 닿아 돌이 떨어지는 부분)을 잘라낸 크롭본 — 컷 2에서 이미 빠져나온 고래가 또 나오는 것처럼 보이지 않게 */}
        <Clip src="ulju/c3.mp4" dur={C3} zoom={[1.0, 1.04]} />
        <Caption text="반구천의 고래가" dur={C3} />
      </Sequence>
      <Sequence from={s4} durationInFrames={C4}>
        {/* 고래가 제자리에 떠 있어서 화면을 옆으로 밀어 전진감을 만든다 (좌우 반전본) */}
        <Clip src="ulju/c4.mp4" dur={C4} zoom={[1.18, 1.18]} panX={[5, -5]} />
        <Caption text="깨어났다" dur={C4} />
      </Sequence>
      <Sequence from={s8} durationInFrames={C8}>
        <Clip src="ulju/c8.mp4" dur={C8} zoom={[1.12, 1.0]} rate={C8_RATE} />
        <Sequence from={15} durationInFrames={95}>
          <Caption text="가장 먼저 해가 뜨는 곳으로" dur={95} top />
        </Sequence>
        <Sequence from={END_FROM} durationInFrames={C8 - END_FROM}>
          <EndCard />
        </Sequence>
      </Sequence>
      {music ? <Audio src={staticFile(music)} volume={0.85} /> : null}
      {sfx ? (
        <>
          {/* 컷 2 시작: 절벽이 무너지는 소리 */}
          <Sequence from={s2} durationInFrames={150}>
            <Audio src={staticFile("ulju/sfx_rock.wav")} volume={0.9} />
          </Sequence>
          {/* 엔딩 카드가 뜰 때: 고래 울음 */}
          {/* 후보 B(루카 선택): 낮은 울림은 컷 8 시작에, 올라가는 울음은 "울주" 글자가 뜨는 순간(3.7초 지점)에 맞춘다 */}
          <Sequence from={s8 + END_FROM - 111}>
            <Audio src={staticFile("ulju/sfx_whale.wav")} volume={0.7} />
          </Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
