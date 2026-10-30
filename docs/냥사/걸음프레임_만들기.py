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

# 2) 다리 영역 픽셀을 가장 가까운 다리에 배정
legs = [np.zeros((h, w), bool) for _ in range(4)]
xs = np.arange(w)
for yy in range(top_y, h):
    c = np.array(centers[yy])
    d = np.abs(xs[:, None] - c[None, :])
    owner = d.argmin(1)
    for i in range(4):
        legs[i][yy] = alpha[yy] & (owner == i)

body_mask = alpha.copy()
belly_y = split_y + 4          # 배 아래로 조금 겹쳐 남겨 틈이 안 보이게
body_mask[belly_y:] = False


def layer(mask):
    L = A.copy()
    L[..., 3] = np.where(mask, A[..., 3], 0)
    return Image.fromarray(L, 'RGBA')


body = layer(body_mask)
leg_layers = [layer(m) for m in legs]
pivots = [(centers[top_y][i], top_y) for i in range(4)]

# 3) 왼쪽부터 다리 0,1 = 뒷다리, 2,3 = 앞다리. 대각선 다리끼리 같은 박자(0과 3, 1과 2)
phase = [0, math.pi, math.pi, 0]
N = 6
frames = []
for k in range(N):
    t = 2 * math.pi * k / N
    f = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for i in range(4):
        ang = 18 * math.sin(t + phase[i])
        f.alpha_composite(leg_layers[i].rotate(ang, center=pivots[i], resample=Image.BICUBIC))
    f.alpha_composite(body)
    frames.append(f)
    f.save(f'{out_prefix}-{k}.webp', quality=82)

if preview:
    sheet = Image.new('RGBA', (w * N, h), (225, 225, 225, 255))
    for k, f in enumerate(frames):
        sheet.alpha_composite(f, (k * w, 0))
    sheet.convert('RGB').save(preview, quality=85)
print('ok', src, 'foot', foot_y, 'split', split_y, 'top', top_y)
