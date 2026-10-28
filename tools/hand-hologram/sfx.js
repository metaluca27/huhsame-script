// 효과음은 전부 Web Audio 로 합성 (저작권 걱정 없음). 녹화에도 같이 담기도록 stream 을 내보낸다.
let ctx = null, out = null;

export function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = .6;
    out.connect(ctx.destination);
    out.stream = ctx.createMediaStreamDestination();
    out.connect(out.stream);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return { ctx, out };
}

function tone(freq0, freq1, dur, type = 'sine', vol = .4, delay = 0) {
  const { ctx, out } = audio();
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq0, t);
  o.frequency.exponentialRampToValueAtTime(freq1, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .01);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + .02);
}

/** 고르기: 짧은 띵 */
export const pick = () => tone(1320, 1500, .12, 'triangle', .22);
/** 등장: 지잉~ 올라가는 소리 + 반짝 */
export function summon() {
  tone(220, 880, .45, 'sawtooth', .12);
  tone(440, 1760, .5, 'sine', .25);
  [0, .08, .16].forEach((d, i) => tone(1800 + i * 400, 2400 + i * 400, .18, 'triangle', .12, .35 + d));
}
/** 사라짐: 내려가는 쉬익 */
export const vanish = () => tone(900, 160, .4, 'sine', .25);
