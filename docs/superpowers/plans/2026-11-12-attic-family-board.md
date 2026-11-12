# 다락방 식구들 상황판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다락방 식구 7명의 실제 기록을 읽어 미니PC에서 한 화면으로 보여주는 상황판을 만든다.

**Architecture:** 수집기(`collect.py`)가 1분마다 기록 파일을 읽기 전용으로 열어 `status.json` 한 장을 쓴다. 화면(`index.html`)은 그 파일만 30초마다 다시 읽어 그린다. 둘 사이의 약속은 `status.json`의 모양뿐이다.

**Tech Stack:** Python 3.14 표준 라이브러리만 (`sqlite3`, `json`, `subprocess`, `unittest`), 정적 HTML·CSS·JS 한 파일, `python -m http.server`.

설계 문서: `docs/superpowers/specs/2026-11-12-attic-family-board-design.md`

---

## 파일

| 파일 | 책임 |
|---|---|
| `tools/attic-family/collect.py` | 기록 읽기와 `status.json` 쓰기 |
| `tools/attic-family/test_collect.py` | 가짜 기록 파일로 수집기 테스트 (`unittest`) |
| `tools/attic-family/index.html` | 화면 |
| `tools/attic-family/상황판_열기.bat` | 수집기와 서버를 켜고 브라우저 열기 |
| `tools/attic-family/.gitignore` | `status.json` 제외 |
| `.claude/launch.json` | 미리보기용 `attic-family` 항목(포트 8797) 추가 |

## 실제 기록에서 확인한 사실 (2026-11-12)

- 오픈클로 DB의 시각은 전부 1970년부터 센 밀리초 정수다. `session_nodes.last_activity_at`은 전부 비어 있어 쓸 수 없다.
- 대화 한 줄은 `transcript_event_identities`의 `event_type='message'`다. `session_id`로 `session_windows`와 이어 `session_key`를 얻는다.
- `session_key` 모양: `agent:<식구>:<채널>:...`. 채널은 `telegram`, `discord`, `slack`, `kakao-talkchannel`이고, `agent:main:main`은 직접 대화다.
- 헤르메스 `cron/jobs.json`은 `{"jobs": [...]}`이고 작업마다 `id`, `name`, `enabled`, `last_run_at`, `last_status`(`ok`가 정상), `last_error`, `next_run_at`이 있다. 시각은 `+09:00`이 붙은 ISO 문자열이다.
- `cron/executions.db`의 `executions` 표: `job_id`, `status`(`completed`·`failed`), `started_at`, `finished_at`.

## `status.json` 모양

```json
{
  "generated_at": "2026-11-12T21:00:00+09:00",
  "members": [
    {"id": "pureum", "name": "푸름이", "role": "오픈클로 맏이", "state": "active",
     "last_at": "2026-11-12T19:20:00+09:00", "today_count": 12,
     "last_line": "텔레그램에서 대화", "lines": [], "detail": ""}
  ],
  "totals": {"today_count": 12, "active": 1, "errors": 0},
  "journal": [{"at": "2026-11-12T19:20:00+09:00", "id": "pureum", "name": "푸름이", "line": "텔레그램에서 대화"}],
  "warnings": ["..."]
}
```

`state`는 `active`·`quiet`·`error`·`unreadable` 중 하나다. `lines`는 노바처럼 출처가 둘인 식구의 출처별 한 줄이다.

---

### Task 1: 오픈클로 식구 읽기

**Files:** Create `tools/attic-family/collect.py`, `tools/attic-family/test_collect.py`

- [ ] 테스트 먼저: 임시 폴더에 `session_windows(session_id, session_key)`와 `transcript_event_identities(session_id, event_id, seq, event_type, created_at)` 두 표만 있는 가짜 DB를 만든다. 경우는 셋이다.
  - 오늘 메시지 2건(텔레그램)과 어제 1건(카톡): `today_count == 2`, `last_line == "텔레그램에서 대화"`, `state == "active"`
  - 메시지가 어제 것뿐: `state == "quiet"`, `today_count == 0`, `last_at`은 어제 시각
  - 파일 없음: `state == "unreadable"`, `today_count is None`
- [ ] `python -m unittest` 실행해 실패 확인
- [ ] 구현: `read_openclaw(db_path, now)`는 `file:...?mode=ro`로 열고 아래 두 질의만 쓴다.

