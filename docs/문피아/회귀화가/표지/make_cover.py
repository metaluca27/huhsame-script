"""문피아 표지 만들기: 그림 위쪽 + 아래 어두운 띠에 두 줄 제목 (탱커 표지와 같은 800x1144)."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 800, 1144
BAND_TOP = 800
FONT = r"C:\Windows\Fonts\malgunbd.ttf"
BG = (8, 11, 24)

def text_w(draw, s, f):
    b = draw.textbbox((0, 0), s, font=f)
    return b[2] - b[0], b

def fit_font(draw, s, max_w, start):
    size = start
    while size > 20:
        f = ImageFont.truetype(FONT, size)
        if text_w(draw, s, f)[0] <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(FONT, size)

def make(src, out, line2_color, num_color):
    im = Image.open(src).convert("RGB")
    scale = W / im.width
    im = im.resize((W, round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), BG)
    canvas.paste(im.crop((0, 0, W, min(im.height, H))), (0, 0))
    # 그림 아래쪽을 띠 색으로 부드럽게 녹이기
    grad = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(grad)
    fade = 90
    for y in range(BAND_TOP - fade, H):
        a = 255 if y >= BAND_TOP else int(255 * (y - (BAND_TOP - fade)) / fade)
        gd.line([(0, y), (W, y)], fill=a)
    canvas = Image.composite(Image.new("RGB", (W, H), BG), canvas, grad)

    d = ImageDraw.Draw(canvas)
    margin = 40
    # 1줄: "32억을 그린 화가는" (32억만 강조색)
    l1a, l1b = "32억을", " 그린 화가는"
    f1 = fit_font(d, l1a + l1b, W - 2 * margin, 92)
    wa, _ = text_w(d, l1a, f1)
    wt, bt = text_w(d, l1a + l1b, f1)
    x1 = (W - wt) // 2
    y1 = BAND_TOP + 18
    for dx, dy in [(-3,0),(3,0),(0,-3),(0,3),(-2,-2),(2,2),(-2,2),(2,-2)]:
        d.text((x1+dx, y1+dy), l1a + l1b, font=f1, fill=(0,0,0))
    d.text((x1, y1), l1a, font=f1, fill=num_color)
    d.text((x1 + wa, y1), l1b, font=f1, fill=(255, 255, 255))
    # 2줄: "0원이었다" (크게)
    l2 = "0원이었다"
    f2 = fit_font(d, l2, W - 2 * margin, 170)
    w2, b2 = text_w(d, l2, f2)
    x2 = (W - w2) // 2 - b2[0]
    y2 = y1 + (bt[3] - bt[1]) + 34 - b2[1] + 10
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.text((x2, y2), l2, font=f2, fill=line2_color + (170,))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(canvas)
    d.text((x2, y2), l2, font=f2, fill=line2_color)
    canvas.save(out, quality=95)
    print(out, canvas.size)

if __name__ == "__main__":
    src = sys.argv[1]
    make(src, sys.argv[2], (255, 92, 77), (242, 193, 78))   # 0원=붉은 서명색, 32억=금색
    make(src, sys.argv[3], (242, 193, 78), (242, 193, 78))  # 둘 다 금색
