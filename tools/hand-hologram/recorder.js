// 녹화: 카메라 화면(거울) + 홀로그램을 한 캔버스에 합쳐 세로 9:16(또는 가로 16:9)로 저장.
import { audio } from './sfx.js';

export function createRecorder(video, holoCanvas) {
  const out = document.createElement('canvas');
  const g = out.getContext('2d');
  let rec = null, raf = 0, chunks = [], vertical = true;

  function draw() {
    const vw = video.videoWidth, vh = video.videoHeight;
    // 가로 영상에서 가운데 9:16 만 잘라 쓴다 (화면의 점선 상자)
    const sw = vertical ? vh * 9 / 16 : vw, sx = (vw - sw) / 2;
    g.save();
    g.translate(out.width, 0);
    g.scale(-1, 1);                                   // 거울
    g.filter = 'brightness(.82) saturate(.9)';
    g.drawImage(video, vw - sx - sw, 0, sw, vh, 0, 0, out.width, out.height);
    g.restore();
    g.filter = 'none';
    const hw = holoCanvas.width, hh = holoCanvas.height;
    const hsw = vertical ? hh * 9 / 16 : hw;
    g.drawImage(holoCanvas, (hw - hsw) / 2, 0, hsw, hh, 0, 0, out.width, out.height);
    raf = requestAnimationFrame(draw);
  }

  return {
    get recording() { return !!rec; },
    set vertical(v) { vertical = v; },
    start() {
      const vh = video.videoHeight;
      out.height = vertical ? 1920 : vh;
      out.width = vertical ? 1080 : video.videoWidth;
      draw();
      const stream = out.captureStream(30);
      audio().out.stream.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const type = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
        .find((t) => MediaRecorder.isTypeSupported(t));
      rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12_000_000 });
      chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        cancelAnimationFrame(raf);
        const blob = new Blob(chunks, { type: rec.mimeType });
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = URL.createObjectURL(blob);
        a.download = `손홀로그램_${stamp}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        rec = null;
      };
      rec.start(500);
    },
    stop() { rec?.stop(); },
  };
}
