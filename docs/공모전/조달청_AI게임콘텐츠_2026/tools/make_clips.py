"""「작은 전구의 여행」 영상 클립: 영상/scenes/sceneNN.png를 시작 그림으로 8초 클립 생성(힉스필드 seedance1_5, 720p, 소리 없음).
결과: 영상/clips/clipNN.mp4
사용: python make_clips.py          # 아직 없는 클립만
      python make_clips.py 3 7     # 지정한 클립만 다시(덮어씀)
"""
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.normpath(os.path.join(HERE, "..", "영상"))
OUT = os.path.join(VID, "clips")
HF = shutil.which("higgsfield") or "higgsfield"   # 윈도우에선 higgsfield.CMD라 전체 경로가 필요

cfg = json.load(open(os.path.join(VID, "clip_prompts.json"), encoding="utf-8"))
only = {int(a) for a in sys.argv[1:]}
os.makedirs(OUT, exist_ok=True)


def make(clip):
    n = clip["n"]
    dst = os.path.join(OUT, f"clip{n:02d}.mp4")
    if only and n not in only:
        return None
    if not only and os.path.exists(dst):
        return f"{n:02d} skip"
    cmd = [HF, "generate", "create", "seedance1_5", "--start-image", os.path.join(VID, "scenes", f"scene{n:02d}.png"),
           "--aspect_ratio", "16:9", "--duration", "8", "--resolution", "720p", "--generate_audio", "false",
           "--prompt", cfg["style"] + " " + clip["prompt"], "--wait", "--wait-timeout", "30m"]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    urls = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("http")]
    if not urls:
        return f"{n:02d} FAIL: {(r.stderr or r.stdout).strip()[-300:]}"
    urllib.request.urlretrieve(urls[-1], dst)
    return f"{n:02d} ok"


with ThreadPoolExecutor(3) as ex:
    for msg in ex.map(make, cfg["clips"]):
        if msg:
            print(msg, flush=True)
