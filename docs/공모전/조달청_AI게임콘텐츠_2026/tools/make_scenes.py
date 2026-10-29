"""「작은 전구의 여행」 장면 그림 생성: 영상/scene_prompts.json → 영상/scenes/sceneNN.png (힉스필드 nano_banana_2, 16:9 2k).
참조 이미지: 반짝이 캐릭터 시트 + (있으면) 그 단계의 게임 배지.
사용: python make_scenes.py            # 아직 없는 장면만 생성
      python make_scenes.py 3 7       # 지정한 장면만 다시 생성(덮어씀)
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
OUT = os.path.join(VID, "scenes")
SHEET = os.path.join(VID, "character_sheet_v1.png")
BADGES = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk", "img"))

HF = shutil.which("higgsfield") or "higgsfield"   # 윈도우에선 higgsfield.CMD라 전체 경로가 필요
cfg = json.load(open(os.path.join(VID, "scene_prompts.json"), encoding="utf-8"))
only = {int(a) for a in sys.argv[1:]}
os.makedirs(OUT, exist_ok=True)


def make(scene):
    n = scene["n"]
    dst = os.path.join(OUT, f"scene{n:02d}.png")
    if not only and os.path.exists(dst):
        return f"{n:02d} skip"
    if only and n not in only:
        return None
    cmd = [HF, "generate", "create", "nano_banana_2", "--aspect_ratio", "16:9", "--resolution", "2k",
           "--image", SHEET, "--prompt", cfg["style"] + " Scene: " + scene["prompt"], "--wait", "--wait-timeout", "15m"]
    if scene.get("badge"):
        cmd += ["--image", os.path.join(BADGES, f"stage{scene['badge']:02d}.png")]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    urls = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("http")]
    if not urls:
        return f"{n:02d} FAIL: {(r.stderr or r.stdout).strip()[-300:]}"
    urllib.request.urlretrieve(urls[-1], dst)
    return f"{n:02d} ok"


with ThreadPoolExecutor(4) as ex:
    for msg in ex.map(make, cfg["scenes"]):
        if msg:
            print(msg, flush=True)
