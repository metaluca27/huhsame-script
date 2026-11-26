"""작은도서관 마실 카드뉴스 6장 만들기 (힉스필드 배경 + 한글 문구는 여기서 얹음)
실행: python make_cards.py  → out/card1.png ~ card6.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
W, H = 1080, 1350
IMG_H = 830          # 그림이 보이는 높이
PANEL_Y = 790        # 크림색 판이 시작되는 높이(그림 위로 살짝 겹침)
BOLD = "C:/Windows/Fonts/malgunbd.ttf"
REG = "C:/Windows/Fonts/malgun.ttf"
CREAM = (251, 244, 230)
INK = (58, 46, 40)
SUB = (110, 92, 80)
ORANGE = (224, 123, 57)

CARDS = [
    # (그림 세로 위치: 1080x1440 그림에서 어디부터 보여줄지, 작은 머리말, 제목, 설명)
    (400, "울산 작은도서관 마실", "우리 동네에\n작은도서관이 42곳?", "몰랐던 동네 사랑방, 한 화면에 모았어요"),
    (300, "작은도서관이 뭐예요?", "아파트 1층, 골목 안\n가까운 도서관", "그림책 읽고, 수업 듣고, 이웃 만나는 곳"),
    (300, "42곳을 한눈에", "그래프와 지도로\n둘러봐요", "구·군별로 묶어서, 가까운 곳부터 쏙"),
    (480, "요즘 소식", "관장님이 직접 올리는\n도서관 이야기", "사진과 활동 소식이 바로바로 올라와요"),
    (250, "다가오는 행사", "행사 일정도\n날짜 가까운 순으로", "D-day 표시에 신청 링크까지 한 번에"),
    (560, "이번 주말엔", "가까운 도서관부터\n마실 가볼까요?", "vaulted-bus-346411.web.app/smalllib"),
]


def font(path, size):
    return ImageFont.truetype(path, size)


def make(i, off, kicker, title, sub):
    bg = Image.open(HERE / "bg" / f"bg{i}.webp").convert("RGB").resize((1080, 1440), Image.LANCZOS)
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
    kf = font(BOLD, 30)
    kw = d.textlength(kicker, font=kf)
    d.rounded_rectangle((x, y, x + kw + 44, y + 54), 27, fill=ORANGE)
    d.text((x + 22, y + 27), kicker, font=kf, fill="white", anchor="lm")
    y += 92

    tsize = 74 if i == 1 else 66
    tf = font(BOLD, tsize)
    for line in title.split("\n"):
        d.text((x, y), line, font=tf, fill=INK)
        y += int(tsize * 1.32)
    y += 14
    sf = font(BOLD if i == 6 else REG, 34)
    d.text((x, y), sub, font=sf, fill=ORANGE if i == 6 else SUB)

    # 아래 띠
    ff = font(BOLD, 26)
    d.line((x, H - 92, W - x, H - 92), fill=(230, 214, 190), width=2)
    d.text((x, H - 52), "울산 작은도서관 마실", font=ff, fill=SUB, anchor="lm")
    d.text((W - x, H - 52), f"{i} / {len(CARDS)}", font=ff, fill=SUB, anchor="rm")

    card.save(OUT / f"card{i}.png")


for n, c in enumerate(CARDS, 1):
    make(n, *c)
print("done", OUT)
