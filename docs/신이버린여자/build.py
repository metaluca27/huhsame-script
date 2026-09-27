"""신이 버린 여자 프롤로그 조립 스크립트.

컷 목록(SEGMENTS)대로 1920x1080/24fps 조각을 만들고 이어 붙인 뒤
내레이션(과 음악이 있으면 음악)을 얹는다.

사용법: python build.py            → out/prologue_v1.mp4
        python build.py --music audio/music.mp3
"""
import argparse, subprocess
from pathlib import Path

ROOT = Path(__file__).parent
V = ROOT / "video"
TMP = ROOT / "out" / "seg"
FONT = "C\\:/Windows/Fonts/malgun.ttf"
TITLE_FONT = "C\\:/Windows/Fonts/batang.ttc"
NORM = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p,setsar=1"

# (이름, 종류, 소스, 시작, 길이, 추가필터)
SEGMENTS = [
    ("01_notice", "card", None, 0, 3.0, None),
    ("02_alley", "clip", "cut-0004-E-alley-1080p.mp4", 0, 6.0, None),
    ("03_horse", "clip", "cut-0010-C-horse-1080p.mp4", 0, 7.0, None),
    ("04_crowd", "clip", "cut-0017-crowd-1080p.mp4", 0.5, 4.0, None),
    ("05_witch", "clip", "cut-0022-witch-v2-1080p.mp4", 0, 5.0, None),
    ("06_altar", "clip", "cut-0027a-D-altar-1080p.mp4", 0, 5.0, None),
    ("07_disc", "clip", "cut-0027b-disc-1080p.mp4", 0, 4.0, "fade=out:st=3.4:d=0.6"),
    ("08_black", "black", None, 0, 2.0, None),
    ("09_wake", "clip", "cut-0040-G-wake-1080p.mp4", 0, 4.0, "fade=in:st=0:d=0.3"),
    ("10_wrap", "clip", "cut-0043-wrap-1080p.mp4", 0, 3.2, None),
    ("11_title", "title", "yeon-reference.jpg", 0, 3.5, None),
]
NARRATION = ("audio/priest_Gacrux.wav", 25.3)  # 제단 컷 시작 직후


def run(args):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


def textfile(name, text):
    p = TMP / f"{name}.txt"
    p.write_text(text, encoding="utf-8")
    return str(p).replace("\\", "/").replace(":", "\\:")


def build_segment(name, kind, src, start, dur, extra):
    out = TMP / f"{name}.mp4"
    if kind in ("card", "black"):
        vf = "format=yuv420p"
        if kind == "card":
            t1 = textfile("notice1", "이 영상은 생성형 AI 기반으로 만들어졌습니다")
            t2 = textfile("notice2", "Powered by Seedance")
            vf = (f"drawtext=fontfile='{FONT}':textfile='{t1}':fontcolor=white:fontsize=44:x=(w-tw)/2:y=h/2-60,"
                  f"drawtext=fontfile='{FONT}':textfile='{t2}':fontcolor=white@0.8:fontsize=36:x=(w-tw)/2:y=h/2+20,"
                  "fade=in:st=0:d=0.4,fade=out:st=2.6:d=0.4,format=yuv420p")
        run(["-f", "lavfi", "-i", f"color=black:s=1920x1080:r=24:d={dur}", "-vf", vf, "-t", str(dur), str(out)])
    elif kind == "title":
        t = textfile("title", "신이 버린 여자")
        vf = ("crop=1320:742:0:0,scale=1920:1080,zoompan=z='1+0.0005*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,"
              f"drawtext=fontfile='{TITLE_FONT}':textfile='{t}':fontcolor=white:fontsize=110:"
              "x=(w-tw)/2:y=h-220:alpha='min(1,max(0,(t-0.6)/0.8))':shadowcolor=black@0.7:shadowx=4:shadowy=4,"
              "fade=out:st=3.0:d=0.5,format=yuv420p")
        run(["-loop", "1", "-i", str(ROOT / src), "-vf", vf, "-t", str(dur), "-r", "24", str(out)])
    elif kind == "cool":
        # 뒤로 갈수록 황금빛이 빠지고 차가운 청회색으로 바뀌게
        fc = (f"[0:v]{NORM}[a];[a]split[b][c];"
              "[c]colorbalance=rs=-0.15:gs=-0.05:bs=0.2:rm=-0.12:bm=0.15,eq=saturation=0.55:brightness=-0.04,"
              "format=yuva420p,fade=in:st=1.2:d=2.5:alpha=1[cool];[b][cool]overlay,format=yuv420p[v]")
        run(["-ss", str(start), "-t", str(dur), "-i", str(V / src), "-filter_complex", fc, "-map", "[v]", "-an", str(out)])
    else:
        vf = NORM + ("," + extra if extra else "")
        run(["-ss", str(start), "-t", str(dur), "-i", str(V / src), "-vf", vf, "-an", str(out)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--music")
    ap.add_argument("--music-start", type=float, default=0, help="음악을 몇 초 지점부터 쓸지")
    ap.add_argument("--out", default="out/prologue_v1.mp4")
    a = ap.parse_args()
    TMP.mkdir(parents=True, exist_ok=True)
    segs = [build_segment(*s) for s in SEGMENTS]
    lst = TMP / "list.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in segs), encoding="utf-8")
    silent = TMP / "silent.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)])
    total = sum(s[4] for s in SEGMENTS)
    nar, at = NARRATION
    ms = int(at * 1000)
    inputs = ["-i", str(silent), "-i", str(ROOT / nar)]
    if a.music:
        inputs += ["-ss", str(a.music_start), "-i", a.music]
        # 내레이션이 나올 때 음악을 자동으로 낮춘다(사이드체인)
        mix = (f"[1:a]adelay={ms}|{ms},volume=1.6,apad,asplit=2[n][nk];"
               f"[2:a]atrim=0:{total},afade=out:st={total-2}:d=2,volume=0.55[m];"
               "[m][nk]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=400[md];"
               "[md][n]amix=inputs=2:normalize=0:duration=first[a]")
    else:
        mix = f"[1:a]adelay={ms}|{ms},volume=1.6,apad[a]"
    out = ROOT / a.out
    run([*inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "18",
         "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-t", str(total), "-movflags", "+faststart", str(out)])
    print(out, f"{total:.1f}s")


if __name__ == "__main__":
    main()
