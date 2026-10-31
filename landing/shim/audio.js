// 「쉼」 소리 엔진 — 파동(바이노럴) · 자연소리 · 음악(앰비언트 패드) 3층
const FADE = 3; // 장면 바꿀 때 크로스페이드(초)

export class Engine {
  constructor() {
    this.ctx = null;
    this.scene = null;
    this.natureNodes = [];
    this.files = {};
    this.timers = [];
  }

  async start(scene) {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);

    this.bus = {};
    for (const k of ['wave', 'nature', 'music']) {
      this.bus[k] = ctx.createGain();
      this.bus[k].connect(this.master);
    }
    this.noise = { pink: makeNoise(ctx, 'pink'), brown: makeNoise(ctx, 'brown'), white: makeNoise(ctx, 'white') };
    this.reverb = makeReverb(ctx);
    this.reverb.connect(this.bus.music);

    this.startWave();
    this.startMusic();
    await this.setScene(scene, true);
  }

  setLevel(layer, v) {
    if (!this.ctx) return;
    const max = { wave: 0.12, nature: 1, music: 1.2 }[layer];
    this.bus[layer].gain.setTargetAtTime(v * max, this.ctx.currentTime, 0.1);
  }

  async setScene(scene, first = false) {
    const ctx = this.ctx;
    this.scene = scene;
    const t = ctx.currentTime;

    // 파동: 왼쪽 carrier, 오른쪽 carrier+beat
    this.left.frequency.linearRampToValueAtTime(scene.carrier, t + FADE);
    this.right.frequency.linearRampToValueAtTime(scene.carrier + scene.beat, t + FADE);

    // 자연소리: 이전 것 페이드아웃 후 정지, 새 것 페이드인
    for (const n of this.natureNodes) {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + FADE);
      setTimeout(() => n.stop(), (FADE + 0.2) * 1000);
    }
    this.natureNodes = [];
    for (const spec of scene.nature) {
      const node = await this.makeNature(spec);
      node.gain.gain.setValueAtTime(0, ctx.currentTime);
      node.gain.gain.linearRampToValueAtTime(spec.gain, ctx.currentTime + (first ? 2 : FADE));
      node.gain.connect(this.bus.nature);
      this.natureNodes.push(node);
    }
  }

  // 타이머 끝: 서서히 작아지다 멈춤
  fadeOut(sec, done) {
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + sec);
    this.fadeTimer = setTimeout(() => { this.ctx.suspend(); done && done(); }, sec * 1000);
  }

  async pause() { clearTimeout(this.fadeTimer); await this.ctx.suspend(); }

  async resume() {
    clearTimeout(this.fadeTimer);
    await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(1, t + 1.5);
  }

  /* ---------- 파동 ---------- */
  startWave() {
    const ctx = this.ctx;
    const merger = ctx.createChannelMerger(2);
    this.left = ctx.createOscillator();
    this.right = ctx.createOscillator();
    this.left.frequency.value = 180;
    this.right.frequency.value = 186;
    this.left.connect(merger, 0, 0);
    this.right.connect(merger, 0, 1);
    merger.connect(this.bus.wave);
    this.left.start();
    this.right.start();
  }

  /* ---------- 자연소리 ---------- */
  async loadFile(name) {
    if (!this.files[name]) {
      this.files[name] = fetch(`/shim/sounds/${name}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx.decodeAudioData(b));
    }
    return this.files[name];
  }

  async makeNature(spec) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    const stops = [];
    const loopNoise = (type) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise[type];
      s.loop = true;
      s.start();
      stops.push(() => s.stop());
      return s;
    };
    const lfo = (hz, depth, param) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = hz;
      g.gain.value = depth;
      o.connect(g).connect(param);
      o.start();
      stops.push(() => o.stop());
    };

    if (spec.type === 'file') {
      const buf = await this.loadFile(spec.src);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      // mp3 앞뒤 무음 여백을 피해서 반복
      s.loopStart = 0.06;
      s.loopEnd = buf.duration - 0.06;
      s.connect(gain);
      s.start(0, Math.random() * (buf.duration - 1));
      stops.push(() => s.stop());
    } else if (spec.type === 'waves') {
      // 핑크 노이즈를 천천히 밀려왔다 빠지게
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 550;
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      loopNoise('pink').connect(f).connect(swell).connect(gain);
      lfo(0.11, 0.45, swell.gain);
      lfo(0.11, 280, f.frequency);
    } else if (spec.type === 'wind') {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 260;
      f.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.6;
      loopNoise('brown').connect(f).connect(g).connect(gain);
      lfo(0.045, 100, f.frequency);
      lfo(0.07, 0.5, g.gain);
    } else if (spec.type === 'fire') {
      // 낮은 웅웅거림 + 타닥타닥
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 260;
      const lg = ctx.createGain();
      lg.gain.value = 0.7;
      loopNoise('brown').connect(low).connect(lg).connect(gain);
      lfo(0.3, 0.2, lg.gain);

      const crackleOut = ctx.createBiquadFilter();
      crackleOut.type = 'highpass';
      crackleOut.frequency.value = 900;
      crackleOut.connect(gain);
      let next = ctx.currentTime + 0.1;
      const tick = () => {
        while (next < ctx.currentTime + 1.5) {
          this.crackle(next, crackleOut);
          next += Math.random() < 0.15 ? 0.01 + Math.random() * 0.04 : 0.05 + Math.random() * 0.35;
        }
      };
      tick();
      const id = setInterval(tick, 400);
      stops.push(() => clearInterval(id));
    }
    return { gain, stop: () => { stops.forEach((s) => s()); gain.disconnect(); } };
  }

  crackle(when, out) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise.white;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200 + Math.random() * 3000;
    f.Q.value = 1.5;
    const g = ctx.createGain();
    const peak = 0.1 + Math.random() ** 3 * 0.9;
    const len = 0.004 + Math.random() * 0.03;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    s.connect(f).connect(g).connect(out);
    s.start(when, Math.random() * 5, len + 0.01);
  }

  /* ---------- 음악: 느린 화음이 계속 새로 생김 ---------- */
  startMusic() {
    const ctx = this.ctx;
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 650;
    this.musicFilter.connect(this.reverb);
    const dry = ctx.createGain();
    dry.gain.value = 0.45;
    this.musicFilter.connect(dry).connect(this.bus.music);

    // 따뜻한 화음 진행 (I - vi - IV - V 계열, maj7/add9 voicing)
    const prog = [[0, 7, 11, 16], [-3, 4, 7, 12], [-7, 0, 4, 9], [-5, 2, 7, 11]];
    let bar = 0;
    let next = ctx.currentTime + 0.5;
    const tick = () => {
      while (next < ctx.currentTime + 12) {
        const dur = 8;
        const chord = prog[bar % prog.length];
        this.chord(next, dur + 4, chord);
        // 피아노 같은 한 음씩: 한 마디에 2~4개, 화음 안의 음으로
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const st = chord[Math.floor(Math.random() * chord.length)] + 12;
          this.pluck(next + 0.6 + (i * dur) / n + Math.random() * 0.6, st);
        }
        next += dur;
        bar++;
      }
    };
    tick();
    setInterval(tick, 3000);
  }

  chord(when, len, steps) {
    const ctx = this.ctx;
    const root = this.scene ? this.scene.root : 50;
    for (const st of steps) {
      const hz = 440 * 2 ** ((root + st - 69) / 12);
      const g = ctx.createGain();
      const vol = 0.07 / (1 + Math.max(st, 0) / 12);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 3);
      g.gain.setValueAtTime(vol, when + len - 4);
      g.gain.linearRampToValueAtTime(0, when + len);
      g.connect(this.musicFilter);
      for (const [type, det] of [['sine', -4], ['triangle', 4]]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz;
        o.detune.value = det;
        o.connect(g);
        o.start(when);
        o.stop(when + len + 0.1);
      }
    }
  }

  // 부드러운 피아노/오르골 느낌의 한 음
  pluck(when, st) {
    const ctx = this.ctx;
    const root = this.scene ? this.scene.root : 50;
    const hz = 440 * 2 ** ((root + st - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.05, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, when);
    f.frequency.exponentialRampToValueAtTime(500, when + 2);
    g.connect(f).connect(this.reverb);
    f.connect(this.bus.music);
    for (const [mult, amp] of [[1, 1], [2, 0.3], [3, 0.08]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.frequency.value = hz * mult;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(when);
      o.stop(when + 4.1);
    }
  }
}

function makeNoise(ctx, type) {
  const len = ctx.sampleRate * 8;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w * 0.5;
      else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    // 반복 이음새가 튀지 않게 끝 0.5초를 앞에 겹쳐 섞음 (그 끝부분은 아래에서 잘라냄)
    const x = Math.floor(ctx.sampleRate * 0.5);
    for (let i = 0; i < x; i++) {
      const t = i / x;
      d[i] = d[i] * Math.sqrt(t) + d[len - x + i] * Math.sqrt(1 - t);
    }
  }
  const x = Math.floor(ctx.sampleRate * 0.5);
  const out = ctx.createBuffer(2, len - x, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(0, len - x), ch);
  return out;
}

function makeReverb(ctx) {
  const len = ctx.sampleRate * 4;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}
