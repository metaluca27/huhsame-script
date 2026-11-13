"""상황판을 한 프로그램으로 띄운다: 수집기(1분마다) + 화면 서버(127.0.0.1:8797).

윈도우 작업 스케줄러가 로그인할 때 창 없이(pythonw) 실행한다.
직접 켤 때:  python serve.py
"""
import functools
import sys
import threading
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import collect

HERE = Path(__file__).parent
HOST, PORT = "127.0.0.1", 8797


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # 창 없이 돌 때는 로그를 쓸 곳이 없다
        pass


class SingleServer(ThreadingHTTPServer):
    # 윈도우에서는 주소 재사용을 켜 두면 같은 포트에 두 개가 떠 버린다.
    # 꺼야 두 번째 실행이 "이미 켜져 있음"을 알아챈다.
    allow_reuse_address = False


def collect_forever():
    while True:
        try:
            collect.write_status(collect.OUT, collect.build_status(datetime.now(collect.KST)))
        except Exception:  # 한 번 실패해도 다음 차례에 다시 시도한다
            pass
        time.sleep(collect.INTERVAL_SEC)


def main():
    handler = functools.partial(QuietHandler, directory=str(HERE))
    try:
        server = SingleServer((HOST, PORT), handler)
    except OSError:
        return 0  # 이미 다른 상황판이 켜져 있다. 수집기가 두 개 돌지 않게 그냥 끝낸다
    threading.Thread(target=collect_forever, daemon=True).start()
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
