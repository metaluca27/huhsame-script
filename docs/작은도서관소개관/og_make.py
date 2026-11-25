# 작은도서관 마실 미리보기 그림(og.jpg, 1200x630) 만들기
#   python og_make.py       → landing/smalllib/og.jpg (울산)
#   python og_make.py demo  → landing/smalllib-demo/og.jpg (체험판)
# 사이트 첫 화면 그래프와 같은 모양: 협회 ─ 구군 ─ 도서관 점들, 어두운 바탕.
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
DEMO = len(sys.argv) > 1 and sys.argv[1] == "demo"
SITE = ROOT / ("landing/smalllib-demo" if DEMO else "landing/smalllib")
libs = json.loads((SITE / "libraries.json").read_text(encoding="utf-8"))["libraries"]
libs = [l for l in libs if not l.get("hidden")]
S = 2  # 2배로 그리고 줄여서 매끈하게
W, H = 1200 * S, 630 * S
GU = ({"해솔구": "#5fb3a1", "달빛구": "#8c8fe6", "별내구": "#e8a33d", "산들군": "#7fbf5a"} if DEMO
      else {"중구": "#e8a33d", "남구": "#5fb3a1", "동구": "#e0705a", "북구": "#8c8fe6", "울주군": "#7fbf5a"})

# ── 점 배치 (간단한 힘 시뮬레이션) ──
random.seed(7)
nodes, links = {}, []
def add(k, r, c, kind):
    nodes[k] = dict(x=random.uniform(-150, 150), y=random.uniform(-150, 150), vx=0, vy=0, r=r, c=c, kind=kind)
add("root", 12, "#d9d4c7", "root")
for g, c in GU.items():
    add("gu:" + g, 8.5, c, "gu"); links.append(("root", "gu:" + g, 115))
for g in dict.fromkeys(l["group"] for l in libs if l.get("group")):
    gu = next(l["gu"] for l in libs if l.get("group") == g)
    add("grp:" + g, 6.5, GU[gu], "grp"); links.append(("gu:" + gu, "grp:" + g, 60))
for l in libs:
    add(l["id"], 4.6, GU[l["gu"]], "lib")
    links.append(("grp:" + l["group"], l["id"], 52) if l.get("group") else ("gu:" + l["gu"], l["id"], 68))
K = list(nodes)
for it in range(900):
    for i, a in enumerate(K):
        A = nodes[a]
        for b in K[i + 1:]:
            B = nodes[b]; dx, dy = A["x"] - B["x"], A["y"] - B["y"]; d2 = dx * dx + dy * dy + .01
            if d2 > 90000: continue
            f = 900 / d2; d = math.sqrt(d2); dx /= d; dy /= d
            A["vx"] += dx * f; A["vy"] += dy * f; B["vx"] -= dx * f; B["vy"] -= dy * f
    for a, b, ln in links:
        A, B = nodes[a], nodes[b]; dx, dy = B["x"] - A["x"], B["y"] - A["y"]; d = math.hypot(dx, dy) or 1
        f = (d - ln) * .012; A["vx"] += dx / d * f; A["vy"] += dy / d * f; B["vx"] -= dx / d * f; B["vy"] -= dy / d * f
    for n in nodes.values():
        n["vx"] -= n["x"] * .002; n["vy"] -= n["y"] * .002
        n["vx"] *= .82; n["vy"] *= .82; n["x"] += max(-6, min(6, n["vx"])); n["y"] += max(-6, min(6, n["vy"]))

# 그래프를 오른쪽 영역에 맞추기
xs = [n["x"] for n in nodes.values()]; ys = [n["y"] for n in nodes.values()]
cx0, cy0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
span = max(max(xs) - min(xs), max(ys) - min(ys))
k = (560 * S) / span
OX, OY = 860 * S, 315 * S
P = lambda n: (OX + (n["x"] - cx0) * k, OY + (n["y"] - cy0) * k)

img = Image.new("RGB", (W, H), "#1e1f1c")
# 은은한 빛
glow = Image.new("RGB", (W, H), "#1e1f1c"); gd = ImageDraw.Draw(glow)
gd.ellipse([OX - 330 * S, OY - 300 * S, OX + 330 * S, OY + 300 * S], fill="#2c2b3a")
img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120 * S)), .9)
d = ImageDraw.Draw(img)
for a, b, _ in links:
    d.line([P(nodes[a]), P(nodes[b])], fill="#4a4a46", width=2 * S // 2 + 1)
# 점 + 살짝 빛
halo = Image.new("RGBA", (W, H), (0, 0, 0, 0)); hd = ImageDraw.Draw(halo)
for n in nodes.values():
    x, y = P(n); r = n["r"] * S * 1.25
    hd.ellipse([x - r * 2.4, y - r * 2.4, x + r * 2.4, y + r * 2.4], fill=n["c"] + "40")
img.paste(halo.filter(ImageFilter.GaussianBlur(6 * S)), (0, 0), halo.filter(ImageFilter.GaussianBlur(6 * S)))
d = ImageDraw.Draw(img)
for n in nodes.values():
    x, y = P(n); r = n["r"] * S * 1.25
    d.ellipse([x - r, y - r, x + r, y + r], fill=n["c"])
# 구군 이름
F = lambda sz, bold=True: ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf", sz * S)
for g in GU:
    x, y = P(nodes["gu:" + g])
    d.text((x, y + 14 * S), g, font=F(17), fill="#e8e4da", anchor="mt")

# ── 왼쪽 글 ──
L = 72 * S
# 왼쪽은 글이 잘 읽히게 어둡게 깔기
shade = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shade)
for i in range(0, 640 * S, 4):
    a = int(235 * max(0, 1 - max(0, i - 420 * S) / (220 * S)))
    sd.rectangle([i, 0, i + 4, H], fill=(30, 31, 28, a))
img.paste(shade, (0, 0), shade); d = ImageDraw.Draw(img)
d.text((L, 150 * S), ("우리 협회 도서관을 한눈에 · 체험판" if DEMO else "울산작은도서관협회 회원 도서관 %d곳" % len(libs)), font=F(24), fill="#c9b2ff")
d.text((L, 196 * S), ("우리 동네" if DEMO else "울산") + " 작은도서관", font=F(70), fill="#f4f1e8")
d.text((L, 286 * S), "마실", font=F(70), fill="#f4f1e8")
d.text((L, 404 * S), "우리 동네 작은도서관은", font=F(28, False), fill="#bdb8ab")
d.text((L, 446 * S), "요즘 뭐 하고 있을까?", font=F(28, False), fill="#bdb8ab")
# 범례
x = L; y = 528 * S
for g, c in GU.items():
    d.ellipse([x, y + 6 * S, x + 13 * S, y + 19 * S], fill=c)
    d.text((x + 20 * S, y), g, font=F(19, False), fill="#a9a497"); x += (20 + 19 * len(g) + 26) * S

out = SITE / "og.jpg"
img.resize((1200, 630), Image.LANCZOS).save(out, quality=88)
print(out, out.stat().st_size // 1024, "KB")
