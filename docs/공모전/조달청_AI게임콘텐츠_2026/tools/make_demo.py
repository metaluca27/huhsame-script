"""시연영상(1920x1080, 약 1분): 루카 녹화(세로) + capture_screens.mjs 정지 화면 + 좌우 설명 글씨.
사용: python make_demo.py <녹화.mp4> [배경음악] [성명]
결과: ../제출/AI게임_시연영상_쑥쑥혁신제품_<성명>.mp4
"""
import os
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.normpath(os.path.join(HERE, "..", "녹화"))
OUTDIR = os.path.normpath(os.path.join(HERE, "..", "제출"))
W, H, FPS = 1920, 1080, 30
GAME_H = 1000
GAME_W = round(1134 * GAME_H / 1704 / 2) * 2   # 666
GX, GY = (W - GAME_W) // 2, (H - GAME_H) // 2
BOLD, REG = "C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf"
NAVY, BLUE, ORANGE = (29, 43, 79), (59, 110, 214), (240, 128, 32)

rec = sys.argv[1]
music = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else None
name = sys.argv[3] if len(sys.argv) > 3 else "문신임"

# 구간: (종류, 원본/그림, 시작, 끝, 배속 또는 길이, 오른쪽 설명 제목, 설명 본문)
SEGMENTS = [
    ("still", "shot_01_start.png", 0, 0, 4.0, "작은 아이디어가\n세계로 자라는 길", "혁신제품이 되기까지\n11단계를 합체 퍼즐로"),
    ("still", "shot_02_card1.png", 0, 0, 4.0, "처음 만난 단계는\n도감 카드로", "단계마다 실제 조달 제도를\n한 줄로 배워요"),
    ("video", rec, 0, 40, 4.0, "같은 단계끼리\n붙이면 쑥!", "아이디어 → 설계도 → 시제품\n→ 시험·인증 …"),
    ("video", rec, 96, 178, 3.0, "콤보로 더 크게", "연속으로 합치면 점수 배율 UP\n위쪽 선을 넘으면 게임 끝"),
    ("still", "shot_03_card6.png", 0, 0, 3.5, "6단계\n혁신제품 지정", "조달청이 기술력을 인정하면\n수의계약으로 공공기관에 납품"),
    ("still", "shot_03_card7.png", 0, 0, 3.5, "7단계\n나라장터 등록", "공공기관이 물건을 사는\n온라인 장터"),
    ("still", "shot_03_card11.png", 0, 0, 3.5, "11단계\nK-혁신 대표기업", "작은 아이디어가\n세계적인 기업으로"),
    ("still", "shot_04_result.png", 0, 0, 3.0, "결과 화면", "내 아이디어가 몇 단계까지\n자랐는지 한눈에"),
    ("still", "shot_05_book.png", 0, 0, 4.0, "혁신제품 도감 11장", "모은 카드를 다시 읽으며\n혁신조달 제도를 복습"),
]
OUTRO = 4.0


def font(path, size):
    return ImageFont.truetype(path, size)


