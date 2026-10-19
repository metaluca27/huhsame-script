"""쑥쑥! 혁신제품 — 임시 배지 11장(단계 색 원 + 번호). 진짜 그림 생기면 make_badges.py가 덮어씀.
사용: python make_placeholder_badges.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk", "img"))
COLORS = ["#FFE27A", "#9AD0FF", "#FFB37A", "#B6E3A8", "#C9B6FF", "#FFD34D",
          "#5EC8C8", "#FF9AA2", "#6FA8FF", "#7ED6A5", "#FF7A59"]
SIZE = 512

os.makedirs(OUT, exist_ok=True)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 220)
except OSError:
    font = ImageFont.load_default()
for i, col in enumerate(COLORS):
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, SIZE - 4, SIZE - 4), fill=col, outline="#1d2b4f", width=10)
    text = str(i + 1)
    box = d.textbbox((0, 0), text, font=font)
    d.text(((SIZE - (box[2] - box[0])) / 2 - box[0], (SIZE - (box[3] - box[1])) / 2 - box[1]), text, font=font, fill="#1d2b4f")
    im.save(os.path.join(OUT, f"stage{i + 1:02d}.png"))
print("saved 11 placeholders to", OUT)
