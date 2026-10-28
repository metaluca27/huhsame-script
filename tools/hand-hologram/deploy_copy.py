"""tools/hand-hologram → landing/hand 로 복사 (index.html 에 <base href="/hand/"> 넣기). 그다음 firebase deploy."""
import shutil
from pathlib import Path

HERE = Path(__file__).parent
DST = HERE.parents[1] / "landing" / "hand"
(DST / "models").mkdir(parents=True, exist_ok=True)
for name in ["main.js", "hands.js", "holo.js", "sfx.js", "recorder.js"]:
    shutil.copy(HERE / name, DST / name)
for glb in (HERE / "models").glob("*.glb"):
    shutil.copy(glb, DST / "models" / glb.name)
html = (HERE / "index.html").read_text(encoding="utf-8")
base = '<base href="/hand/">  <!-- Firebase trailingSlash:false 라 /hand 에서 ./main.js 가 루트로 새지 않게 -->'
(DST / "index.html").write_text(html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + base, 1), encoding="utf-8")
print("copied to", DST)
