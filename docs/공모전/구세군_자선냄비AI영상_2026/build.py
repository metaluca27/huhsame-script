"""「작은 종소리」 편집 — 그림 7장 + AI 영상 2컷 + 자막 카드 → 1920x1080 mp4 (60초 이내)

python build.py            # 전체 빌드 → 최종/작은종소리.mp4
"""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
K = os.path.join(HERE, "키프레임")
V = os.path.join(HERE, "영상")
A = os.path.join(HERE, "음원")
T = os.path.join(HERE, "_tmp")
OUT = os.path.join(HERE, "최종")
FONT = "C\\:/Windows/Fonts/NotoSansKR-VF.ttf"
FPS = 30
XF = 0.8  # 크로스페이드 길이(초)
BGM = os.path.join(A, "winter_51s.m4a")  # Higgsfield Sonilo Music, 51초 한 곡 (반복 없음)

# (종류, 소스, 길이, 움직임) — 움직임: (시작줌, 끝줌, 초점x, 초점y)
SHOTS = [
    ("img", "k1.png", 7, (1.00, 1.10, 0.50, 0.55)),
    ("img", "k2.png", 6, (1.12, 1.12, 0.40, 0.60, 0.60)),  # 좌→우 흐르기
    ("img", "k3.png", 6, (1.00, 1.18, 0.38, 0.42)),
    ("vid", "v4.mp4", 6, None),
    ("vid", "v5.mp4", 6, None),
    ("img", "k6.png", 7, (1.00, 1.15, 0.72, 0.55)),
    ("img", "k7.png", 8, (1.14, 1.00, 0.50, 0.70)),
]

CARDS = [
    (4.5, ["작은 종소리 하나가,", "누군가의 겨울을 밝힙니다"], 64),
    (3.5, ["Light of Life", "2026 구세군 자선냄비"], 64),
    (4.0, ["이 영상은 2026 자선냄비 나눔 AI 영상공모전 제출을 위해 만들어졌으며,", "생성형 AI 기반으로 제작되었습니다"], 40),
]


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\u2019").replace(",", "\\,")


def img_clip(i, src, dur, mv):
    n = int(dur * FPS)
    z0, z1 = mv[0], mv[1]
    if len(mv) == 5:  # 좌우 패닝
        x0, x1, fy = mv[2], mv[4], mv[3]
        z = f"{z0}"
        x = f"(iw-iw/zoom)*({x0}+({x1}-{x0})*on/{n})"
        y = f"(ih-ih/zoom)*{fy}"
    else:
        fx, fy = mv[2], mv[3]
        z = f"{z0}+({z1}-{z0})*on/{n}"
        x = f"(iw-iw/zoom)*{fx}"
        y = f"(ih-ih/zoom)*{fy}"
    vf = (f"scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='{z}':x='{x}':y='{y}':d={n}:s=1920x1080:fps={FPS},"
          f"format=yuv420p")
    out = os.path.join(T, f"s{i}.mp4")
    run(["ffmpeg", "-y", "-i", os.path.join(K, src), "-vf", vf, "-frames:v", str(n),
         "-c:v", "libx264", "-crf", "16", "-preset", "medium", out])
    return out


def vid_clip(i, src, dur):
    out = os.path.join(T, f"s{i}.mp4")
    run(["ffmpeg", "-y", "-i", os.path.join(V, src), "-t", str(dur), "-an",
         "-vf", f"scale=1920:1080:flags=lanczos,fps={FPS},format=yuv420p",
         "-c:v", "libx264", "-crf", "16", "-preset", "medium", out])
    return out


