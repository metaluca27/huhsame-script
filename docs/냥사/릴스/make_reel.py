"""냥사 푸름이 계정 릴스 — 폰 화면 녹화본을 잘라 붙이고 푸름이 말투 자막을 얹는다.
usage: python make_reel.py <녹화본.mp4> <결과.mp4>
"""
import os
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
BG = '0xE9D3A6'
FONT = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\UhBeeSe_hyun.ttf")

# (시작초, 끝초, 빠르기, 확대해서 말풍선 보기, 자막)
CUTS = [
    (10.0, 13.0, 1.0, False, '집사야, 나 하늘에서|절 하나 차렸다옹'),
    (22.0, 31.0, 3.0, False, ''),
    (32.0, 39.5, 2.5, False, ''),
    (46.0, 56.0, 1.0, False, ''),
    (59.0, 73.0, 1.4, False, '마음 무거우면|탑 한 바퀴 돌고 가라옹'),
    (82.0, 88.0, 1.0, False, '마음 무거우면|탑 한 바퀴 돌고 가라옹'),
    (112.0, 117.0, 1.0, False, '냥사, 프로필 링크에|있다옹'),
]


def caption_png(text, path):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if text:
        d = ImageDraw.Draw(img)
        lines = text.split('|')
        size = 76
        ft = ImageFont.truetype(FONT, size)
        while max(d.textlength(l, font=ft) for l in lines) > W - 160:
            size -= 2
            ft = ImageFont.truetype(FONT, size)
        lh = int(size * 1.35)
        tw = max(d.textlength(l, font=ft) for l in lines)
        top = 250
        box = (W / 2 - tw / 2 - 40, top - 28, W / 2 + tw / 2 + 40, top + lh * len(lines) + 12)
        d.rounded_rectangle(box, radius=40, fill=(255, 250, 238, 235), outline=(201, 164, 106, 255), width=4)
        for i, l in enumerate(lines):
            lw = d.textlength(l, font=ft)
            d.text(((W - lw) / 2, top + i * lh), l, font=ft, fill=(74, 58, 42))
    img.save(path)


def atempo(speed):
    parts = []
    while speed > 2.0:
        parts.append('atempo=2.0')
        speed /= 2.0
    parts.append('atempo=%.4f' % speed)
    return ','.join(parts)


inputs = ['-i', SRC]
filters = []
for i, (a, b, sp, zoom, text) in enumerate(CUTS):
    png = os.path.join(HERE, 'cap_%d.png' % i)
    caption_png(text, png)
    inputs += ['-i', png]
    frame = ('crop=760:1350:160:0,scale=%d:%d' % (W, H)) if zoom else \
            ('scale=%d:-2,pad=%d:%d:0:(oh-ih)/2:color=%s' % (W, W, H, BG))
    filters.append('[0:v]trim=%s:%s,setpts=(PTS-STARTPTS)/%s,%s,fps=30,setsar=1[v%d]' % (a, b, sp, frame, i))
    filters.append('[v%d][%d:v]overlay=0:0[c%d]' % (i, i + 1, i))
    filters.append('[0:a]atrim=%s:%s,asetpts=PTS-STARTPTS,%s[a%d]' % (a, b, atempo(sp), i))
n = len(CUTS)
filters.append(''.join('[c%d][a%d]' % (i, i) for i in range(n)) + 'concat=n=%d:v=1:a=1[vo][ao]' % n)
filters.append('[ao]afade=t=in:d=0.4,loudnorm=I=-16:TP=-1.5[af]')
cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + [
    '-filter_complex', ';'.join(filters), '-map', '[vo]', '-map', '[af]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
for i in range(n):
    os.remove(os.path.join(HERE, 'cap_%d.png' % i))
print('done', OUT)
