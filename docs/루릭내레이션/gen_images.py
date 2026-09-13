"""prompts.json의 장면마다 힉스필드 Z Image(세로 9:16)로 그림 1장씩 생성해 images/NN.png로 저장.

사용법 (에피소드 폴더 안에서):
  python ../gen_images.py            # 없는 그림만 생성
  python ../gen_images.py --only 05,12
  python ../gen_images.py --dry-run  # 프롬프트만 출력, 크레딧 안 씀

잡 제출은 순서대로, 대기는 한꺼번에 한다. 이미 있는 images/NN.png는 건너뛴다.
"""
import argparse, json, subprocess, sys, time, urllib.request
from pathlib import Path

MODEL = "z_image"
import shutil
HF = shutil.which("higgsfield") or shutil.which("higgsfield.cmd")
if not HF:
    sys.exit("higgsfield CLI를 찾을 수 없어요 (npm i -g @higgsfield/cli)")


def run(args):
    r = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout)


def build_prompt(p, num):
    scene = p["scenes"][num]
    scene = scene.replace("OWNER", p["owner"]).replace("RURIK", p["rurik"]).replace("PUREUM", p["pureum"])
    return f"{p['style']} Scene: {scene}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    p = json.loads(Path("prompts.json").read_text(encoding="utf-8"))
    Path("images").mkdir(exist_ok=True)
    nums = sorted(p["scenes"])
    if a.only:
        nums = [n for n in nums if n in set(a.only.split(","))]
    todo = [n for n in nums if not Path(f"images/{n}.png").exists()]
    print(f"생성 대상 {len(todo)}장 (건너뜀 {len(nums) - len(todo)}장)", file=sys.stderr)
    if a.dry_run:
        for n in todo:
            print(n, build_prompt(p, n))
        return

    # 동시 실행 제한(플러스 플랜 8개)에 걸리지 않도록 BATCH장씩 제출 → 대기 → 다음 묶음
    BATCH = 4  # Starter 플랜 이미지 동시 4개, Plus 8개 — 낮은 쪽에 맞춤
    logp = Path("images/jobs.json")
    log = json.loads(logp.read_text(encoding="utf-8")) if logp.exists() else {}
    for i in range(0, len(todo), BATCH):
        jobs = {}
        for n in todo[i:i + BATCH]:
            ids = run(["generate", "create", MODEL, "--prompt", build_prompt(p, n), "--aspect_ratio", "9:16"])
            jobs[n] = ids[0]
            log[n] = {"job": ids[0], "status": "submitted"}
            logp.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"{n} 제출 {ids[0]}", file=sys.stderr)
            time.sleep(1)
        for n, jid in jobs.items():
            res = run(["generate", "wait", jid])
            url = res.get("result_url")
            if res.get("status") != "completed" or not url:
                print(f"{n} 실패: {res.get('status')}", file=sys.stderr)
                log[n] = {"job": jid, "status": res.get("status")}
            else:
                urllib.request.urlretrieve(url, f"images/{n}.png")
                log[n] = {"job": jid, "status": "completed", "url": url}
                print(f"{n} 저장", file=sys.stderr)
            logp.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
    ok = sum(1 for v in log.values() if v["status"] == "completed")
    print(json.dumps({"ok": ok, "failed": len(log) - ok}, ensure_ascii=False))


if __name__ == "__main__":
    main()
