"""루카가 찍은 안티그라비티 화면을 슬라이드용으로 자른다. 이메일과 이름이 보이는 왼쪽 아래 프로필과 대화 목록은 빼고 자른다."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
SHOTS = {
    "sidebar": ("205136", (0, 100, 392, 300)),
    "marketplace": ("205136", (392, 40, 1578, 1048)),
    "usage": ("205349", (430, 110, 1455, 900)),
    "plugin_list": ("205750", (392, 100, 1584, 801)),
    "plugin_built": ("210415", (385, 120, 1566, 815)),
    "plugin_detail": ("210628", (380, 60, 1513, 727)),
    "permission": ("210123", (420, 550, 1565, 925)),
    "full": ("210904", (0, 0, 1516, 1021)),
    "market_top": ("205136", (392, 135, 1578, 935)),
    "market_google": ("205203", (392, 120, 1578, 920)),
    "chat_ask": ("205956", (385, 60, 1588, 880)),
    "progress": ("210243", (385, 60, 1584, 800)),
    "proposal": ("210014", (385, 60, 1569, 860)),
    "detail_big": ("210628", (380, 60, 1513, 800)),
    "commands": ("210649", (380, 60, 1518, 950)),
    "settings": ("205305", (370, 105, 1440, 895)),
    "chat_casual": ("204759", (388, 100, 1582, 800)),
    "save": ("210840", (380, 100, 1512, 880)),
}
# 화면에 보이는 PC 사용자 이름을 지운다. (왼쪽, 위, 오른쪽, 아래)는 자른 뒤 기준 좌표다.
WIPES = {"permission": [(109, 74, 170, 98)], "commands": [(183, 308, 237, 338)]}


def rounded(img, radius=20, border=(42, 52, 70), width=3):
    img = img.convert("RGBA")
    scale = 3
    w, h = img.size
    mask = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius * scale, fill=255)
    img.putalpha(mask.resize((w, h), Image.LANCZOS))
    ring = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius * scale,
                                           outline=border + (255,), width=width * scale)
    img.alpha_composite(ring.resize((w, h), Image.LANCZOS))
    return img


for old in OUT.glob("*.png"):
    old.unlink()
for name, (stamp, box) in SHOTS.items():
    img = Image.open(SRC / f"스크린샷 2026-11-03 {stamp}.png").convert("RGB").crop(box)
    for wipe in WIPES.get(name, []):
        ImageDraw.Draw(img).rectangle(wipe, fill=img.getpixel((wipe[0] - 2, wipe[1] - 2)))
    rounded(img).save(OUT / f"{name}.png", optimize=True)
    print(name, img.size)
