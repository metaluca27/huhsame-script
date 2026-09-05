# tools/merge-og.py — 카톡 미리보기 1200×630. 힉스필드 키아트(og-wide.png 우선, 없으면 정사각 og.png)를 오른쪽에 두고
# 왼쪽에 제목을 얹는다. 정사각 그림에서 잘못 나온 두 동그라미(흰 고양이·정체불명 얼굴)는 우리 아이콘으로 덮는다.
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'landing', 'merge', 'img')
SRC_DIR = r'C:\Users\atlia\Desktop\캐릭터6'
W, H = 1200, 630

def font(size):
    for p in [r'C:\Windows\Fonts\malgunbd.ttf', r'C:\Windows\Fonts\malgun.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def icon(name, d):
    return Image.open(os.path.join(IMG, name + '.png')).convert('RGBA').resize((d, d), Image.LANCZOS)

bg = Image.new('RGBA', (W, H))
d = ImageDraw.Draw(bg)
for y in range(H):  # 세로 그라데이션 네이비
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(14 + 10 * t), int(22 + 16 * t), int(52 + 36 * t), 255))

wide = os.path.join(SRC_DIR, 'og-wide.png')
square = os.path.join(SRC_DIR, 'og.png')
if os.path.exists(wide):
    art = Image.open(wide).convert('RGBA')
    art = art.resize((W, int(art.height * W / art.width)), Image.LANCZOS)
    bg.alpha_composite(art.crop((0, max(0, (art.height - H) // 2), W, max(0, (art.height - H) // 2) + H)))
else:
    art = Image.open(square).convert('RGBA')
    # 잘못 나온 두 동그라미를 우리 아이콘으로 덮기 (원본 1024 기준 좌표)
    for name, (cx, cy, r) in {'pureum': (852, 690, 68), 'jujuya': (540, 856, 72)}.items():
        ic = icon(name, r * 2)
        disc = Image.new('RGBA', (r * 2, r * 2), (0, 0, 0, 0))
        ImageDraw.Draw(disc).ellipse((0, 0, r * 2 - 1, r * 2 - 1), fill=(120, 140, 220, 255), outline=(30, 30, 70, 255), width=4)
        disc.alpha_composite(ic)
        art.alpha_composite(disc, (cx - r, cy - r))
    art = art.resize((int(art.width * H / art.height), H), Image.LANCZOS)
    mask = Image.new('L', art.size, 255)   # 왼쪽 가장자리를 배경과 섞기
    md = ImageDraw.Draw(mask)
    for x in range(160):
        md.line([(x, 0), (x, H)], fill=int(255 * x / 160))
    bg.paste(art, (W - art.width, 0), mask)

for i in range(140):  # 반짝이(왼쪽 영역)
    x, y = (i * 997) % W, (i * 601) % H
    if x < 560:
        s = 2 + (i % 3)
        d.ellipse((x, y, x + s, y + s), fill=(255, 255, 255, 70 + (i % 4) * 30))
d = ImageDraw.Draw(bg)
d.text((70, 170), '다락방 머지', font=font(104), fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(20, 20, 60, 255))
d.text((76, 305), '붙이면 진화한다!', font=font(52), fill=(255, 217, 79, 255), stroke_width=3, stroke_fill=(20, 20, 60, 255))
d.text((78, 385), '주주야부터 전설 루카까지, 11단계 합체', font=font(32), fill=(220, 226, 255, 255))
# 진화 사슬 미니 아이콘 줄
x = 78
for k in ['jujuya', 'ruric', 'pureum', 'nova', 'luna', 'luka', 'luka-gold', 'luka-fire', 'luka-space', 'luka-angel', 'luka-legend']:
    bg.alpha_composite(icon(k, 40), (x, 450)); x += 46
out = bg.convert('RGB').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
path = os.path.join(IMG, 'og.png')
out.save(path, optimize=True)
print('og.png saved', out.size, os.path.getsize(path) // 1024, 'KB', 'source:', 'wide' if os.path.exists(wide) else 'square')
