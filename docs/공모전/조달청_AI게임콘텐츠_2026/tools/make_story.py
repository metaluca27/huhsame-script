"""「작은 전구의 여행」 최종 편집: 클립(없으면 그림 천천히 확대) + 내레이션 + 배경음악 + 한글 자막 → 1920x1080 MP4.
사용: python make_story.py [성명]
결과: ../제출/AI영상_작은전구의여행_<성명>.mp4
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.normpath(os.path.join(HERE, "..", "영상"))
OUTDIR = os.path.normpath(os.path.join(HERE, "..", "제출"))
NAME = sys.argv[1] if len(sys.argv) > 1 else "문신임"
W, H, FPS = 1920, 1080, 30
VOICE_SPEED = 1.08     # 내레이션 살짝 빠르게(음높이 유지) — 3분 내외에 맞춤
GAP = 0.6              # 장면마다 내레이션 뒤 여백
LEAD = 0.5             # 장면 시작 후 내레이션 들어가기까지
XF = 0.5               # 장면 사이 디졸브
ENDING = 7.0           # 마지막 타이틀 장면 길이
MAX_SLOW = 1.5         # 클립을 늘릴 수 있는 최대 배속(그 이상은 마지막 장면 정지)
BOLD = "C:/Windows/Fonts/malgunbd.ttf"

narr = json.load(open(os.path.join(VID, "narration.json"), encoding="utf-8"))
durs = json.load(open(os.path.join(VID, "voice", "durations.json"), encoding="utf-8"))
script = open(os.path.join(VID, "대본_v1.md"), encoding="utf-8").read()
# 자막은 숫자 표기가 있는 대본 원문을 씀(낭독용 한글 숫자 말고)
subs_text = {int(m.group(1)): m.group(2).strip() for m in re.finditer(r"^\| (\d+) \|[^|]*\|[^|]*\| (.+?) \|\s*$", script, re.M)}

tmp = tempfile.mkdtemp(prefix="story-")


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + args, check=True)


def ending_image():
    im = Image.open(os.path.join(VID, "scenes", "scene15.png")).convert("RGB").resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for txt, size, y, col in [("작은 전구의 여행", 120, 300, (40, 60, 110)),
                              ("작은 아이디어가 세계로 · 조달청 혁신조달", 46, 430, (70, 90, 140))]:
        f = ImageFont.truetype(BOLD, size)
        d.text((W // 2, y), txt, font=f, fill=col, anchor="mm", stroke_width=6, stroke_fill="white")
    p = os.path.join(tmp, "ending.png"); im.save(p)
    return p


# 1) 장면별 길이와 영상 조각
scene_len, clips = {}, []
for n in range(1, 16):
    if n <= 14:
        length = LEAD + durs[f"{n:02d}"] / VOICE_SPEED + GAP + XF
    else:
        length = ENDING
    scene_len[n] = length
    out = os.path.join(tmp, f"v{n:02d}.mp4")
    clip = os.path.join(VID, "clips", f"clip{n:02d}.mp4")
    if os.path.exists(clip):
        ext = os.path.join(VID, "clips", f"clip{n:02d}b.mp4")   # 긴 장면은 첫 클립 마지막 장면에서 이어 뽑은 클립을 뒤에 붙임
        if os.path.exists(ext):
            joined = os.path.join(tmp, f"j{n:02d}.mp4")
            run(["-i", clip, "-i", ext, "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]", "-map", "[v]",
                 "-c:v", "libx264", "-crf", "16", "-preset", "medium", joined])
            clip = joined
        src_len = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip],
                                       capture_output=True, text=True).stdout)
        slow = min(MAX_SLOW, max(1.0, length / src_len))
        hold = max(0.0, length - src_len * slow)
        frames = int(length * FPS) + 1
        # 남는 시간은 마지막 장면을 잡아두되, 장면 전체에 아주 느린 줌을 깔아서 멈춰 보이지 않게 함
        vf = (f"setpts={slow:.4f}*PTS,scale=2560:1440:flags=lanczos,fps={FPS},"
              f"tpad=stop_mode=clone:stop_duration={hold + 0.1:.2f},trim=duration={length:.3f},setpts=PTS-STARTPTS,"
              f"zoompan=z='1+0.05*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p")
        run(["-i", clip, "-an", "-vf", vf, "-c:v", "libx264", "-crf", "17", "-preset", "medium", out])
    else:
        img = ending_image() if n == 15 else os.path.join(VID, "scenes", f"scene{n:02d}.png")
        frames = int(length * FPS) + 1
        vf = (f"scale=3840:-2,zoompan=z='1+0.06*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
              f"trim=duration={length:.3f},format=yuv420p")
        run(["-loop", "1", "-i", img, "-vf", vf, "-c:v", "libx264", "-crf", "17", "-preset", "medium", out])
    clips.append(out)
    print(f"scene {n:02d}: {length:.2f}s {'clip' if os.path.exists(clip) else 'still'}", flush=True)

# 2) 디졸브로 이어 붙이기
inputs, chain, t = [], "", 0.0
for c in clips:
    inputs += ["-i", c]
starts = {1: 0.0}
prev = "[0:v]"
for i in range(1, len(clips)):
    t += scene_len[i] - XF
    starts[i + 1] = t
    lab = f"[x{i}]"
    chain += f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={t:.3f}{lab};"
    prev = lab
total = t + scene_len[15]
video = os.path.join(tmp, "video.mp4")
run(inputs + ["-filter_complex", chain.rstrip(";"), "-map", prev, "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-r", str(FPS), video])

# 3) 내레이션 배치 + 배경음악(곡 길이를 영상에 맞춰 늘림, 음높이 유지)
music = os.path.join(VID, "music", "bgm_lyria35.mp3")
mlen = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", music],
                            capture_output=True, text=True).stdout)
m_tempo = max(0.85, min(1.0, mlen / (total - 0.5)))
a_in = ["-i", music]
a_f = [f"[0:a]atempo={m_tempo:.4f},aresample=48000,volume=0.22,afade=t=in:d=1.5,afade=t=out:st={total - 3:.2f}:d=3,apad,atrim=0:{total:.3f}[m]"]
vox = ""
for n in range(1, 15):
    a_in += ["-i", os.path.join(VID, "voice", f"{n:02d}.wav")]
    delay = int((starts[n] + LEAD) * 1000)
    a_f.append(f"[{n}:a]atempo={VOICE_SPEED},aresample=48000,aformat=channel_layouts=mono,adelay={delay},volume=1.0[v{n}]")
    vox += f"[v{n}]"
# 내레이션이 나오는 동안 음악을 자동으로 낮춤(사이드체인): 음악 클라이맥스(13번)에서도 목소리가 묻히지 않게
a_f.append(f"{vox}amix=inputs=14:normalize=0,apad,atrim=0:{total:.3f},asplit=2[vx][vk]")
a_f.append("[m]aformat=channel_layouts=mono[mm];[mm][vk]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=600:makeup=1[md]")
a_f.append(f"[md][vx]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]")
audio = os.path.join(tmp, "audio.m4a")
run(a_in + ["-filter_complex", ";".join(a_f), "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", audio])

# 4) 자막(문장 단위, 글자 수 비율로 시간 나눔)
def ts(s):
    h, s = divmod(s, 3600); m, s = divmod(s, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


def wrap(p, limit=26):
    """긴 문장은 가운데에 가장 가까운 띄어쓰기에서 두 줄로 나눔(단어 중간에서 끊기지 않게)."""
    if len(p) <= limit or " " not in p:
        return p
    mid = len(p) / 2
    cut = min((i for i, ch in enumerate(p) if ch == " "), key=lambda i: abs(i - mid))
    return p[:cut] + "\n" + p[cut + 1:]


srt, k = [], 1
for n in range(1, 15):
    text = subs_text[n]
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text) if p.strip()]
    begin, span = starts[n] + LEAD, durs[f"{n:02d}"] / VOICE_SPEED
    total_chars = sum(len(p) for p in parts)
    for p in parts:
        seg = span * len(p) / total_chars
        srt.append(f"{k}\n{ts(begin)} --> {ts(begin + seg - 0.05)}\n{wrap(p)}\n")
        begin += seg; k += 1
srt_path = os.path.join(tmp, "subs.srt")
open(srt_path, "w", encoding="utf-8").write("\n".join(srt))

os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, f"AI영상_작은전구의여행_{NAME}.mp4")
srt_ff = srt_path.replace("\\", "/").replace(":", "\\:")
style = "FontName=Malgun Gothic,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=4,BackColour=&H80000000,Outline=1,Shadow=0,MarginV=12"
run(["-i", video, "-i", audio, "-vf", f"subtitles='{srt_ff}':force_style='{style}'", "-map", "0:v", "-map", "1:a",
     "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", out])
print(f"{out}  ({total:.1f}s, 음악 템포 {m_tempo:.3f})")