def background(title, body, speed_label=None):
    """배경(하늘색 그라데이션) + 왼쪽 게임 소개 + 오른쪽 구간 설명. 가운데 게임 자리는 비워 둠."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(244 - 22 * t), int(249 - 14 * t), 255))
    # 왼쪽: 작품 소개(고정)
    lx = 70
    d.text((lx, 300), "🌱", font=ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 72), embedded_color=True)
    d.text((lx, 400), "쑥쑥!\n혁신제품", font=font(BOLD, 76), fill=BLUE, spacing=10)
    d.text((lx, 600), "조달청 혁신조달 합체 퍼즐", font=font(REG, 30), fill=NAVY)
    d.text((lx, 650), "웹 · PC · 모바일에서 바로 실행", font=font(REG, 26), fill=(90, 105, 140))
    d.text((lx, H - 90), "2026 조달청 AI 게임·콘텐츠 공모전", font=font(REG, 22), fill=(110, 125, 160))
    # 오른쪽: 구간 설명
    rx = GX + GAME_W + 70
    d.text((rx, 380), title, font=font(BOLD, 52), fill=NAVY, spacing=12)
    d.text((rx, 540), body, font=font(REG, 30), fill=(70, 85, 120), spacing=12)
    if speed_label:
        d.rounded_rectangle((rx, 300, rx + 150, 352), radius=26, fill=ORANGE)
        d.text((rx + 75, 326), speed_label, font=font(BOLD, 28), fill="white", anchor="mm")
    # 게임 화면 그림자 테두리
    d.rounded_rectangle((GX - 6, GY - 6, GX + GAME_W + 6, GY + GAME_H + 6), radius=18, fill=(205, 220, 245))
    return im


def outro():
    im = background("", "")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, H), fill=(244, 249, 255))
    d.text((W // 2, 360), "🌱", font=ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 110), embedded_color=True, anchor="mm")
    d.text((W // 2, 500), "쑥쑥! 혁신제품", font=font(BOLD, 96), fill=BLUE, anchor="mm")
    d.text((W // 2, 610), "작은 아이디어를 합쳐 세계로!", font=font(REG, 42), fill=NAVY, anchor="mm")
    d.text((W // 2, 720), "vaulted-bus-346411.web.app/ssukssuk", font=font(REG, 32), fill=(90, 105, 140), anchor="mm")
    return im


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + args, check=True)


tmp = tempfile.mkdtemp(prefix="ssukdemo-")
clips = []
for n, (kind, src, a, b, val, title, body) in enumerate(SEGMENTS):
    label = f"{val:g}배속" if kind == "video" else None
    bg = os.path.join(tmp, f"bg{n}.png"); background(title, body, label).save(bg)
    out = os.path.join(tmp, f"c{n}.mp4")
    if kind == "still":
        shot = os.path.join(SHOTS, src)
        run(["-loop", "1", "-t", str(val), "-i", bg, "-loop", "1", "-t", str(val), "-i", shot,
             "-filter_complex", f"[1]scale={GAME_W}:{GAME_H}[g];[0][g]overlay={GX}:{GY},fps={FPS},format=yuv420p",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", out])
    else:
        run(["-loop", "1", "-i", bg, "-ss", str(a), "-to", str(b), "-i", src,
             "-filter_complex", f"[1]setpts=PTS/{val},scale={GAME_W}:{GAME_H},fps={FPS}[g];[0][g]overlay={GX}:{GY}:shortest=1,format=yuv420p",
             "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium", out])
    clips.append(out)

ob = os.path.join(tmp, "outro.png"); outro().save(ob)
oc = os.path.join(tmp, "outro.mp4")
run(["-loop", "1", "-t", str(OUTRO), "-i", ob, "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-crf", "18", oc])
clips.append(oc)

lst = os.path.join(tmp, "list.txt")
with open(lst, "w", encoding="utf-8") as f:
    f.writelines(f"file '{c.replace(os.sep, '/')}'\n" for c in clips)
silent = os.path.join(tmp, "silent.mp4")
run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent])
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent],
                           capture_output=True, text=True, check=True).stdout)

os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, f"AI게임_시연영상_쑥쑥혁신제품_{name}.mp4")
vf = f"fade=in:st=0:d=0.6,fade=out:st={dur - 1:.2f}:d=1"
if music:
    run(["-i", silent, "-stream_loop", "-1", "-i", music, "-t", f"{dur:.2f}", "-vf", vf,
         "-af", f"afade=in:st=0:d=1,afade=out:st={dur - 2.5:.2f}:d=2.5,loudnorm=I=-16:TP=-1.5",
         "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out])
else:
    run(["-i", silent, "-vf", vf, "-c:v", "libx264", "-crf", "18", out])
print(f"{out}  ({dur:.1f}s)")
