"""제출용 ZIP: landing/ssukssuk 통째(테스트 파일 제외) + 외부 주소 검사.
사용: python pack_zip.py <성명>
결과: ../제출/AI게임_실행파일_쑥쑥혁신제품_<성명>.zip  (안에 'ssukssuk/index.html')
"""
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "landing", "ssukssuk"))
OUTDIR = os.path.normpath(os.path.join(HERE, "..", "제출"))
SKIP = re.compile(r"\.test\.mjs$")
JUNK = ("thumbs.db", "desktop.ini")
EXTERNAL = re.compile(r"""(src|href)\s*=\s*["']https?://|fetch\(\s*["']https?://|url\(\s*["']?https?://|['"]https?://[^'"]+\.(js|png|css)['"]""")

if len(sys.argv) < 2:
    sys.exit("사용: python pack_zip.py <성명>")
name = sys.argv[1]
os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, f"AI게임_실행파일_쑥쑥혁신제품_{name}.zip")

problems = []
for fn in ("index.html", "ssuk-core.js", "ssuk-store.js", "ssuk-game.js", "ssuk-ui.js"):
    text = open(os.path.join(SRC, fn), encoding="utf-8").read()
    for m in EXTERNAL.finditer(text):
        problems.append(f"{fn}: {m.group(0)}")
if problems:
    sys.exit("외부 주소 발견 — 오프라인에서 안 돌 수 있음:\n" + "\n".join(problems))

count = 0
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in sorted(files):
            if SKIP.search(f) or f.startswith(".") or f.lower() in JUNK:
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, SRC).replace(os.sep, "/")
            z.write(full, "ssukssuk/" + rel)
            count += 1
    z.writestr("ssukssuk/HOW_TO_RUN.txt",
               "1. 압축을 풉니다.\n2. 'ssukssuk' 폴더 안의 index.html을 더블클릭합니다 (크롬·엣지 권장).\n"
               "3. 인터넷 연결 없이 실행됩니다.\n웹 버전: https://vaulted-bus-346411.web.app/ssukssuk\n")
print(f"{out}  ({count + 1} files, {os.path.getsize(out) // 1024} KB)")
