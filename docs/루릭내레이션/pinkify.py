"""루릭(회색으로 그려진 스핑크스)만 핑크로 칠한다. 크레딧 없이 후처리.

규칙: 지정한 영역(그림 가로세로 0~10 격자 비율) 안에서 채도가 낮고 너무 밝지도 어둡지도 않은
픽셀(=회색 몸통)만 핑크 색조로 바꾼다. 검은 외곽선·흰 배경·채도 있는 색은 그대로.

사용법: python ../pinkify.py  (에피소드 폴더 안에서, images/NN.png → 덮어쓰기, 원본은 NN_gray.png 보관)
"""
import colorsys, shutil, sys
from pathlib import Path
from PIL import Image
import numpy as np

# num: ([포함 사각형들], [제외 사각형들])  — 각 사각형은 (x0,y0,x1,y1) 격자 0~10
REGIONS = {
    "01": ([(5.7, 6.0, 9.6, 9.9)], []),
    "02": ([(0.4, 5.8, 4.3, 9.3)], []),
    "03": ([(5.8, 2.0, 9.3, 5.3), (5.2, 6.2, 9.6, 9.7)], []),
    "06": ([(0.0, 3.3, 8.6, 9.95)], [(4.9, 3.3, 7.6, 5.7)]),  # 집사 바지 제외
    "12": ([(1.0, 4.6, 5.0, 8.7)], []),
    "17": ([(1.9, 3.0, 4.6, 8.0), (4.6, 4.3, 6.0, 8.0)], [(1.9, 4.4, 2.6, 5.4), (1.0, 6.95, 6.5, 8.0)]),  # 집사 다리·상자 안쪽 제외
    "23": ([(2.5, 6.7, 5.4, 9.9)], []),
    "24": ([(0.0, 0.0, 10.0, 10.0)], []),
    "28": ([(0.2, 4.6, 5.3, 9.95)], [(4.2, 4.6, 5.3, 5.9)]),
}
HUE, SAT, LIGHT_GAIN = 345 / 360, 0.42, 1.12


def pinkify(num, incl, excl):
    src = Path(f"images/{num}.png")
    keep = Path(f"images/{num}_gray.png")
    if not keep.exists():
        shutil.copy(src, keep)
    im = Image.open(keep).convert("RGB")
    a = np.asarray(im).astype(np.float32) / 255.0
    H, W = a.shape[:2]
    mask = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in incl:
        mask[int(y0 / 10 * H):int(y1 / 10 * H), int(x0 / 10 * W):int(x1 / 10 * W)] = True
    for x0, y0, x1, y1 in excl:
        mask[int(y0 / 10 * H):int(y1 / 10 * H), int(x0 / 10 * W):int(x1 / 10 * W)] = False
    mx, mn = a.max(2), a.min(2)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d < 1e-6, 0, d / (1 - np.abs(2 * l - 1) + 1e-6))
    target = mask & (s < 0.35) & (l > 0.22) & (l < 0.86)
    out = a.copy()
    ys, xs = np.nonzero(target)
    for y, x in zip(ys, xs):
        nl = min(0.92, l[y, x] * LIGHT_GAIN)
        out[y, x] = colorsys.hls_to_rgb(HUE, nl, SAT)
    Image.fromarray((out * 255).astype(np.uint8)).save(src)
    return int(target.sum())


if __name__ == "__main__":
    only = set(sys.argv[1:]) or set(REGIONS)
    for n, (incl, excl) in REGIONS.items():
        if n in only:
            print(n, pinkify(n, incl, excl), "px")
