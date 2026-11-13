"""상황판을 한 프로그램으로 띄운다: 수집기(1분마다) + 화면 서버(127.0.0.1:8797).

윈도우 작업 스케줄러가 로그인할 때 창 없이(pythonw) 실행한다.
직접 켤 때:  python serve.py
"""
import functools
import json
import sys
import threading
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import actions
import collect

HERE = Path(__file__).parent
HOST, PORT = "127.0.0.1", 8797
HIDDEN_SUFFIXES = ("commands.log", ".py", ".bat", ".tmp")
BAD_BODY = "명령 모양이 올바르지 않아요"


class BoardHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # 창 없이 돌 때는 로그를 쓸 곳이 없다
        pass

    def do_GET(self):
        # 명령 기록과 프로그램 파일은 화면으로 내보내지 않는다
        if self.path.split("?")[0].lower().endswith(HIDDEN_SUFFIXES):
            return self.send_error(404)
        return super().do_GET()

    def reply(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise actions.Refused(BAD_BODY)
        if not 0 < length <= 16000:
            raise actions.Refused(BAD_BODY)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise actions.Refused(BAD_BODY)
        if not isinstance(body, dict):
            raise actions.Refused(BAD_BODY)
        return body

    def do_POST(self):
        try:
            actions.check_request(self.headers)
            body = self.read_body()
            if self.path == "/api/ask":
                out = actions.ask(body.get("member"), body.get("text"))
            elif self.path == "/api/run-job":
                out = actions.run_job(body.get("job_id"))
            else:
                return self.reply(404, {"ok": False, "error": "없는 주소예요"})
            self.reply(200, {"ok": True, **out})
        except actions.Refused as e:
            self.reply(400, {"ok": False, "error": str(e)})
        except Exception as e:  # 예상 못 한 오류도 화면에 이유를 알려준다
            self.reply(500, {"ok": False, "error": f"상황판 서버 오류 ({type(e).__name__})"})


class SingleServer(ThreadingHTTPServer):
    # 윈도우에서는 주소 재사용을 켜 두면 같은 포트에 두 개가 떠 버린다.
    # 꺼야 두 번째 실행이 "이미 켜져 있음"을 알아챈다.
    allow_reuse_address = False
    daemon_threads = True


def collect_forever():
    while True:
        try:
            collect.write_status(collect.OUT, collect.build_status(datetime.now(collect.KST)))
        except Exception:  # 한 번 실패해도 다음 차례에 다시 시도한다
            pass
        time.sleep(collect.INTERVAL_SEC)


def main():
    handler = functools.partial(BoardHandler, directory=str(HERE))
    try:
        server = SingleServer((HOST, PORT), handler)
    except OSError:
        return 0  # 이미 다른 상황판이 켜져 있다. 수집기가 두 개 돌지 않게 그냥 끝낸다
    threading.Thread(target=collect_forever, daemon=True).start()
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
