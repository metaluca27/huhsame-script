"""그림 한 장 → 허깅페이스 TRELLIS 무료 공간으로 3D 인형(GLB) 뽑기.
터미널: python gen.py <이름> [시드]   (src_<이름>.webp|png → raw/<이름>.glb)
HF_TOKEN 사용자 환경변수 필요. ai-office-3d/blender/prep_models.py 머리말과 같은 설정(texture 2048, simplify 0.95)."""
import os
import shutil
import sys

from gradio_client import Client, handle_file
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1]
seed = int(sys.argv[2]) if len(sys.argv) > 2 else 0

src = next(os.path.join(HERE, f"src_{name}.{e}") for e in ("png", "webp", "jpg") if os.path.exists(os.path.join(HERE, f"src_{name}.{e}")))
png = os.path.join(HERE, "raw", f"{name}_in.png")
Image.open(src).convert("RGB").save(png)

c = Client("trellis-community/TRELLIS", token=os.environ["HF_TOKEN"])
c.predict(api_name="/start_session")
prep = c.predict(image=handle_file(png), api_name="/preprocess_image")
shutil.copy(prep if isinstance(prep, str) else prep["path"], os.path.join(HERE, "raw", f"{name}_cut.png"))
video, _, glb = c.predict(
    image=handle_file(prep if isinstance(prep, str) else prep["path"]),
    multiimages=[], seed=seed,
    ss_guidance_strength=7.5, ss_sampling_steps=12,
    slat_guidance_strength=3.0, slat_sampling_steps=12,
    multiimage_algo="stochastic", mesh_simplify=0.95, texture_size=2048,
    api_name="/generate_and_extract_glb",
)
out = os.path.join(HERE, "raw", f"{name}.glb")
shutil.copy(glb if isinstance(glb, str) else glb["path"], out)
v = video["video"] if isinstance(video, dict) else video
if v:
    shutil.copy(v, os.path.join(HERE, "raw", f"{name}_turn.mp4"))
print("done", out, os.path.getsize(out))
