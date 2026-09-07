"""Sora 2 image-to-video: 키프레임 1장 + 프롬프트 → 세로 mp4.

사용:
  python tools/sora_clip.py <이미지경로> <출력mp4> "<프롬프트>" [--seconds 8] [--model sora-2]

- OPENAI_API_KEY 환경변수 사용
- 입력 이미지는 720x1280(9:16)으로 자동 리사이즈(중앙 크롭)해서 전송
"""
import argparse, io, os, sys, time
import requests
from PIL import Image

API = "https://api.openai.com/v1/videos"
W, H = 720, 1280


def fit_9x16(path: str) -> bytes:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    target = W / H
    if w / h > target:  # 너무 넓음 → 좌우 크롭
        nw = int(h * target)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:  # 너무 김 → 상하 크롭
        nh = int(w / target)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((W, H), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("out")
    ap.add_argument("prompt")
    ap.add_argument("--seconds", default="8", choices=["4", "8", "12"])
    ap.add_argument("--model", default="sora-2")
    a = ap.parse_args()

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY 없음")
    hdr = {"Authorization": f"Bearer {key}"}

    png = fit_9x16(a.image)
    r = requests.post(
        API,
        headers=hdr,
        data={"model": a.model, "prompt": a.prompt, "size": f"{W}x{H}", "seconds": a.seconds},
        files={"input_reference": ("frame.png", png, "image/png")},
        timeout=120,
    )
    if r.status_code >= 400:
        sys.exit(f"생성 요청 실패 {r.status_code}: {r.text[:800]}")
    job = r.json()
    vid = job["id"]
    print(f"job {vid} status={job.get('status')}", flush=True)

    t0 = time.time()
    while True:
        time.sleep(10)
        j = requests.get(f"{API}/{vid}", headers=hdr, timeout=60).json()
        st = j.get("status")
        print(f"  {int(time.time()-t0):4d}s {st} {j.get('progress', '')}", flush=True)
        if st == "completed":
            break
        if st in ("failed", "cancelled"):
            sys.exit(f"실패: {j.get('error')}")
        if time.time() - t0 > 900:
            sys.exit("15분 초과")

    c = requests.get(f"{API}/{vid}/content", headers=hdr, timeout=300)
    c.raise_for_status()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "wb") as f:
        f.write(c.content)
    print(f"saved {a.out} ({len(c.content)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
