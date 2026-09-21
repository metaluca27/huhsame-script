"""롱폼 재료(대본·음성·그림)로 세로 숏츠를 잘라낸다.

숏츠는 새로 만드는 게 아니라 이미 만든 편에서 떼어 온다. 그림도 목소리도 그대로 쓰고,
세로 화면으로 다시 앉히고 자막을 크게 깔고 끝에 "이어서 보기" 카드만 붙인다.

사용법 (에피소드 폴더 안에서):
  python ../도구/shorts.py plan                     # 숏츠로 쓸 만한 구간 후보 보기
  python ../도구/shorts.py make 001-012             # 그 줄들로 숏츠 만들기
  python ../도구/shorts.py make 001-012 --out 숏츠_훅.mp4 --title "버려진 항아리"
"""
import argparse, json, re, subprocess, sys, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from script_io import parse_script, scene_kind
from timeline import build_timeline, split_cues, to_srt
from imaging import FPS

SIZE = (1080, 1920)      # 유튜브 숏츠 세로 화면
MAX_SEC = 60             # 숏츠 길이 상한
CTA_SEC = 2.5            # 끝에 붙는 "이어서 보기" 카드
SUB_WIDTH = 16           # 세로 화면 자막 한 줄 글자 수
GAP = 0.6                # 줄 사이 숨 고르기(길이 어림용)
POSES = Path(__file__).resolve().parent.parent / "허허서방"


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def parse_range(text, nums):
    """'001-012' 또는 '004,005,009' → 줄 번호 목록. 대본에 없는 번호면 알려준다."""
    picked = []
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = (p.strip() for p in part.split("-", 1))
            if a not in nums or b not in nums:
                raise ValueError(f"{a}-{b}번 줄이 대본에 없어요")
            i, j = nums.index(a), nums.index(b)
            if i > j:
                raise ValueError(f"{a}번이 {b}번보다 뒤예요")
            picked += nums[i:j + 1]
        else:
            if part not in nums:
                raise ValueError(f"{part}번 줄이 대본에 없어요")
            picked.append(part)
    if not picked:
        raise ValueError("줄 번호를 적어 주세요 (예: 001-012)")
    return picked


def vertical_filter(frames, zoom_in=True):
    """가로 그림을 세로 화면에 앉히는 필터: 흐린 배경 + 가운데 원본 + 아주 느린 확대."""
    w, h = SIZE
    zoom = f"1+0.05*on/{frames}" if zoom_in else f"1.05-0.05*on/{frames}"
    return (
        f"[0:v]scale={w}:-1,crop={w}:ih:0:(ih-oh)/2,scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},boxblur=24:2,eq=brightness=-0.10[bg];"
        f"[0:v]scale=3240:-1,zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={w}x{round(w * 9 / 16)}:fps={FPS}[fg];"
        f"[bg][fg]overlay=0:(H-h)/2,format=yuv420p"
    )


