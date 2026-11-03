"""슬라이드에 넣는 움직이는 GIF를 만든다. 배경색을 슬라이드와 똑같이 맞춰 경계가 안 보이게 한다."""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

BG = (10, 13, 20)
MINT = (90, 169, 255)
VIOLET = (255, 122, 89)
WHITE = (242, 245, 250)
SS = 2  # 2배로 그린 뒤 줄여서 가장자리를 부드럽게 한다


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def build_palette():
    colors = [BG]
    for target in (MINT, VIOLET, WHITE):
        colors += [lerp(BG, target, i / 70) for i in range(1, 71)]
    colors += [lerp(MINT, VIOLET, i / 44) for i in range(1, 45)]
    flat = [c for rgb in colors[:256] for c in rgb]
    flat += [0] * (768 - len(flat))
    pal = Image.new("P", (1, 1))
    pal.putpalette(flat)
    return pal


PALETTE = build_palette()


def canvas(w, h):
    return Image.new("RGB", (w * SS, h * SS), BG)


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
    small = []
    for f in frames:
        f = f.resize((f.width // SS, f.height // SS), Image.LANCZOS)
        small.append(f.quantize(palette=PALETTE, dither=Image.Dither.NONE))
    path = OUT / name
    small[0].save(path, save_all=True, append_images=small[1:], loop=0, duration=duration,
                  disposal=1, optimize=False)
    print(name, f"{path.stat().st_size / 1024:.0f}KB", len(small), "frames")


def orbit(name="orbit.gif", size=720, n=48):
    """자료 조각들이 가운데 노트북 주위를 도는 표지 그림."""
    rings = [(0.22, 3, MINT, 1), (0.33, 4, VIOLET, -1), (0.44, 5, MINT, 1)]
    frames = []
    for i in range(n):
        t = i / n
        img = canvas(size, size)
        d = ImageDraw.Draw(img)
        cx = cy = size * SS / 2
        for radius, count, color, direction in rings:
            r = radius * size * SS
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=lerp(BG, color, 0.28), width=2 * SS // 2)
        pulse = 0.5 + 0.5 * math.sin(t * 2 * math.pi)
        core = (0.095 + 0.012 * pulse) * size * SS
        glow_dot(img, cx, cy, core, lerp(MINT, VIOLET, pulse), glow=1.5)
        d = ImageDraw.Draw(img)
        bw, bh = core * 0.82, core * 0.62
        for k in (-1, 1):
            d.rounded_rectangle([cx + (k - 1) / 2 * bw - 1, cy - bh, cx + (k + 1) / 2 * bw + 1, cy + bh],
                                radius=4 * SS, outline=BG, width=3 * SS)
        for radius, count, color, direction in rings:
            r = radius * size * SS
            for k in range(count):
                # 고리마다 한 바퀴를 온전히 돌아 끝 프레임이 첫 프레임과 이어진다
                a = direction * t * 2 * math.pi + k / count * 2 * math.pi
                glow_dot(img, cx + r * math.cos(a), cy + r * math.sin(a), 6 * SS, color, glow=2.4)
        frames.append(img)
    save(frames, name, 70)


def route(name="route.gif", w=1200, h=150, n=50):
    """집에서 회사로 가는 길 위를 지나가는 점."""
    frames = []
    for i in range(n):
        t = i / n
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        y = h * SS / 2
        x0, x1 = 30 * SS, (w - 30) * SS
        head = x0 + (x1 - x0) * t
        d.line([x0, y, x1, y], fill=lerp(BG, WHITE, 0.16), width=3 * SS)
        d.line([x0, y, head, y], fill=lerp(MINT, VIOLET, t), width=4 * SS)
        for k in range(1, 8):
            sx = x0 + (x1 - x0) * k / 8
            d.ellipse([sx - 5 * SS, y - 5 * SS, sx + 5 * SS, y + 5 * SS],
                      fill=lerp(BG, MINT, 0.9) if sx < head else lerp(BG, WHITE, 0.28))
        glow_dot(img, head, y, 10 * SS, MINT, glow=2.6)
        frames.append(img)
    save(frames, name, 70)


def wave(name="wave.gif", w=1200, h=280, n=40, bars=64):
    """녹음할 때 보이는 소리 파형. 사인파를 겹쳐 끝과 처음이 이어지게 만든다."""
    rng = random.Random(7)
    phases = [(rng.random() * 2 * math.pi, rng.random() * 2 * math.pi) for _ in range(bars)]
    frames = []
    for i in range(n):
        t = i / n * 2 * math.pi
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        gap = w * SS / bars
        for b in range(bars):
            envelope = 0.3 + 0.7 * math.sin(math.pi * (b + 0.5) / bars) ** 0.8
            level = (0.5 + 0.28 * math.sin(t + phases[b][0]) + 0.22 * math.sin(2 * t + phases[b][1]))
            height = max(10 * SS, level * envelope * h * SS * 0.9)
            x = (b + 0.5) * gap
            color = lerp(VIOLET, MINT, b / (bars - 1))
            d.rounded_rectangle([x - gap * 0.28, h * SS / 2 - height / 2, x + gap * 0.28, h * SS / 2 + height / 2],
                                radius=int(gap * 0.28), fill=color)
        frames.append(img)
    save(frames, name, 60)


def ripple(name="ripple.gif", size=560, n=45, rings=3):
    """말을 걸면 퍼져 나가는 음성 물결과 가운데 마이크."""
    frames = []
    for i in range(n):
        t = i / n
        img = canvas(size, size)
        d = ImageDraw.Draw(img)
        c = size * SS / 2
        for k in range(rings):
            p = (t + k / rings) % 1
            r = (0.17 + 0.31 * p) * size * SS
            d.ellipse([c - r, c - r, c + r, c + r], outline=lerp(BG, lerp(MINT, VIOLET, p), (1 - p) ** 1.4),
                      width=3 * SS)
        r0 = 0.15 * size * SS
        d.ellipse([c - r0, c - r0, c + r0, c + r0], fill=MINT)
        u = size * SS / 100
        d.rounded_rectangle([c - 3.5 * u, c - 9 * u, c + 3.5 * u, c + 3 * u], radius=int(3.5 * u), fill=BG)
        d.arc([c - 6.5 * u, c - 6 * u, c + 6.5 * u, c + 7 * u], 0, 180, fill=BG, width=int(1.5 * u))
        d.line([c, c + 7 * u, c, c + 10.5 * u], fill=BG, width=int(1.5 * u))
        d.line([c - 4 * u, c + 10.5 * u, c + 4 * u, c + 10.5 * u], fill=BG, width=int(1.5 * u))
        frames.append(img)
    save(frames, name, 60)


def flow(name="flow.gif", w=1200, h=60, n=30, dots=5):
    """왼쪽에서 오른쪽으로 흐르는 자료 입자."""
    frames = []
    for i in range(n):
        t = i / n
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        y = h * SS / 2
        d.line([0, y, w * SS, y], fill=lerp(BG, WHITE, 0.16), width=2 * SS)
        for k in range(dots):
            p = (t + k / dots) % 1
            edge = min(1.0, min(p, 1 - p) * 8)
            glow_dot(img, p * w * SS, y, 6 * SS, lerp(BG, lerp(MINT, VIOLET, p), edge), glow=2.2)
        frames.append(img)
    save(frames, name, 60)


def refill(name="refill.gif", size=520, n=60):
    """사용량이 줄었다가 다시 차는 고리. 5시간 충전 비유."""
    frames = []
    for i in range(n):
        t = i / n
        level = 1 - t / 0.72 if t < 0.72 else (t - 0.72) / 0.28
        level = max(0.0, min(1.0, level))
        img = canvas(size, size)
        d = ImageDraw.Draw(img)
        c = size * SS / 2
        r = 0.42 * size * SS
        box = [c - r, c - r, c + r, c + r]
        d.ellipse(box, outline=lerp(BG, WHITE, 0.14), width=26 * SS // 2 * 2)
        color = lerp(VIOLET, MINT, level)
        if level > 0:
            d.arc(box, -90, -90 + 360 * level, fill=color, width=26 * SS // 2 * 2)
        frames.append(img)
    save(frames, name, 70)


def hub(name="hub.gif", size=720, n=45, spokes=8):
    """가운데 에이전트와 바깥 도구들을 잇는 선 위로 신호가 오간다."""
    frames = []
    for i in range(n):
        t = i / n
        img = canvas(size, size)
        d = ImageDraw.Draw(img)
        c = size * SS / 2
        r = 0.4 * size * SS
        nodes = [(c + r * math.cos(k / spokes * 2 * math.pi - math.pi / 2), c + r * math.sin(k / spokes * 2 * math.pi - math.pi / 2)) for k in range(spokes)]
        for x, y in nodes:
            d.line([c, c, x, y], fill=lerp(BG, WHITE, 0.14), width=2 * SS)
        d.ellipse([c - r, c - r, c + r, c + r], outline=lerp(BG, MINT, 0.18), width=2 * SS)
        for k, (x, y) in enumerate(nodes):
            p = (t * 2 + k / spokes) % 1
            q = p if k % 2 == 0 else 1 - p
            glow_dot(img, c + (x - c) * q, c + (y - c) * q, 5 * SS, MINT if k % 2 == 0 else VIOLET, glow=2.2)
        d = ImageDraw.Draw(img)
        for k, (x, y) in enumerate(nodes):
            active = 0.5 + 0.5 * math.sin(t * 2 * math.pi * 2 + k)
            s_ = 26 * SS
            color = lerp(lerp(BG, WHITE, 0.2), MINT if k % 2 == 0 else VIOLET, active)
            d.rounded_rectangle([x - s_, y - s_, x + s_, y + s_], radius=12 * SS, fill=BG, outline=color, width=3 * SS)
            d.rounded_rectangle([x - s_ * 0.45, y - s_ * 0.45, x + s_ * 0.45, y + s_ * 0.45], radius=5 * SS, fill=color)
        pulse = 0.5 + 0.5 * math.sin(t * 2 * math.pi)
        core = (0.1 + 0.012 * pulse) * size * SS
        glow_dot(img, c, c, core, lerp(MINT, VIOLET, pulse * 0.35), glow=1.5)
        d = ImageDraw.Draw(img)
        w = core * 0.62
        d.polygon([(c, c - w), (c + w * 0.86, c + w * 0.72), (c, c + w * 0.28), (c - w * 0.86, c + w * 0.72)], fill=BG)
        frames.append(img)
    save(frames, name, 70)


def bars(name="bars.gif", w=1000, h=380, n=60, rows=3):
    """여러 에이전트가 동시에 일하는 진행 막대."""
    frames = []
    speeds = [(0.0, 1.0), (0.12, 0.8), (0.28, 0.62)]
    for i in range(n):
        t = i / n
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        for r in range(rows):
            y = (r + 0.5) * h * SS / rows
            x0, x1 = 20 * SS, (w - 20) * SS
            bh = 16 * SS
            d.rounded_rectangle([x0, y - bh, x1, y + bh], radius=bh, fill=lerp(BG, WHITE, 0.09))
            start, span = speeds[r]
            level = max(0.0, min(1.0, (t - start) / (span * 0.8))) if t < 0.92 else 1.0 - (t - 0.92) / 0.08
            level = max(0.03, level)
            color = lerp(MINT, VIOLET, r / max(1, rows - 1))
            head = x0 + (x1 - x0) * level
            d.rounded_rectangle([x0, y - bh, head, y + bh], radius=bh, fill=color)
            glow_dot(img, head, y, 9 * SS, WHITE, glow=2.0)
            d = ImageDraw.Draw(img)
        frames.append(img)
    save(frames, name, 70)


if __name__ == "__main__":
    hub()
    bars()
    route()
    flow("flow.gif", w=1600, h=80, n=30, dots=6)
    refill()
    ripple()
