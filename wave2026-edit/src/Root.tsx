import { Composition } from "remotion";
import { Wave2026, TOTAL_FRAMES, FPS } from "./Wave2026";

export const Root = () => (
  <Composition
    id="Wave2026"
    component={Wave2026}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