def cta_card(out, title, pose="껄껄"):
    """끝에 붙는 카드: 다음 편으로 넘어오게 만드는 한마디."""
    from PIL import Image, ImageDraw, ImageFont
    from imaging import PAPER, GUNGSUH
    w, h = SIZE
    card = Image.new("RGB", SIZE, PAPER)
    face = POSES / f"{pose}.png"
    if face.exists():
        img = Image.open(face).convert("RGB")
        img = img.resize((w, round(img.height * w / img.width)))
        card.paste(img, (0, (h - img.height) // 2 - 120))
    d = ImageDraw.Draw(card)
    big = ImageFont.truetype(GUNGSUH[0], 96, index=GUNGSUH[1])
    small = ImageFont.truetype(GUNGSUH[0], 64, index=GUNGSUH[1])
    lines = [(title or "이야기 끝까지 들으시려거든", big), ("채널에서 전체 영상 보기", small), ("허허서방", small)]
    y = h - 520
    for text, font in lines:
        tw = d.textlength(text, font=font)
        d.text(((w - tw) / 2, y), text, font=font, fill=(40, 34, 30),
               stroke_width=6, stroke_fill=(245, 240, 228))
        y += font.size + 40
    card.save(out)
    return out


def make(nums_text, out, title):
    rows = parse_script("대본.md")
    by_num = {r["num"]: r for r in rows}
    durations = {d["num"]: d for d in json.loads(Path("audio/durations.json").read_text(encoding="utf-8"))}
    picked = parse_range(nums_text, [r["num"] for r in rows])
    lines = [{**by_num[n], "sec": durations[n]["sec"]} for n in picked]
    tl, scenes, total = build_timeline(lines)
    if total + CTA_SEC > MAX_SEC:
        sys.exit(f"{total + CTA_SEC:.0f}초예요 — 숏츠는 {MAX_SEC}초까지예요. 줄 수를 줄이세요")

    work = Path("shorts_work")
    work.mkdir(exist_ok=True)
    # 1) 목소리 이어 붙이기
    pcm, params = bytearray(), None
    for ln in tl:
        with wave.open(f"audio/{ln['num']}.wav") as w:
            params = params or w.getparams()
            pcm += w.readframes(w.getnframes())
        pcm += b"\x00" * (params.sampwidth * params.nchannels * round(ln["gap"] * params.framerate))
    voice = work / "voice.wav"
    with wave.open(str(voice), "wb") as w:
        w.setparams(params)
        w.writeframes(bytes(pcm))

    # 2) 장면마다 세로 클립
    listing = []
    for i, sc in enumerate(scenes):
        img = Path(f"images/{sc['scene']}.png")
        if not img.exists():
            sys.exit(f"그림이 없어요: {img}")
        frames = max(1, round(sc["dur"] * FPS))
        clip = work / f"{i:02d}.mp4"
        ff("-loop", 1, "-i", img, "-filter_complex", vertical_filter(frames, i % 2 == 0),
           "-frames:v", frames, "-c:v", "libx264", "-preset", "veryfast", "-crf", 20, "-r", FPS, clip)
        listing.append(f"file '{clip.name}'\n")
    cta_png = cta_card(work / "cta.png", title)
    cta_mp4 = work / "cta.mp4"
    ff("-loop", 1, "-i", cta_png, "-frames:v", round(CTA_SEC * FPS), "-vf", "format=yuv420p",
       "-c:v", "libx264", "-preset", "veryfast", "-crf", 20, "-r", FPS, cta_mp4)
    listing.append(f"file '{cta_mp4.name}'\n")
    (work / "list.txt").write_text("".join(listing), encoding="utf-8")

    # 3) 이어 붙이고 자막 굽기
    draft = work / "draft.mp4"
    ff("-f", "concat", "-safe", 0, "-i", work / "list.txt", "-i", voice,
       "-af", "apad", "-t", round(total + CTA_SEC, 3),
       "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", draft)
    cues = [c for ln in tl for c in split_cues(ln["text"], ln["start"], ln["sec"], width=SUB_WIDTH)]
    srt = work / "subs.srt"
    srt.write_text(to_srt(cues), encoding="utf-8")
    # 세로 화면은 ASS 여백 기준이 달라서 MarginV를 작게 준다(크게 주면 화면 밖으로 밀림)
    style = ("FontName=Malgun Gothic,FontSize=16,Bold=1,PrimaryColour=&H00FFFFFF,"
             "BorderStyle=1,Outline=3,OutlineColour=&H00000000,Shadow=0,"
             "Alignment=2,MarginV=60,MarginL=60,MarginR=60")
    ff("-i", draft, "-vf", f"subtitles={work.name}/{srt.name}:force_style='{style}'",
       "-c:v", "libx264", "-preset", "medium", "-crf", 20, "-c:a", "copy", out)
    print(f"{out} 만들었어요 — {total + CTA_SEC:.1f}초, 장면 {len(scenes)}개, 자막 {len(cues)}개")


def scene_kinds():
    """장면 → 종류(base/sil/web/huh). prompts.json이 없으면 빈 표."""
    path = Path("prompts.json")
    if not path.exists():
        return {}
    scenes = json.loads(path.read_text(encoding="utf-8"))["scenes"]
    return {sid: scene_kind(body)[0] for sid, body in scenes.items()}


def candidates(rows, durations, kinds, limit=MAX_SEC - CTA_SEC - 1):
    """숏츠로 떼어 쓸 구간 세 개: 훅 / 반전 / 한마디."""
    def window(start_i, stop_at_huh=False):
        total, picked = 0.0, []
        for r in rows[start_i:]:
            if stop_at_huh and kinds.get(r["scene"]) == "huh":
                break
            sec = durations.get(r["num"], 0) + GAP
            if total + sec > limit:
                break
            total += sec
            picked.append(r)
        return picked, total

    out = []
    head, head_sec = window(0, stop_at_huh=True)
    if head:
        out.append(("훅", head, head_sec))

    web = [i for i, r in enumerate(rows) if kinds.get(r["scene"]) == "web"]
    if web:
        # 반전은 보통 마지막 웹 장면. 그 장면 첫 줄부터 담는다
        flip_scene = rows[web[-1]]["scene"]
        first = next(i for i, r in enumerate(rows) if r["scene"] == flip_scene)
        body, body_sec = window(first)
        if body:
            out.append(("반전", body, body_sec))

    huh_tail = [i for i, r in enumerate(rows) if kinds.get(r["scene"]) == "huh"]
    if huh_tail:
        # 끝 허허서방 대목 중, 숏츠 길이에 맞게 뒤에서부터 자른다
        first = huh_tail[-1]
        for i in reversed(huh_tail):
            if i < first - 6:
                break
            first = i
        tail, tail_sec = window(first)
        if tail:
            out.append(("한마디", tail, tail_sec))
    return out


def plan():
    """숏츠로 떼어 쓸 만한 구간을 골라 보여준다."""
    rows = parse_script("대본.md")
    durations = {d["num"]: d["sec"] for d in json.loads(Path("audio/durations.json").read_text(encoding="utf-8"))}
    print("숏츠 후보 (줄 번호 범위를 make에 그대로 넣으세요)\n")
    for name, picked, sec in candidates(rows, durations, scene_kinds()):
        print(f"{name}  {picked[0]['num']}-{picked[-1]['num']}  {sec:.0f}초")
        print(f"   {picked[0]['text'][:40]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["plan", "make"])
    ap.add_argument("lines", nargs="?", default="")
    ap.add_argument("--out", default="")
    ap.add_argument("--title", default="")
    a = ap.parse_args()
    if a.cmd == "plan":
        return plan()
    if not a.lines:
        sys.exit("줄 번호를 적어 주세요 (예: shorts.py make 001-012)")
    out = a.out or f"숏츠_{a.lines.replace(',', '_')}.mp4"
    try:
        make(a.lines, out, a.title)
    except ValueError as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