```sql
SELECT count(*) FROM transcript_event_identities
 WHERE event_type='message' AND created_at >= :day_start_ms;

SELECT e.created_at, w.session_key
  FROM transcript_event_identities e
  LEFT JOIN session_windows w ON w.session_id = e.session_id
 WHERE e.event_type='message'
 ORDER BY e.created_at DESC LIMIT 40;
```

  `channel_line(session_key)`는 채널 이름만 한국어로 바꾼다. 대화 이름과 내용은 읽지 않는다.
- [ ] 테스트 통과 확인 후 커밋

### Task 2: 헤르메스 식구 읽기

**Files:** Modify `collect.py`, `test_collect.py`

- [ ] 테스트 먼저: 가짜 `jobs.json`(루나 2개, 노바 1개, 헤르미 1개, 이름이 안 맞는 "기타 작업" 1개)과 가짜 `executions.db`.
  - 루나 작업 하나의 `last_status`가 `error`: 루나 `state == "error"`, `detail`에 그 작업 제목
  - 꺼진(`enabled: false`) 작업의 실패는 오류로 세지 않음
  - "기타 작업"은 헤르미 몫으로 들어감
  - 오늘 실행 1건인 식구는 `active`, 없는 식구는 `quiet`
  - `jobs.json` 없음: 세 식구 모두 `unreadable`
- [ ] 실패 확인
- [ ] 구현: `read_hermes(cron_dir, now)`가 `{"루나": {...}, "노바": {...}, "헤르미": {...}}`를 돌려준다. `config.yaml`과 `auth.json`은 열지 않는다.
- [ ] 통과 확인 후 커밋

### Task 3: 클로 읽기와 전체 조립

**Files:** Modify `collect.py`, `test_collect.py`

- [ ] 테스트 먼저:
  - `read_git`: 임시 저장소에 커밋 1개 만들고 `today_count == 1`, `last_line`이 커밋 제목
  - `build_status`: 노바는 오픈클로와 헤르메스 결과를 합쳐 `lines`가 2줄, `today_count`는 합
  - 오픈클로 4명의 마지막 활동이 모두 24시간보다 오래됨: `warnings`에 게이트웨이 경고
  - 한 식구가 `unreadable`이어도 나머지는 정상, `totals`는 읽힌 값만 더함
  - `journal`은 최신순 30줄 이하
- [ ] 실패 확인
- [ ] 구현: `read_git(repo, now)`, `build_status(now, openclaw_dir, hermes_cron_dir, repo)`, `write_status(path, status)`(임시 파일에 쓰고 `os.replace`), `main()`(`--once`가 없으면 60초마다 반복, 한 번 실패해도 멈추지 않음)
- [ ] 통과 확인, `python collect.py --once`를 실제 기록으로 돌려 `status.json` 눈으로 확인 후 커밋

### Task 4: 화면

**Files:** Create `tools/attic-family/index.html`, `tools/attic-family/.gitignore`; Modify `.claude/launch.json`

- [ ] `index.html`: 가운데 루카, 식구 카드 7장을 타원 위에 배치, SVG 선으로 연결. 최근 10분 안에 활동한 식구의 선에 반짝임. 위 숫자 띠, 아래 일지. `status.json`을 30초마다 `cache: "no-store"`로 다시 읽는다. 글자는 전부 `textContent`로 넣는다.
- [ ] `generated_at`이 3분보다 오래되면 "수집이 멈췄어요" 띠, 파일을 못 읽으면 "수집기가 꺼져 있어요" 띠.
- [ ] `launch.json`에 `attic-family`(포트 8797) 추가, 미리보기로 띄워 콘솔 오류와 화면 확인.
- [ ] 커밋

### Task 5: 실행 파일과 대조 확인

**Files:** Create `tools/attic-family/상황판_열기.bat`

- [ ] bat: 수집기를 최소화 창으로 켜고, `python -m http.server 8797 --bind 127.0.0.1`을 켜고, 브라우저를 연다.
- [ ] 대조: 화면의 식구별 건수와 시각을 기록 파일을 직접 조회한 값과 비교한다.
- [ ] 못 읽는 경우: 오픈클로 폴더 경로를 없는 곳으로 바꿔 `--once`를 돌리고 "기록 못 읽음"이 뜨는지 본다.
- [ ] 커밋
