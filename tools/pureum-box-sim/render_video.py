"""연습 단계별 푸름이를 세로 숏츠 영상으로. 사용법: python render_video.py [체크포인트 걸음수 ...]"""
import argparse
import subprocess
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
FPS = 25


def label(frame, text):
    img = Image.fromarray(frame)
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 96)
    w = d.textlength(text, font=font)
    d.text(((img.width - w) / 2, 150), text, font=font, fill=(70, 55, 45),
           stroke_width=6, stroke_fill=(255, 250, 240))
    return np.asarray(img)


def episode_frames(model, seed, max_sec, explore=False, hold=1):
    """explore=True: 연습 초반처럼 아무렇게나 시도(버둥버둥). hold: 같은 동작을 몇 번 이어갈지."""
    env = PureumBoxEnv(render_mode="rgb_array")
    obs, _ = env.reset(seed=seed)
    if explore:
        torch.manual_seed(seed)
    frames, success = [env.render()], False
    for i in range(int(max_sec * FPS)):
        if i % hold == 0:
            action, _ = model.predict(obs, deterministic=not explore)
        obs, _, terminated, truncated, info = env.step(action)
        frames.append(env.render())
        if terminated or truncated:
            success = info["success"]
            break
    frames += [frames[-1]] * FPS  # 끝 장면 1초 멈춤
    env.close()
    return frames, success


def text_for(steps):
    return "첫 도전" if steps == 0 else f"연습 {steps // 10000}만 번째"


def pick_seed(model, tries=40):
    """마지막 실력으로 깔끔하게 성공하는 시작 자리를 고른다."""
    env = PureumBoxEnv()
    for seed in range(tries):
        obs, _ = env.reset(seed=seed)
        for _ in range(250):
            obs, _, term, trunc, info = env.step(model.predict(obs, deterministic=True)[0])
            if term or trunc:
                break
        if info["success"]:
            return seed
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("steps", nargs="*", type=int, help="체크포인트 걸음수(없으면 처음·중간·끝)")
    p.add_argument("--seed", type=int)
    p.add_argument("--name", default="pureum_box")
    p.add_argument("--flail-seed", type=int, default=15, help="첫 도전 버둥버둥 장면의 무작위 씨앗")
    args = p.parse_args()

    ckpts = sorted(RUNS.glob("ckpt_*_steps.zip"), key=lambda f: int(f.stem.split("_")[1]))
    by_steps = {int(f.stem.split("_")[1]): f for f in ckpts}
    steps = args.steps or [0, sorted(by_steps)[len(by_steps) // 3], max(by_steps)]
    seed = args.seed if args.seed is not None else pick_seed(PPO.load(by_steps[max(by_steps)]))

    OUT.mkdir(exist_ok=True)
    parts = []
    for s in steps:
        model = PPO.load(by_steps[s], device="cpu")
        if s == 0:
            frames, ok = episode_frames(model, args.flail_seed, max_sec=5, explore=True, hold=4)
        else:
            frames, ok = episode_frames(model, seed, max_sec=8)
        part = OUT / f"{args.name}_{s}.mp4"
        imageio.mimwrite(part, [label(f, text_for(s)) for f in frames], fps=FPS,
                         quality=8, macro_block_size=1)
        parts.append(part)
        print(f"{text_for(s)}: {'성공' if ok else '실패'} ({len(frames) / FPS:.1f}초)")

    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    final = OUT / f"{args.name}.mp4"
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "concat",
                    "-safe", "0", "-i", str(lst), "-c", "copy", str(final)], check=True)
    print(f"완성: {final} (시작 자리 seed={seed})")


if __name__ == "__main__":
    main()
