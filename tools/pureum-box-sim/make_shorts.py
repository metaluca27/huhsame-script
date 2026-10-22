"""숏츠 완성본: 화면 글 + 효과음(뿅·쿵·딩). 배경음악은 유튜브 앱에서 추가.
사용법: python make_shorts.py
"""
import subprocess
import wave
from pathlib import Path

import imageio.v2 as imageio
import imageio_ffmpeg
import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from stable_baselines3 import PPO

from pureum_env import PureumBoxEnv

HERE = Path(__file__).parent
RUNS, OUT = HERE / "runs", HERE / "out"
FONT = "C:/Users/atlia/AppData/Local/Microsoft/Windows/Fonts/UhBeeSe_hyun.ttf"
FPS, SR = 25, 44100
INK, PAPER = (70, 55, 45), (255, 250, 240)

INTRO = ("AI 고양이한테 상자를 줬어요", "들어가는 법은 안 알려줬어요")
SCENES = [  # (체크포인트, 위 큰 글씨, 아래 작은 글씨, 최대 초, 버둥모드)
    (0, "첫 도전", "아무것도 몰라서 일단 뛰고 봄", 5, True),
    (200_000, "연습 20만 번째", "상자는 찾았는데… 벽만 밀어요", 5, False),
    (250_000, "연습 25만 번째", "아! 뛰면 되잖아? 🐾", 6, False),
]
OUTRO = ("알려준 건 딱 하나", "\"상자 안에 들어가면 +100점\"")
FLAIL_SEED, SCENE_SEED = 15, 0


# ---------- 화면 글 ----------
def _text(d, y, text, size, fill=INK, stroke=PAPER):
    text = text.replace("🐾", "").rstrip()
    while True:  # 화면 폭(양옆 50px 여백)을 넘으면 글씨를 줄임
        font = ImageFont.truetype(FONT, size)
        w = d.textlength(text, font=font)
        if w <= 980 or size <= 40:
            break
        size -= 4
    d.text(((1080 - w) / 2, y), text, font=font, fill=fill, stroke_width=size // 14, stroke_fill=stroke)


def caption(frame, big, small):
    img = Image.fromarray(frame)
    d = ImageDraw.Draw(img)
    _text(d, 150, big, 96)
    _text(d, 290, small, 62)
    return np.asarray(img)


def card(frame, big, small):
    img = Image.fromarray(frame).convert("RGBA")
    shade = Image.new("RGBA", img.size, (40, 30, 25, 150))
    img = Image.alpha_composite(img, shade).convert("RGB")
    d = ImageDraw.Draw(img)
    _text(d, 760, big, 100, fill=PAPER, stroke=INK)
    _text(d, 920, small, 76, fill=(255, 220, 120), stroke=INK)
    return np.asarray(img)


# ---------- 장면 찍기 ----------
def play(model, seed, max_sec, explore):
    env = PureumBoxEnv(render_mode="rgb_array")
    obs, _ = env.reset(seed=seed)
    if explore:
        torch.manual_seed(seed)
    frames, events = [env.render()], []
    for i in range(int(max_sec * FPS)):
        if not explore or i % 4 == 0:
            action, _ = model.predict(obs, deterministic=not explore)
        obs, _, term, trunc, info = env.step(action)
        frames.append(env.render())
        for kind in ("jumped", "bump", "success"):
            if info[kind]:
                events.append((len(frames) - 1, kind))
        if term or trunc:
            break
    env.close()
    return frames, events


# ---------- 효과음 ----------
def _env(n, decay):
    return np.exp(-np.linspace(0, decay, n))


def sfx(kind):
    if kind == "jumped":   # 뿅: 위로 올라가는 짧은 소리
        t = np.linspace(0, 0.16, int(SR * 0.16), False)
        f = 380 + 900 * t / 0.16
        return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 3)
    if kind == "bump":     # 쿵: 낮은 소리 + 살짝 잡음
        t = np.linspace(0, 0.18, int(SR * 0.18), False)
        tone = np.sin(2 * np.pi * 85 * t) + 0.3 * np.random.default_rng(0).normal(size=len(t))
        return 0.5 * tone * _env(len(t), 7)
    t = np.linspace(0, 0.9, int(SR * 0.9), False)  # 딩~: 맑은 종소리
    bell = np.sin(2 * np.pi * 1318 * t) + 0.6 * np.sin(2 * np.pi * 1976 * t)
    return 0.3 * bell * _env(len(t), 5)


def mix(total_frames, events):
    track = np.zeros(int(total_frames / FPS * SR) + SR)
    for frame, kind in events:
        s = sfx(kind)
        start = int(frame / FPS * SR)
        track[start:start + len(s)] += s[: len(track) - start]
    return np.clip(track, -1, 1)


def main():
    OUT.mkdir(exist_ok=True)
    video, events = [], []
    first = True
    for steps, big, small, sec, explore in SCENES:
        model = PPO.load(RUNS / f"ckpt_{steps}_steps.zip", device="cpu")
        frames, ev = play(model, FLAIL_SEED if explore else SCENE_SEED, sec, explore)
        if first:  # 시작 1.5초: 첫 장면 위에 질문
            video += [caption(frames[0], *INTRO)] * int(1.5 * FPS)
            first = False
        events += [(len(video) + f, k) for f, k in ev]
        frames += [frames[-1]] * int(0.6 * FPS)
        video += [caption(f, big, small) for f in frames]
    video += [card(frames[-1], *OUTRO)] * int(2.5 * FPS)

    silent, wav, final = OUT / "_silent.mp4", OUT / "_sfx.wav", OUT / "pureum_box_shorts.mp4"
    imageio.mimwrite(silent, video, fps=FPS, quality=8, macro_block_size=1)
    pcm = (mix(len(video), events) * 32767).astype(np.int16)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(SR), w.writeframes(pcm.tobytes())
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(silent),
                    "-i", str(wav), "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    str(final)], check=True)
    silent.unlink(), wav.unlink()
    kinds = {k: sum(1 for _, x in events if x == k) for k in ("jumped", "bump", "success")}
    print(f"완성: {final} ({len(video) / FPS:.1f}초) 효과음 뿅{kinds['jumped']} 쿵{kinds['bump']} 딩{kinds['success']}")


if __name__ == "__main__":
    main()
