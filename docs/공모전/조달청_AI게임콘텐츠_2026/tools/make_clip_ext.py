"""긴 장면용 이어지는 클립: 첫 클립 마지막 장면(clips/lastframes/lastNN.png)에서 출발해 clipNNb.mp4 생성 (clip_prompts.json의 extensions)."""
import json, os, shutil, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.normpath(os.path.join(HERE, "..", "영상"))
HF = shutil.which("higgsfield") or "higgsfield"
cfg = json.load(open(os.path.join(VID, "clip_prompts.json"), encoding="utf-8"))
only = {int(a) for a in sys.argv[1:]}


def make(e):
    n = e["n"]
    if only and n not in only:
        return None
    dst = os.path.join(VID, "clips", f"clip{n:02d}b.mp4")
    if not only and os.path.exists(dst):
        return f"{n:02d}b skip"
    cmd = [HF, "generate", "create", "seedance1_5", "--start-image", os.path.join(VID, "clips", "lastframes", f"last{n:02d}.png"),
           "--aspect_ratio", "16:9", "--duration", "8", "--resolution", "720p", "--generate_audio", "false",
           "--prompt", cfg["style"] + " " + e["prompt"], "--wait", "--wait-timeout", "30m"]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    urls = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("http")]
    if not urls:
        return f"{n:02d}b FAIL: {(r.stderr or r.stdout).strip()[-300:]}"
    urllib.request.urlretrieve(urls[-1], dst)
    return f"{n:02d}b ok"


with ThreadPoolExecutor(3) as ex:
    for m in ex.map(make, cfg["extensions"]):
        if m:
            print(m, flush=True)
