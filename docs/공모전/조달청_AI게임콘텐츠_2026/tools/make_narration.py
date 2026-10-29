"""「작은 전구의 여행」 내레이션: 영상/narration.json → 영상/voice/NN.wav (킬링보이스 워커 /voice/tts) + durations.json
사용: python make_narration.py          # 없는 것만
      python make_narration.py 7 11     # 지정한 줄만 다시
"""
import base64
import json
import os
import sys
import time
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.normpath(os.path.join(HERE, "..", "영상"))
OUT = os.path.join(VID, "voice")
WORKER = "https://small-recipe-9345.atlia0318.workers.dev/voice/tts"
HEADERS = {"Content-Type": "application/json", "Origin": "https://vaulted-bus-346411.web.app",
           "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KillingVoiceBatch/1.0"}   # 없으면 클라우드플레어 403

cfg = json.load(open(os.path.join(VID, "narration.json"), encoding="utf-8"))
only = {int(a) for a in sys.argv[1:]}
os.makedirs(OUT, exist_ok=True)
dur_path = os.path.join(OUT, "durations.json")
durations = json.load(open(dur_path, encoding="utf-8")) if os.path.exists(dur_path) else {}


def tts(text):
    body = json.dumps(dict(cfg["voice"], text=text)).encode("utf-8")
    last = None
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(WORKER, data=body, headers=HEADERS), timeout=120) as r:
                d = json.loads(r.read().decode("utf-8"))
            if "audio" in d:
                return base64.b64decode(d["audio"]), int(d.get("rate", 24000))
            last = d.get("error")
        except Exception as e:
            last = str(e)
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"TTS 실패: {last}")


for line in cfg["lines"]:
    n = line["n"]
    dst = os.path.join(OUT, f"{n:02d}.wav")
    if (only and n not in only) or (not only and os.path.exists(dst)):
        continue
    pcm, rate = tts(line["text"])
    with wave.open(dst, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    durations[f"{n:02d}"] = round(len(pcm) / 2 / rate, 2)
    print(f"{n:02d} {durations[f'{n:02d}']}s", flush=True)

json.dump(durations, open(dur_path, "w", encoding="utf-8"), indent=1)
print("total", round(sum(durations.values()), 1), "s")
