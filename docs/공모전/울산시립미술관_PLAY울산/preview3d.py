# 건물 3면 미리보기: 최종 영상을 좌측·정면·우측 면으로 나눠 건물 모퉁이에 얹은 모습을 두 시점에서 보여준다.
# 가정: 스크린 픽셀 간격 6mm(공고문) → 좌 4.0m / 정면 30.3m / 우 5.6m, 높이 4.6m, 모퉁이는 직각.
# 사용: python preview3d.py   → 건물미리보기.mp4, 건물미리보기_장면.jpg
import subprocess
import numpy as np
from PIL import Image, ImageDraw

SRC = "집가는길_final.mp4"
SW, SH = 3328, 384                       # 미리보기용으로 절반 크기로 읽는다
FPS = 15
VW, VH = 1600, 520                       # 시점 하나의 크기
PX = 0.006 * 2                           # 절반 크기 픽셀 하나의 실제 길이(m)
LW, FW_, RW = 672 // 2, 5056 // 2, 928 // 2
Lm, Fm, Rm, Hm = LW * PX, FW_ * PX, RW * PX, SH * PX
Y0 = 9.0                                 # 스크린 아래쪽 높이(m), 건물 옥상 위라고 가정


def camera(pos, look, fov=64):
    pos, look = np.array(pos, float), np.array(look, float)
    f = look - pos; f /= np.linalg.norm(f)
    r = np.cross([0, 1, 0], f); r /= np.linalg.norm(r)   # 화면 오른쪽
    u = np.cross(f, r)
    foc = (VW / 2) / np.tan(np.radians(fov) / 2)

    def proj(p):
        d = np.array(p, float) - pos
        z = d @ f
        return (VW / 2 + foc * (d @ r) / z, VH * 0.5 - foc * (d @ u) / z)
    return proj


def coeffs(dst, src):
    """dst(화면 위 네 점) → src(원본 네 점) 로 가는 원근 변환 계수 (PIL용)."""
    A = []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    return np.linalg.solve(np.array(A, float), np.array(src, float).reshape(8))


# 세 면의 네 꼭짓점(위왼, 위오, 아래오, 아래왼). 정면은 z=0, 양옆 면은 뒤(z+)로 꺾인다
FACES = {
    "L": ([(0, Y0 + Hm, Lm), (0, Y0 + Hm, 0), (0, Y0, 0), (0, Y0, Lm)], (0, LW)),
    "F": ([(0, Y0 + Hm, 0), (Fm, Y0 + Hm, 0), (Fm, Y0, 0), (0, Y0, 0)], (LW, LW + FW_)),
    "R": ([(Fm, Y0 + Hm, 0), (Fm, Y0 + Hm, Rm), (Fm, Y0, Rm), (Fm, Y0, 0)], (LW + FW_, SW)),
}
VIEWS = [("왼쪽 모퉁이에서", camera((-12, 1.6, -27), (11, 7.2, 0)), "LF"),
         ("오른쪽 모퉁이에서", camera((Fm + 12, 1.6, -27), (Fm - 11, 7.2, 0)), "FR")]


def backdrop(proj, faces):
    im = Image.new("RGB", (VW, VH), (18, 20, 34)); d = ImageDraw.Draw(im)
    for y in range(VH):                                  # 저녁 하늘
        t = y / VH
        d.line([(0, y), (VW, y)], fill=(int(20 + 38 * t), int(22 + 26 * t), int(44 + 30 * t)))
    walls = {"L": [(0, Y0, Lm + 14), (0, Y0, 0), (0, 0, 0), (0, 0, Lm + 14)],
             "F": [(0, Y0, 0), (Fm, Y0, 0), (Fm, 0, 0), (0, 0, 0)],
             "R": [(Fm, Y0, 0), (Fm, Y0, Rm + 14), (Fm, 0, Rm + 14), (Fm, 0, 0)]}
    shade = {"L": (38, 40, 48), "F": (58, 60, 68), "R": (38, 40, 48)}
    for k in faces:                                      # 스크린 아래 건물 벽(단순한 덩어리)
        d.polygon([proj(p) for p in walls[k]], fill=shade[k])
    gy = proj((0, 0, 0))[1]
    d.rectangle([0, min(max(gy, proj((Fm, 0, 0))[1]) - 2, VH - 1), VW, VH], fill=(26, 27, 32))   # 땅
    for x in (Fm * 0.2, Fm * 0.5, Fm * 0.8):             # 크기 가늠용 사람(키 1.7m)
        a, b = proj((x, 1.7, -3)), proj((x, 0, -3))
        w = (b[1] - a[1]) * 0.16
        d.ellipse([a[0] - w, a[1], a[0] + w, a[1] + 2 * w], fill=(200, 200, 205))
        d.rectangle([a[0] - w * 0.9, a[1] + 2 * w, a[0] + w * 0.9, max(b[1], a[1] + 2 * w)], fill=(200, 200, 205))
    return im


PLAN = []
for name, proj, faces in VIEWS:
    items = []
    for k in faces:
        quad3, (x0, x1) = FACES[k]
        dst = [proj(p) for p in quad3]
        src = [(0, 0), (x1 - x0, 0), (x1 - x0, SH), (0, SH)]
        mask = Image.new("L", (VW, VH), 0); ImageDraw.Draw(mask).polygon(dst, fill=255)
        items.append((x0, x1, coeffs(dst, src), mask))
    PLAN.append((name, backdrop(proj, faces), items))

dec = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", SRC, "-vf", f"scale={SW}:{SH},fps={FPS}", "-f", "rawvideo",
                        "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{VW}x{VH * 2}", "-r", str(FPS),
                        "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "건물미리보기.mp4"], stdin=subprocess.PIPE)
stills, n = [], 0
while True:
    raw = dec.stdout.read(SW * SH * 3)
    if len(raw) < SW * SH * 3:
        break
    frame = Image.frombytes("RGB", (SW, SH), raw)
    out = Image.new("RGB", (VW, VH * 2))
    for i, (name, back, items) in enumerate(PLAN):
        view = back.copy()
        for x0, x1, co, mask in items:
            face = frame.crop((x0, 0, x1, SH)).transform((VW, VH), Image.PERSPECTIVE, tuple(co), Image.BILINEAR)
            view.paste(face, (0, 0), mask)
        out.paste(view, (0, i * VH))
    enc.stdin.write(out.tobytes())
    if n in (FPS * 8, FPS * 30, FPS * 58):
        stills.append(out.copy())
    n += 1
enc.stdin.close(); enc.wait()
sheet = Image.new("RGB", (VW, VH * 2 * len(stills) + 10 * (len(stills) - 1)), "white")
for i, s in enumerate(stills):
    sheet.paste(s, (0, i * (VH * 2 + 10)))
sheet.save("건물미리보기_장면.jpg", quality=88)
print("frames", n)
