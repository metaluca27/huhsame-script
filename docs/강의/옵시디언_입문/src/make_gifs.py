"""슬라이드에 넣는 움직이는 GIF를 만든다. 배경색을 슬라이드와 똑같이 맞춰 경계가 안 보이게 한다."""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

BG = (10, 13, 20)
PURPLE = (168, 139, 250)
MINT = (61, 245, 196)
WHITE = (242, 245, 250)
SS = 2  # 2배로 그린 뒤 줄여서 가장자리를 부드럽게 한다


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def build_palette():
    colors = [BG]
    for target in (PURPLE, MINT, WHITE):
        colors += [lerp(BG, target, i / 70) for i in range(1, 71)]
    colors += [lerp(PURPLE, MINT, i / 44) for i in range(1, 45)]
    flat = [c for rgb in colors[:256] for c in rgb]
    flat += [0] * (768 - len(flat))
    pal = Image.new("P", (1, 1))
    pal.putpalette(flat)
    return pal


PALETTE = build_palette()


def glow_dot(img, x, y, r, color, glow=3.0):
    """번지는 빛이 붙은 점을 덧칠한다."""
    pad = int(r * glow * 3)
    size = pad * 2
    layer = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(layer)
    d.ellipse([pad - r * glow, pad - r * glow, pad + r * glow, pad + r * glow], fill=110)
    layer = layer.filter(ImageFilter.GaussianBlur(r * glow / 2))
    d = ImageDraw.Draw(layer)
    d.ellipse([pad - r, pad - r, pad + r, pad + r], fill=255)
    img.paste(Image.new("RGB", (size, size), color), (int(x - pad), int(y - pad)), layer)


def save(frames, name, duration=60):
    small = [f.resize((f.width // SS, f.height // SS), Image.LANCZOS).quantize(palette=PALETTE, dither=Image.Dither.NONE) for f in frames]
    path = OUT / name
    small[0].save(path, save_all=True, append_images=small[1:], loop=0, duration=duration, disposal=1, optimize=False)
    print(name, f"{path.stat().st_size / 1024:.0f}KB", len(small), "frames")


def links(name="links.gif", size=720, n=60):
    """노트(점)들이 링크(선)로 이어지고, 빛이 링크를 따라 차례로 흐르는 그래프 뷰 그림."""
    nodes = [(0.5, 0.5), (0.24, 0.3), (0.76, 0.27), (0.2, 0.68), (0.8, 0.7), (0.5, 0.16), (0.5, 0.86), (0.08, 0.48), (0.92, 0.48)]
    edges = [(0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (1, 7), (2, 8), (1, 5), (4, 8), (3, 6)]
    frames = []
    for i in range(n):
        t = i / n
        img = Image.new("RGB", (size * SS, size * SS), BG)
        d = ImageDraw.Draw(img)
        pts = [(x * size * SS, y * size * SS) for x, y in nodes]
        for a, b in edges:
            d.line([pts[a], pts[b]], fill=lerp(BG, PURPLE, 0.35), width=2 * SS)
        # 빛 하나가 링크를 차례로 지나가며 한 바퀴를 돌아 끝 프레임이 첫 프레임과 이어진다
        pos = t * len(edges)
        k, f = int(pos), pos - int(pos)
        a, b = edges[k]
        hx = pts[a][0] + (pts[b][0] - pts[a][0]) * f
        hy = pts[a][1] + (pts[b][1] - pts[a][1]) * f
        d.line([pts[a], (hx, hy)], fill=lerp(PURPLE, MINT, 0.6), width=4 * SS)
        for j, (x, y) in enumerate(pts):
            pulse = 0.5 + 0.5 * math.sin((t + j / len(pts)) * 2 * math.pi)
            r = (20 if j == 0 else 11) * SS * (0.92 + 0.12 * pulse)
            glow_dot(img, x, y, r, lerp(PURPLE, WHITE, 0.25 * pulse) if j else PURPLE, glow=2.0)
        glow_dot(img, hx, hy, 7 * SS, MINT, glow=2.6)
        frames.append(img)
    save(frames, name, 70)


if __name__ == "__main__":
    links()
