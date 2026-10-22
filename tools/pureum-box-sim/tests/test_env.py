import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pureum_env import PureumBoxEnv  # noqa: E402


def settle(env, n=10):
    for _ in range(n):
        out = env.step(np.zeros(3, dtype=np.float32))
    return out


def test_reset_shape():
    env = PureumBoxEnv()
    obs, _ = env.reset(seed=0)
    assert obs.shape == (11,)
    assert env.observation_space.contains(obs)


def test_idle_stays_outside():
    env = PureumBoxEnv()
    env.reset(seed=1)
    obs, _, terminated, _, info = settle(env, 30)
    assert not terminated and not info["success"]
    assert obs[10] == 0.0


def test_inside_box_is_success():
    env = PureumBoxEnv()
    env.reset(seed=2)
    env.place(0.0, 0.0, z=0.02)
    _, reward, terminated, _, info = settle(env, 5)
    assert info["success"] and terminated
    assert reward >= 99


def test_jump_goes_up():
    env = PureumBoxEnv()
    env.reset(seed=3)
    settle(env, 5)
    z0 = env._pos()[2]
    env.step(np.array([0, 0, 1], dtype=np.float32))
    assert env._pos()[2] > z0 + 0.05


def test_wall_blocks_without_jump():
    env = PureumBoxEnv()
    env.reset(seed=4)
    env.place(0.6, 0.0, yaw=np.pi)  # 상자를 바라보고 서 있음
    for _ in range(60):
        _, _, terminated, _, _ = env.step(np.array([1, 0, 0], dtype=np.float32))
        assert not terminated
    assert env._pos()[0] > 0.30  # 벽 밖에 막혀 있음


def test_jump_over_wall_gets_in():
    env = PureumBoxEnv()
    env.reset(seed=5)
    env.place(0.75, 0.0, yaw=np.pi)
    got_in = False
    for i in range(80):
        a = np.array([1, 0, 1 if i == 2 else 0], dtype=np.float32)
        _, _, terminated, _, info = env.step(a)
        if info["success"]:
            got_in = True
            break
    assert got_in
