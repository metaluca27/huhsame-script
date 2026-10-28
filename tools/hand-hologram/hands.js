// 손 인식 (MediaPipe HandLandmarker) + 손가락 개수 세기. 영상은 브라우저 밖으로 안 나간다.
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const HOLD_MS = 300; // 같은 손가락 개수가 이만큼 이어져야 인정 (흔들림 방지)

export async function createHands() {
  const files = await FilesetResolver.forVisionTasks(WASM);
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1 });
  try {
    return await HandLandmarker.createFromOptions(files, opts('GPU'));
  } catch {
    return await HandLandmarker.createFromOptions(files, opts('CPU'));
  }
}

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** 펴진 손가락 개수 (0~5). 손가락 끝이 마디보다 손목에서 멀면 펴진 것. */
export function countFingers(lm) {
  const w = lm[0];
  let n = 0;
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    if (d(lm[tip], w) > d(lm[pip], w) * 1.12) n++;
  }
  // 엄지: 끝이 가운데손가락 뿌리에서 손바닥 너비만큼 벌어졌나 (접으면 손바닥 위에 붙음)
  // 처음엔 검지 뿌리·손목 길이 기준이었는데 폰에서 쫙 편 손을 4개로 읽어 등장이 안 됐음(10-28)
  if (d(lm[4], lm[9]) > d(lm[5], lm[17]) * 1.1) n++;
  return n;
}

/** 손바닥 가운데·크기·기울기 (0~1 좌표, 거울 반전 전). */
export function palmPose(lm) {
  const ids = [0, 5, 9, 13, 17];
  const x = ids.reduce((s, i) => s + lm[i].x, 0) / ids.length;
  const y = ids.reduce((s, i) => s + lm[i].y, 0) / ids.length;
  const size = d(lm[0], lm[9]);
  const angle = Math.atan2(lm[9].y - lm[0].y, lm[9].x - lm[0].x); // 손목→가운데손가락 방향
  return { x, y, size, angle };
}

/** 손가락 개수가 HOLD_MS 동안 같을 때만 바뀌는 안정된 값. */
export function stableCounter() {
  let raw = null, since = 0, stable = null;
  return (n, now) => {
    if (n !== raw) { raw = n; since = now; }
    if (n !== stable && now - since >= HOLD_MS) stable = n;
    return stable;
  };
}
