# 「집 가는 길」 영상 렌더. 좌측 면의 원화에서 새들이 날아올라 전깃줄을 따라 40m를 건너가 오른쪽 끝 전깃줄에 내려앉는다.
# 그 사이 노을이 천천히 저물고 별이 뜬다. 무음 MP4.
# 사용: python render.py draft   (절반 크기 3328x384, 빠른 확인용)
#       python render.py final   (제출 규격 6656x768, H.264, 무음)
import math, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MODE = sys.argv[1] if len(sys.argv) > 1 else "draft"
K = 1 if MODE == "final" else 2          # 축소 배율
FW, FH_ = 6656, 768                      # 제출 규격
W, H, FPS, DUR = FW // K, FH_ // K, 30, 60
LEFT = 672                               # 좌측 면 폭(원화 자리)
OUT = f"집가는길_{MODE}.mp4"
rng = np.random.default_rng(11)


def smooth(t, a, b):
    x = min(max((t - a) / (b - a), 0), 1)
    return x * x * (3 - 2 * x)


# ---------- 배경 ----------
bg = Image.open("배경띠_v4_6656x768.png").convert("RGB")   # 맨 왼쪽은 손대지 않은 원화, 거기서부터 이어 그린 한 폭

# 원화 속 새(왼쪽 위 작은 점들)의 자리를 찾고, 새가 날아오른 뒤의 빈 하늘도 만들어 둔다
a = np.asarray(bg, np.float32)
zone = a[:150, :330].mean(axis=2)
soft = np.asarray(bg.crop((0, 0, 330, 150)).filter(ImageFilter.MedianFilter(21)), np.float32)
dark = zone < soft.mean(axis=2) - 38
ys, xs = np.nonzero(dark)
ORIG_BIRDS = []
if len(xs):
    order = np.argsort(xs); xs, ys = xs[order], ys[order]
    start = 0
    for i in range(1, len(xs) + 1):
        if i == len(xs) or xs[i] - xs[i - 1] > 6:
            ORIG_BIRDS.append((float(xs[start:i].mean()), float(ys[start:i].mean()), float(xs[i - 1] - xs[start] + 6)))
            start = i
ORIG_BIRDS = ORIG_BIRDS[:5] or [(60, 20, 14), (110, 14, 14), (135, 10, 12), (190, 6, 12)]
empty = bg.copy()
patch = Image.fromarray(np.where(np.asarray(Image.fromarray(dark).filter(ImageFilter.MaxFilter(7)))[..., None], soft, a[:150, :330]).astype(np.uint8))
empty.paste(patch, (0, 0))

day_with = np.asarray(bg.resize((W, H), Image.LANCZOS), np.float32)      # 새가 그려진 원화
day = np.asarray(empty.resize((W, H), Image.LANCZOS), np.float32)        # 새가 떠난 뒤
lum = day.mean(axis=2)
sil = np.clip((70 - lum) / 30, 0, 1)[..., None]                          # 검은 실루엣(나무·전봇대·전깃줄)

# 해 진 뒤 하늘: 붓 자국의 밝고 어두움은 남기고 색만 남보라로. 지평선 쪽 잔불빛은 남긴다
yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
tex = np.clip(lum / 255, 0, 1)[..., None]
dusk = np.array([14, 16, 44], np.float32) + tex * np.array([70, 62, 120], np.float32)
dusk += day * np.array([0.42, 0.13, 0.03], np.float32) * np.clip((yy - 0.5) / 0.35, 0, 1)
dusk = dusk * (1 - sil) + day * 0.5 * sil
skymask = (lum > 70)

# 별: 하늘 위쪽에만. 잔별은 가만히 있고, 듬성듬성 놓인 큰 별만 제각각 느리게 반짝인다(급한 점멸은 금지 조항)
def scatter(n, power):
    x = rng.integers(0, W, n); y = (rng.random(n) ** power * H * 0.52).astype(int)
    k = skymask[y, x]
    return x[k], y[k]


