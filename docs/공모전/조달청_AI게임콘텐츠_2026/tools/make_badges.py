"""생성 원본(badge_raw/stageNN.png) → 원 바깥을 투명하게 깎은 512px 배지(landing/ssukssuk/img/stageNN.png).
생성 그림은 흰 배경 위에 원 배지가 여백을 두고 놓여 있어서, 흰색이 아닌 부분의 경계를 찾아
그 정사각형만 잘라낸 뒤 원 마스크를 씌운다.
사용: python make_badges.py
"""
import os
from PIL import Image, ImageChops, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.normpath(os.path.join(HERE, "..", "badge_raw"))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk", "img"))
SIZE, SS = 512, 4  # 최종 크기, 마스크 안티에일리어싱 배율
WHITE_TOL = 30     # 이 정도까지는 흰 배경으로 봄


def badge_box(im):
    """흰 배경이 아닌 영역의 경계 → 가운데 맞춘 정사각형 (left, top, right, bottom)."""
    rgb = im.convert("RGB")
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, (255, 255, 255))).convert("L")
    mask = diff.point(lambda v: 255 if v > WHITE_TOL else 0)
    box = mask.getbbox() or (0, 0, im.width, im.height)
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    half = max(box[2] - box[0], box[3] - box[1]) / 2
    return (int(cx - half), int(cy - half), int(cx + half), int(cy + half))


for n in range(1, 12):
    src = os.path.join(RAW, f"stage{n:02d}.png")
    im = Image.open(src).convert("RGBA")
    im = im.crop(badge_box(im)).resize((SIZE, SIZE), Image.LANCZOS)
    mask = Image.new("L", (SIZE * SS, SIZE * SS), 0)
    pad = int(SIZE * SS * 0.004)
    ImageDraw.Draw(mask).ellipse((pad, pad, SIZE * SS - pad, SIZE * SS - pad), fill=255)
    im.putalpha(mask.resize((SIZE, SIZE), Image.LANCZOS))
    im.save(os.path.join(OUT, f"stage{n:02d}.png"))
    print("ok", n)
