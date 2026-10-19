"""제출용 ZIP: 파일 하나로 도는 html(스크립트·그림 내장) + 외부 주소 검사.
사용: python pack_zip.py <성명>
결과: ../제출/AI게임_실행파일_쑥쑥혁신제품_<성명>.zip  (안에 바로실행 html 하나 + 안내문 + 라이선스)
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

def build_standalone():
    """파일 하나로 도는 html: 스크립트를 본문에 넣고 배지 그림은 data URI(384px)로.
    ZIP을 풀지 않고 안에서 바로 더블클릭해도(윈도우가 그 파일 하나만 꺼내 엶) 실행되게."""
    import base64
    import io
    from PIL import Image

    html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
    start = html.rfind("<script>", 0, html.index("var files"))
    end = html.index("</script>", start) + len("</script>")
    core = open(os.path.join(SRC, "ssuk-core.js"), encoding="utf-8").read()
    for n in range(1, 12):
        im = Image.open(os.path.join(SRC, "img", f"stage{n:02d}.png")).resize((384, 384), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
        uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
        core = core.replace(f"./img/stage{n:02d}.png", uri)
    parts = [open(os.path.join(SRC, "vendor", "matter.min.js"), encoding="utf-8").read(), core]
    parts += [open(os.path.join(SRC, f), encoding="utf-8").read() for f in ("ssuk-store.js", "ssuk-game.js", "ssuk-ui.js")]
    boot = ("(function () { var chain = document.getElementById('start-chain');"
            " SsukCore.STAGES.forEach(function (s) { var im = document.createElement('img'); im.src = s.img; im.alt = s.name; im.title = s.name; chain.appendChild(im); });"
            " SsukUI.boot(); })();")
    inline = "".join("<script>\n" + p.replace("</script", "<\\/script") + "\n</script>\n" for p in parts + [boot])
    return html[:start] + inline + html[end:]


# Gmail은 압축 안의 .js 파일을 보안상 차단 → 파일 하나로 도는 html + 안내문 + 라이선스만 넣음
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("쑥쑥혁신제품_바로실행.html", build_standalone())
    z.write(os.path.join(SRC, "vendor", "LICENSE-matter-js.txt"), "LICENSE-matter-js.txt")
    z.writestr("HOW_TO_RUN.txt",
               "'쑥쑥혁신제품_바로실행.html'을 더블클릭하세요 (크롬·엣지 권장). 압축을 풀지 않아도, 인터넷 연결 없이도 실행됩니다.\n"
               "웹 버전: https://vaulted-bus-346411.web.app/ssukssuk\n"
               "물리엔진 Matter.js(MIT 라이선스)를 html 안에 포함했습니다. 라이선스 전문: LICENSE-matter-js.txt\n")
with zipfile.ZipFile(out) as z:
    names = z.namelist()
blocked = [n for n in names if n.lower().endswith((".js", ".exe", ".bat", ".cmd", ".vbs", ".jar"))]
if blocked:
    sys.exit(f"메일에서 막히는 파일이 들어감: {blocked}")
print(f"{out}  ({len(names)} files, {os.path.getsize(out) // 1024} KB)")
