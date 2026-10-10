# 진짜 원화(집가는길)를 늘리지 않고 띠의 맨 왼쪽에 그대로 두고, 거기서부터 오른쪽으로 이어 그린다.
# 사용: python chain_orig.py   → orig_A~E 생성 후 orig_띠_6656x768.png 로 붙임
import re, shutil, subprocess, urllib.request
import numpy as np
from PIL import Image
import extend as e, stitch2 as s

e.PRE = "orig"; e.PROMPTS["orig"] = e.STYLE
W, H = e.W, e.H
orig = Image.open("../원화_집가는길.jpg").convert("RGB")
ow = round(orig.width * H / orig.height)
orig = orig.resize((ow, H), Image.LANCZOS)

# A: 원화 + 오른쪽 빈 캔버스
canvas = Image.new("RGB", (W, H), (128, 128, 128))
mask = Image.new("L", (ow, H), 255)
mask.paste(Image.linear_gradient("L").rotate(-90, expand=True).resize((300, H)), (ow - 300, 0))
canvas.paste(orig, (0, 0), mask); canvas.save("canvas_origA.png")
out = subprocess.run([shutil.which("higgsfield"), "generate", "create", "nano_banana_pro", "--image", "canvas_origA.png",
                      "--aspect_ratio", "21:9", "--resolution", "4k", "--wait", "--wait-timeout", "10m", "--json",
                      "--prompt", e.STYLE + "Do not stretch, move or resize the painted part. The power lines that leave the "
                      "painted part toward the upper right come back down to utility poles further right."],
                     capture_output=True, text=True, encoding="utf-8").stdout
url = [u for u in re.findall(r'https?://[^"\s]+', out) if u.endswith(".png")][0]
urllib.request.urlretrieve(url, "orig_A.png")
Image.open("orig_A.png").convert("RGB").resize((1600, 679)).save("orig_A_preview.jpg", quality=85)
print("A ok", flush=True)
for n in "BCDE":
    e.make(n, tries=2)
s.stitch("orig", "ABCDE")
# 맨 왼쪽은 손대지 않은 진짜 원화로 다시 덮는다
strip = Image.open("orig_띠v2_6656x768.png").convert("RGB")
o = orig.resize((round(ow * 768 / H), 768), Image.LANCZOS)
m = Image.new("L", o.size, 255)
m.paste(Image.linear_gradient("L").rotate(-90, expand=True).resize((70, 768)), (o.width - 70, 0))
strip.paste(o, (0, 0), m); strip.save("orig_띠_6656x768.png")
half = Image.new("RGB", (3328, 768 * 2 + 10), "white")
half.paste(strip.crop((0, 0, 3328, 768)), (0, 0)); half.paste(strip.crop((3328, 0, 6656, 768)), (0, 778))
half.resize((1664, 773)).save("orig_check.jpg", quality=88)
print("원화 폭(px, 768 기준):", o.width)
