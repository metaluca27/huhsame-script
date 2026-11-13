"""다락방 식구들 상황판 수집기.

식구들이 남긴 기록을 읽기 전용으로 열어 status.json 한 장으로 요약한다.
AI를 부르지 않고, 식구들의 설정이나 기록은 바꾸지 않는다.

  python collect.py          1분마다 계속 갱신
  python collect.py --once   한 번만 갱신
"""
import json
import os
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

KST = timezone(timedelta(hours=9))
HOME = Path.home()
OPENCLAW_DIR = HOME / ".openclaw" / "agents"
HERMES_CRON_DIR = HOME / "AppData" / "Local" / "hermes" / "cron"
REPO = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("status.json")

INTERVAL_SEC = 60
JOURNAL_MAX = 30
SILENT_HOURS = 24

# (화면 id, 이름, 한 줄 소개, 오픈클로 폴더 이름)
OPENCLAW_MEMBERS = [
    ("pureum", "푸름이", "오픈클로 맏이", "main"),
    ("rurik", "루릭", "음악·쇼츠", "lurick"),
    ("jujuya", "주주야", "오픈클로 막내", "jujuya"),
]
HERMES_OWNERS = ("루나", "노바", "헤르미")
HERMES_FALLBACK = "헤르미"  # 이름이 안 맞는 예약 작업은 헤르메스 주인인 헤르미 몫

CHANNEL_LINES = {
    "main": "직접 대화",
    "dashboard": "오픈클로 화면에서 대화",
    "telegram": "텔레그램에서 대화",
    "discord": "디스코드에서 대화",
    "slack": "슬랙에서 대화",
    "kakao-talkchannel": "카톡 상담 응대",
}


def iso(dt):
    return dt.astimezone(KST).isoformat(timespec="seconds")


def day_start(now):
    return now.astimezone(KST).replace(hour=0, minute=0, second=0, microsecond=0)


def parse_iso(text):
    if not text:
        return None
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=KST)


def result(state, last_at=None, today_count=0, last_line="", detail="", events=None):
    """식구 한 명(또는 출처 하나)을 읽은 결과. events는 일지용 [(시각, 한 줄)]."""
    return {
        "state": state,
        "last_at": iso(last_at) if last_at else None,
        "today_count": today_count,
        "last_line": last_line,
        "detail": detail,
        "events": [(iso(at), line) for at, line in (events or [])],
    }


def unreadable(why):
    return result("unreadable", today_count=None, detail=why)


def open_readonly(path):
    return sqlite3.connect(f"{Path(path).as_uri()}?mode=ro", uri=True)


# ── 오픈클로 식구 ─────────────────────────────────────────────

def channel_line(session_key):
    """대화 이름 대신 채널만 알려준다. 이름에는 손님 정보가 섞일 수 있다."""
    parts = (session_key or "").split(":")
    channel = parts[2] if len(parts) > 2 else ""
    return CHANNEL_LINES.get(channel, "대화")


def read_openclaw(db_path, now):
    try:
        con = open_readonly(db_path)
    except sqlite3.Error as e:
        return unreadable(f"기록 파일을 못 열었어요 ({e})")
    try:
        start_ms = int(day_start(now).timestamp() * 1000)
        (today,) = con.execute(
            "SELECT count(*) FROM transcript_event_identities "
            "WHERE event_type='message' AND created_at >= ?",
            (start_ms,),
        ).fetchone()
        rows = con.execute(
            "SELECT e.created_at, w.session_key FROM transcript_event_identities e "
            "LEFT JOIN session_windows w ON w.session_id = e.session_id "
            "WHERE e.event_type='message' ORDER BY e.created_at DESC LIMIT 40"
        ).fetchall()
    except sqlite3.Error as e:
        return unreadable(f"기록 모양이 달라졌어요 ({e})")
    finally:
        con.close()

    events = []
    for created_ms, key in rows:
        line = channel_line(key)
        # 같은 채널에서 연달아 오간 말은 일지에 한 줄로 묶는다
        if events and events[-1][1] == line:
            continue
        events.append((datetime.fromtimestamp(created_ms / 1000, KST), line))
    if not events:
        return result("quiet")
    last_at, last_line = events[0]
    return result("active" if today else "quiet", last_at, today, last_line, events=events)


# ── 헤르메스 식구 ─────────────────────────────────────────────

def hermes_owner(job_name):
    for who in HERMES_OWNERS:
        if job_name.startswith(who):
            return who
    return HERMES_FALLBACK


