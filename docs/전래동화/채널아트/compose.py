"""허허서방 채널아트: 배너(2560x1440)와 프로필(800x800)을 만든다.

재료: bg.png(사람 없는 민화풍 배경), ../그림체샘플/A_민화수묵/01.png(전기수 원본)
유튜브 배너는 기기마다 잘리므로 얼굴·글자는 가운데 안전영역(1546x423) 안에 둔다.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import numpy as np

HERE = Path(__file__).parent
SRC = HERE.parent / "그림체샘플" / "A_민화수묵" / "01.png"
FONT = "C:/Windows/Fonts/batang.ttc"  # index 2 = 궁서
W, H = 2560, 1440
SAFE = (507, 508, 2053, 931)


def whiten(img):
    """한지 바탕색을 흰색으로 펴서 곱하기 합성 때 네모 자국이 안 남게 한다."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    paper = np.median(a[20:200, 20:400].reshape(-1, 3), axis=0)
    return Image.fromarray(np.clip(a / paper * 255, 0, 255).astype(np.uint8))


def banner():
    bg = Image.open(HERE / "bg.png").convert("RGB").resize((W, H), Image.LANCZOS)
    paper = tuple(int(v) for v in np.median(np.asarray(bg)[60:260, 900:1600].reshape(-1, 3), axis=0))

    # 글자 뒤 안개 띠: 한지색을 흐리게 깔아서 집·지붕 선이 글자랑 안 싸우게
    mist = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mist).rounded_rectangle((560, 530, 2110, 925), 160, fill=248)
    ImageDraw.Draw(mist).ellipse((600, 850, 1160, 1260), fill=240)  # 전기수 몸 뒤 좌판이 비치지 않게
    mist = mist.filter(ImageFilter.GaussianBlur(55))
    bg = Image.composite(Image.new("RGB", (W, H), paper), bg, mist)

    # 전기수: 원본 상반신을 잘라 한지끼리 곱하기 합성, 아래는 먹이 번지듯 페이드
    src = whiten(Image.open(SRC))
    fig = src.crop((470, 40, 1310, 900))
    s = 0.8
    fig = fig.resize((int(fig.width * s), int(fig.height * s)), Image.LANCZOS)
    fx, fy = 470, 505
    # 네모 자국이 안 남게 타원형으로 번지는 마스크 (얼굴·가슴 중심)
    fade = Image.new("L", fig.size, 0)
    cx, cy = fig.width * 0.5, fig.height * 0.38
    ImageDraw.Draw(fade).ellipse((cx - fig.width * 0.40, cy - fig.height * 0.40,
                                  cx + fig.width * 0.40, cy + fig.height * 0.52), fill=255)
    fade = fade.filter(ImageFilter.GaussianBlur(45))
    region = bg.crop((fx, fy, fx + fig.width, fy + fig.height))
    mult = ImageChops.multiply(region, fig)
    bg.paste(Image.composite(mult, region, fade), (fx, fy))

    d = ImageDraw.Draw(bg)
    ink = (28, 24, 22)
    title = ImageFont.truetype(FONT, 190, index=2)
    sub = ImageFont.truetype(FONT, 64, index=2)
    tx = 1150
    d.text((tx, 575), "허허서방", font=title, fill=ink)
    d.text((tx + 10, 830), "팔자가 뒤집히는 옛날이야기", font=sub, fill=(70, 58, 50))

    # 붉은 낙관 도장
    tw = d.textlength("허허서방", font=title)
    sx, sy, ss = int(tx + tw + 24), 610, 100
    assert sx + ss <= SAFE[2] - 10, f"도장이 안전영역 밖: {sx + ss}"
    d.rectangle((sx, sy, sx + ss, sy + ss), fill=(178, 44, 36))
    seal = ImageFont.truetype(FONT, 42, index=2)
    for j, ch in enumerate("허허"):
        cw = d.textlength(ch, font=seal)
        d.text((sx + (ss - cw) / 2, sy + 6 + j * 45), ch, font=seal, fill=(250, 240, 225))

    bg.save(HERE / "배너_허허서방.png", optimize=True)

    # 확인용: 안전영역(모바일에서 보이는 부분) 표시본
    chk = bg.copy()
    ImageDraw.Draw(chk).rectangle(SAFE, outline=(255, 0, 0), width=6)
    chk.resize((W // 2, H // 2)).save(HERE / "_배너_안전영역확인.jpg", quality=85)


def profile():
    src = Image.open(SRC).convert("RGB")
    box = (600, 20, 1184, 604)  # 갓 끝부터 수염까지 정사각
    src.crop(box).resize((800, 800), Image.LANCZOS).save(HERE / "프로필_허허서방.png", optimize=True)


if __name__ == "__main__":
    banner()
    profile()
    print("done")
