"""수집기 테스트. 가짜 기록 파일을 만들어 검사한다.

실행: python -m unittest test_collect -v   (tools/attic-family 폴더에서)
"""
import json
import sqlite3
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

import collect

NOW = datetime(2026, 11, 12, 21, 0, 0, tzinfo=collect.KST)


def ms(dt):
    return int(dt.timestamp() * 1000)


def make_openclaw_db(path, messages):
    """messages: [(session_key, datetime, event_type)]"""
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE session_windows (session_id TEXT, session_key TEXT)")
    con.execute(
        "CREATE TABLE transcript_event_identities "
        "(session_id TEXT, event_id TEXT, seq INTEGER, event_type TEXT, created_at INTEGER)"
    )
    keys = {}
    for i, (key, at, kind) in enumerate(messages):
        sid = keys.setdefault(key, f"s{len(keys)}")
        con.execute(
            "INSERT INTO transcript_event_identities VALUES (?,?,?,?,?)",
            (sid, f"e{i}", i, kind, ms(at)),
        )
    for key, sid in keys.items():
        con.execute("INSERT INTO session_windows VALUES (?,?)", (sid, key))
    con.commit()
    con.close()


def make_hermes(cron_dir, jobs, executions):
    """executions: [(job_id, status, started_at datetime)]"""
    cron_dir.mkdir(parents=True, exist_ok=True)
    (cron_dir / "jobs.json").write_text(
        json.dumps({"jobs": jobs}, ensure_ascii=False), encoding="utf-8"
    )
    con = sqlite3.connect(cron_dir / "executions.db")
    con.execute(
        "CREATE TABLE executions (id INTEGER PRIMARY KEY, job_id TEXT, status TEXT, "
        "started_at TEXT, finished_at TEXT)"
    )
    for job_id, status, at in executions:
        con.execute(
            "INSERT INTO executions (job_id, status, started_at, finished_at) VALUES (?,?,?,?)",
            (job_id, status, at.isoformat(), (at + timedelta(minutes=2)).isoformat()),
        )
    con.commit()
    con.close()


def job(job_id, name, last_run, status="ok", enabled=True, error=None):
    return {
        "id": job_id,
        "name": name,
        "enabled": enabled,
        "last_run_at": last_run.isoformat() if last_run else None,
        "last_status": status,
        "last_error": error,
        "next_run_at": (NOW + timedelta(days=1)).isoformat(),
    }


class OpenclawTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "a" / "openclaw-agent.sqlite"

    def tearDown(self):
        self.tmp.cleanup()

    def test_active_today(self):
        make_openclaw_db(
            self.db,
            [
                ("agent:main:kakao-talkchannel:dm:손님이름", NOW - timedelta(days=1), "message"),
                ("agent:main:telegram:direct:1", NOW - timedelta(hours=3), "message"),
                ("agent:main:telegram:direct:1", NOW - timedelta(hours=2), "message"),
                ("agent:main:telegram:direct:1", NOW - timedelta(hours=1), "model_change"),
            ],
        )
        r = collect.read_openclaw(self.db, NOW)
        self.assertEqual(r["state"], "active")
        self.assertEqual(r["today_count"], 2)
        self.assertEqual(r["last_line"], "텔레그램에서 대화")
        self.assertEqual(r["last_at"], (NOW - timedelta(hours=2)).isoformat(timespec="seconds"))

    def test_never_leaks_session_names(self):
        make_openclaw_db(
            self.db, [("agent:main:kakao-talkchannel:dm:손님이름", NOW - timedelta(hours=1), "message")]
        )
        r = collect.read_openclaw(self.db, NOW)
        self.assertEqual(r["last_line"], "카톡 상담 응대")
        self.assertNotIn("손님이름", json.dumps(r, ensure_ascii=False))

    def test_quiet_when_only_old(self):
        make_openclaw_db(self.db, [("agent:main:main", NOW - timedelta(days=1), "message")])
        r = collect.read_openclaw(self.db, NOW)
        self.assertEqual(r["state"], "quiet")
        self.assertEqual(r["today_count"], 0)
        self.assertEqual(r["last_line"], "직접 대화")
        self.assertEqual(r["last_at"], (NOW - timedelta(days=1)).isoformat(timespec="seconds"))

    def test_empty_db_is_quiet_without_time(self):
        make_openclaw_db(self.db, [])
        r = collect.read_openclaw(self.db, NOW)
        self.assertEqual(r["state"], "quiet")
        self.assertIsNone(r["last_at"])

    def test_missing_file_is_unreadable(self):
        r = collect.read_openclaw(Path(self.tmp.name) / "없음.sqlite", NOW)
        self.assertEqual(r["state"], "unreadable")
        self.assertIsNone(r["today_count"])
        self.assertTrue(r["detail"])


class HermesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cron = Path(self.tmp.name) / "cron"

    def tearDown(self):
        self.tmp.cleanup()

    def test_split_by_name_and_states(self):
        today = NOW - timedelta(hours=7)
        old = NOW - timedelta(days=3)
        make_hermes(
            self.cron,
            [
                job("l1", "루나 데일리 | SNS 트렌드 브리핑", today),
                job("l2", "루나 위클리 | 추천 도서 브리핑", old, status="error", error="401"),
                job("n1", "노바 위클리 | 코덱스 브리핑", old),
                job("h1", "헤르미 위클리 | 지식 아카이브 다이제스트", old),
                job("x1", "기타 작업", today),
                job("n2", "노바 위클리 | 꺼진 작업", old, status="error", enabled=False),
            ],
            [("l1", "completed", today), ("x1", "completed", today), ("n1", "completed", old)],
        )
        r = collect.read_hermes(self.cron, NOW)
        self.assertEqual(set(r), {"루나", "노바", "헤르미"})
        self.assertEqual(r["루나"]["state"], "error")
        self.assertIn("추천 도서 브리핑", r["루나"]["detail"])
        self.assertEqual(r["루나"]["today_count"], 1)
        self.assertEqual(r["노바"]["state"], "quiet")  # 꺼진 작업의 실패는 세지 않는다
        self.assertEqual(r["헤르미"]["state"], "active")  # "기타 작업"은 헤르미 몫
        self.assertEqual(r["헤르미"]["today_count"], 1)
        self.assertEqual(r["헤르미"]["last_line"], "기타 작업 완료")
        self.assertEqual(r["루나"]["last_line"], "SNS 트렌드 브리핑 완료")

    def test_missing_jobs_is_unreadable(self):
        r = collect.read_hermes(self.cron, NOW)
        for who in ("루나", "노바", "헤르미"):
            self.assertEqual(r[who]["state"], "unreadable")
            self.assertIsNone(r[who]["today_count"])

    def test_missing_executions_still_reads_jobs(self):
        self.cron.mkdir(parents=True)
        (self.cron / "jobs.json").write_text(
            json.dumps({"jobs": [job("l1", "루나 데일리 | 브리핑", NOW - timedelta(hours=1))]}),
            encoding="utf-8",
        )
        r = collect.read_hermes(self.cron, NOW)
        self.assertEqual(r["루나"]["state"], "active")  # 오늘 돌았다는 건 jobs.json으로도 안다
        self.assertEqual(r["루나"]["today_count"], 1)


class GitTest(unittest.TestCase):
    def test_counts_today_commits(self):
        with tempfile.TemporaryDirectory() as d:
            def git(*a):
                subprocess.run(["git", "-C", d, *a], check=True, capture_output=True)

            git("init", "-q")
            git("config", "user.email", "t@example.invalid")
            git("config", "user.name", "t")
            git("config", "commit.gpgsign", "false")
            (Path(d) / "a.txt").write_text("a", encoding="utf-8")
            git("add", "a.txt")
            git("commit", "-q", "-m", "첫 작업")
            r = collect.read_git(Path(d), datetime.now(collect.KST))
            self.assertEqual(r["state"], "active")
            self.assertEqual(r["today_count"], 1)
            self.assertEqual(r["last_line"], "첫 작업")

    def test_not_a_repo_is_unreadable(self):
        with tempfile.TemporaryDirectory() as d:
            r = collect.read_git(Path(d) / "없는폴더", NOW)
            self.assertEqual(r["state"], "unreadable")


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.oc = self.root / "agents"
        self.cron = self.root / "cron"

    def tearDown(self):
        self.tmp.cleanup()

    def agent_db(self, agent):
        return self.oc / agent / "agent" / "openclaw-agent.sqlite"

    def build(self):
        return collect.build_status(NOW, self.oc, self.cron, self.root / "repo-없음")

    def test_nova_merges_two_sources(self):
        for a in ("main", "lurick", "jujuya"):
            make_openclaw_db(self.agent_db(a), [("agent:x:telegram:d:1", NOW - timedelta(hours=1), "message")])
        make_openclaw_db(
            self.agent_db("nova"),
            [("agent:nova:kakao-talkchannel:dm:x", NOW - timedelta(hours=5), "message")] * 3,
        )
        today = NOW - timedelta(hours=2)
        make_hermes(self.cron, [job("n1", "노바 위클리 | 코덱스 브리핑", today)], [("n1", "completed", today)])
        s = self.build()
        by = {m["id"]: m for m in s["members"]}
        self.assertEqual([m["id"] for m in s["members"]],
                         ["pureum", "rurik", "jujuya", "nova", "hermi", "luna", "clo"])
        nova = by["nova"]
        self.assertEqual(nova["today_count"], 4)
        self.assertEqual(len(nova["lines"]), 2)
        self.assertEqual(nova["last_at"], today.isoformat(timespec="seconds"))
        self.assertEqual(nova["last_line"], "코덱스 브리핑 완료")
        self.assertEqual(nova["state"], "active")
        self.assertEqual(by["clo"]["state"], "unreadable")
        # 못 읽은 식구는 합계에서 빠진다
        self.assertEqual(s["totals"]["today_count"], 1 + 1 + 1 + 4)
        self.assertEqual(s["totals"]["active"], 4)
        self.assertEqual(s["warnings"], [])
        self.assertLessEqual(len(s["journal"]), 30)
        ats = [j["at"] for j in s["journal"]]
        self.assertEqual(ats, sorted(ats, reverse=True))

    def test_gateway_warning_when_all_openclaw_silent(self):
        for a in ("main", "lurick", "jujuya", "nova"):
            make_openclaw_db(self.agent_db(a), [("agent:x:telegram:d:1", NOW - timedelta(days=2), "message")])
        s = self.build()
        self.assertTrue(any("게이트웨이" in w for w in s["warnings"]))

    def test_no_gateway_warning_when_one_spoke(self):
        for a in ("main", "lurick", "jujuya"):
            make_openclaw_db(self.agent_db(a), [("agent:x:telegram:d:1", NOW - timedelta(days=2), "message")])
        make_openclaw_db(self.agent_db("nova"), [("agent:x:telegram:d:1", NOW - timedelta(hours=2), "message")])
        s = self.build()
        self.assertFalse(any("게이트웨이" in w for w in s["warnings"]))

    def test_write_status_roundtrip(self):
        out = self.root / "status.json"
        s = self.build()
        collect.write_status(out, s)
        self.assertEqual(json.loads(out.read_text(encoding="utf-8")), s)
        self.assertEqual([p.name for p in self.root.glob("status*")], ["status.json"])


if __name__ == "__main__":
    unittest.main()
