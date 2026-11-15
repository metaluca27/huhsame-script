# -*- coding: utf-8 -*-
"""「남원에 오면 나도 춘향이」 편집 스크립트.
실행: python build/make_video.py  (공모전 폴더에서)
그림·영상 컷을 노래 시간에 맞춰 붙이고, 가사 자막·표기 문구·끝 화면을 얹는다.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W, H, FPS = 1080, 1920, 30
SONG = "audio/song_v1.mp3"
SONG_LEN = 45.52
END_LEN = 3.2
FONT = r"C:\Windows\Fonts\NotoSansKR-VF.ttf"   # Noto Sans KR, SIL OFL (상업 이용 가능)
TMP = "build/tmp"
OUT = "남원에오면나도춘향이.mp4"
os.makedirs(TMP, exist_ok=True)

# (종류, 파일, 시작, 끝, 옵션)  still=그림에 느린 확대, clip=영상(ss=영상 안 시작점)
TIMELINE = [
    ("still", "images/S01.png",  0.0,  5.0, {"film": True, "zoom": "in"}),
    ("still", "images/S02.png",  5.0, 10.2, {"zoom": "in"}),
    ("clip",  "clips/C1_변신.mp4", 10.2, 15.2, {"ss": 0.0}),
    ("still", "images/S04.png", 15.2, 18.5, {"zoom": "in"}),
    ("still", "images/S05c.png", 18.5, 22.0, {"zoom": "out"}),
    ("clip",  "clips/C2_빙글.mp4", 22.0, 27.0, {"ss": 0.0}),
    ("still", "images/S06.png", 27.0, 31.5, {"zoom": "in"}),
    ("clip",  "clips/C3_그네.mp4", 31.5, 35.3, {"ss": 0.0}),
    ("still", "images/S07.png", 35.3, 37.4, {"zoom": "in"}),
    ("clip",  "clips/C4_머쓱.mp4", 37.4, 39.7, {"ss": 0.4}),
    ("clip",  "clips/C5_추어탕.mp4", 39.7, SONG_LEN, {"ss": 0.0, "hold": True}),
]

SUBS = [
    (0.0,  4.9,  "오래전 어느 날 남원에 갔었지"),
    (5.0,  10.0, "기억은 흐릿한데 그 기분은 선명해"),
    (10.2, 15.0, "광한루 연못 위로 오작교를 건너는데"),
    (17.8, 21.9, "남원에 오면 나도 춘향이"),
    (22.0, 26.6, "치맛자락 바람에 날리고"),
    (27.0, 31.3, "남원에 오면 누구나 춘향이"),
    (31.5, 35.5, "그네 타고 하늘까지"),
    (36.7, 39.4, "몽룡이는 없었지만"),
    (39.5, 44.8, "추어탕은 있었네"),
]
NOTICE = "2026 전북에 빠졌쏭 AI 뮤직쇼츠 공모전 출품작 · AI를 활용해 만든 영상"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0 or (r.stderr and "warning" in cmd):
        print(r.stderr[-2500:])
    if r.returncode != 0:
        sys.exit(1)


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def text_png(path, text, size, y, weight="Bold", fill=(255, 255, 255), stroke=6, pill=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(size, weight)
    box = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
    tw, th = box[2] - box[0], box[3] - box[1]
    x = (W - tw) // 2 - box[0]
    if pill:
        pad = 18
        d.rounded_rectangle([x + box[0] - pad, y + box[1] - pad // 2, x + box[2] + pad, y + box[3] + pad // 2],
                            radius=22, fill=(0, 0, 0, 120))
    d.text((x, y), text, font=f, fill=fill, stroke_width=stroke, stroke_fill=(40, 20, 20, 255))
    img.save(path)


def seg_still(i, src, dur, opt):
    out = f"{TMP}/seg{i:02d}.mp4"
    n = int(round(dur * FPS))
    if opt.get("zoom") == "out":
        z = f"1.12-0.10*on/{n}"
    else:
        z = f"1.02+0.10*on/{n}"
    vf = (f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
          f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1")
    if opt.get("film"):
        # 흐릿한 옛 필름 사진 느낌: 살짝 흐리고 누렇게, 가장자리 어둡게
        vf += ",gblur=sigma=2.2,eq=saturation=0.75:contrast=0.92:brightness=0.03,colorbalance=rs=0.10:gs=0.04:bs=-0.10,vignette=PI/4.5"
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", src, "-vf", vf, "-frames:v", str(n),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-r", str(FPS), out])
    return out


def seg_clip(i, src, dur, opt):
    out = f"{TMP}/seg{i:02d}.mp4"
    n = int(round(dur * FPS))
    vf = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps={FPS},setsar=1"
    if opt.get("hold"):
        vf += f",tpad=stop_mode=clone:stop_duration=6"
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(opt.get("ss", 0)), "-i", src, "-an", "-vf", vf,
         "-frames:v", str(n), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-r", str(FPS), out])
    return out


def end_card():
    bg = Image.open("images/S02.png").convert("RGB")
    s = max(W / bg.width, H / bg.height)
    bg = bg.resize((int(bg.width * s) + 1, int(bg.height * s) + 1))
    l, t = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((l, t, l + W, t + H)).filter(ImageFilter.GaussianBlur(14))
    bg = Image.blend(bg, Image.new("RGB", (W, H), (30, 14, 10)), 0.45).convert("RGBA")
    d = ImageDraw.Draw(bg)

    def center(text, size, y, weight="Bold", fill=(255, 255, 255)):
        f = font(size, weight)
        b = d.textbbox((0, 0), text, font=f)
        d.text(((W - (b[2] - b[0])) // 2 - b[0], y), text, font=f, fill=fill)

    center("남원에 오면", 96, 640, "Black", (255, 226, 120))
    center("나도 춘향이", 120, 760, "Black")
    center("이번 가을, 남원에서 만나요", 52, 960, "Medium")
    center("2026 전북에 빠졌쏭 AI 뮤직쇼츠 공모전 출품작", 36, 1330, "Medium")
    center("이 영상은 AI를 활용해 만든 영상입니다", 36, 1390, "Medium")
    center("노래 Suno · 그림과 영상 Higgsfield", 30, 1460, "Regular", (230, 230, 230))
    p = f"{TMP}/end.png"; bg.convert("RGB").save(p)
    out = f"{TMP}/seg99.mp4"; n = int(round(END_LEN * FPS))
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", p, "-vf", f"fps={FPS},setsar=1,fade=t=in:st=0:d=0.4",
         "-frames:v", str(n), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-r", str(FPS), out])
    return out


def main():
    segs = []
    for i, (kind, src, a, b, opt) in enumerate(TIMELINE):
        segs.append((seg_still if kind == "still" else seg_clip)(i, src, b - a, opt))
        print("seg", i, kind, src, round(b - a, 2))
    segs.append(end_card())
    total = SONG_LEN + END_LEN
    # 조각들을 필터로 이어 붙인다(복사 방식은 시간 표시가 어긋나 자막·장면이 밀렸음)
    inputs = []
    for s_ in segs:
        inputs += ["-i", s_]
    ns = len(segs)
    filt = ["".join(f"[{k}:v]" for k in range(ns)) + f"concat=n={ns}:v=1:a=0,fps={FPS},setpts=N/{FPS}/TB[b0]"]
    last = "b0"
    text_png(f"{TMP}/notice.png", NOTICE, 27, 176, "Medium", stroke=0, pill=True)
    overlays = [(f"{TMP}/notice.png", 0, SONG_LEN)]
    for k, (a, b, t) in enumerate(SUBS):
        p = f"{TMP}/sub{k}.png"; text_png(p, t, 62, 1480); overlays.append((p, a, b))
    for k, (p, a, b) in enumerate(overlays):
        inputs += ["-loop", "1", "-t", str(total), "-i", p]
        filt.append(f"[{last}][{ns+k}:v]overlay=0:0:enable='between(t,{a},{b})'[v{k}]"); last = f"v{k}"
    filt.append(f"[{last}]fade=t=out:st={total-0.4}:d=0.4[vout]")
    filt.append(f"[{ns+len(overlays)}:a]apad=whole_dur={total}[aout]")
    run(["ffmpeg", "-y", "-loglevel", "warning", *inputs, "-i", SONG, "-filter_complex", ";".join(filt),
         "-map", "[vout]", "-map", "[aout]", "-t", str(total), "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-crf", "18", "-preset", "slow", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", OUT])
    print("done", OUT)


if __name__ == "__main__":
    main()
