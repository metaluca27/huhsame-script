"""bevel.py: round the rim of every raised shape, so it curves back like a cheek instead of ending in a cliff.

usage: python tools/bevel.py <depth_raw_rg.png> <backdepth_rg.png> <out_depth_rg.png> [radius_px=64] [preview.jpg]
Near its outline a shape eases down to the depth of what lies behind it. Seen from the side the paint
itself wraps around the curve, and no stretched wall is needed.
"""
import sys, numpy as np, cv2
def rd(p):
    e = cv2.imread(p); return (e[..., 2].astype(np.float32) * 256 + e[..., 1]) / 65535
def wr(p, d):
    v = np.round(np.clip(d, 0, 1) * 65535).astype(np.uint16)
    cv2.imwrite(p, np.dstack([np.zeros_like(v, np.uint8), (v & 255).astype(np.uint8), (v >> 8).astype(np.uint8)]))
d, back = rd(sys.argv[1]), rd(sys.argv[2])
R = float(sys.argv[4]) if len(sys.argv) > 4 else 64
gap = d - back
fg = (gap > 0.06).astype(np.uint8)
dist = cv2.distanceTransform(fg, cv2.DIST_L2, 5)
t = np.clip(dist / R, 0, 1)
prof = np.sin(np.pi / 2 * t) ** 0.85                     # steep at the very rim, flat on top: a rounded shoulder
out = np.where(fg > 0, back + gap * prof, d)
out = cv2.GaussianBlur(out, (0, 0), 1.6)
wr(sys.argv[3], out)
gx = np.abs(np.diff(out, axis=1)).max()
print("rim rounded over %d px; steepest step left: %.3f of the depth range per pixel" % (R, gx))
if len(sys.argv) > 5:
    cv2.imwrite(sys.argv[5], np.hstack([cv2.applyColorMap((d * 255).astype(np.uint8), cv2.COLORMAP_INFERNO), cv2.applyColorMap((out * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)]))
