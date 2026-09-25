"""audio/durations.json + images → narration.wav, timeline.json, draft.mp4, final.mp4

사용법 (에피소드 폴더 안에서):
  python ../도구/build.py audio
  python ../도구/build.py video [--endcard 경로]
  python ../도구/build.py subs
"""
import argparse, json, subprocess, sys, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from script_io import parse_script
from timeline import build_timeline, split_cues, to_srt
from imaging import FPS, kenburns_filter, make_end_card

END_SEC = 5
DEFAULT_ENDCARD = Path.home() / "Desktop" / "피지컬아트" / "집가는길.jpg"


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def build_audio():
    lines = json.loads(Path("audio/durations.json").read_text(encoding="utf-8"))
    current = [(r["num"], r["scene"], r["text"]) for r in parse_script("대본.md")]
    recorded = [(d["num"], d["scene"], d["text"]) for d in lines]
    if current != recorded:
        mismatches = [c[0] for c, r in zip(current, recorded) if c != r]
        if mismatches:
            first = mismatches[0]
        else:
            shorter, longer = (current, recorded) if len(current) < len(recorded) else (recorded, current)
            first = longer[len(shorter)][0]
        sys.exit(f"대본.md가 음성 만든 뒤에 바뀌었어요 — tts.py make부터 다시 실행하세요 ({first}번부터)")
    tl_lines, scenes, total = build_timeline(lines)
    rate = channels = width = None
    pcm = bytearray()
    for ln in tl_lines:
        path = f"audio/{ln['num']}.wav"
        with wave.open(path) as w:
            r, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
            if rate is None:
                rate, channels, width = r, ch, sw
            elif (r, ch, sw) != (rate, channels, width):
                sys.exit(f"{ln['num']}번 줄 오디오 포맷이 다름: {path} = {r}Hz/{ch}ch/{sw}B "
                         f"(기준 {rate}Hz/{channels}ch/{width}B) — 다시 생성해서 맞춰주세요")
            pcm += w.readframes(w.getnframes())
        pcm += b"\x00" * (width * channels * round(ln["gap"] * rate))
    with wave.open("narration.wav", "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(bytes(pcm))
    Path("timeline.json").write_text(json.dumps({"lines": tl_lines, "scenes": scenes, "total": total},
                                                ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"줄 {len(tl_lines)}개, 장면 구간 {len(scenes)}개, 총 {int(total // 60)}분 {int(total % 60)}초")


def build_video(endcard, credit=None):
    tl = json.loads(Path("timeline.json").read_text(encoding="utf-8"))
    missing = sorted({s["scene"] for s in tl["scenes"] if not Path(f"images/{s['scene']}.png").exists()})
    if missing:
        sys.exit(f"그림 없음: {missing}")
    # --endcard 없음 으로 주면 엔딩 카드 없이 끝낸다 (루카 그림을 안 붙이는 편)
    use_end = str(endcard).strip() not in ("", "없음", "none")
    if use_end and not Path(endcard).exists():
        sys.exit(f"엔딩 카드 그림이 없어요: {endcard} (--endcard 경로로 지정, 안 붙이려면 --endcard 없음)")
    clips = Path("clips")
    clips.mkdir(exist_ok=True)
    if use_end:
        make_end_card(endcard, clips / "end.png", **({"credit": credit} if credit else {}))
    items = [(f"images/{s['scene']}.png", max(1, round((s["start"] + s["dur"]) * FPS) - round(s["start"] * FPS)))
              for s in tl["scenes"]] + ([(clips / "end.png", END_SEC * FPS)] if use_end else [])
    listing = []
    for i, (img, frames) in enumerate(items):
        out = clips / f"{i:03d}.mp4"
        ff("-i", img, "-vf", kenburns_filter(frames, zoom_in=(i % 2 == 0)), "-frames:v", frames,
           "-c:v", "libx264", "-preset", "veryfast", "-crf", 20, "-r", FPS, out)
        listing.append(f"file '{out.name}'\n")
        print(f"\r클립 {i + 1}/{len(items)}", end="", file=sys.stderr)
    print(file=sys.stderr)
    (clips / "list.txt").write_text("".join(listing), encoding="utf-8")
    ff("-f", "concat", "-safe", 0, "-i", clips / "list.txt", "-i", "narration.wav",
       "-af", "apad", "-t", round(tl["total"] + END_SEC, 3),
       "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "draft.mp4")
    print("draft.mp4 생성 완료")


def build_subs():
    tl = json.loads(Path("timeline.json").read_text(encoding="utf-8"))
    cues = [c for ln in tl["lines"] for c in split_cues(ln["text"], ln["start"], ln["sec"])]
    Path("subs.srt").write_text(to_srt(cues), encoding="utf-8")
    style = ("FontName=Malgun Gothic,FontSize=22,Bold=1,PrimaryColour=&H00FFFFFF,"
             "BorderStyle=4,BackColour=&H99000000,Outline=2,OutlineColour=&H00000000,Shadow=0,"
             "Alignment=2,MarginV=16,MarginL=40,MarginR=40")
    ff("-i", "draft.mp4", "-vf", f"subtitles=subs.srt:force_style='{style}'",
       "-c:v", "libx264", "-preset", "medium", "-crf", 20, "-c:a", "copy", "final.mp4")
    print(f"final.mp4 생성 완료 (자막 {len(cues)}개)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["audio", "video", "subs"])
    ap.add_argument("--endcard", default=str(DEFAULT_ENDCARD))
    ap.add_argument("--credit", default="", help="엔딩 카드 크레딧 문구 (기본: 그림: Metaluca.)")
    a = ap.parse_args()
    {"audio": build_audio, "video": lambda: build_video(a.endcard, a.credit), "subs": build_subs}[a.cmd]()


if __name__ == "__main__":
    main()
