"""U잼 「같은 자리, 다른 얼굴」 모핑 체인 키프레임 (nano_banana_2, 16:9, 2크레딧/장).

F1은 새로 그리고, F2부터는 바로 앞 프레임을 참조로 넣어 같은 구도·같은 고양이 자리를 유지한 채 풍경만 바꾼다.
사용법:
  python docs/U잼2026/gen_chain.py            # 없는 프레임만 순서대로
  python docs/U잼2026/gen_chain.py --redo 3   # F3을 새로 (F3_v2… 로 저장, 이후 프레임은 최신 버전을 참조)
결과: Desktop/콘텐츠/U잼2026/chain/F{n}.png (여러 버전이면 가장 최근 것을 다음 프레임 참조로 씀)
"""
import argparse, json, os, shutil, subprocess, sys, urllib.request
from pathlib import Path

HF = shutil.which("higgsfield") or shutil.which("higgsfield.cmd")
OUT = Path.home() / "Desktop/콘텐츠/U잼2026/chain"
CATS = [Path.home() / "Desktop/콘텐츠/WAVE2026/루릭_3D.png", Path.home() / "Desktop/콘텐츠/WAVE2026/푸름이_3D.png"]

CATS_TXT = ("two small Pixar-style 3D chibi cats sitting side by side in the bottom-left corner of the frame, "
            "seen from behind, small in the frame (about one sixth of the frame height), looking at the view: "
            "on the left a hairless pink sphynx cat with large bat-like ears in a black hoodie with purple sleeves, "
            "on the right a Russian Blue cat with silver-grey fur in a royal-blue hoodie")
KEEP = ("Keep exactly the same camera angle, horizon line, composition and framing as the reference image. "
        "Keep the two cats exactly where they are, same size, same pose, seen from behind. Only the scenery changes: ")
STYLE = " Photorealistic cinematic landscape, 16:9 widescreen, the cats are the only stylized 3D elements. No text, no letters, no watermark."

FRAMES = {
    1: "Wide cinematic shot at blue-hour dawn: a dense row of tall petrochemical plant chimneys and towers of the Ulsan industrial complex "
       "rising vertically across the frame, thick white steam drifting between them, soft pink-orange dawn light on the horizon, "
       "the cats sit on a low concrete wall in the foreground. " + CATS_TXT + ".",
    2: KEEP + "the chimneys become tall green bamboo stalks of the Taehwagang Simni bamboo forest standing in exactly the same positions and heights, "
       "the white steam becomes soft morning mist floating between the bamboo, early morning golden light, the concrete wall becomes a wooden riverside deck.",
    3: KEEP + "the bamboo stalks become tall downtown Ulsan high-rise buildings and apartment towers along the Taehwa River in exactly the same positions, "
       "the mist clears into a bright clear late-morning sky, the river reflects the city, the wooden deck becomes a riverside promenade railing.",
    4: KEEP + "the high-rise buildings become the Ulsan shipyard: an enormous yellow goliath gantry crane spanning the frame and a gigantic ship hull "
       "on the water below it, bright midday sun, the railing becomes a harbor quay edge.",
    5: KEEP + "the shipyard becomes the open East Sea: the long crane arm dissolves into a flock of white egrets flying across the sky in the same line, "
       "and the giant ship hull becomes the grey back of a Korean gray whale surfacing in the same place and size, afternoon sunlight sparkling on the waves, "
       "the quay becomes a rocky shore.",
    6: KEEP + "the scene becomes sunset at Ulsan Bridge: the curved back of the whale becomes the graceful curved main cable of the long white suspension bridge "
       "in the same arc, the bridge lights just turning on, orange-purple sunset sky reflected on the sea, the rocky shore becomes a seaside viewpoint wall.",
    7: KEEP + "the scene becomes night: the bridge becomes the Ulsan petrochemical industrial complex lit up with thousands of golden and white lights "
       "on towers and pipes in the same positions, the lights reflecting on the dark water, deep blue night sky.",
    8: KEEP + "the industrial lights rise and become stars and fireflies: tall bamboo forest silhouettes of Taehwagang under a deep starry night sky "
       "full of stars, glowing fireflies floating between the bamboo where the plant lights were, calm and magical, "
       "the two cats looking up at the stars, the right side of the sky left calm and empty for title text.",
}


def hf(args, timeout=900):
    r = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8", timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout)


def latest(n):
    vs = sorted(OUT.glob(f"F{n}*.png"), key=lambda p: p.stat().st_mtime)
    return vs[-1] if vs else None


REVERSE_F1 = (KEEP + "the bamboo stalks become tall petrochemical plant chimneys and towers of the Ulsan industrial complex in exactly the same positions "
              "and heights, the morning mist becomes thick white steam drifting between them, blue-hour dawn light with a pink-orange horizon, "
              "the wooden deck becomes a concrete wall.")


def gen(n, ref=None):
    refs = list(CATS)
    if ref:
        refs = [Path(ref)] + refs
    elif n > 1:
        prev = latest(n - 1)
        if prev is None:
            sys.exit(f"F{n - 1}이 없어요")
        refs = [prev] + refs
    prompt = REVERSE_F1 if (ref and n == 1) else FRAMES[n]
    args = ["generate", "create", "nano_banana_2", "--prompt", prompt + STYLE, "--aspect_ratio", "16:9", "--resolution", "2k"]
    for r in refs:
        args += ["--image", str(r)]
    jid = hf(args, timeout=120)[0]
    res = hf(["generate", "wait", jid])
    if res.get("status") != "completed" or not res.get("result_url"):
        sys.exit(f"F{n} 실패 {res.get('status')}")
    name = f"F{n}.png"
    k = 2
    while (OUT / name).exists():
        name, k = f"F{n}_v{k}.png", k + 1
    part = OUT / (name + ".part")
    urllib.request.urlretrieve(res["result_url"], part)
    os.replace(part, OUT / name)
    print(f"{name} 저장 (job {jid})", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--redo", type=int)
    ap.add_argument("--ref", help="앞 프레임 대신 이 그림을 구도 기준으로 (F1을 F2에 맞출 때)")
    ap.add_argument("--upto", type=int, default=len(FRAMES))
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.redo:
        return gen(a.redo, a.ref)
    for n in range(1, a.upto + 1):
        if latest(n) is None:
            gen(n)


if __name__ == "__main__":
    main()
