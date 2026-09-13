"""킬링보이스 워커로 문장별 TTS를 뽑아 WAV로 저장한다.

사용법:
  python tts.py --text "문장" --out 파일.wav [--preset rurik] [--tone calm]
  python tts.py --script 대본.md --outdir audio/ [--preset rurik] [--tone calm]

대본.md는 '| 번호 | 내레이션 | 장면 |' 표 형식. 번호가 두 자리 숫자인 행만 읽는다.
"""
import argparse, base64, json, re, sys, time, urllib.request, wave
from pathlib import Path

WORKER = "https://small-recipe-9345.atlia0318.workers.dev/voice/tts"


def tts(text, preset, tone, retries=3):
    body = json.dumps({"text": text, "preset": preset, "tone": tone}).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://vaulted-bus-346411.web.app",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KillingVoiceBatch/1.0",
    }
    req = urllib.request.Request(WORKER, data=body, headers=headers)
    last = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.loads(r.read().decode("utf-8"))
            if "audio" in data:
                return base64.b64decode(data["audio"]), int(data.get("rate", 24000))
            last = data.get("error")
        except Exception as e:  # noqa
            last = str(e)
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"TTS 실패: {last}")


def save_wav(pcm, rate, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return len(pcm) / 2 / rate


def parse_script(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*(\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$", line)
        if m:
            rows.append((m.group(1), m.group(2), m.group(3)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--out")
    ap.add_argument("--script")
    ap.add_argument("--outdir")
    ap.add_argument("--preset", default="rurik")
    ap.add_argument("--tone", default="calm")
    ap.add_argument("--only", help="쉼표로 구분한 번호만 다시 뽑기 (예: 03,07)")
    a = ap.parse_args()

    if a.text:
        pcm, rate = tts(a.text, a.preset, a.tone)
        sec = save_wav(pcm, rate, a.out)
        print(json.dumps({"out": a.out, "sec": round(sec, 2)}, ensure_ascii=False))
        return

    rows = parse_script(a.script)
    only = set(a.only.split(",")) if a.only else None
    outdir = Path(a.outdir)
    result = []
    for num, text, scene in rows:
        if only and num not in only:
            continue
        out = outdir / f"{num}.wav"
        pcm, rate = tts(text, a.preset, a.tone)
        sec = save_wav(pcm, rate, out)
        result.append({"num": num, "text": text, "scene": scene, "file": out.name, "sec": round(sec, 2)})
        print(f"{num} {sec:5.2f}s  {text}", file=sys.stderr)
    # --only로 일부만 다시 뽑아도 기존 기록을 지우지 않고 해당 번호만 갱신한다
    dpath = outdir / "durations.json"
    merged = {r["num"]: r for r in (json.loads(dpath.read_text(encoding="utf-8")) if dpath.exists() else [])}
    for r in result:
        merged[r["num"]] = r
    result = [merged[k] for k in sorted(merged)]
    dpath.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"count": len(result), "total_sec": round(sum(r["sec"] for r in result), 1)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