fx, fy = scatter(170, 1.5)                               # 잔별
fb = rng.uniform(0.25, 0.6, len(fx))
tx, ty = scatter(46, 1.2)                                # 반짝이는 큰 별
tper = rng.uniform(3.5, 7.0, len(tx)); tph = rng.uniform(0, 6.28, len(tx)); tsz = rng.uniform(1.8, 3.4, len(tx)) * 2 / K
SR = int(9 * 2 / K)
gyy, gxx = np.mgrid[-SR:SR + 1, -SR:SR + 1].astype(np.float32)
STAR = [np.exp(-(gxx ** 2 + gyy ** 2) / (2 * (z / 2.4) ** 2))[..., None] * np.array([255, 246, 225], np.float32)
        + (np.exp(-(gxx ** 2) / 0.5 - gyy ** 2 / (2 * z ** 2)) + np.exp(-(gyy ** 2) / 0.5 - gxx ** 2 / (2 * z ** 2)))[..., None] * 45
        for z in tsz]                                    # 가운데 빛 + 가는 십자 빛줄기

# ---------- 새 ----------
full_lum = np.asarray(bg.convert("L"), np.float32)


def wire_y(x):
    """오른쪽 면에서 x 위치의 맨 위 전깃줄 높이를 찾는다(가는 검은 줄)."""
    col = full_lum[:, int(x)] < 75
    for y in range(120, 620):
        if col[y]:
            run = 0
            while y + run < 768 and col[y + run]:
                run += 1
            if run <= 9:
                return y
            return None
    return None


PERCH = []
for x in range(6320, 6650, 10):   # 우측 면 끝, 나무 위로 지나가는 전깃줄
    y = wire_y(x)
    if y:
        PERCH.append((x, y))
# 전깃줄이 아닌 것(하늘에 그려진 작은 새 등)에 앉지 않도록, 이웃 점들과 높이가 이어지는 점만 남긴다
PERCH = [(x, y) for (x, y) in PERCH
         if abs(y - np.median([q for (p, q) in PERCH if abs(p - x) <= 45])) < 14 and sum(abs(p - x) <= 45 for (p, q) in PERCH) >= 4]
NB = 11                                   # 원화의 새 + 가는 길에 합류하는 새
perch_pick = [PERCH[i] for i in np.linspace(0, len(PERCH) - 1, NB).astype(int)] if len(PERCH) >= NB else [(5900 + i * 70, 300) for i in range(NB)]
rng.shuffle(perch_pick)

T_UP, T_LAND = 4.0, 47.0                  # 날아오르는 시각, 내려앉기 시작하는 시각
BIRDS = []
for i in range(NB):
    if i < len(ORIG_BIRDS):
        x0, y0, w0 = ORIG_BIRDS[i]; t0 = T_UP + i * 0.5; s0 = w0
    else:                                 # 정면 나무 사이에서 날아올라 합류
        x0 = rng.uniform(900, 3600); y0 = rng.uniform(430, 520); s0 = 10; t0 = None
    BIRDS.append(dict(x0=x0, y0=y0, s0=s0, t0=t0, off=rng.uniform(-1100, 120), alt=rng.uniform(150, 330), ph=rng.uniform(0, 6.28),
                      size=rng.uniform(78, 120), bob=rng.uniform(18, 42), per=perch_pick[i], land=T_LAND + rng.uniform(0, 5)))
V = (5750 - 150) / (T_LAND - T_UP)        # 무리의 속도(px/초) ≈ 초속 0.8m, 사람이 걷는 속도
for b in BIRDS:
    if b["t0"] is None:
        b["t0"] = T_UP + max(0.5, (b["x0"] - 150 - b["off"]) / V - 1.5)


