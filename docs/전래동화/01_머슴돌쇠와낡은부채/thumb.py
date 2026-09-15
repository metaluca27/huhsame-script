"""1편 썸네일 후보 3장 (1280x720). 굵은 글자 3줄, 마지막 줄만 주황."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 96)
SMALL = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 44)
LINES = ["글 모르는 머슴이", "사흘 만에", "부자를 꿇렸다"]
WHITE, ORANGE, INK = (255, 255, 255), (255, 150, 30), (25, 18, 14)

# (장면, 글자 위치 x, y, 정렬, 그림 위치 조정)
CANDS = {
    "후보1_S02": ("images/S02.png", 1250, 60, "right"),
    "후보2_S01": ("images/S01.png", 40, 40, "left"),
    "후보3_S04": ("images/S04.png", 1260, 385, "right"),
}


def shade(img, side):
    """글자 뒤를 살짝 어둡게 해서 글자가 튀게."""
    w, h = img.size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    if side == "left":
        d.rectangle((0, 0, w * 0.62, h * 0.62), fill=120)
    elif side == "right-top":
        d.rectangle((w * 0.40, 0, w, h * 0.62), fill=120)
    elif side == "none":
        return img
    else:
        d.rectangle((w * 0.40, h * 0.45, w, h), fill=120)
    m = m.filter(ImageFilter.GaussianBlur(90))
    return Image.composite(Image.new("RGB", (w, h), (0, 0, 0)), img, m)


for name, (src, x, y, align) in CANDS.items():
    im = Image.open(src).convert("RGB").resize((1280, 720), Image.LANCZOS)
    side = "left" if align == "left" else ("none" if "S04" in src else ("right-top" if y < 150 else "right-bottom"))
    im = shade(im, side)
    d = ImageDraw.Draw(im)
    for i, t in enumerate(LINES):
        tw = d.textlength(t, font=FONT)
        tx = x if align == "left" else x - tw
        d.text((tx, y + i * 112), t, font=FONT, fill=ORANGE if i == 2 else WHITE,
               stroke_width=9, stroke_fill=INK)
    d.text((1250 - d.textlength("허허서방", font=SMALL), 650) if align == "left" else (30, 650),
           "허허서방", font=SMALL, fill=WHITE, stroke_width=5, stroke_fill=INK)
    im.save(f"썸네일_{name}.jpg", quality=92)
print("ok")
