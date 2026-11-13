"""상황판에서 식구에게 일을 시키는 통로.

- 말 걸기: 오픈클로 식구(푸름이·루릭·주주야)에게 글을 보내고 답을 받는다.
- 지금 돌리기: 헤르메스 예약 브리핑을 다음 차례에 바로 돌린다.

식구와 명령은 여기 적힌 것만 된다. 화면에서 온 글은 파일로 넘기고,
명령 줄에는 절대 끼워 넣지 않는다.
"""
import json
import re
import shutil
import subprocess
import tempfile
import threading
from datetime import datetime
from pathlib import Path

import collect

HERE = Path(__file__).parent
LOG = HERE / "commands.log"

# 화면 id -> 오픈클로 식구 이름
ASK_AGENTS = {"pureum": "main", "rurik": "lurick", "jujuya": "jujuya"}
MAX_TEXT = 2000
ASK_TIMEOUT_SEC = 300
JOB_TIMEOUT_SEC = 900  # `hermes cron run`은 브리핑이 끝날 때까지 기다린다 (보통 20초~3분)
JOB_ID = re.compile(r"^[0-9a-f]{6,32}$")
ALLOWED_HOSTS = {"127.0.0.1:8797", "localhost:8797"}
ALLOWED_ORIGINS = {"http://127.0.0.1:8797", "http://localhost:8797"}
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
HERMES_FALLBACK = collect.HOME / "AppData/Local/hermes/hermes-agent/venv/Scripts/hermes.exe"

_locks = {k: threading.Lock() for k in list(ASK_AGENTS) + ["jobs"]}


class Refused(Exception):
    """사용자에게 그대로 보여줄 거절 사유."""


def check_request(headers):
    """다른 웹사이트가 이 PC의 상황판에 몰래 명령을 보내는 것을 막는다."""
    def get(key):
        return (headers.get(key) or "").strip()

    if get("Host") not in ALLOWED_HOSTS:
        raise Refused("이 주소로는 명령을 받을 수 없어요")
    origin = get("Origin")
    if origin and origin not in ALLOWED_ORIGINS:
        raise Refused("상황판 화면에서 보낸 명령만 받아요")
    if get("X-Attic-Board") != "1":
        raise Refused("상황판 화면에서 보낸 명령만 받아요")
    if not get("Content-Type").startswith("application/json"):
        raise Refused("명령 모양이 올바르지 않아요")


def find_exe(name, fallback=None):
    path = shutil.which(name)
    if not path and fallback and Path(fallback).exists():
        path = str(fallback)
    if not path:
        raise Refused(f"{name} 프로그램을 찾지 못했어요")
    return path


def log(kind, who, text, outcome):
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(
                {"at": collect.iso(datetime.now(collect.KST)), "kind": kind, "who": who,
                 "text": text, "outcome": outcome[:500]}, ensure_ascii=False) + "\n")
    except OSError:
        pass


def parse_reply(stdout):
    """오픈클로가 돌려준 결과에서 식구의 답과 비용만 꺼낸다."""
    start = stdout.find("{")
    if start < 0:
        raise Refused("식구의 답을 읽지 못했어요")
    try:
        data = json.loads(stdout[start:])
    except ValueError:
        raise Refused("식구의 답을 읽지 못했어요")
    result = data.get("result") or {}
    texts = [p.get("text") for p in result.get("payloads") or [] if p.get("text")]
    if data.get("status") != "ok" or not texts:
        raise Refused("식구가 답을 주지 않았어요")
    cost = ((result.get("meta") or {}).get("agentMeta") or {}).get("costUsd")
    return "\n\n".join(texts), cost if isinstance(cost, (int, float)) else None


def ask(member, text, run=subprocess.run):
    if member not in ASK_AGENTS:
        raise Refused("이 식구에게는 말을 걸 수 없어요")
    text = (text or "").strip() if isinstance(text, str) else ""
    if not text:
        raise Refused("할 말을 적어주세요")
    if len(text) > MAX_TEXT:
        raise Refused(f"글이 너무 길어요 ({MAX_TEXT}자까지)")
    lock = _locks[member]
    if not lock.acquire(blocking=False):
        raise Refused("아직 앞에 시킨 일을 하는 중이에요")
    try:
        exe = find_exe("openclaw")
        with tempfile.TemporaryDirectory(prefix="attic-ask-") as d:
            msg = Path(d) / "message.txt"
            msg.write_text(text, encoding="utf-8")
            try:
                p = run(
                    [exe, "agent", "--agent", ASK_AGENTS[member], "--message-file", str(msg), "--json"],
                    capture_output=True, text=True, encoding="utf-8", errors="replace",
                    stdin=subprocess.DEVNULL, timeout=ASK_TIMEOUT_SEC, creationflags=NO_WINDOW,
                )
            except subprocess.TimeoutExpired:
                raise Refused("5분이 지나도 답이 없어서 기다리기를 멈췄어요")
        if p.returncode != 0:
            raise Refused("식구에게 전달하지 못했어요 (오픈클로 게이트웨이가 꺼져 있을 수 있어요)")
        reply, cost = parse_reply(p.stdout)
        log("ask", member, text, reply)
        return {"reply": reply, "cost_usd": cost}
    except Refused as e:
        log("ask-failed", member, text, str(e))
        raise
    finally:
        lock.release()


def known_jobs(cron_dir=None):
    """켜져 있는 예약 브리핑의 {id: 이름}."""
    cron_dir = Path(cron_dir or collect.HERMES_CRON_DIR)
    try:
        data = json.loads((cron_dir / "jobs.json").read_text(encoding="utf-8"))
        jobs = data["jobs"] if isinstance(data, dict) else data
        jobs = list(jobs.values()) if isinstance(jobs, dict) else list(jobs)
        return {j.get("id"): j.get("name", "") for j in jobs if j.get("enabled", True)}
    except (OSError, ValueError, KeyError, TypeError):
        return {}


def run_job(job_id, run=subprocess.run, cron_dir=None):
    job_id = job_id.strip() if isinstance(job_id, str) else ""
    jobs = known_jobs(cron_dir)
    if not JOB_ID.match(job_id) or job_id not in jobs:
        raise Refused("목록에 없는 브리핑이에요")
    lock = _locks["jobs"]
    if not lock.acquire(blocking=False):
        raise Refused("다른 브리핑이 도는 중이에요. 끝난 뒤에 다시 눌러주세요")
    try:
        exe = find_exe("hermes", HERMES_FALLBACK)
        try:
            p = run([exe, "cron", "run", job_id], capture_output=True, text=True, encoding="utf-8",
                    errors="replace", stdin=subprocess.DEVNULL, timeout=JOB_TIMEOUT_SEC,
                    creationflags=NO_WINDOW)
        except subprocess.TimeoutExpired:
            raise Refused("15분이 지나도 끝나지 않아서 기다리기를 멈췄어요. 브리핑은 계속 돌고 있을 수 있어요")
        if p.returncode != 0:
            raise Refused("브리핑을 맡기지 못했어요 (헤르메스가 꺼져 있을 수 있어요)")
        title = collect.job_title(jobs[job_id])
        log("run-job", job_id, title, "done")
        return {"title": title,
                "message": f"「{title}」 다 돌렸어요. 결과는 평소처럼 텔레그램으로 갔어요."}
    finally:
        lock.release()
