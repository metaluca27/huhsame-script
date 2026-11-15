"""ending.py: after the walk through the 3D world, hand over to the REAL painting.

usage: python tools/ending.py <original.jpg> <frames dir> <last frame no> <title> <subtitle>
Writes 96 more frames (4 s at 24 fps) after the last rendered frame:
  0.0-1.0 s  the real painting fades in exactly over its 3D copy
  1.0-2.5 s  it straightens, steps back and sits whole on a dimmed backdrop
  2.0-4.0 s  the caption comes up and holds
"""
import sys, os, math, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

orig_path, fdir, last, title, sub = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
FPS, N = 24, 96
orig = cv2.imread(orig_path)
ren = cv2.imread(os.path.join(fdir, "f_%04d.png" % last))
H, W = ren.shape[:2]
oh, ow = orig.shape[:2]

# where the painting sits inside the last 3D frame (scale, rotation, centre)
g1, g2 = cv2.cvtColor(orig, cv2.COLOR_BGR2GRAY), cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY)
sift = cv2.SIFT_create(6000)
k1, d1 = sift.detectAndCompute(g1, None); k2, d2 = sift.detectAndCompute(g2, None)
good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.75 * b.distance]
p1 = np.float32([k1[m.queryIdx].pt for m in good]); p2 = np.float32([k2[m.trainIdx].pt for m in good])
M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=12)
s0 = math.hypot(M[0, 0], M[1, 0]); r0 = math.atan2(M[1, 0], M[0, 0])
c0 = M @ np.array([ow / 2, oh / 2, 1.0])
# when the 3D copy strays too far from the painting for matching to work, place it by hand:
# ALIGN="scale,rot_deg,tx,ty" (top-left of the painting lands at tx,ty in the frame)
if os.environ.get("ALIGN"):
    s0, rd, tx, ty = [float(v) for v in os.environ["ALIGN"].split(",")]
    r0 = math.radians(rd)
    c0 = np.array([tx, ty]) + s0 * np.array([[math.cos(r0), -math.sin(r0)], [math.sin(r0), math.cos(r0)]]) @ np.array([ow / 2, oh / 2])
    print("manual placement:", s0, rd, tx, ty)
print("match: %d good, %d inliers" % (len(good), int(inl.sum())))

# where it ends: upright, whole, centred, with room for the caption underneath
s1 = min(920 / ow, 1340 / oh); r1 = 0.0; c1 = np.array([W / 2, 190 + oh * s1 / 2])

def ease(p):
    p = min(1.0, max(0.0, p)); return 4 * p * p * p if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2

def place(s, r, c):
    a, b = s * math.cos(r), s * math.sin(r)
    A = np.array([[a, -b, 0.0], [b, a, 0.0]])
    A[:, 2] = c - A[:, :2] @ np.array([ow / 2, oh / 2])
    return A

font_candidates = [r"C:\Windows\Fonts\malgunbd.ttf", r"C:\Windows\Fonts\malgun.ttf"]
fpath = next(p for p in font_candidates if os.path.exists(p))
f_title = ImageFont.truetype(fpath, 84); f_sub = ImageFont.truetype(fpath, 30)
blurred = cv2.GaussianBlur(ren, (0, 0), 22)
mask_src = np.full((oh, ow), 255, np.uint8)
FADE = float(os.environ.get("FADE", 1.0)); DIM = float(os.environ.get("DIM", 0.78)); FEATHER = float(os.environ.get("FEATHER", 0))

for i in range(N):
    t = i / FPS
    fade = ease(t / FADE)                     # painting over its 3D copy
    mv = ease((t - 1.0) / 1.5)                # straighten and step back
    s = s0 + (s1 - s0) * mv; r = r0 + (r1 - r0) * mv; c = c0 + (c1 - c0) * mv
    A = place(s, r, c)
    # backdrop: the 3D frame, softening and dimming as the painting steps back
    bg = cv2.addWeighted(ren, 1 - mv, blurred, mv, 0).astype(np.float32) * (1 - DIM * mv)
    warped = cv2.warpAffine(orig, A, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    m = cv2.warpAffine(mask_src, A, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32) / 255.0
    soft = FEATHER * (1 - mv)                 # a soft edge while it sits over the 3D copy, crisp once it stands alone
    if soft > 0.5: m = cv2.GaussianBlur(m, (0, 0), soft)
    m = m[..., None]
    frame = bg * (1 - m * fade) + warped * (m * fade)
    img = Image.fromarray(cv2.cvtColor(np.clip(frame, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))
    cap = ease((t - 2.0) / 0.8)
    if cap > 0:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
        y = 190 + oh * s1 + 46 + (1 - cap) * 22
        d.text((80, y), title, font=f_title, fill=(244, 241, 234, int(255 * cap)))
        d.text((84, y + 118), sub, font=f_sub, fill=(244, 241, 234, int(200 * cap)))
        img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    img.save(os.path.join(fdir, "f_%04d.png" % (last + 1 + i)))
print("wrote", N, "frames after", last)
