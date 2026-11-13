"""일 시키기 통로 테스트. 진짜 식구는 부르지 않고 가짜 실행기로 검사한다.

실행: python -m unittest test_actions -v   (tools/attic-family 폴더에서)
"""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import actions

GOOD_HEADERS = {
    "Host": "127.0.0.1:8797",
    "Origin": "http://127.0.0.1:8797",
    "X-Attic-Board": "1",
    "Content-Type": "application/json",
}
OPENCLAW_OK = "warning line\n" + json.dumps({
    "status": "ok",
    "result": {"payloads": [{"text": "네, 할게요"}, {"text": None}],
               "meta": {"agentMeta": {"costUsd": 0.04}}},
})


class FakeRun:
    def __init__(self, stdout="", returncode=0, error=None):
        self.stdout, self.returncode, self.error = stdout, returncode, error
        self.calls = []
        self.message_seen = None

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        if "--message-file" in args:
            path = args[args.index("--message-file") + 1]
            self.message_seen = Path(path).read_text(encoding="utf-8")
        if self.error:
            raise self.error
        return SimpleNamespace(stdout=self.stdout, returncode=self.returncode)


class CheckRequestTest(unittest.TestCase):
    def test_board_page_is_allowed(self):
        actions.check_request(GOOD_HEADERS)
        actions.check_request({**GOOD_HEADERS, "Host": "localhost:8797", "Origin": "http://localhost:8797"})

    def test_other_website_is_refused(self):
        with self.assertRaises(actions.Refused):
            actions.check_request({**GOOD_HEADERS, "Origin": "https://evil.example"})

    def test_missing_board_header_is_refused(self):
        headers = dict(GOOD_HEADERS)
        del headers["X-Attic-Board"]
        with self.assertRaises(actions.Refused):
            actions.check_request(headers)

    def test_wrong_host_is_refused(self):
        with self.assertRaises(actions.Refused):
            actions.check_request({**GOOD_HEADERS, "Host": "evil.example:8797"})

    def test_form_post_is_refused(self):
        with self.assertRaises(actions.Refused):
            actions.check_request({**GOOD_HEADERS, "Content-Type": "text/plain"})


class AskTest(unittest.TestCase):
    def setUp(self):
        patches = [mock.patch.object(actions, "find_exe", return_value="openclaw"),
                   mock.patch.object(actions, "log")]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def test_sends_text_by_file_not_command_line(self):
        run = FakeRun(OPENCLAW_OK)
        nasty = '오늘 한 일 알려줘 & del /q * "$(rm -rf)"'
        out = actions.ask("rurik", f"  {nasty}  ", run=run)
        self.assertEqual(out, {"reply": "네, 할게요", "cost_usd": 0.04})
        args, kwargs = run.calls[0]
        self.assertEqual(args[:4], ["openclaw", "agent", "--agent", "lurick"])
        self.assertEqual(run.message_seen, nasty)
        self.assertNotIn(nasty, " ".join(args))
        self.assertNotIn("shell", kwargs)

    def test_unknown_member_is_refused_without_running(self):
        run = FakeRun(OPENCLAW_OK)
        for who in ("nova", "clo", "main", "", None, "../x"):
            with self.assertRaises(actions.Refused):
                actions.ask(who, "안녕", run=run)
        self.assertEqual(run.calls, [])

    def test_empty_and_too_long_are_refused(self):
        run = FakeRun(OPENCLAW_OK)
        for text in ("", "   ", None, 123, "가" * (actions.MAX_TEXT + 1)):
            with self.assertRaises(actions.Refused):
                actions.ask("pureum", text, run=run)
        self.assertEqual(run.calls, [])

    def test_failure_cases_give_a_reason(self):
        cases = [
            FakeRun("", returncode=1),
            FakeRun("no json here"),
            FakeRun(json.dumps({"status": "error", "result": {"payloads": []}})),
            FakeRun(error=subprocess.TimeoutExpired("openclaw", 1)),
        ]
        for run in cases:
            with self.assertRaises(actions.Refused) as ctx:
                actions.ask("jujuya", "안녕", run=run)
            self.assertTrue(str(ctx.exception))

    def test_second_ask_while_busy_is_refused_then_freed(self):
        def slow_run(args, **kwargs):
            with self.assertRaises(actions.Refused):
                actions.ask("pureum", "또", run=FakeRun(OPENCLAW_OK))
            return SimpleNamespace(stdout=OPENCLAW_OK, returncode=0)

        actions.ask("pureum", "첫 번째", run=slow_run)
        actions.ask("pureum", "끝난 뒤에는 다시 됨", run=FakeRun(OPENCLAW_OK))


class RunJobTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cron = Path(self.tmp.name)
        (self.cron / "jobs.json").write_text(json.dumps({"jobs": [
            {"id": "a3ac9c4aa845", "name": "루나 데일리 | SNS 트렌드 브리핑", "enabled": True},
            {"id": "deadbeef0000", "name": "루나 위클리 | 꺼진 것", "enabled": False},
        ]}, ensure_ascii=False), encoding="utf-8")
        patches = [mock.patch.object(actions, "find_exe", return_value="hermes"),
                   mock.patch.object(actions, "log")]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def test_runs_a_listed_job(self):
        run = FakeRun("ok")
        out = actions.run_job("a3ac9c4aa845", run=run, cron_dir=self.cron)
        self.assertEqual(out["title"], "SNS 트렌드 브리핑")
        self.assertEqual(run.calls[0][0], ["hermes", "cron", "run", "a3ac9c4aa845"])

    def test_unlisted_disabled_or_odd_ids_are_refused(self):
        run = FakeRun("ok")
        for job_id in ("ffffffffffff", "deadbeef0000", "a3ac9c4aa845 --yolo", "", None, "../jobs"):
            with self.assertRaises(actions.Refused):
                actions.run_job(job_id, run=run, cron_dir=self.cron)
        self.assertEqual(run.calls, [])

    def test_hermes_failure_gives_a_reason(self):
        with self.assertRaises(actions.Refused):
            actions.run_job("a3ac9c4aa845", run=FakeRun("", returncode=1), cron_dir=self.cron)


if __name__ == "__main__":
    unittest.main()
