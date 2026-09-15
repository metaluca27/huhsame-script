"""줄별 음성 길이 → 줄/장면 타임라인, 자막 큐 분할, SRT 문자열."""

GAP_LINE = 0.5   # 같은 장면 안 줄 사이 숨 고르기
GAP_SCENE = 0.9  # 장면이 바뀌기 직전 쉼
WIDTH = 24       # 가로 1920 자막 한 줄 글자 수
MAX_LINES = 2


def build_timeline(lines):
    """lines: [{num, scene, text, sec}] → (줄 목록+start/end/gap, 장면 구간 목록, 전체 길이)."""
    t, out, scenes = 0.0, [], []
    for i, ln in enumerate(lines):
        nxt = lines[i + 1]["scene"] if i + 1 < len(lines) else None
        gap = GAP_SCENE if nxt is not None and nxt != ln["scene"] else GAP_LINE
        if not scenes or scenes[-1]["scene"] != ln["scene"]:
            scenes.append({"scene": ln["scene"], "start": round(t, 3)})
        out.append({**ln, "start": round(t, 3), "end": round(t + ln["sec"], 3), "gap": gap})
        t += ln["sec"] + gap
    total = round(t, 3)
    for i, s in enumerate(scenes):
        end = scenes[i + 1]["start"] if i + 1 < len(scenes) else total
        s["dur"] = round(end - s["start"], 3)
    return out, scenes, total


def wrap(text, width=WIDTH):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def split_cues(text, start, sec, width=WIDTH, max_lines=MAX_LINES):
    """한 줄 내레이션을 화면에 2줄 이하로 들어가는 큐들로 쪼개고 글자 수 비율로 시간 배분."""
    chunks, cur = [], ""
    for w in text.split():
        cand = f"{cur} {w}".strip()
        if cur and len(wrap(cand, width).split("\n")) > max_lines:
            chunks.append(cur)
            cur = w
        else:
            cur = cand
    if cur:
        chunks.append(cur)
    total_chars = sum(len(c) for c in chunks)
    cues, t = [], start
    for i, c in enumerate(chunks):
        end = start + sec if i == len(chunks) - 1 else t + sec * len(c) / total_chars
        cues.append((round(t, 3), round(end, 3), wrap(c, width)))
        t = end
    return cues


def _ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def to_srt(cues):
    return "\n".join(f"{i}\n{_ts(a)} --> {_ts(b)}\n{body}\n" for i, (a, b, body) in enumerate(cues, 1))
