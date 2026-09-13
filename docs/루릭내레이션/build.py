"""문장별 wav → narration.wav 합본 + timeline.json, 그리고 그림이 있으면 draft.mp4까지.

사용법 (에피소드 폴더 안에서):
  python ../build.py audio      # 합본 + 타임라인
  python ../build.py video      # timeline.json + images/NN.png → draft.mp4 (세로 1080x1920)
  python ../build.py subs       # timeline.json → 자막.srt(캔바용) + subs.srt(줄바꿈 정리) → final.mp4 (자막 구움)
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


MAX_CHARS = 13  # 자막 한 줄 최대 글자 수(세로 1080 기준, 맑은 고딕 굵게)


def wrap(text):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > MAX_CHARS:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def build_subs():
    tl = json.loads(Path("timeline.json").read_text(encoding="utf-8"))

    def ts(t):
        h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")

    plain, wrapped = [], []
    for i, s in enumerate(tl, 1):
        a, b = ts(s["start"]), ts(s["start"] + s["dur"] - 0.3)
        plain.append(f"{i}\n{a} --> {b}\n{s['text']}\n")
        wrapped.append(f"{i}\n{a} --> {b}\n{wrap(s['text'])}\n")
    Path("자막.srt").write_text("\n".join(plain), encoding="utf-8")
    Path("subs.srt").write_text("\n".join(wrapped), encoding="utf-8")
    style = ("FontName=Malgun Gothic,FontSize=13,Bold=1,PrimaryColour=&H00FFFFFF,"
             "BorderStyle=4,BackColour=&H90000000,Outline=2,OutlineColour=&H00000000,Shadow=0,"
             "Alignment=2,MarginV=48,MarginL=25,MarginR=25")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "draft.mp4",
                    "-vf", f"subtitles=subs.srt:force_style='{style}'",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy", "final.mp4"], check=True)
    print("final.mp4 생성 완료 (자막 구움)")


if __name__ == "__main__":
    {"audio": build_audio, "video": build_video, "subs": build_subs}[sys.argv[1]]()
