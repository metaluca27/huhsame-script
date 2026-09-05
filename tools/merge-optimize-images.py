# tools/merge-optimize-images.py — 합체 게임 아이콘을 256색 팔레트 PNG로 줄인다(알파 유지).
import os
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', 'landing', 'merge', 'img')
before = after = 0
for f in sorted(os.listdir(D)):
    if not f.endswith('.png') or f == 'og.png':
        continue
    p = os.path.join(D, f)
    im = Image.open(p).convert('RGBA')
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    b = os.path.getsize(p)
    q.save(p, optimize=True)
    a = os.path.getsize(p)
    before += b; after += a
    print(f'{f}: {b // 1024}KB -> {a // 1024}KB')
print(f'total {before // 1024}KB -> {after // 1024}KB')
