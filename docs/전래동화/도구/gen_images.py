"""장면 그림 준비.

사용법 (에피소드 폴더 안에서):
  python ../도구/gen_images.py plan                  # 장면 종류·길이·예상 크레딧 표 + 웹프롬프트.md 작성 (크레딧 0)
  python ../도구/gen_images.py z [--only S01,S07]    # base·sil 장면을 Z Image로 생성 (없는 것만, --only는 덮어쓰기)
  python ../도구/gen_images.py huh                   # [HUH:포즈] 장면에 허허서방 포즈 복사
  python ../도구/gen_images.py import images/S12.png <다운로드한 파일>   # 16:9 맞춤 + 웹 색감 보정 후 저장
  python ../도구/gen_images.py status                # 빠진 그림 목록
"""
import argparse, json, os, shutil, subprocess, sys, time, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from script_io import build_prompt, parse_script
from imaging import fit_cover, web_tone
from PIL import Image

HF = shutil.which("higgsfield") or shutil.which("higgsfield.cmd")
HUH_DIR = Path(__file__).resolve().parent.parent / "허허서방"
Z_COST = 0.15
BATCH = 4


def load():
    p = json.loads(Path("prompts.json").read_text(encoding="utf-8"))
    used = sorted({r["scene"] for r in parse_script("대본.md")})
    missing = [s for s in used if s not in p["scenes"]]
    if missing:
        sys.exit(f"prompts.json에 없는 장면: {missing}")
    return p, used


def hf(args):
    r = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout)


def cmd_plan(p, used):
    counts, web = {"base": 0, "sil": 0, "web": 0, "huh": 0}, []
    for sid in used:
        kind, prompt = build_prompt(p, sid)
        counts[kind] += 1
        size = "-" if kind == "huh" else f"{len(prompt)}자"
        have = "✅" if Path(f"images/{sid}.png").exists() else "  "
        print(f"{have} {sid} {kind:4} {size}")
        if kind == "web":
            web.append(f"## {sid}\n\n참고 그림: `docs/전래동화/그림체샘플/A_민화수묵/02.png`\n\n```\n{prompt}\n```\n")
    Path("웹프롬프트.md").write_text(
        "# 웹에서 뽑을 장면\n\n힉스필드 웹 · **Nano Banana(2 아님) · Unlimited 켜기 · 16:9 · 참고 그림 첨부** · 버튼에 숫자 없는지 확인\n\n"
        + "\n".join(web), encoding="utf-8")
    z = counts["base"] + counts["sil"]
    print(json.dumps({**counts, "z_credits": round(z * Z_COST, 2)}, ensure_ascii=False))


def cmd_z(p, used, only):
    if HF is None:
        sys.exit("higgsfield CLI를 찾을 수 없어요 (npm i -g @higgsfield/cli)")
    Path("images").mkdir(exist_ok=True)
    todo = []
    for sid in used:
        kind, prompt = build_prompt(p, sid)
        if kind not in ("base", "sil"):
            continue
        if only and sid not in only:
            continue
        if not only and Path(f"images/{sid}.png").exists():
            continue
        todo.append((sid, prompt))
    print(f"Z Image {len(todo)}장, 약 {len(todo) * Z_COST:.2f}크레딧", file=sys.stderr)
    logp = Path("images/jobs.json")
    log = json.loads(logp.read_text(encoding="utf-8")) if logp.exists() else {}
    for i in range(0, len(todo), BATCH):
        jobs = {}
        for sid, prompt in todo[i:i + BATCH]:
            jobs[sid] = hf(["generate", "create", "z_image", "--prompt", prompt, "--aspect_ratio", "16:9"])[0]
            time.sleep(1)
        for sid, jid in jobs.items():
            try:
                res = hf(["generate", "wait", jid])
                url = res.get("result_url")
                if res.get("status") == "completed" and url:
                    part = f"images/{sid}.png.part"
                    urllib.request.urlretrieve(url, part)
                    os.replace(part, f"images/{sid}.png")
                    log[sid] = {"job": jid, "status": "completed"}
                    print(f"{sid} 저장", file=sys.stderr)
                else:
                    log[sid] = {"job": jid, "status": res.get("status")}
                    print(f"{sid} 실패 {res.get('status')}", file=sys.stderr)
            except RuntimeError as e:
                log[sid] = {"job": jid, "status": "failed"}
                print(f"{sid} 실패 {e}", file=sys.stderr)
            logp.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")


def cmd_huh(p, used):
    Path("images").mkdir(exist_ok=True)
    for sid in used:
        kind, pose = build_prompt(p, sid)
        if kind == "huh":
            src = HUH_DIR / f"{pose}.png"
            if not src.exists():
                sys.exit(f"허허서방 포즈 없음: {src}")
            shutil.copy(src, f"images/{sid}.png")
            print(f"{sid} ← {pose}")


def cmd_import(dest, src):
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    web_tone(fit_cover(Image.open(src))).save(dest)
    print(f"{dest} 저장 (1920x1080, 웹 색감 보정)")


def cmd_status(p, used):
    missing = [s for s in used if not Path(f"images/{s}.png").exists()]
    print(json.dumps({"scenes": len(used), "missing": missing}, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["plan", "z", "huh", "import", "status"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    if a.cmd == "import":
        if len(a.args) != 2:
            sys.exit("사용법: import <저장할 경로> <원본 파일>")
        return cmd_import(*a.args)
    p, used = load()
    if a.cmd == "plan":
        cmd_plan(p, used)
    elif a.cmd == "z":
        cmd_z(p, used, set(filter(None, a.only.split(","))))
    elif a.cmd == "huh":
        cmd_huh(p, used)
    else:
        cmd_status(p, used)


if __name__ == "__main__":
    main()
