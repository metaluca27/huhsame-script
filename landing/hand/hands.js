// 손 인식 (MediaPipe HandLandmarker) + 손가락 개수 세기. 영상은 브라우저 밖으로 안 나간다.
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WINDOW = 8, AGREE = 5; // 최근 8장면 중 5번 같은 동작이면 인정 (시간 기준은 폰에서 깜빡임에 자꾸 끊겼음)

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

/**
 * 손동작 읽기 → '0'(주먹) · '1' · '2' · '3' · '👍'(엄지만) · '🖐'(4개 이상 = 손바닥 쫙).
 * 손바닥을 정면으로 펴면 엄지가 옆으로 누워 잘 안 잡혀서(폰 시험 10-28) 등장은 엄지 없이 4손가락으로 판단한다.
 */
export function readGesture(lm) {
  const w = lm[0];
  // 엄지 뺀 네 손가락(검지·중지·약지·새끼)이 펴졌나: 끝이 마디보다 손목에서 멀면 펴진 것
  const up = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([tip, pip]) => d(lm[tip], w) > d(lm[pip], w) * 1.12);
  const n = up.filter(Boolean).length;
  if (n >= 4) return '🖐';
  // 🤟(검지+새끼)도 3 으로: 안내에 🤟 를 썼더니 루카가 그 모양대로 해서 CLO 가 안 불렸음(10-28)
  if (up[0] && up[3] && !up[1] && !up[2]) return '3';
  if (n > 0) return String(n);
  // 엄지: 끝이 가운데손가락 뿌리에서 손바닥 너비보다 멀리 벌어졌나 (접으면 손바닥 위에 붙음)
  return d(lm[4], lm[9]) > d(lm[5], lm[17]) * 1.1 ? '👍' : '0';
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

/** 최근 WINDOW 장면 중 같은 동작이 AGREE 번 넘게 나와야 바뀌는 값 (손이 흔들려 깜빡이는 것 방지). */
export function stableGesture() {
  const recent = [];
  let stable = null;
  return (g) => {
    recent.push(g);
    if (recent.length > WINDOW) recent.shift();
    const hits = recent.filter((x) => x === g).length;
    if (g !== stable && hits >= AGREE) stable = g;
    return stable;
  };
}
