# 이어 그린 조각들을 한 줄로 붙인다. 겹치는 구간에서 두 조각이 가장 비슷한 길(구불구불한 세로선)을 찾아
# 그 길을 따라 자르고 살짝 섞어서, 반듯한 세로 이음새가 보이지 않게 한다.
# 사용: python stitch2.py pano ABCDE
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, uniform_filter1d

W, H, OVER = 6336, 2688, 1900
S = 4          # 길 찾기는 1/4 크기에서
FEATHER = 60   # 길 양옆으로 섞는 폭(px)


def load(pre, n):
    return np.asarray(Image.open(f"{pre}_{n}.png").convert("RGB").resize((W, H), Image.LANCZOS), dtype=np.float32)


def seam_mask(a, b):
    """겹치는 구간 a(앞 조각), b(새 조각)에서 차이가 가장 작은 세로 길을 찾아 0(앞)→1(새) 마스크를 돌려준다."""
    d = np.abs(a[::S, ::S] - b[::S, ::S]).sum(axis=2)
    d = gaussian_filter(d, 2)
    h, w = d.shape
    d[:, : w // 10] += 1e4  # 가장자리에 붙지 않게
    d[:, -w // 10:] += 1e4
    cost = d.copy()
    R = 3  # 한 줄에 좌우로 움직일 수 있는 칸
    back = np.zeros((h, w), dtype=np.int16)
    for y in range(1, h):
        prev = cost[y - 1]
        cands = np.stack([np.roll(prev, k) for k in range(-R, R + 1)])
        for i, k in enumerate(range(-R, R + 1)):  # 말려 넘어온 칸은 못 쓰게
            if k > 0:
                cands[i, :k] = np.inf
            elif k < 0:
                cands[i, k:] = np.inf
        idx = cands.argmin(axis=0)
        back[y] = idx - R
        cost[y] += cands[idx, np.arange(w)]
    path = np.zeros(h, dtype=np.int32)
    path[-1] = cost[-1].argmin()
    for y in range(h - 1, 0, -1):
        path[y - 1] = path[y] - back[y, path[y]]
    path = uniform_filter1d(np.repeat(path, S)[: a.shape[0]].astype(np.float32) * S, size=41, mode="nearest")
    xs = np.arange(a.shape[1], dtype=np.float32)[None, :]
    return np.clip((xs - path[:, None]) / FEATHER + 0.5, 0, 1)[:, :, None]


def stitch(pre, names):
    strip = load(pre, names[0])
    for n in names[1:]:
        new = load(pre, n)
        a, b = strip[:, -OVER:], new[:, :OVER]
        # 전체 색감(밝은 하늘 부분 기준)을 앞 조각에 맞춘다
        sky = (a.mean(axis=2) > 90) & (b.mean(axis=2) > 90)
        shift = (a[sky].mean(axis=0) - b[sky].mean(axis=0)) if sky.any() else 0
        lum = np.clip(new.mean(axis=2, keepdims=True) / 90, 0, 1)
        new = np.clip(new + shift * lum, 0, 255)
        m = seam_mask(a, new[:, :OVER])
        strip[:, -OVER:] = a * (1 - m) + new[:, :OVER] * m
        strip = np.concatenate([strip, new[:, OVER:]], axis=1)
    full = Image.fromarray(strip.astype(np.uint8))
    need = round(6656 * H / 768)
    full = full.crop((0, 0, min(need, full.width), H))
    small = full.resize((round(full.width * 768 / H), 768), Image.LANCZOS)
    small.save(f"{pre}_띠v2_6656x768.png")
    half = small.width // 2
    chk = Image.new("RGB", (half, 768 * 2 + 10), "white")
    chk.paste(small.crop((0, 0, half, 768)), (0, 0))
    chk.paste(small.crop((half, 0, half * 2, 768)), (0, 778))
    chk.resize((1664, 773)).save(f"{pre}_check_v2.jpg", quality=88)
    print("ok", small.size)


if __name__ == "__main__":
    stitch(sys.argv[1], sys.argv[2])
