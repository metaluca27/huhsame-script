# 원화 파노라마(pano_A.png)를 오른쪽으로 이어 그려 6656x768 배경 띠를 만든다.
# 사용: python extend.py cloud B C D E stitch  (A의 오른쪽 끝을 차례로 이어 그린 뒤 한 줄로 붙임)
import json, re, shutil, subprocess, sys, urllib.request
from PIL import Image

W, H, OVER = 6336, 2688, 1900
ORDER = "ABCDE"
STYLE = (
    "The left part of this image is a finished hand-painted acrylic painting on canvas. The flat grey area on the right is "
    "blank canvas; the painting fades softly into the grey. Continue the same painting to the right so it fills the entire grey "
    "area with no visible vertical line or join anywhere, as if the same artist kept painting on a wider canvas. Trees are loose "
    "and irregular, a mix of leafy trees and pines, not neat identical conifers. Identical acrylic brushwork and canvas texture, same palette: pale blue-grey and lavender "
    "clouds in the upper sky, blazing orange-yellow sunset glow low on the horizon, pure black silhouettes. The row of black "
    "silhouetted pine trees of varying heights continues along the bottom with gaps of glowing orange sky. The thin black power "
    "lines continue unbroken from the left part and run on to the right edge, carried by simple black utility poles. A few tiny "
    "black birds. Keep the left painted part exactly unchanged. No people, no text, no signature, no frame, no grey left over. "
)
CLOUD = (
    "The left part of this image is a finished hand-painted acrylic painting on canvas. The flat grey area on the right is "
    "blank canvas. Continue the same painting to the right so it fills the entire grey area seamlessly, as if the same artist "
    "kept painting on a wider canvas. Identical style: bold flat stylized cloud shapes stacked in horizontal layers with crisp "
    "wavy edges, in silver grey, charcoal, white, pink, metallic gold, blazing orange and deep red, visible canvas texture. "
    "The layered clouds and the winding river of gold and orange light keep flowing to the right. Along the bottom, black "
    "silhouetted leafy bushes and trees and more arched greenhouse tunnels with black frames glowing blue and purple. "
    "Keep the left painted part exactly unchanged. No people, no text, no signature, no frame, no grey left over. "
)
PROMPTS = {"pano": STYLE, "cloud": CLOUD}
PRE = "pano"
EXTRA = {
    "E": "Near the far right end, among the trees, stands one small cozy house in dark silhouette with a pitched roof and a single "
         "warm glowing yellow window: this is home, the end of the road. ",
}


FEATHER = 500  # 그림에서 빈 캔버스로 넘어가는 경계를 흐리게 (반듯한 세로줄이 그림에 남는 것 방지)


def has_seam(path):
    """하늘 윗부분에서 경계 근처에 반듯한 세로줄이 생겼는지 본다."""
    import numpy as np
    g = np.asarray(Image.open(path).convert("L").resize((W // 4, H // 4)), dtype=np.float32)[: H // 4 * 28 // 100]
    col = np.abs(np.diff(g, axis=1)).mean(axis=0)
    lo, hi = (OVER - FEATHER - 100) // 4, (OVER + 100) // 4
    score = col[lo:hi].max() / np.median(col)
    return score > 4, round(float(score), 2)


def make(name, tries=3):
    prev = Image.open(f"{PRE}_{ORDER[ORDER.index(name) - 1]}.png").convert("RGB").resize((W, H))
    canvas = Image.new("RGB", (W, H), (128, 128, 128))
    mask = Image.new("L", (OVER, H), 255)
    mask.paste(Image.linear_gradient("L").rotate(-90, expand=True).resize((FEATHER, H)), (OVER - FEATHER, 0))
    canvas.paste(prev.crop((W - OVER, 0, W, H)), (0, 0), mask)
    canvas.save(f"canvas_{name}.png")
    best = None
    for t in range(tries):
        out = subprocess.run(
            [shutil.which("higgsfield"), "generate", "create", "nano_banana_pro", "--image", f"canvas_{name}.png",
             "--aspect_ratio", "21:9", "--resolution", "4k", "--wait", "--wait-timeout", "10m", "--json",
             "--prompt", PROMPTS[PRE] + EXTRA.get(name, "")],
            capture_output=True, text=True, encoding="utf-8").stdout
        url = [u for u in re.findall(r'https?://[^"\s]+', out) if u.endswith(".png")][0]
        urllib.request.urlretrieve(url, f"{PRE}_{name}_try{t}.png")
        bad, score = has_seam(f"{PRE}_{name}_try{t}.png")
        print(name, "try", t + 1, "seam score", score, "BAD" if bad else "ok", flush=True)
        if best is None or score < best[0]:
            best = (score, t)
        if not bad:
            break
    shutil.copy(f"{PRE}_{name}_try{best[1]}.png", f"{PRE}_{name}.png")  # 세로줄이 가장 약한 것을 쓴다
    Image.open(f"{PRE}_{name}.png").convert("RGB").resize((1600, 679)).save(f"{PRE}_{name}_preview.jpg", quality=85)


def stitch(names):
    BLEND = 400
    strip = Image.open(f"{PRE}_A.png").convert("RGB").resize((W, H))
    for n in names[1:]:
        im = Image.open(f"{PRE}_{n}.png").convert("RGB").resize((W, H))
        new = Image.new("RGB", (strip.width + W - OVER, H))
        new.paste(strip, (0, 0))
        x0 = strip.width - OVER  # 새 패널이 놓일 자리
        mask = Image.new("L", (W, H), 255)
        ramp = Image.linear_gradient("L").rotate(90, expand=True).resize((BLEND, H))  # 왼→오 0..255
        mask.paste(0, (0, 0, OVER - BLEND, H))
        mask.paste(ramp, (OVER - BLEND, 0))
        new.paste(im, (x0, 0), mask)
        strip = new
    strip.save(f"{PRE}_strip_full.png")
    tw = round(strip.width * 768 / H)
    small = strip.resize((tw, 768), Image.LANCZOS)
    small.save(f"{PRE}_strip_768.png")
    print("strip", strip.size, "->", small.size)


if __name__ == "__main__":
    # python extend.py <pano|cloud> <B C D E ... | stitch>
    PRE = sys.argv[1]
    for a in sys.argv[2:]:
        stitch(ORDER) if a == "stitch" else make(a)
