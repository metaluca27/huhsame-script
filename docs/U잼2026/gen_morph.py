"""U잼 모핑 영상: 앞 프레임 → 뒤 프레임 (kling3_0 pro 1080p, 16:9, 5초, 7.5크레딧/개).

사용법:
  python docs/U잼2026/gen_morph.py 12 45     # m12(F1→F2), m45(F4→F5)
결과: Desktop/콘텐츠/U잼2026/clips/m{ab}.mp4 (이미 있으면 m{ab}_v2…)
프레임은 chain/jpg/ 의 1920×1080 JPG를 씀 (2K PNG는 업로드가 자주 실패).
"""
import json, os, shutil, subprocess, sys, time, urllib.request
from pathlib import Path

HF = shutil.which("higgsfield") or shutil.which("higgsfield.cmd")
ROOT = Path.home() / "Desktop/콘텐츠/U잼2026"
FR = ROOT / "chain/jpg"
CLIPS = ROOT / "clips"

HEAD = ("Seamless magical morph transition, locked-off static camera, no camera movement. "
        "The two small cats sitting in the bottom-left stay seated in the same place but are clearly alive: "
        "both tails slowly and continuously sway and curl side to side the whole time, ears twitch, bodies gently breathe, "
        "and they occasionally glance at each other and back at the view. ")
TAIL = " Smooth continuous transformation, no cuts."
MORPH = {
    "12": "The industrial chimneys slowly grow and transform into tall green bamboo stalks, the white steam softens into drifting morning mist, the dawn sky brightens to morning, the concrete wall turns into a wooden deck.",
    "23": "Each green bamboo stalk stays in place and directly thickens, turns grey and white, and grows windows until it becomes a tall apartment tower; the bamboo forest becomes the city skyline in one continuous growth. The mist clears to reveal a calm river reflecting the towers. No palm trees, no empty frames, the scene is never blank.",
    "34": "The high-rise buildings fold and reshape into an enormous yellow goliath gantry crane and a giant ship hull on the water, the city becomes a shipyard.",
    "45": "The long yellow crane arm breaks apart into a flock of white egrets that fly across the sky, the giant ship hull sinks and transforms into the grey back of a whale surfacing and spouting, the shipyard dissolves into open sea with sparkling waves, the quay becomes rocks.",
    "56": "The whale slowly dives while its curved back stretches into the long curved cable of a suspension bridge, the sky turns to sunset orange and purple, the bridge lights begin to glow.",
    "67": "Night falls, the bridge dissolves and its lights multiply into the thousands of golden lights of an industrial complex on the water, reflections shimmer.",
    "78": "The golden industrial lights slowly lift off and float upward, becoming fireflies and stars, the plant dissolves into dark bamboo forest silhouettes under a starry night sky.",
}


def frame(n):
    vs = sorted(FR.glob(f"F{n}*.jpg"), key=lambda p: p.stat().st_mtime)
    return vs[-1]


def hf(args, timeout=900):
    r = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8", timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout)


def submit(key, tries=4):
    a, b = key
    args = ["generate", "create", "kling3_0", "--prompt", HEAD + MORPH[key] + TAIL,
            "--start-image", str(frame(a)), "--end-image", str(frame(b)),
            "--aspect_ratio", "16:9", "--duration", "5", "--mode", "pro", "--sound", "off"]
    for i in range(tries):
        try:
            d = hf(args, timeout=300)
            return d[0] if isinstance(d, list) else d["id"]
        except Exception as e:
            print(f"m{key} 제출 실패({i + 1}/{tries}) {str(e)[:120]}", file=sys.stderr)
            time.sleep(15)
    return None


def main():
    CLIPS.mkdir(parents=True, exist_ok=True)
    jobs = []
    for key in sys.argv[1:]:
        jid = submit(key)
        if jid:
            print(f"m{key} 제출 {jid}", file=sys.stderr)
            jobs.append((key, jid))
    for key, jid in jobs:
        for i in range(3):
            try:
                res = hf(["generate", "wait", jid], timeout=1500)
                break
            except Exception as e:
                print(f"m{key} 대기 오류 {str(e)[:120]}", file=sys.stderr)
                time.sleep(20)
        else:
            print(f"m{key} 결과 못 받음 (job {jid})", file=sys.stderr)
            continue
        if res.get("status") != "completed":
            print(f"m{key} 실패 {res.get('status')}", file=sys.stderr)
            continue
        name, k = f"m{key}.mp4", 2
        while (CLIPS / name).exists():
            name, k = f"m{key}_v{k}.mp4", k + 1
        urllib.request.urlretrieve(res["result_url"], CLIPS / name)
        print(f"{name} 저장", file=sys.stderr)


if __name__ == "__main__":
    main()
