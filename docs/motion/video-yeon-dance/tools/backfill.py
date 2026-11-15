"""backfill.py: paint what is hidden behind the figure, so turning the camera never shows a black hole.

usage: python tools/backfill.py <painting.jpg> <depth_rg.png> <out_back.jpg> <out_backdepth_rg.png> [preview.jpg]
Behind every near thing it lays a second, farther surface: its depth is the depth of whatever lies around
(pushed back), its colour is spread inwards from that surrounding paint. Nothing is redrawn by an AI.
"""
import sys, numpy as np, cv2
src, dep, out_c, out_d = sys.argv[1:5]
enc = cv2.imread(dep)                                   # BGR: G = low byte, R = high byte
d = (enc[..., 2].astype(np.float32) * 256 + enc[..., 1]) / 65535
h, w = d.shape
img = cv2.resize(cv2.imread(src), (w, h), interpolation=cv2.INTER_AREA)
# two passes: first what lies just behind (hair behind the face), then what lies behind that (the backdrop)
back = d.copy(); col = img.copy()
for ksize, thr in ((61, 0.05), (151, 0.05)):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    far = cv2.GaussianBlur(cv2.erode(back, k), (0, 0), ksize / 6)
    far = np.minimum(far, back)
    mask = ((back - far) > thr).astype(np.uint8)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    col = cv2.inpaint(col, mask * 255, 7, cv2.INPAINT_TELEA)
    back = np.where(mask > 0, far, back)
col = cv2.GaussianBlur(col, (0, 0), 1.2)
cv2.imwrite(out_c, col, [cv2.IMWRITE_JPEG_QUALITY, 92])
v = np.round(np.clip(back, 0, 1) * 65535).astype(np.uint16)
cv2.imwrite(out_d, np.dstack([np.zeros_like(v, np.uint8), (v & 255).astype(np.uint8), (v >> 8).astype(np.uint8)]))
print("hidden area filled: %.0f%% of the picture" % (100 * float(((d - back) > 0.04).mean())))
if len(sys.argv) > 5:
    cv2.imwrite(sys.argv[5], np.hstack([img, col, cv2.applyColorMap((back * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)]))
