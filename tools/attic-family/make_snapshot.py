"""시연용 파일 만들기.

지금의 status.json과 그림을 index.html 안에 넣어 파일 한 개로 만든다.
그 파일은 수집기나 서버 없이 더블클릭만으로 열린다 (인터넷도 필요 없다).

  python make_snapshot.py            -> 상황판_시연용.html
  python make_snapshot.py 다른이름.html
"""
import base64
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent


def build():
    html = (HERE / "index.html").read_text(encoding="utf-8")
    status = json.loads((HERE / "status.json").read_text(encoding="utf-8"))
    images = {
        p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode("ascii")
        for p in sorted((HERE / "img").glob("*.webp"))
    }
    # "</" 가 요약 안에 있어도 script 태그가 중간에 닫히지 않게 한다
    def js(value):
        return json.dumps(value, ensure_ascii=False).replace("</", r"<\/")

    inject = f"<script>window.SNAPSHOT = {js(status)};\nwindow.SNAPSHOT_IMG = {js(images)};</script>\n"
    marker = "<script>\nconst COLORS"
    if marker not in html:
        raise SystemExit("index.html 모양이 달라져서 끼워 넣을 자리를 못 찾았어요")
    return html.replace(marker, inject + marker, 1), status


def main():
    out = HERE / (sys.argv[1] if len(sys.argv) > 1 else "상황판_시연용.html")
    html, status = build()
    out.write_text(html, encoding="utf-8")
    print(f"{out.name} ({out.stat().st_size // 1024} KB), {status['generated_at']} 기준")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
