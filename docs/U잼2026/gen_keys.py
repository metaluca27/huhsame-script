"""U잼 「고래가 깨우는 울산」 가로판 키프레임 생성 (nano_banana_2, 16:9, 2크레딧/장).

사용법:
  python docs/U잼2026/gen_keys.py                # 없는 것만 컷당 2장(a, b)
  python docs/U잼2026/gen_keys.py --only 3,7     # 해당 컷만 새로 (c, d… 다음 글자로 추가)
결과: Desktop/콘텐츠/U잼2026/keys/cut{N}_{a,b}.png, jobs.json
"""
import argparse, json, os, shutil, subprocess, sys, time, urllib.request
from pathlib import Path

HF = shutil.which("higgsfield") or shutil.which("higgsfield.cmd")
OUT = Path.home() / "Desktop/콘텐츠/U잼2026/keys"
REF3D = [Path.home() / "Desktop/콘텐츠/WAVE2026/루릭_3D.png", Path.home() / "Desktop/콘텐츠/WAVE2026/푸름이_3D.png"]
REF2D = [Path.home() / "Desktop/콘텐츠/다락방캐릭터/루릭1.png", Path.home() / "Desktop/콘텐츠/다락방캐릭터/푸름이1.png"]
BATCH = 6

B = {
    "RURIK": "a hairless sphynx cat with pale pink wrinkled skin, large bat-like ears, bright blue eyes, wearing a black zip-up hoodie with purple sleeves and lime-green drawstrings, brown collar with a small gold bell",
    "PUREUM": "a Russian Blue cat with sleek silver-grey fur, bright green eyes, wearing a royal-blue zip-up hoodie over a white t-shirt, dark grey pants, brown collar with a small gold bell",
    "WHALE": "a massive photorealistic Korean gray whale, mottled grey skin with white barnacle patches, no dorsal fin",
    "STYLE3D": "Pixar-style 3D render of the two cats with cute chibi proportions and big expressive eyes, placed inside a photorealistic cinematic environment, volumetric light, 16:9 widescreen cinematic composition, ultra detailed.",
    "STYLE2D": "Clean 2D digital illustration with bold outlines and flat cel shading, matching the reference character art exactly, 16:9 widescreen.",
}
TAIL = " Exactly two cats, no text, no letters, no watermark."

CUTS = {
    1: ("2d", "[STYLE2D] [RURIK] and [PUREUM] sitting side by side on the edge of a concrete pier at Jangsaengpo whale harbor in Ulsan Korea, seen from behind, wide shot, calm dark-blue sea at dawn filling most of the frame, a small lighthouse and whale sculptures on the breakwater at the left, distant industrial cranes on the horizon, soft pastel sky."),
    2: ("3d", "[STYLE3D] [WHALE] bursting upward out of the sea in a huge explosion of white spray, [RURIK] and [PUREUM] standing on the whale's back amazed with arms spread, water droplets frozen in golden dawn light, Jangsaengpo harbor in the far background, dramatic low wide angle."),
    3: ("3d", "[STYLE3D] [RURIK] and [PUREUM] riding on the back of [WHALE] racing through blue waves, cutting a huge V-shaped wake, Ulsan Bridge (long suspension bridge with two white towers) spanning the whole width of the frame above, morning sun, sea spray, wide tracking shot from low side angle."),
    4: ("3d", "[STYLE3D] [RURIK] and [PUREUM] on the back of [WHALE] gliding past a real modern Korean shipyard on the Ulsan coast, an enormous yellow goliath gantry crane, a gigantic ship hull under construction in dry dock towering over the whale, welding sparks, workers tiny in the distance, bright daylight, the cats looking up in awe, wide shot showing the scale."),
    5: ("3d", "[STYLE3D] Night scene. [RURIK] and [PUREUM] on the back of [WHALE] floating calmly in dark water in front of the Ulsan petrochemical industrial complex lit up at night, thousands of golden and white lights on towers and pipes, lights reflecting on the water around the whale, the cats sitting quietly watching, wide cinematic shot."),
    6: ("3d", "[STYLE3D] Early morning. [WHALE] swimming up the wide Taehwa River in Ulsan with [RURIK] and [PUREUM] on its back, green riverbanks with reeds, a flock of white egrets taking off from the water around the whale, city apartment towers and bridges in the soft misty background, golden light, wide shot."),
    7: ("3d", "[STYLE3D] Epic climax: [WHALE] breaching fully out of the Taehwa River in a giant arc, right beside the tall dense green bamboo forest of Taehwagang National Garden on the riverbank, downtown Ulsan skyline behind, distant factory chimneys on the horizon, [RURIK] and [PUREUM] holding on mid-air laughing, sunset golden-pink sky, extreme low wide angle, water cascading off the whale."),
    8: ("3d", "[STYLE3D] [WHALE] swimming out to the open sea past the rocky coast of Daewangam Park in Ulsan, jagged reddish rocks and pine trees, a small red footbridge connecting the rocks, sunset over the ocean, [RURIK] and [PUREUM] on the whale's back seen from behind waving back toward the land, wide peaceful shot."),
    9: ("3d", "[STYLE3D] Medium close-up of [RURIK] and [PUREUM] sitting on the back of [WHALE] facing the camera, both waving and winking, soft sunset sea behind, Ulsan coastline blurred, the cats placed on the left half of the frame with empty space on the right for text."),
}