def bird_sprite(span, flap, perched=False):
    s = 4; n = int(max(span, 8) * s * 1.3); n += n % 2
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); c = n / 2; u = span * s / 2
    if perched:
        d.ellipse([c - u * 0.32, c - u * 0.55, c + u * 0.32, c + u * 0.3], fill=255)      # 몸
        d.ellipse([c + u * 0.05, c - u * 0.85, c + u * 0.5, c - u * 0.4], fill=255)       # 머리
        d.polygon([(c - u * 0.25, c + u * 0.1), (c - u * 0.75, c + u * 0.55), (c - u * 0.05, c + u * 0.3)], fill=255)  # 꼬리
    else:
        # 멀리서 본 새: 원화의 새처럼 양 날개를 펼친 붓 자국 모양. 날갯짓에 따라 ∨ ↔ ∧ 로 바뀐다
        fl = math.sin(flap)
        d.ellipse([c - u * 0.16, c - u * 0.09, c + u * 0.2, c + u * 0.11], fill=255)       # 몸
        for sgn in (-1, 1):
            mid = (c + sgn * u * 0.45, c - u * 0.12 - fl * u * 0.22)
            tip = (c + sgn * u * 0.95, c + u * 0.05 - fl * u * 0.5)
            d.polygon([(c, c - u * 0.08), mid, tip, (mid[0], mid[1] + u * 0.17), (c, c + u * 0.1)], fill=255)
    out = max(2, int(n / s / K))
    return np.asarray(im.resize((out, out), Image.LANCZOS), np.float32)[..., None] / 255


def paste(fr, spr, cx, cy, alpha=1.0):
    n = spr.shape[0]; x0 = int(cx / K - n / 2); y0 = int(cy / K - n / 2)
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + n, W), min(y0 + n, H)
    if xa >= xb or ya >= yb:
        return
    m = spr[ya - y0:yb - y0, xa - x0:xb - x0] * alpha
    fr[ya:yb, xa:xb] = fr[ya:yb, xa:xb] * (1 - m) + np.array([14, 9, 16], np.float32) * m


ff = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
     "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15" if MODE == "final" else "20", "-preset", "medium",
     "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)

for f in range(FPS * DUR):
    t = f / FPS
    lift = smooth(t, T_UP - 0.4, T_UP + 0.4)             # 원화 속 새가 그림에서 떨어져 나오는 순간
    base = day_with * (1 - lift) + day * lift
    n = smooth(t, 14, 46) * 0.86                          # 노을 → 땅거미 (32초에 걸쳐 천천히)
    fr = base * (1 - n) + dusk * n
    st = smooth(t, 34, 52)
    if st > 0:
        fr[fy, fx] = np.minimum(255, fr[fy, fx] + (st * fb * 200)[:, None])
        for i in range(len(tx)):
            tw = 0.62 + 0.38 * (0.5 + 0.5 * math.sin(t * 6.283 / tper[i] + tph[i]))          # 약하게, 느린 숨쉬기처럼 살짝 밝아졌다 어두워진다
            ya, yb, xa, xb = ty[i] - SR, ty[i] + SR + 1, tx[i] - SR, tx[i] + SR + 1
            if ya < 0 or xa < 0 or yb > H or xb > W:
                continue
            fr[ya:yb, xa:xb] = np.minimum(255, fr[ya:yb, xa:xb] + STAR[i] * (st * tw))
    for b in BIRDS:
        if t < b["t0"]:
            continue
        tt = t - b["t0"]
        gx = 150 + b["off"] + V * (t - T_UP)                                   # 무리 안 제 자리
        k = smooth(tt, 0, 5)                                                   # 날아올라 무리에 섞이기
        x = b["x0"] + (max(gx, b["x0"] + tt * V * 0.6) - b["x0"]) * k if b["x0"] < 700 else b["x0"] + (gx - b["x0"]) * k
        y = b["y0"] + (b["alt"] + math.sin(t * 0.9 + b["ph"]) * b["bob"] - b["y0"]) * k
        span = b["s0"] + (b["size"] - b["s0"]) * smooth(tt, 0, 7)
        ld = smooth(t, b["land"], b["land"] + 5)                               # 전깃줄로 내려앉기
        px, py = b["per"]
        x = x + (px - x) * ld; y = y + (py - 9 - y) * ld; span = span + (26 - span) * ld
        if ld >= 1:
            paste(fr, bird_sprite(26, 0, perched=True), px, py - 9)
        else:
            paste(fr, bird_sprite(span, t * (7.5 + 2 * ld) + b["ph"]), x, y)
    ff.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes())

ff.stdin.close(); ff.wait()
print("done", MODE, "orig birds:", len(ORIG_BIRDS), "perch pts:", len(PERCH))
