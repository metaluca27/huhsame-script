// 녹화: 카메라 화면(거울) + 홀로그램을 한 캔버스에 합쳐 세로 9:16(또는 가로 16:9)로 저장.
import { audio } from './sfx.js';

export function createRecorder(video, holoCanvas) {
  const out = document.createElement('canvas');
  const g = out.getContext('2d');
  let rec = null, raf = 0, chunks = [], vertical = true;

  /** 가운데에서 결과 비율만큼 잘라낼 영역 (가로 웹캠이든 세로 폰 카메라든) */
  function crop(w, h) {
    const want = out.width / out.height;
    return w / h > want
      ? { sx: (w - h * want) / 2, sy: 0, sw: h * want, sh: h }
      : { sx: 0, sy: (h - w / want) / 2, sw: w, sh: w / want };
  }

  function draw() {
    const v = crop(video.videoWidth, video.videoHeight);
    g.save();
    g.translate(out.width, 0);
    g.scale(-1, 1);                                   // 거울 (가운데 자르기라 좌우 대칭)
    g.filter = 'brightness(.82) saturate(.9)';
    g.drawImage(video, v.sx, v.sy, v.sw, v.sh, 0, 0, out.width, out.height);
    g.restore();
    g.filter = 'none';
    const h = crop(holoCanvas.width, holoCanvas.height);
    g.drawImage(holoCanvas, h.sx, h.sy, h.sw, h.sh, 0, 0, out.width, out.height);
    raf = requestAnimationFrame(draw);
  }

  return {
    get recording() { return !!rec; },
    set vertical(v) { vertical = v; },
    start() {
      out.width = vertical ? 1080 : 1920;
      out.height = vertical ? 1920 : 1080;
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