def job_title(job_name):
    return job_name.split("|", 1)[1].strip() if "|" in job_name else job_name.strip()


def read_hermes(cron_dir, now):
    cron_dir = Path(cron_dir)
    try:
        data = json.loads((cron_dir / "jobs.json").read_text(encoding="utf-8"))
        jobs = data["jobs"] if isinstance(data, dict) else data
        jobs = list(jobs.values()) if isinstance(jobs, dict) else list(jobs)
    except (OSError, ValueError, KeyError, TypeError) as e:
        why = f"예약 작업 목록을 못 읽었어요 ({type(e).__name__})"
        return {who: unreadable(why) for who in HERMES_OWNERS}

    start = day_start(now)
    by_id = {j.get("id"): j for j in jobs}

    # 실행 기록: (시각, 작업 id, 성공 여부). 못 읽으면 jobs.json의 마지막 실행으로 대신한다.
    runs = []
    try:
        con = open_readonly(cron_dir / "executions.db")
        try:
            for job_id, status, started in con.execute(
                "SELECT job_id, status, started_at FROM executions "
                "ORDER BY started_at DESC LIMIT 60"
            ):
                at = parse_iso(started)
                if at and job_id in by_id:
                    runs.append((at, job_id, status == "completed"))
        finally:
            con.close()
    except sqlite3.Error:
        for j in jobs:
            at = parse_iso(j.get("last_run_at"))
            if at:
                runs.append((at, j.get("id"), j.get("last_status") == "ok"))
        runs.sort(key=lambda r: r[0], reverse=True)

    out = {}
    for who in HERMES_OWNERS:
        mine = [j for j in jobs if hermes_owner(j.get("name", "")) == who]
        ids = {j.get("id") for j in mine}
        my_runs = [r for r in runs if r[1] in ids]
        events = [
            (at, f"{job_title(by_id[jid].get('name', ''))} {'완료' if ok else '실패'}")
            for at, jid, ok in my_runs
        ]
        today = sum(1 for at, _, _ in my_runs if at >= start)
        failing = [
            job_title(j.get("name", ""))
            for j in mine
            if j.get("enabled", True) and j.get("last_status") not in ("ok", None)
        ]
        if failing:
            state, detail = "error", "마지막 실행 실패: " + ", ".join(failing)
        else:
            state, detail = ("active" if today else "quiet"), ""
        last_at, last_line = events[0] if events else (None, "")
        r = result(state, last_at, today, last_line, detail, events)
        # 상황판의 "지금 돌리기" 버튼이 쓰는 목록
        r["jobs"] = [
            {
                "id": j.get("id"),
                "title": job_title(j.get("name", "")),
                "last_at": iso(parse_iso(j.get("last_run_at"))) if parse_iso(j.get("last_run_at")) else None,
                "ok": j.get("last_status") in ("ok", None),
            }
            for j in mine
            if j.get("enabled", True) and j.get("id")
        ]
        out[who] = r
    return out


# ── 클로 ─────────────────────────────────────────────────────

