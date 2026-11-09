"""헤르메스 데스크탑 창 캡처(raw/)를 잘라 슬라이드용 화면(screens/)으로 만든다.

토큰, 텔레그램 ID, 사용자 이름이 보이는 곳은 흐리게 가린다. 설명할 곳에는 번호와 테두리를 직접 그린다.
좌표는 1632x965 원본 캡처 기준이다.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAW, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
ACCENT = (91, 140, 255)  # 헤르메스 파랑, 슬라이드 강조색과 같다
FONT = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26)

# 이름: (원본, 자르는 범위, 가릴 곳, [(테두리 범위, 번호)])
SHOTS = {
    "home": ("h12", None, [(186, 940, 262, 965)], []),
    "tour": ("h12", None, [(186, 940, 262, 965)], [
        ((22, 96, 330, 126), 1), ((22, 136, 330, 166), 2), ((22, 175, 330, 205), 3), ((22, 214, 330, 244), 4),
        ((22, 253, 330, 283), 5), ((1228, 884, 1440, 914), 6), ((50, 940, 180, 964), 7)]),
    "chat": ("h15", (360, 40, 1632, 940), [], []),
    "model_free": ("h12", (372, 868, 1612, 930), [], []),
    "model_codex": ("h01", (372, 868, 1612, 930), [], []),
    "caps": ("h07", (360, 30, 1632, 940), [], [((360, 160, 880, 330), None)]),
    "messaging": ("h03", (360, 60, 1632, 940), [(718, 488, 1100, 524)], []),
    "cron_list": ("h11", (350, 90, 1632, 870), [], []),
    "cron_detail": ("h05", (60, 40, 1580, 920), [(520, 276, 680, 302)], [((90, 460, 380, 490), None)]),
    "artifacts": ("h08", (350, 40, 1632, 840), [], []),
}


def frame(img, radius=20, border=(205, 210, 220), width=3):
    """모서리를 둥글게 깎고 얇은 테두리를 두른다."""
    img = img.convert("RGBA")
    w, h = img.size
    mask = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius * 2, fill=255)
    img.putalpha(mask.resize((w, h), Image.LANCZOS))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, w - 1, h - 1], radius, outline=border + (255,), width=width)
    return img


for name, (src, box, hide, marks) in SHOTS.items():
    path = RAW / f"{src}.png"
    if not path.exists():
        print("없음", src)
        continue
    img = Image.open(path).convert("RGB")
    for area in hide:
        img.paste(img.crop(area).filter(ImageFilter.GaussianBlur(9)), area[:2])
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1), num in marks:
        d.rounded_rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], 8, outline=ACCENT, width=4)
        if num is not None:
            cx, cy = (x1 + 24, (y0 + y1) // 2) if x1 + 50 < img.width else (x0 - 26, (y0 + y1) // 2)
            d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=ACCENT)
            d.text((cx, cy), str(num), fill=(20, 20, 24), font=FONT, anchor="mm")
    if box:
        img = img.crop(box)
    frame(img).save(OUT / f"{name}.png")
    print(name, img.size)
