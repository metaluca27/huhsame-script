"""참고 영상에서 안티그라비티 화면만 잘라 모서리를 둥글게 다듬는다. 자막과 왼쪽 프로젝트 목록은 빼고 자른다.
루카가 직접 찍은 화면이 생기면 src/screens의 같은 이름 파일을 바꾸면 된다."""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

VIDEO, OUT = sys.argv[1], Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
SHOTS = {
    "marketplace": (100, (450, 60, 1040, 640)),
    "stripe": (175, (380, 60, 895, 625)),
    "canva": (880, (480, 60, 1010, 640)),
    "vercel": (850, (440, 60, 1000, 640)),
}


def rounded(img, radius=14, border=(42, 52, 70), width=2):
    img = img.convert("RGBA")
    scale = 3
    w, h = img.size
    mask = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius * scale, fill=255)
    img.putalpha(mask.resize((w, h), Image.LANCZOS))
    ring = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius * scale,
                                           outline=border + (255,), width=width * scale)
    img.alpha_composite(ring.resize((w, h), Image.LANCZOS))
    return img


with tempfile.TemporaryDirectory() as tmp:
    for name, (sec, box) in SHOTS.items():
        frame = Path(tmp) / f"{name}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(sec), "-i", VIDEO, "-frames:v", "1", str(frame)], check=True)
        img = Image.open(frame).convert("RGB").crop(box)
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
        rounded(img, 24, width=3).save(OUT / f"{name}.png", optimize=True)
        print(name, img.size)