def read_git(repo, now):
    try:
        p = subprocess.run(
            ["git", "-C", str(repo), "log", "-50", "--pretty=format:%cI%x09%s"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=20,
            stdin=subprocess.DEVNULL,
            # 창 없는 pythonw 로 돌 때 git 이 터미널 창을 띄우지 않게 한다
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.SubprocessError) as e:
        return unreadable(f"작업 기록을 못 읽었어요 ({type(e).__name__})")
    if p.returncode != 0:
        return unreadable("작업 기록을 못 읽었어요 (git 저장소가 아니에요)")
    events = []
    for row in p.stdout.splitlines():
        stamp, _, subject = row.partition("\t")
        at = parse_iso(stamp)
        if at:
            events.append((at, subject.strip()))
    if not events:
        return result("quiet")
    start = day_start(now)
    today = sum(1 for at, _ in events if at >= start)
    return result("active" if today else "quiet", events[0][0], today, events[0][1], events=events)


# ── 조립 ─────────────────────────────────────────────────────

def source_line(label, r, unit="건"):
    if r["state"] == "unreadable":
        return f"{label}: 기록 못 읽음"
    last = f"마지막 {r['last_at'][5:16].replace('T', ' ')}" if r["last_at"] else "기록 없음"
    return f"{label}: 오늘 {r['today_count']}{unit} · {last}"


def merge_nova(chat, briefing):
    """노바는 카톡 상담(오픈클로)과 주간 브리핑(헤르메스) 두 출처를 카드 한 장에 합친다."""
    parts = [chat, briefing]
    readable = [p for p in parts if p["state"] != "unreadable"]
    lines = [source_line("카톡 상담", chat), source_line("주간 브리핑", briefing, "회")]
    if not readable:
        merged = unreadable("두 기록 모두 못 읽었어요")
    else:
        newest = max(readable, key=lambda p: p["last_at"] or "")
        today = sum(p["today_count"] for p in readable)
        if any(p["state"] == "error" for p in readable):
            state = "error"
        else:
            state = "active" if today else "quiet"
        merged = {
            "state": state,
            "last_at": newest["last_at"],
            "today_count": today,
            "last_line": newest["last_line"],
            "detail": " / ".join(p["detail"] for p in parts if p["detail"]),
            "events": sorted(chat["events"] + briefing["events"], reverse=True),
        }
    merged["lines"] = lines
    merged["jobs"] = briefing.get("jobs", [])
    return merged


def build_status(now, openclaw_dir=OPENCLAW_DIR, hermes_cron_dir=HERMES_CRON_DIR, repo=REPO):
    openclaw_dir = Path(openclaw_dir)

    def oc(folder):
        return read_openclaw(openclaw_dir / folder / "agent" / "openclaw-agent.sqlite", now)

    hermes = read_hermes(hermes_cron_dir, now)
    nova_chat = oc("nova")

    members = []
    openclaw_results = [nova_chat]
    for mid, name, role, folder in OPENCLAW_MEMBERS:
        r = oc(folder)
        openclaw_results.append(r)
        members.append((mid, name, role, r))
    members.append(("nova", "노바", "카톡 상담·주간 브리핑", merge_nova(nova_chat, hermes["노바"])))
    members.append(("hermi", "헤르미", "헤르메스 주인", hermes["헤르미"]))
    members.append(("luna", "루나", "SNS·시장 브리핑", hermes["루나"]))
    members.append(("clo", "클로", "앱 개발·분석", read_git(repo, now)))

    journal = []
    out_members = []
    for mid, name, role, r in members:
        for at, line in r["events"]:
            journal.append({"at": at, "id": mid, "name": name, "line": line})
        out_members.append({
            "id": mid, "name": name, "role": role,
            "state": r["state"], "last_at": r["last_at"], "today_count": r["today_count"],
            "last_line": r["last_line"], "lines": r.get("lines", []), "detail": r["detail"],
            "jobs": r.get("jobs", []),
        })
    journal.sort(key=lambda j: j["at"], reverse=True)

    warnings = []
    readable = [r for r in openclaw_results if r["state"] != "unreadable"]
    cutoff = iso(now - timedelta(hours=SILENT_HOURS))
    if readable and all((r["last_at"] or "") < cutoff for r in readable):
        newest = max((r["last_at"] or "") for r in readable)
        since = f" 마지막 소식은 {newest[:16].replace('T', ' ')}이에요." if newest else ""
        warnings.append(
            f"오픈클로 식구들이 {SILENT_HOURS}시간 넘게 조용해요. 게이트웨이가 멈췄을 수 있어요.{since}"
        )
    for m in out_members:
        if m["state"] == "error":
            warnings.append(f"{m['name']}: {m['detail']}")

    return {
        "generated_at": iso(now),
        "members": out_members,
        "totals": {
            "today_count": sum(m["today_count"] or 0 for m in out_members),
            "active": sum(1 for m in out_members if m["state"] == "active"),
            "errors": sum(1 for m in out_members if m["state"] == "error"),
            "unreadable": sum(1 for m in out_members if m["state"] == "unreadable"),
        },
        "journal": journal[:JOURNAL_MAX],
        "warnings": warnings,
    }


def write_status(path, status):
    """화면이 반쯤 쓰인 파일을 읽지 않도록 임시 파일에 쓴 뒤 바꿔치기한다."""
    path = Path(path)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(status, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)


def main():
    once = "--once" in sys.argv
    while True:
        try:
            status = build_status(datetime.now(KST))
            write_status(OUT, status)
            t = status["totals"]
            print(f"[{status['generated_at'][11:19]}] 오늘 {t['today_count']}건, "
                  f"활동 {t['active']}명, 오류 {t['errors']}, 못 읽음 {t['unreadable']}", flush=True)
        except Exception as e:  # 한 번 실패해도 수집기는 계속 돈다
            print(f"수집 실패: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
            if once:
                return 1
        if once:
            return 0
        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
    sys.exit(main())
