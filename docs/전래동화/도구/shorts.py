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
SUB_WIDTH = 12           # 세로 화면 자막 한 줄 글자 수
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


FITS = {"wide": 9 / 16, "square": 1.0}  # 가운데 그림이 차지하는 세로 비율(가로 대비)
VERTICAL_DIR = Path("숏츠그림")          # 9:16으로 따로 뽑은 그림이 있으면 이걸 꽉 채워 쓴다


def fullbleed_filter(frames, zoom_in=True):
    """세로 그림을 화면에 꽉 채운다. 비율이 9:16이 아니어도 가운데 기준으로 잘라 채운다."""
    w, h = SIZE
    zoom = f"1+0.05*on/{frames}" if zoom_in else f"1.05-0.05*on/{frames}"
    return (f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,crop={w * 2}:{h * 2},"
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={FPS},format=yuv420p")


def pan_filter(frames, to_right=True):
    """가로 그림을 9:16으로 잘라 화면을 꽉 채우고, 좌우로 천천히 밀어 준다(팬).

    새로 그리지 않으니 인물이 바뀌지 않는다. 대신 좌우 끝은 보이지 않는다.
    """
    w, h = SIZE
    move = f"(in_w-out_w)*n/{frames}" if to_right else f"(in_w-out_w)*(1-n/{frames})"
    return (f"scale=-1:{h}:force_original_aspect_ratio=increase,"
            f"crop=w=ih*9/16:h=ih:x='{move}':y=0,scale={w}:{h},format=yuv420p")


def vertical_filter(frames, zoom_in=True, fit="square"):
    """가로 그림을 세로 화면에 앉히는 필터: 흐린 배경 + 가운데 원본 + 아주 느린 확대.

    fit=wide   원본 16:9 그대로 (그림 전체가 보이지만 위아래가 많이 빈다)
    fit=square 좌우를 조금 잘라 1:1 (숏츠에서 가장 자연스러움)
    fit=full   9:16까지 잘라 화면을 꽉 채움 (좌우가 많이 잘린다)
    """
    w, h = SIZE
    fg_h = round(w * FITS[fit])
    zoom = f"1+0.05*on/{frames}" if zoom_in else f"1.05-0.05*on/{frames}"
    return (
        f"[0:v]scale={w}:-1,crop={w}:ih:0:(ih-oh)/2,scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},boxblur=24:2,eq=brightness=-0.10[bg];"
        rf"[0:v]scale=3240:-1,crop=min(iw\,ih*{16 / 9 * FITS[fit]:.4f}):ih,"
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={w}x{fg_h}:fps={FPS}[fg];"
        f"[bg][fg]overlay=0:(H-h)/2-120,format=yuv420p"
    )


def trim_paper_border(img, bright=170, flat=26, pad=4):
    """세로 그림이 '가로 그림 + 위아래 종이 여백'으로 나오면 그림 부분만 잘라낸다.

    종이 여백은 밝고(한지색) 색 변화가 거의 없다. 그런 줄이 위아래에 이어지면 잘라낸다.
    """
    import numpy as np
    a = np.asarray(img.convert("RGB")).astype(float)
    rows, var = a.mean(axis=1), a.std(axis=(1, 2))
    paper = (rows.min(axis=1) > bright) & (var < flat)
    top = 0
    while top < len(paper) and paper[top]:
        top += 1
    bottom = len(paper)
    while bottom > top and paper[bottom - 1]:
        bottom -= 1
    top, bottom = max(top - pad, 0), min(bottom + pad, img.height)
    if not (img.height * 0.35 < bottom - top < img.height * 0.94):
        return img
    return img.crop((0, top, img.width, bottom))


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


def prompts_for(nums_text):
    """숏츠에 쓸 장면들의 9:16 프롬프트를 파일로 뽑아 준다 (웹 무제한으로 뽑을 때 사용)."""
    rows = parse_script("대본.md")
    picked = parse_range(nums_text, [r["num"] for r in rows])
    scenes, seen = [], set()
    for r in rows:
        if r["num"] in picked and r["scene"] not in seen:
            seen.add(r["scene"])
            scenes.append(r["scene"])
    data = json.loads(Path("prompts.json").read_text(encoding="utf-8"))
    VERTICAL_DIR.mkdir(exist_ok=True)
    out = ["# 숏츠용 세로 그림 (9:16)", "",
           "힉스필드 웹 · **Nano Banana(2 아님) · Unlimited 켜기 · 9:16** ",
           "참고 그림은 본편 `images/` 에서 같은 장면을 넣으면 인물이 안 바뀝니다.",
           f"받은 그림은 `{VERTICAL_DIR}/S01.png` 처럼 장면 번호로 저장하세요.", ""]
    for sid in scenes:
        kind, body = scene_kind(data["scenes"][sid])
        if kind == "huh":
            out += [f"## {sid} — 허허서방 {body} (그대로 쓰면 됩니다)", ""]
            continue
        for key in sorted(data["characters"], key=len, reverse=True):
            body = body.replace(key, data["characters"][key])
        out += [f"## {sid}", "", f"참고 그림: `images/{sid}.png`", "", "```",
                f"{data['styles'][kind]} Vertical 9:16 composition, the people fill the middle of a tall frame, "
                f"heads and feet inside the picture. Exactly one moon in the sky and nothing is duplicated "
                f"— draw each person and each object only once. Scene: {body}", "```", ""]
    path = VERTICAL_DIR / "프롬프트.md"
    path.write_text(chr(10).join(out), encoding="utf-8")
    print(f"{path} 에 {len(scenes)}장 프롬프트를 적었어요 — 웹에서 9:16으로 뽑아 {VERTICAL_DIR}/에 넣으세요")


def make(nums_text, out, title, fit="pan"):
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
        tall = VERTICAL_DIR / f"{sc['scene']}.png"
        img = tall if tall.exists() else Path(f"images/{sc['scene']}.png")
        if not img.exists():
            sys.exit(f"그림이 없어요: {img}")
        frames = max(1, round(sc["dur"] * FPS))
        clip = work / f"{i:02d}.mp4"
        if img == tall:
            from PIL import Image as _Image
            trimmed = trim_paper_border(_Image.open(img))
            if trimmed.size != _Image.open(img).size:
                img = work / f"tall{i:02d}.png"
                trimmed.save(img)
        if img != Path(f"images/{sc['scene']}.png"):
            flt = fullbleed_filter(frames, i % 2 == 0)       # 세로로 따로 뽑은 그림
        elif fit == "pan":
            flt = pan_filter(frames, i % 2 == 0)             # 원본 그림을 잘라 꽉 채우고 밀기
        else:
            flt = vertical_filter(frames, i % 2 == 0, fit)   # 흐린 배경 위에 원본
        opt = "-filter_complex" if "[bg]" in flt else "-vf"   # 흐린 배경을 합성할 때만 복합 필터
        ff("-loop", 1, "-i", img, opt, flt,
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
    # WrapStyle=2 = 우리가 넣은 줄바꿈만 쓴다(안 그러면 낱말 가운데서 잘린다)
    style = ("FontName=Malgun Gothic,FontSize=16,Bold=1,PrimaryColour=&H00FFFFFF,"
             "BorderStyle=1,Outline=3,OutlineColour=&H00000000,Shadow=0,WrapStyle=2,"
             "Alignment=2,MarginV=60,MarginL=40,MarginR=40")
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
    ap.add_argument("cmd", choices=["plan", "make", "그림"])
    ap.add_argument("lines", nargs="?", default="")
    ap.add_argument("--out", default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--fit", default="pan", choices=sorted(FITS) + ["pan"], help="square=흐린 배경 위, pan=원본을 잘라 꽉 채우고 밀기")
    a = ap.parse_args()
    if a.cmd == "plan":
        return plan()
    if a.cmd == "그림":
        if not a.lines:
            sys.exit("줄 번호를 적어 주세요 (예: shorts.py 그림 001-005)")
        try:
            return prompts_for(a.lines)
        except ValueError as e:
            sys.exit(str(e))
    if not a.lines:
        sys.exit("줄 번호를 적어 주세요 (예: shorts.py make 001-012)")
    out = a.out or f"숏츠_{a.lines.replace(',', '_')}.mp4"
    try:
        make(a.lines, out, a.title, a.fit)
    except ValueError as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
