"""여러 키프레임을 Sora 2로 병렬 생성. jobs.json: [{"image","out","prompt"}, ...]

사용: python tools/sora_batch.py jobs.json [--workers 3] [--seconds 8]
"""
import argparse, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
CLIP = os.path.join(HERE, "sora_clip.py")


def run(job, seconds):
    if os.path.exists(job["out"]):
        return job["out"], 0, "이미 있음, 건너뜀"
    p = subprocess.run(
        [sys.executable, CLIP, job["image"], job["out"], job["prompt"], "--seconds", seconds],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    tail = (p.stdout + p.stderr).strip().splitlines()[-2:]
    return job["out"], p.returncode, " | ".join(tail)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--seconds", default="8")
    a = ap.parse_args()
    with open(a.jobs, encoding="utf-8") as f:
        jobs = json.load(f)
    print(f"{len(jobs)}개 시작, 동시 {a.workers}", flush=True)
    fails = 0
    with ThreadPoolExecutor(a.workers) as ex:
        futs = [ex.submit(run, j, a.seconds) for j in jobs]
        for fut in as_completed(futs):
            out, rc, msg = fut.result()
            fails += rc != 0
            print(("OK   " if rc == 0 else "FAIL ") + os.path.basename(out) + "  " + msg, flush=True)
    print(f"완료: 실패 {fails}개", flush=True)


if __name__ == "__main__":
    main()
