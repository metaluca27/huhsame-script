"""푸름이 연습시키기 (PPO). 사용법: python train.py --steps 1500000"""
import argparse
from pathlib import Path

from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import CheckpointCallback
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import SubprocVecEnv

from pureum_env import PureumBoxEnv

RUNS = Path(__file__).parent / "runs"


def evaluate(model, n=20, seed=1000):
    env = PureumBoxEnv()
    wins = 0
    for i in range(n):
        obs, _ = env.reset(seed=seed + i)
        done = False
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, terminated, truncated, info = env.step(action)
            done = terminated or truncated
        wins += info["success"]
    return wins


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--steps", type=int, default=1_500_000)
    p.add_argument("--envs", type=int, default=8)
    p.add_argument("--save-every", type=int, default=50_000)
    args = p.parse_args()

    RUNS.mkdir(exist_ok=True)
    env = make_vec_env(PureumBoxEnv, n_envs=args.envs, seed=0, vec_env_cls=SubprocVecEnv)
    model = PPO("MlpPolicy", env, n_steps=1024, batch_size=512, gamma=0.99,
                learning_rate=3e-4, ent_coef=0.005, verbose=1, seed=0, device="cpu")
    model.save(RUNS / "ckpt_0_steps")  # 아무것도 모르는 첫 도전
    every = max(args.save_every // args.envs, 1)
    model.learn(total_timesteps=args.steps,
                callback=CheckpointCallback(every, str(RUNS), name_prefix="ckpt"))
    model.save(RUNS / "final")
    print(f"성공: 20번 중 {evaluate(model)}번 상자 안에 들어감")


if __name__ == "__main__":
    main()