def card_clip(i, dur, lines, size):
    out = os.path.join(T, f"c{i}.mp4")
    gap = int(size * 1.6)
    top = 540 - gap * (len(lines) - 1) // 2
    dt = []
    for j, ln in enumerate(lines):
        dt.append(f"drawtext=fontfile='{FONT}':text='{esc(ln)}':fontsize={size}:fontcolor=0xF6E7C1:"
                  f"x=(w-text_w)/2:y={top + j * gap}-text_h/2:"
                  f"alpha='min(1,t/0.8)*min(1,({dur}-t)/0.8)'")
    vf = ",".join(dt) + ",format=yuv420p"
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=0x0B1026:s=1920x1080:r={FPS}:d={dur}",
         "-vf", vf, "-t", str(dur), "-c:v", "libx264", "-crf", "16", out])
    return out


def xfade_all(clips, durs, out):
    inputs = sum([["-i", c] for c in clips], [])
    parts, last, off = [], "[0:v]", 0.0
    for k in range(1, len(clips)):
        off += durs[k - 1] - XF
        lab = f"[x{k}]"
        parts.append(f"{last}[{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lab}")
        last = lab
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(parts), "-map", last,
         "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", out])
    return off + durs[-1]


def sfx():
    """종소리·동전 소리·바람을 직접 합성 (외부 음원 없음)."""
    bell = os.path.join(A, "bell.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
         "aevalsrc='(0.5*sin(2*PI*1320*t)+0.3*sin(2*PI*2640*t)+0.2*sin(2*PI*3960*t)+0.15*sin(2*PI*1980*t))*exp(-1.6*t)':s=48000:d=4",
         "-af", "aecho=0.8:0.6:120|240:0.3|0.15,volume=0.8", bell])
    coin = os.path.join(A, "coin.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
         "aevalsrc='(0.6*sin(2*PI*3100*t)+0.4*sin(2*PI*4700*t))*exp(-9*t)':s=48000:d=1", "-af", "volume=0.6", coin])
    wind = os.path.join(A, "wind.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anoisesrc=color=brown:amplitude=0.25:d=14:r=48000",
         "-af", "lowpass=f=500,afade=t=in:d=2,afade=t=out:st=10:d=4", wind])
    return bell, coin, wind


def mix(video, total, starts):
    bell, coin, wind = sfx()
    out = os.path.join(OUT, "작은종소리.mp4")
    s3, s4 = starts[2], starts[3]
    fc = (
        f"[1:a]atrim=0:{total},afade=t=in:d=1,afade=t=out:st={total - 2.5}:d=2.5,volume=0.6[m];"
        f"[2:a]adelay={int((starts[1] + 1.5) * 1000)}|{int((starts[1] + 1.5) * 1000)},volume=0.25[b0];"  # 멀리 종소리
        f"[3:a]adelay={int((s3 + 3.0) * 1000)}|{int((s3 + 3.0) * 1000)}[c];"
        f"[4:a]adelay={int((s4 + 0.6) * 1000)}|{int((s4 + 0.6) * 1000)},volume=1.0[b1];"
        f"[5:a]volume=0.5[w];"
        f"[6:a]adelay={int((total - 11.5) * 1000)}|{int((total - 11.5) * 1000)},volume=0.45[b2];"
        f"[m][b0][c][b1][w][b2]amix=inputs=6:normalize=0,alimiter=limit=0.95[a]"
    )
    run(["ffmpeg", "-y", "-i", video, "-i", BGM, "-i", bell, "-i", coin, "-i", bell, "-i", wind, "-i", bell,
         "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-t", f"{total:.2f}", "-movflags", "+faststart", out])
    return out


def main():
    os.makedirs(T, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    clips, durs = [], []
    for i, (kind, src, dur, mv) in enumerate(SHOTS):
        clips.append(img_clip(i, src, dur, mv) if kind == "img" else vid_clip(i, src, dur))
        durs.append(dur)
    for j, (dur, lines, size) in enumerate(CARDS):
        clips.append(card_clip(j, dur, lines, size))
        durs.append(dur)
    starts, t = [], 0.0
    for d in durs:
        starts.append(t)
        t += d - XF
    silent = os.path.join(T, "silent.mp4")
    total = xfade_all(clips, durs, silent)
    out = mix(silent, total, starts)
    print(f"완료: {out} ({total:.1f}초)")


if __name__ == "__main__":
    main()
