"""허허서방 목소리(Umbriel)로 대본 줄마다 wav를 뽑고, 위험한 줄은 받아쓰기로 대조한다.

사용법 (에피소드 폴더 안에서):
  python ../도구/tts.py make                 # 없는 줄만 생성 → audio/NNN.wav + audio/durations.json
  python ../도구/tts.py make --only 012,045  # 해당 줄 다시 생성(덮어쓰기)
  python ../도구/tts.py check                # 숫자·따옴표 줄 + --also 줄 받아쓰기 → 받아쓰기.md
  python ../도구/tts.py check --also 030,031
"""
import argparse, array, base64, json, os, re, sys, time, urllib.request, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from script_io import parse_script

WORKER = "https://small-recipe-9345.atlia0318.workers.dev/voice"
HEADERS = {
    "Content-Type": "application/json",
    "Origin": "https://vaulted-bus-346411.web.app",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KillingVoiceBatch/1.0",
}
VOICE = {
    "preset": "middleM",
    "tone": "calm",
    "voice": "Umbriel",
    "style": "구수하고 능청스러운 50대 남자 장터 이야기꾼 목소리로. 낮고 굵은 중저음, 느긋하게 뜸을 들이며 옛날이야기를 풀어내듯",
}


def payload(text):
    return {"text": text, **VOICE}


def needs_check(text):
    return bool(re.search(r"[0-9\"“”‘’'「」]", text))


def _norm(s):
    return re.sub(r"[\s\W_]+", "", s)


def similar(a, b):
    return _norm(a) == _norm(b)


def post(path, body, timeout=180):
    req = urllib.request.Request(f"{WORKER}/{path}", data=json.dumps(body).encode("utf-8"), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def tts(text, retries=3):
    last = None
    for i in range(retries):
        try:
            data = post("tts", payload(text))
            if "audio" in data:
                return base64.b64decode(data["audio"]), int(data.get("rate", 24000))
            last = data.get("error")
        except Exception as e:  # noqa: BLE001 — 네트워크 오류는 재시도
            last = str(e)
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"TTS 실패: {last}")


def save_wav(pcm, rate, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    os.replace(tmp, path)
    return len(pcm) / 2 / rate


def wav_sec(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def _load_manifest():
    p = Path("audio/manifest.json")
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _save_manifest(manifest):
    Path("audio/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")


def make(rows, only):
    Path("audio").mkdir(exist_ok=True)
    manifest = _load_manifest()
    for r in rows:
        forced = bool(only and r["num"] in only)
        if only and not forced:
            continue
        out = Path(f"audio/{r['num']}.wav")
        prev_text = manifest.get(r["num"])
        text_changed = prev_text is not None and prev_text != r["text"]
        needs = forced or not out.exists() or prev_text is None or text_changed
        if not needs:
            continue
        if text_changed:
            print(f"{r['num']} 대본이 바뀌어 다시 생성", file=sys.stderr)
        pcm, rate = tts(r["text"])
        sec = save_wav(pcm, rate, out)
        manifest[r["num"]] = r["text"]
        _save_manifest(manifest)
        print(f"{r['num']} {sec:5.2f}s  {r['text']}", file=sys.stderr)
    durations = [{**r, "sec": round(wav_sec(f"audio/{r['num']}.wav"), 3)}
                 for r in rows if Path(f"audio/{r['num']}.wav").exists()]
    Path("audio/durations.json").write_text(json.dumps(durations, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(d["sec"] for d in durations)
    print(json.dumps({"lines": len(durations), "of": len(rows), "voice_min": round(total / 60, 1)}, ensure_ascii=False))


SEC_PER_CHAR_MAX = 0.40  # 글자당 이 이상이면 같은 문장을 두 번 읽었을 가능성
LEAD_SILENCE_MAX = 1.5   # 문장 앞 무음(초)
GAP_SILENCE_MAX = 2.0    # 문장 중간 공백(초)


def loud_windows(path, step=0.05, floor=300):
    """0.05초 칸마다 소리가 났는지 보고, 소리 난 칸 번호와 전체 길이를 준다."""
    with wave.open(str(path)) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        raw = w.readframes(n)
    a = array.array("h", raw)
    if ch == 2:
        a = a[0::2]
    win = max(int(sr * step), 1)
    peaks = [max(abs(v) for v in a[i:i + win]) for i in range(0, len(a) - win + 1, win)]
    return [i for i, v in enumerate(peaks) if v > floor], (n / sr if sr else 0.0)


def audio_problem(path, text):
    """길이·무음이 수상한 줄이면 사람이 읽을 이유를 돌려준다. 멀쩡하면 None."""
    loud, dur = loud_windows(path)
    if not loud:
        return f"{dur:.1f}초 내내 소리가 없어요"
    lead = loud[0] * 0.05
    gap = max((b - a) for a, b in zip(loud, loud[1:])) * 0.05 if len(loud) > 1 else 0.0
    if lead > LEAD_SILENCE_MAX:
        return f"문장 앞에 무음 {lead:.1f}초"
    if gap > GAP_SILENCE_MAX:
        return f"문장 중간에 공백 {gap:.1f}초"
    if text and dur / len(text) > SEC_PER_CHAR_MAX:
        return f"{len(text)}자인데 {dur:.1f}초 — 같은 문장을 두 번 읽었을 수 있어요"
    return None


def check(rows, also):
    targets = [r for r in rows if needs_check(r["text"]) or r["num"] in also]
    out = ["| 번호 | 일치 | 원문 | 받아쓰기 |", "|---|---|---|---|"]
    bad = 0
    errors = 0
    for r in targets:
        try:
            b64 = base64.b64encode(Path(f"audio/{r['num']}.wav").read_bytes()).decode()
            heard = post("stt", {"audio": b64, "mime": "audio/wav"}).get("text", "")
        except Exception as e:  # noqa: BLE001 — 한 줄 실패해도 나머지는 계속 진행
            errors += 1
            out.append(f"| {r['num']} | ⚠️ | {r['text']} | 오류: {e} |")
            continue
        ok = similar(r["text"], heard)
        bad += not ok
        out.append(f"| {r['num']} | {'✅' if ok else '❌'} | {r['text']} | {heard} |")
    # 받아쓰기로는 안 보이는 사고(긴 무음·두 번 읽기)는 길이로 잡는다 — 모든 줄 검사
    odd = []
    for r in rows:
        f = Path(f"audio/{r['num']}.wav")
        if not f.exists():
            continue
        why = audio_problem(f, r["text"])
        if why:
            odd.append(f"{r['num']}: {why}")
    if odd:
        out += ["", "## 목소리 길이 이상", ""] + [f"- {line}" for line in odd]
        for line in odd:
            print(f"목소리 확인 필요 — {line}", file=sys.stderr)
    Path("받아쓰기.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    result = {"checked": len(targets), "mismatch": bad, "error": errors, "audio_odd": len(odd)}
    print(json.dumps(result, ensure_ascii=False))
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["make", "check"])
    ap.add_argument("--only", default="")
    ap.add_argument("--also", default="")
    a = ap.parse_args()
    rows = parse_script("대본.md")
    if a.cmd == "make":
        make(rows, set(filter(None, a.only.split(","))))
    else:
        check(rows, set(filter(None, a.also.split(","))))


if __name__ == "__main__":
    main()
