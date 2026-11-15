# 8컷 원화 생성 (글자 없는 그림만). 사용: python gen_cuts.py 1 2 3 ...
import json, shutil, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw"
REF = str(RAW / "00_character.png")
HF = shutil.which("higgsfield")

STYLE = (
    "One single-panel illustration for a Korean instatoon, vertical 4:5. "
    "Use the exact same tiger character as in the reference image (same round goofy minhwa-inspired face, "
    "big round yellow eyes, wavy stripes, chubby upright body, big clumsy paws). "
    "Style: modern flat-color webtoon with clean bold dark outlines, limited warm palette "
    "(ochre orange, cream, ink black, muted teal), subtle hanji paper texture. "
    "Single scene only, one image only, full-bleed artwork filling the whole canvas edge to edge, no border, no frame, no margins, not split into panels, no character sheet. "
    "Absolutely no text, no letters, no numbers, no speech bubbles, no captions, no watermark anywhere. "
)

CUTS = {
    1: "Scene: long ago, night, in front of a small traditional Korean thatched-roof cottage. The tiger wears the "
       "mother disguise (white jeogori, long cream skirt, white headscarf) and knocks on a wooden lattice paper door "
       "with a flour-dusted white paw, putting on a fake sweet smile. Through a small gap in the door, two pairs of "
       "children's eyes peek out warily. A crescent moon. Keep the top 25% of the image as calm empty night sky.",
    2: "Scene: present-day Seoul at night, a small rooftop room terrace. The tiger in a dark teal hoodie with hood up "
       "crouches on a plastic stool hunched over a glowing smartphone, scheming smug grin, face lit by the screen. "
       "In the far background the Seoul city skyline with a tall slim observation tower on a hill and apartment lights. "
       "Keep the top 25% of the image as calm empty dark sky.",
    3: "Scene: close-up of the tiger in the dark teal hoodie typing on a smartphone with two big clumsy claws, tongue "
       "sticking out in concentration, sly eyes, phone glow on the face. The tiger occupies only the bottom 45% of the "
       "image. The top 55% is a completely plain flat soft cream background with nothing in it.",
    4: "Scene: a front-facing selfie video-call view of the tiger from chest up, wearing a cheap curly black permed "
       "wig and badly applied red lipstick, forcing a nervous innocent smile, sweat drop. A cute beauty-filter effect: "
       "pink blush circles, sparkles and little hearts floating around the face. Background: messy rooftop room wall. "
       "The tiger is in the lower 65% of the image; keep the top 30% plain and uncluttered.",
    5: "Scene: front-facing selfie video-call view. The tiger wears the same cheap curly BLACK permed wig and red lipstick as in the second reference image, and holds one huge paw up "
       "close to the camera; the paw is clumsily dusted with white flour but the sharp claws and orange striped fur "
       "clearly show. Panicked wide eyes, sweating heavily. The paw and face fill the upper 65% of the image; keep the "
       "bottom 30% plain and uncluttered.",
    6: "Scene: night, the glass lobby entrance of a modern Seoul apartment building. On the wall is an intercom door "
       "keypad with plain unmarked round buttons and a small red warning light flashing. The tiger in the dark teal "
       "hoodie pokes the keypad with one giant claw that presses several buttons at once, frustrated gritted teeth. "
       "Keep the top 25% of the image calm and uncluttered (dark wall or sky).",
    7: "Scene: night, the tiger in the dark teal hoodie sits slumped on the steps outside the apartment entrance, "
       "totally defeated, teary eyes, ears drooping, its smartphone lying face-up on the ground beside it glowing. "
       "The tiger occupies only the bottom 45% of the image. The top 55% is plain calm dark teal night sky with "
       "nothing in it.",
    8: "Scene: quiet night, warm and gentle mood. A white plastic bag containing Korean rice cakes hangs on the "
       "handle of the apartment building's glass entrance door, with a small blank yellow sticky note on the bag. "
       "The tiger in the dark teal hoodie, hood down, holds the bag gently with both paws, touched, happy tears and a "
       "soft smile. A big bright full moon in the sky, warm light from the lobby. Keep the top 25% of the image as "
       "calm night sky with the moon off to one side.",
}


def run(n: int, suffix: str = ""):
    cmd = [HF, "generate", "create", "nano_banana_2", "--prompt", STYLE + CUTS[n], "--image", REF, *(["--image", str(RAW / "cut04.png")] if n == 5 else []),
           "--aspect_ratio", "4:5", "--resolution", "2k", "--wait", "--wait-timeout", "15m", "--json"]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    try:
        out = p.stdout
        job = json.loads(out[out.index("["):])[0]
        url = job["result_url"]
        dest = RAW / f"cut{n:02d}{suffix}.png"
        urllib.request.urlretrieve(url, dest)
        return f"cut {n}: ok -> {dest.name}"
    except Exception as e:
        return f"cut {n}: FAIL {e}\n{p.stdout[-400:]}\n{p.stderr[-400:]}"


if __name__ == "__main__":
    args = sys.argv[1:]
    suffix = ""
    if args and args[0].startswith("--suffix="):
        suffix = args.pop(0).split("=", 1)[1]
    nums = [int(a) for a in args] or list(CUTS)
    with ThreadPoolExecutor(max_workers=4) as ex:
        for r in ex.map(lambda n: run(n, suffix), nums):
            print(r, flush=True)
