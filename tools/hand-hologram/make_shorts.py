"""손 홀로그램 숏츠: 폰 자체 녹화에서 네 장면을 잘라 잇고 화면 글을 얹는다. 배경음악은 유튜브 앱에서.
사용법: python make_shorts.py <폰 녹화 mp4>   → out/hand_shorts.mp4
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
OUT = HERE / "out"
FONT = "C:/Users/atlia/AppData/Local/Microsoft/Windows/Fonts/UhBeeSe_hyun.ttf"
W, H = 1080, 1920
INK, HOLO = (255, 255, 255), (111, 216, 255)

HOOK = ("손바닥을 펴면", "AI 친구가 나와요")
SCENES = [  # (시작 초, 끝 초, 큰 글씨, 작은 글씨) — 2026-10-28 22:35 녹화 기준
    (4.5, 11.6, "손가락 하나", "= 푸름이"),
    (12.6, 16.6, "손가락 둘", "= 루릭"),
    (16.8, 21.6, "락앤롤 손", "= CLO"),
    (27.0, 31.8, "엄지 척", "= 주주야"),
]
OUTRO = ("주먹 쥐면 쏙 사라져요", "AI 강의 보고 하루 만에 만듦")
HOOK_S, OUTRO_S = 2.2, 2.4


def card(lines, path, top=True, big=100, small=84):
    """투명 PNG 에 두 줄 글씨 (흰 글씨 + 푸른 테두리)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = 230 if top else H - 520
    for text, size, fill in ((lines[0], big, INK), (lines[1], small, HOLO)):
        font = ImageFont.truetype(FONT, size)
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=fill, stroke_width=8, stroke_fill=(10, 30, 45))
        y += size + 34
    img.save(path)


def main(src):
    OUT.mkdir(exist_ok=True)
    pngs = []
    card(HOOK, OUT / "c_hook.png", big=110, small=110)
    pngs.append(OUT / "c_hook.png")
    for i, (_, _, a, b) in enumerate(SCENES):
        card((a, b), OUT / f"c_{i}.png")
        pngs.append(OUT / f"c_{i}.png")
    card(OUTRO, OUT / "c_outro.png", top=False, big=84, small=60)
    pngs.append(OUT / "c_outro.png")

    # 장면 자르기 → 잇기 (소리 = 녹화 속 효과음)
    parts, labels, t = [], [], 0.0
    for i, (s, e, _, _) in enumerate(SCENES):
        parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,scale={W}:{H},fps=30[v{i}];"
                     f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS[a{i}];")
        labels.append((t, t + e - s))
        t += e - s
    total = t
    concat = "".join(f"[v{i}][a{i}]" for i in range(len(SCENES))) + f"concat=n={len(SCENES)}:v=1:a=1[cv][ca];"
    # 글씨 얹기: 훅은 처음 HOOK_S 초(그동안 장면 글은 숨김), 장면 글은 각 장면 동안, 마무리는 마지막 OUTRO_S 초
    chain, prev = [], "cv"
    windows = [(0, HOOK_S)] + [(max(a, HOOK_S if i == 0 else a), b) for i, (a, b) in enumerate(labels)] + [(total - OUTRO_S, total)]
    for k, (a, b) in enumerate(windows):
        chain.append(f"[{prev}][{k + 1}:v]overlay=0:0:enable='between(t,{a:.2f},{b:.2f})'[o{k}];")
        prev = f"o{k}"
    graph = "".join(parts) + concat + "".join(chain)[:-1].rsplit(f"[{prev}]", 1)[0] + "[outv]"
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", src]
    for p in pngs:
        cmd += ["-loop", "1", "-i", str(p)]
    cmd += ["-filter_complex", graph, "-map", "[outv]", "-map", "[ca]", "-t", f"{total:.2f}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(OUT / "hand_shorts.mp4")]
    subprocess.run(cmd, check=True)
    print(f"완성: {OUT / 'hand_shorts.mp4'} ({total:.1f}초)")


if __name__ == "__main__":
    main(sys.argv[1])
