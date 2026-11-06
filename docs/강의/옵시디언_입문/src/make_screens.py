"""옵시디언 창 캡처(raw/)를 잘라 슬라이드용 화면(screens/)으로 만든다. 설명할 곳에는 번호와 테두리를 직접 그린다.

좌표는 1984x1314 원본 캡처 기준이다.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAW, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
ACCENT = (168, 139, 250)  # 옵시디언 보라, 슬라이드 강조색과 같다
FONT = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 30)

# 이름: (원본, 자르는 범위, [(테두리 범위, 번호)])
SHOTS = {
    "tour": ("g11", None, [((70, 120, 370, 1245), 1), ((630, 150, 1720, 1265), 2), ((12, 113, 54, 157), 3), ((1882, 68, 1926, 110), 4), ((1522, 1278, 1700, 1312), 5)]),
    "explorer": ("g10", (0, 0, 380, 760), [((113, 70, 153, 110), 1)]),
    "note_basic": ("g12", (600, 150, 1760, 1160), []),
    "links": ("g11", (600, 500, 1760, 1265), [((684, 690, 868, 728), None), ((684, 730, 902, 768), None), ((676, 877, 850, 915), None)]),
    "graph": ("g01", (380, 60, 1984, 1314), []),
    "props": ("g06", (600, 140, 1760, 800), [((640, 225, 1320, 505), None)]),
    "dash_mine": ("g10", (600, 140, 1760, 720), []),
    "dash_toss": ("g03", (600, 130, 1760, 1220), []),
    "dash_novel": ("g04", (600, 140, 1760, 800), [((648, 555, 1700, 597), None)]),
    "dash_web": ("g14", (600, 140, 1760, 860), []),
    "dash_channel": ("g05", (600, 140, 1760, 640), []),
    "dash_ebook": ("g15", (600, 140, 1760, 560), []),
    "bases": ("g13", (380, 60, 1984, 640), []),
    "retro": ("g07", (600, 140, 1760, 1180), []),
}


def frame(img, radius=24, border=(42, 52, 70), width=4):
    """모서리를 둥글게 깎고 얇은 테두리를 두른다."""
    img = img.convert("RGBA")
    w, h = img.size
    mask = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius * 2, fill=255)
    img.putalpha(mask.resize((w, h), Image.LANCZOS))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, w - 1, h - 1], radius, outline=border + (255,), width=width)
    return img


for name, (src, box, marks) in SHOTS.items():
    img = Image.open(RAW / f"{src}.png").convert("RGB")
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1), num in marks:
        d.rounded_rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], 10, outline=ACCENT, width=5)
        if num is not None:
            cx, cy = (x1 + 22, y0 + 4) if x1 + 50 < img.width else (x0 - 26, y0 + 4)
            d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=ACCENT)
            d.text((cx, cy), str(num), fill=(10, 13, 20), font=FONT, anchor="mm")
    if box:
        img = img.crop(box)
    frame(img).save(OUT / f"{name}.png")
    print(name, img.size)
