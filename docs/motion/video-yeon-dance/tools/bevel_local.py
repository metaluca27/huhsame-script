"""bevel_local.py: round every edge inside a picture, not only its outer outline.

usage: python tools/bevel_local.py <depth_raw_rg.png> <out_depth_rg.png> [radius_px=48] [preview.jpg]
Wherever a near surface stops and a farther one begins (a chin over a neck, armour over an arm, hair over
the backdrop), the near surface eases down to meet the far one, like a rounded shoulder. From the side the
near surface's own paint wraps around the curve.
"""
import sys, numpy as np, cv2
def rd(p):
    e = cv2.imread(p); return (e[..., 2].astype(np.float32) * 256 + e[..., 1]) / 65535
def wr(p, d):
    v = np.round(np.clip(d, 0, 1) * 65535).astype(np.uint16)
    cv2.imwrite(p, np.dstack([np.zeros_like(v, np.uint8), (v & 255).astype(np.uint8), (v >> 8).astype(np.uint8)]))
d = rd(sys.argv[1]); R = int(sys.argv[3]) if len(sys.argv) > 3 else 48
# near-side pixels that sit right on a drop
drop = d - cv2.erode(d, np.ones((5, 5), np.uint8))
edge = (drop > 0.045).astype(np.uint8)
dist = cv2.distanceTransform(1 - edge, cv2.DIST_L2, 5)            # how far each pixel is from the nearest drop
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * R + 1, 2 * R + 1))
far = cv2.erode(d, k)                                             # the depth waiting at the bottom of that drop
t = np.clip(dist / R, 0, 1)
prof = np.sin(np.pi / 2 * t) ** 0.85
out = np.where(dist < R, far + (d - far) * prof, d)
out = cv2.GaussianBlur(out, (0, 0), 1.4)
wr(sys.argv[2], out)
print("edges rounded over %d px; %.1f%% of the picture reshaped; steepest step left %.3f per pixel"
      % (R, 100 * float((np.abs(out - d) > 0.01).mean()), float(np.abs(np.diff(out, axis=1)).max())))
if len(sys.argv) > 4:
    cv2.imwrite(sys.argv[4], np.hstack([cv2.applyColorMap((d * 255).astype(np.uint8), cv2.COLORMAP_INFERNO), cv2.applyColorMap((out * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)]))
