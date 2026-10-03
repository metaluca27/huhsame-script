"""힉스필드 CLI로 키프레임 여러 장을 병렬 생성하고 PNG로 내려받는다.

사용: python tools/hf_keyframes.py jobs.json [--model nano_banana_2] [--workers 3]
jobs.json: [{"out": "경로.png", "prompt": "..."}, ...]  (이미 있는 out은 건너뜀)
"""
import argparse, json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
TAIL = " 9:16 vertical, ultra detailed, tiny people for scale, no text, no watermark, no logo"


def find_url(obj):
    """결과 JSON에서 원본 이미지 URL을 찾는다(_min 썸네일 제외)."""
    found = []

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str) and o.startswith("http") and o.split("?")[0].lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            found.append(o)

    walk(obj)
    full = [u for u in found if "_min" not in u]
    return (full or found or [None])[0]


def run(job, model):
    if os.path.exists(job["out"]):
        return job["out"], "이미 있음"
    p = subprocess.run(
        ["higgsfield", "generate", "create", model, "--prompt", job["prompt"] + TAIL,
         "--aspect_ratio", "9:16", "--wait", "--json"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", shell=(os.name == "nt"),
    )
    try:
        data = json.loads(p.stdout)
    except Exception:
        return job["out"], "실패: " + (p.stdout + p.stderr).strip()[-300:]
    url = find_url(data)
    if not url:
        return job["out"], "실패: URL 없음"
    os.makedirs(os.path.dirname(job["out"]), exist_ok=True)
    urllib.request.urlretrieve(url, job["out"])
    return job["out"], f"OK {os.path.getsize(job['out'])/1e6:.1f}MB"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("--model", default="nano_banana_2")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    jobs = json.load(open(a.jobs, encoding="utf-8"))
    with ThreadPoolExecutor(a.workers) as ex:
        for fut in as_completed([ex.submit(run, j, a.model) for j in jobs]):
            out, msg = fut.result()
            print(os.path.basename(out), msg, flush=True)


if __name__ == "__main__":
    main()
