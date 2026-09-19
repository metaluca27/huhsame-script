import { Composition } from "remotion";
import { Wave2026, TOTAL_FRAMES, FPS } from "./Wave2026";
import { Ulju, ULJU_FPS, uljuDuration } from "./Ulju";

export const Root = () => (
  <>
    <Composition
      id="Wave2026"
      component={Wave2026}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ music: "music.wav" }}
    />
    <Composition
      id="Wave2026Inst"
      component={Wave2026}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ music: "music_inst.wav" }}
    />
    <Composition
      id="UljuDraft"
      component={Ulju}
      durationInFrames={uljuDuration(false)}
      fps={ULJU_FPS}
      width={1080}
      height={1920}
      defaultProps={{ hasCut1: false, music: null }}
    />
    <Composition
      id="Ulju"
      component={Ulju}
      durationInFrames={uljuDuration(true)}
      fps={ULJU_FPS}
      width={1080}
      height={1920}
      defaultProps={{ hasCut1: true, music: null }}
    />
  </>
);
