"""flatten.py: take a sideways tilt out of a depth picture, so a flat backdrop stands flat.

usage: python tools/flatten.py <depth_rg.png>   (rewrites it in place)
Fits a plane to the outer rim of the picture (the backdrop) and removes it.
"""
import sys, numpy as np, cv2
p = sys.argv[1]; enc = cv2.imread(p)
d = (enc[..., 2].astype(np.float32) * 256 + enc[..., 1]) / 65535
h, w = d.shape; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); xx /= w; yy /= h
rim = (xx < 0.07) | (xx > 0.93) | (yy < 0.07) | (yy > 0.93)
rim &= d < np.percentile(d[rim], 80)                     # ignore the figure where it touches the rim
A = np.c_[xx[rim], yy[rim], np.ones(rim.sum())]
coef, *_ = np.linalg.lstsq(A, d[rim], rcond=None)
plane = coef[0] * xx + coef[1] * yy + coef[2]
f = np.clip(d - plane, 0, None); f /= np.percentile(f, 99.7); f = np.clip(f, 0, 1)
v = np.round(f * 65535).astype(np.uint16)
cv2.imwrite(p, np.dstack([np.zeros_like(v, np.uint8), (v & 255).astype(np.uint8), (v >> 8).astype(np.uint8)]))
print("tilt removed: left-right %.2f, top-bottom %.2f" % (coef[0], coef[1]))
