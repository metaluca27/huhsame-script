"""허허서방 목소리(Umbriel)로 대본 줄마다 wav를 뽑고, 위험한 줄은 받아쓰기로 대조한다.

사용법 (에피소드 폴더 안에서):
  python ../도구/tts.py make                 # 없는 줄만 생성 → audio/NNN.wav + audio/durations.json
  python ../도구/tts.py make --only 012,045  # 해당 줄 다시 생성(덮어쓰기)
  python ../도구/tts.py check                # 숫자·따옴표 줄 + --also 줄 받아쓰기 → 받아쓰기.md
  python ../도구/tts.py check --also 030,031
"""
import argparse, base64, json, os, re, sys, time, urllib.request, wave
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


def make(rows, only):
    Path("audio").mkdir(exist_ok=True)
    for r in rows:
        out = Path(f"audio/{r['num']}.wav")
        if out.exists() and not (only and r["num"] in only):
            continue
        if only and r["num"] not in only:
            continue
        pcm, rate = tts(r["text"])
        sec = save_wav(pcm, rate, out)
        print(f"{r['num']} {sec:5.2f}s  {r['text']}", file=sys.stderr)
    durations = [{**r, "sec": round(wav_sec(f"audio/{r['num']}.wav"), 3)}
                 for r in rows if Path(f"audio/{r['num']}.wav").exists()]
    Path("audio/durations.json").write_text(json.dumps(durations, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(d["sec"] for d in durations)
    print(json.dumps({"lines": len(durations), "of": len(rows), "voice_min": round(total / 60, 1)}, ensure_ascii=False))


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
    Path("받아쓰기.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    result = {"checked": len(targets), "mismatch": bad, "error": errors}
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