def build(text):
    for k, v in B.items():
        text = text.replace(f"[{k}]", v)
    return text + TAIL


def hf(args, timeout=120):
    r = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8", timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--n", type=int, default=2)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    logp = OUT / "jobs.json"
    log = json.loads(logp.read_text(encoding="utf-8")) if logp.exists() else {}
    only = {int(x) for x in a.only.split(",") if x}

    todo = []
    for n, (kind, text) in CUTS.items():
        if only and n not in only:
            continue
        have = sorted(p.stem for p in OUT.glob(f"cut{n}_*.png"))
        if not only and len(have) >= a.n:
            continue
        start = len(have)
        for i in range(a.n if only else a.n - len(have)):
            todo.append((f"cut{n}_{'abcdefghij'[start + i]}", kind, build(text)))
    print(f"새 제출 {len(todo)}장, 약 {len(todo) * 2}크레딧", file=sys.stderr)

    def save():
        logp.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")

    for i in range(0, len(todo), BATCH):
        jobs = []
        for name, kind, prompt in todo[i:i + BATCH]:
            refs = REF2D if kind == "2d" else REF3D
            args = ["generate", "create", "nano_banana_2", "--prompt", prompt, "--aspect_ratio", "16:9", "--resolution", "2k"]
            for r in refs:
                args += ["--image", str(r)]
            try:
                jid = hf(args)[0]
                log[name] = {"job": jid, "status": "submitted"}
                jobs.append((name, jid))
            except Exception as e:
                log[name] = {"status": "submit_failed", "error": str(e)}
                print(f"{name} 제출 실패 {e}", file=sys.stderr)
            save()
            time.sleep(1)
        for name, jid in jobs:
            try:
                res = hf(["generate", "wait", jid], timeout=900)
                url = res.get("result_url")
                if res.get("status") == "completed" and url:
                    part = OUT / f"{name}.png.part"
                    urllib.request.urlretrieve(url, part)
                    os.replace(part, OUT / f"{name}.png")
                    log[name] = {"job": jid, "status": "completed"}
                    print(f"{name} 저장", file=sys.stderr)
                else:
                    log[name] = {"job": jid, "status": res.get("status") or "failed"}
                    print(f"{name} 실패 {res.get('status')}", file=sys.stderr)
            except Exception as e:
                log[name] = {"job": jid, "status": "download_failed", "error": str(e)}
                print(f"{name} 다운로드 실패 {e}", file=sys.stderr)
            save()


if __name__ == "__main__":
    main()
