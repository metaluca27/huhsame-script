"""루카가 찍은 폰 스샷을 슬라이드용으로 다듬는다. 아래쪽 안드로이드 버튼 줄을 잘라내고 모서리를 둥글게 한다."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
PREFIX = "KakaoTalk_20261103_104710478"
BOX = (0, 0, 1080, 2200)
SHOTS = {
    "home": "_15",
    "add_source": "_10",
    "url": "_09",
    "mic": "_11",
    "source_list": "_07",
    "chat": "_13",
    "studio": "_02",
    "reset": "_14",
}


def rounded(img, radius=60, border=(42, 52, 70), width=6):
    img = img.convert("RGBA")
    scale = 2
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
for name, suffix in SHOTS.items():
    img = Image.open(SRC / f"{PREFIX}{suffix}.jpg").convert("RGB").crop(BOX).resize((648, 1320), Image.LANCZOS)
    rounded(img, 36, width=4).save(OUT / f"{name}.png", optimize=True)
    print(name, (OUT / f"{name}.png").stat().st_size // 1024, "KB")

# 스튜디오 결과물 스샷은 src/shots_extra에 있고 크기가 달라서 비율만 맞춰 자른다.
for path in sorted((Path(__file__).parent / "shots_extra").glob("*.jpg")):
    img = Image.open(path).convert("RGB")
    w = img.width
    img = img.crop((0, 0, w, round(w * 2200 / 1080))).resize((648, 1320), Image.LANCZOS)
    rounded(img, 36, width=4).save(OUT / f"{path.stem}.png", optimize=True)
    print(path.stem, (OUT / f"{path.stem}.png").stat().st_size // 1024, "KB")
