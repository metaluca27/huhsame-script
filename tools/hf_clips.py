"""힉스필드 CLI로 키프레임 → 영상을 순서대로 생성해 mp4로 내려받는다.

사용: python tools/hf_clips.py jobs.json [--model kling3_0] [--duration 5] [--mode std]
jobs.json: [{"image": "키프레임.png", "out": "경로.mp4", "prompt": "..."}, ...]
무료 플랜은 동시 생성 1개라 순차 실행. 이미 있는 out은 건너뜀.
"""
import argparse, json, os, subprocess, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def find_url(obj):
    found = []

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str) and o.startswith("http") and o.split("?")[0].lower().endswith(".mp4"):
            found.append(o)

    walk(obj)
    full = [u for u in found if "_min" not in u]
    return (full or found or [None])[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("--model", default="wan3_0")  # 무료 플랜에서 되는 영상 모델 (2026-10 확인)
    ap.add_argument("--duration", default="5")
    ap.add_argument("--mode", default="std")
    a = ap.parse_args()
    jobs = json.load(open(a.jobs, encoding="utf-8"))
    for j in jobs:
        name = os.path.basename(j["out"])
        if os.path.exists(j["out"]):
            print(name, "이미 있음", flush=True)
            continue
        cmd = ["higgsfield", "generate", "create", a.model, "--prompt", j["prompt"],
               "--start-image", j["image"], "--aspect_ratio", "9:16", "--duration", a.duration,
               "--wait", "--wait-timeout", "20m", "--json"]
        if a.model.startswith("kling"):  # mode·sound는 Kling 전용 파라미터 (Kling은 유료 플랜 필요)
            cmd += ["--mode", a.mode, "--sound", "off"]
        p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           shell=(os.name == "nt"))
        try:
            url = find_url(json.loads(p.stdout))
        except Exception:
            url = None
        if not url:
            print(name, "실패:", (p.stdout + p.stderr).strip()[-400:], flush=True)
            continue
        os.makedirs(os.path.dirname(j["out"]), exist_ok=True)
        urllib.request.urlretrieve(url, j["out"])
        print(name, f"OK {os.path.getsize(j['out'])/1e6:.1f}MB", flush=True)


if __name__ == "__main__":
    main()
