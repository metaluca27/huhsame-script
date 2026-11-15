"""depth.py: read "what is near, what is far" from a painting. Runs on this PC only.

usage: python tools/depth.py <painting.jpg> <out_depth.png> [preview.jpg]
Writes a 16-bit depth picture packed into two colour channels (red = high byte, green = low byte;
65535 = nearest), at most 1024 px on its long side. Edges between near and far things are made
crisp, so no stray points hang in the air between a figure and what is behind it.
"""
import sys, numpy as np, cv2, torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
src, out = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGB")
proc = AutoImageProcessor.from_pretrained(MODEL)
model = AutoModelForDepthEstimation.from_pretrained(MODEL).eval()
with torch.no_grad():
    pred = model(**proc(images=img, return_tensors="pt")).predicted_depth[0].numpy()
w, h = img.size
sc = 1024 / max(w, h)
size = (round(w * sc), round(h * sc))
d = cv2.resize(pred, size, interpolation=cv2.INTER_CUBIC).astype(np.float32)
lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.5)
d = np.clip((d - lo) / (hi - lo), 0, 1)
d = cv2.bilateralFilter(d, 9, 0.06, 7)                 # calm brush-stroke noise, keep real edges
# crisp edges: where near and far meet inside a small window, every pixel joins one side or the other
k = np.ones((7, 7), np.uint8)
for _ in range(2):
    mn, mx = cv2.erode(d, k), cv2.dilate(d, k)
    edge = (mx - mn) > 0.10
    d = np.where(edge, np.where((d - mn) < (mx - d), mn, mx), d)
edge_share = float(edge.mean())
v = np.round(d * 65535).astype(np.uint16)
rgb = np.dstack([np.zeros_like(v, np.uint8), (v & 255).astype(np.uint8), (v >> 8).astype(np.uint8)])   # BGR for cv2
cv2.imwrite(out, rgb)
print("depth", size, "edge pixels %.1f%%" % (edge_share * 100))
if len(sys.argv) > 3:
    d8 = (d * 255).astype(np.uint8)
    small = cv2.resize(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR), size)
    cv2.imwrite(sys.argv[3], np.hstack([small, cv2.applyColorMap(d8, cv2.COLORMAP_INFERNO)]))
