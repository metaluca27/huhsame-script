"""걷는 고양이 그림에서 다리 4개를 따로 떼어, 엇갈리게 흔든 걸음 프레임을 만든다.
usage: python legs.py <in.webp> <out_prefix> [preview.jpg]
"""
import sys, math
import numpy as np
from PIL import Image

src, out_prefix = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
im0 = Image.open(src).convert('RGBA')
# 다리가 흔들리며 그림 밖으로 나가지 않게 양옆 40px·아래 14px 여백
PAD_X, PAD_B = 40, 14
im = Image.new('RGBA', (im0.width + 2 * PAD_X, im0.height + PAD_B), (0, 0, 0, 0))
im.paste(im0, (PAD_X, 0))
w, h = im.size
A = np.array(im)
alpha = A[..., 3] > 40


def runs(row):
    d = np.diff(np.concatenate([[0], row.astype(int), [0]]))
    s = np.where(d == 1)[0]
    e = np.where(d == -1)[0]
    return [(a, b) for a, b in zip(s, e) if b - a >= 3]


# 1) 아래에서부터 다리 4개가 따로 보이는 줄을 찾고, 위로 올라가며 다리 중심을 따라간다
foot_y = None
for y in range(h - PAD_B - 8, h // 2, -1):
    if len(runs(alpha[y])) == 4:
        foot_y = y
        break
if foot_y is None:
    sys.exit('legs not found')
centers = {foot_y: [(a + b) / 2 for a, b in runs(alpha[foot_y])]}
y = foot_y
split_y = None
while y > h // 2:
    y -= 1
    r = runs(alpha[y])
    prev = centers[y + 1]
    if len(r) == 4:
        centers[y] = [(a + b) / 2 for a, b in r]
    else:
        if split_y is None:
            split_y = y
        # 합쳐지면 바로 아래 기울기대로 이어 그린다
        slope = [(prev[i] - centers.get(y + 6, prev)[i]) / 5 for i in range(4)]
        centers[y] = [prev[i] + slope[i] for i in range(4)]
    if split_y is not None and y < split_y - 22:
        break
top_y = y          # 다리 윗부분(몸통 속)
for yy in range(foot_y + 1, h):
    centers[yy] = centers[foot_y]

# 2) 배 아래(split_y 밑)에선 다리 4개가 이미 떨어져 있으니 가장 가까운 다리에 배정만 한다.
#    다리를 조각내 돌리면 어딘가 잘린 자국이 남아서, 대신 다리를 옆으로 휘게(밀어) 움직인다
xs = np.arange(w)
legs = [np.zeros((h, w), bool) for _ in range(4)]
for yy in range(split_y + 1, h):
    owner = np.abs(xs[:, None] - np.array(centers[yy])[None, :]).argmin(1)
    for i in range(4):
        legs[i][yy] = alpha[yy] & (owner == i)
half = []
for i in range(4):
    ws = [b - a for yy in range(split_y + 1, foot_y + 1)
          for a, b in runs(alpha[yy]) if a <= centers[yy][i] <= b]
    half.append((np.median(ws) if ws else 20) / 2 + 3)

# 반투명 가장자리가 검게 번지지 않게 색에 투명도를 곱해 두고 계산한다
P = A.astype(float)
P[..., :3] *= P[..., 3:4] / 255


def sample_row(row, xq):
    return np.stack([np.interp(xq, xs, row[:, c], left=0, right=0) for c in range(4)], 1)


def over(top, under):
    return top + under * (1 - top[:, 3:4] / 255)


# 3) 왼쪽부터 다리 0,1 = 뒷다리, 2,3 = 앞다리. 대각선 다리끼리 같은 박자(0과 3, 1과 2).
#    엉덩이·어깨(top_y)는 그대로 두고 아래로 갈수록 더 밀어서, 몸통 속에서 다리로 끊김 없이 이어진다
phase = [0, math.pi, math.pi, 0]
N = 6
frames = []
for k in range(N):
    t = 2 * math.pi * k / N
    slope = [math.tan(math.radians(14 * math.sin(t + phase[i]))) for i in range(4)]
    out = P.copy()
    for yy in range(top_y, split_y + 1):
        # 몸통 속 다리 윗부분: 다리 중심 가까운 곳만 그 다리만큼, 멀어질수록 0으로 부드럽게
        c = centers[yy]
        wsum = np.full(w, 0.05)
        dsum = np.zeros(w)
        for i in range(4):
            wi = np.exp(-((xs - c[i]) / half[i]) ** 2)
            wsum += wi
            dsum += wi * slope[i]
        dx = (yy - top_y) * dsum / wsum
        out[yy] = sample_row(P[yy], xs - dx)
    for yy in range(split_y + 1, h):
        row = np.zeros((w, 4))
        for i in range(4):
            Li = P[yy] * legs[i][yy][:, None]
            row = over(sample_row(Li, xs - slope[i] * (yy - top_y)), row)
        out[yy] = row
    a = out[..., 3:4]
    rgb = np.where(a > 0, out[..., :3] * 255 / np.maximum(a, 1e-6), 0)
    f = Image.fromarray(np.concatenate([rgb, a], 2).clip(0, 255).astype(np.uint8), 'RGBA')
    frames.append(f)
    f.save(f'{out_prefix}-{k}.webp', quality=82)

if preview:
    sheet = Image.new('RGBA', (w * N, h), (225, 225, 225, 255))
    for k, f in enumerate(frames):
        sheet.alpha_composite(f, (k * w, 0))
    sheet.convert('RGB').save(preview, quality=85)
print('ok', src, 'foot', foot_y, 'split', split_y, 'top', top_y)
