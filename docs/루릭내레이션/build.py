"""문장별 wav → narration.wav 합본 + timeline.json, 그리고 그림이 있으면 draft.mp4까지.

사용법 (에피소드 폴더 안에서):
  python ../build.py audio      # 합본 + 타임라인
  python ../build.py video      # timeline.json + images/NN.png → draft.mp4 (세로 1080x1920)
"""
import json, re, subprocess, sys, wave
from pathlib import Path

GAP = 0.35  # 문장 사이 숨 고르기(초)


def wav_sec(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def parse_script(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*(\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$", line)
        if m:
            rows.append((m.group(1), m.group(2), m.group(3)))
    return rows


def build_audio():
    rows = parse_script("대본.md")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                    "-t", str(GAP), "audio/gap.wav"], check=True)
    Path("audio/concat.txt").write_text("".join(f"file '{n}.wav'\nfile 'gap.wav'\n" for n, _, _ in rows), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "audio/concat.txt",
                    "-c", "copy", "narration.wav"], check=True)
    t, tl = 0.0, []
    for n, text, scene in rows:
        sec = wav_sec(f"audio/{n}.wav")
        tl.append({"num": n, "start": round(t, 2), "dur": round(sec + GAP, 2), "text": text, "scene": scene,
                   "image": f"images/{n}.png"})
        t += sec + GAP
    Path("timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"문장 {len(tl)}개, 총 {t:.1f}초 ({int(t // 60)}분 {int(t % 60)}초)")


def build_video():
    tl = json.loads(Path("timeline.json").read_text(encoding="utf-8"))
    missing = [s["image"] for s in tl if not Path(s["image"]).exists()]
    if missing:
        sys.exit(f"그림 없음: {missing}")
    # concat demuxer: 각 그림을 문장 길이만큼 보여준다
    # concat 목록은 목록 파일 위치 기준 상대경로라 파일명만 쓴다
    lines = []
    for s in tl:
        lines.append(f"file '{Path(s['image']).name}'\nduration {s['dur']}\n")
    lines.append(f"file '{Path(tl[-1]['image']).name}'\n")  # 마지막 프레임 유지용
    Path("images/concat.txt").write_text("".join(lines), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "images/concat.txt",
                    "-i", "narration.wav",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p",
                    "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", "draft.mp4"], check=True)
    print("draft.mp4 생성 완료")


if __name__ == "__main__":
    {"audio": build_audio, "video": build_video}[sys.argv[1]]()
