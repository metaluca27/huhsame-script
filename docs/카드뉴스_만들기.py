"""카드뉴스 만들기 (힉스필드 배경 그림 + 한글 문구는 여기서 얹음)

폴더 하나 = 카드뉴스 한 세트:
  폴더/bg/bg1.webp ~ bgN.webp   힉스필드에서 받은 배경(3:4)
  폴더/cards.json               {"brand": "아래 띠 글자", "cards": [{"off":..,"kicker":..,"title":..,"sub":..,"accent_sub":false}, ...]}
실행: python docs/카드뉴스_만들기.py <폴더>
결과: 폴더/out/card1.png ~ cardN.png (1080x1350) + _전체보기.jpg
off = 1080x1440으로 늘린 그림에서 몇 px 아래부터 보여줄지(가짜 글자나 빈 곳 잘라낼 때 조절)
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1350
IMG_H = 830          # 그림이 보이는 높이
PANEL_Y = 790        # 크림색 판이 시작되는 높이(그림 위로 살짝 겹침)
BOLD = "C:/Windows/Fonts/malgunbd.ttf"
REG = "C:/Windows/Fonts/malgun.ttf"
CREAM = (251, 244, 230)
INK = (58, 46, 40)
SUB = (110, 92, 80)
ORANGE = (224, 123, 57)


def make(folder, out, i, total, brand, c):
    bg = Image.open(folder / "bg" / f"bg{i}.webp").convert("RGB").resize((1080, 1440), Image.LANCZOS)
    off = c.get("off", 300)
    card = Image.new("RGB", (W, H), CREAM)
    card.paste(bg.crop((0, off, 1080, off + IMG_H)), (0, 0))

    # 판 위쪽에 부드러운 그림자 + 둥근 크림색 판
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((0, PANEL_Y - 6, W, H + 60), 56, fill=90)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    card.paste((60, 40, 30), (0, 0), shadow.point(lambda v: v // 3))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, PANEL_Y, W, H + 60), 56, fill=CREAM)

    x = 76
    y = PANEL_Y + 58
    # 머리말 알약
    kf = ImageFont.truetype(BOLD, 30)
    kw = d.textlength(c["kicker"], font=kf)
    d.rounded_rectangle((x, y, x + kw + 44, y + 54), 27, fill=ORANGE)
    d.text((x + 22, y + 27), c["kicker"], font=kf, fill="white", anchor="lm")
    y += 92

    tsize = 74 if i == 1 else 66
    tf = ImageFont.truetype(BOLD, tsize)
    for line in c["title"].split("\n"):
        d.text((x, y), line, font=tf, fill=INK)
        y += int(tsize * 1.32)
    y += 14
    accent = c.get("accent_sub", False)
    sf = ImageFont.truetype(BOLD if accent else REG, 34)
    d.text((x, y), c["sub"], font=sf, fill=ORANGE if accent else SUB)

    # 아래 띠
    ff = ImageFont.truetype(BOLD, 26)
    d.line((x, H - 92, W - x, H - 92), fill=(230, 214, 190), width=2)
    d.text((x, H - 52), brand, font=ff, fill=SUB, anchor="lm")
    d.text((W - x, H - 52), f"{i} / {total}", font=ff, fill=SUB, anchor="rm")

    card.save(out / f"card{i}.png")
    return card


def main(folder):
    folder = Path(folder)
    cfg = json.loads((folder / "cards.json").read_text(encoding="utf-8"))
    out = folder / "out"
    out.mkdir(exist_ok=True)
    cards = cfg["cards"]
    made = [make(folder, out, n, len(cards), cfg["brand"], c) for n, c in enumerate(cards, 1)]

    w, h = 540, 675
    cols = 3
    rows = (len(made) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, h * rows), "white")
    for k, im in enumerate(made):
        sheet.paste(im.resize((w, h)), ((k % cols) * w, (k // cols) * h))
    sheet.save(out / "_전체보기.jpg", quality=88)
    print("done", len(made), "cards")


if __name__ == "__main__":
    main(sys.argv[1])
