"""푸름이 상자 세상 — MuJoCo 물리 + Gymnasium 규칙(관찰·행동·보상)."""
import math

import gymnasium as gym
import mujoco
import numpy as np

BOX_HALF = 0.30      # 상자 안쪽 반 너비 (m)
WALL_T = 0.02        # 벽 두께
WALL_H = 0.12        # 벽 높이 — 푸름이 키(약 0.25)의 절반
BODY_RZ = 0.10       # 몸통 세로 반지름 = 바닥에 앉았을 때 몸 중심 높이

MOVE_FORCE = 25.0    # 앞뒤로 미는 힘 (N)
TURN_SPEED = 3.0     # 도는 속도 (rad/s)
JUMP_SPEED = 2.4     # 점프 순간 위로 속도 (m/s)

FRAME_SKIP = 20      # 0.002s x 20 = 한 번 판단에 0.04초
MAX_STEPS = 250      # 10초


def build_xml(wall_h=WALL_H):
    w = BOX_HALF + WALL_T
    walls = "\n".join(
        f'<geom name="wall{i}" type="box" size="{sx} {sy} {wall_h / 2}" pos="{px} {py} {wall_h / 2}" material="cardboard"/>'
        for i, (sx, sy, px, py) in enumerate([
            (w, WALL_T, 0, BOX_HALF + WALL_T),
            (w, WALL_T, 0, -(BOX_HALF + WALL_T)),
            (WALL_T, BOX_HALF, BOX_HALF + WALL_T, 0),
            (WALL_T, BOX_HALF, -(BOX_HALF + WALL_T), 0),
        ])
    )
    return f"""
<mujoco model="pureum_box">
  <option timestep="0.002" gravity="0 0 -9.81"/>
  <default><geom friction=".1 .005 .0001"/></default>
  <visual>
    <global offwidth="1080" offheight="1920"/>
    <headlight ambient=".45 .45 .45" diffuse=".6 .6 .6"/>
  </visual>
  <asset>
    <texture name="sky" type="skybox" builtin="gradient" rgb1=".98 .93 .86" rgb2=".86 .80 .74" width="256" height="256"/>
    <texture name="floor" type="2d" builtin="checker" rgb1=".86 .78 .66" rgb2=".80 .71 .58" width="512" height="512"/>
    <material name="floor" texture="floor" texrepeat="8 8"/>
    <material name="cardboard" rgba=".72 .53 .33 1"/>
    <material name="fur" rgba=".58 .62 .68 1"/>
    <material name="inner_ear" rgba=".93 .70 .72 1"/>
    <mesh name="ear" vertex="-.035 -.025 0  .035 -.025 0  0 .025 0  0 0 .07"/>
  </asset>
  <worldbody>
    <light pos="0 -1 4" dir="0 .2 -1" diffuse=".5 .5 .5"/>
    <geom name="floor" type="plane" size="5 5 .1" material="floor"/>
    <body name="box" pos="0 0 0">
      <geom name="box_floor" type="box" size="{w} {w} .003" pos="0 0 .003" material="cardboard"/>
      {walls}
    </body>
    <camera name="shorts" mode="targetbody" target="box" pos="0 -2.5 1.5" fovy="58"/>
    <body name="pureum" pos="0 0 {BODY_RZ}">
      <joint name="x" type="slide" axis="1 0 0" damping="18"/>
      <joint name="y" type="slide" axis="0 1 0" damping="18"/>
      <joint name="z" type="slide" axis="0 0 1"/>
      <joint name="yaw" type="hinge" axis="0 0 1"/>
      <geom name="body" type="ellipsoid" size=".16 .11 .10" mass="3" material="fur" friction=".1 .005 .0001"/>
      <geom name="head" type="sphere" size=".085" pos=".15 0 .09" mass=".4" material="fur" friction=".1 .005 .0001"/>
      <geom name="ear_l" type="mesh" mesh="ear" pos=".14 .045 .155" euler="0 -10 15" material="fur" contype="0" conaffinity="0" mass="0"/>
      <geom name="ear_r" type="mesh" mesh="ear" pos=".14 -.045 .155" euler="0 -10 -15" material="fur" contype="0" conaffinity="0" mass="0"/>
      <geom name="eye_l" type="sphere" size=".016" pos=".225 .03 .105" rgba=".95 .80 .20 1" contype="0" conaffinity="0" mass="0"/>
      <geom name="eye_r" type="sphere" size=".016" pos=".225 -.03 .105" rgba=".95 .80 .20 1" contype="0" conaffinity="0" mass="0"/>
      <geom name="nose" type="sphere" size=".009" pos=".233 0 .085" rgba=".85 .50 .55 1" contype="0" conaffinity="0" mass="0"/>
      <geom name="tail" type="capsule" fromto="-.15 0 .03 -.24 0 .17" size=".022" material="fur" contype="0" conaffinity="0" mass="0"/>
    </body>
  </worldbody>
</mujoco>
"""


class PureumBoxEnv(gym.Env):
    """관찰 11개 / 행동 3개(밀기·돌기·점프)."""

    metadata = {"render_modes": ["rgb_array"], "render_fps": 25}

    def __init__(self, render_mode=None, wall_h=WALL_H, width=1080, height=1920):
        self.model = mujoco.MjModel.from_xml_string(build_xml(wall_h))
        self.data = mujoco.MjData(self.model)
        self.render_mode = render_mode
        self._renderer = None
        self._size = (height, width)
        self.observation_space = gym.spaces.Box(-np.inf, np.inf, shape=(11,), dtype=np.float32)
        self.action_space = gym.spaces.Box(-1.0, 1.0, shape=(3,), dtype=np.float32)
        m = self.model
        self._q = {n: m.jnt_qposadr[m.joint(n).id] for n in ("x", "y", "z", "yaw")}
        self._v = {n: m.jnt_dofadr[m.joint(n).id] for n in ("x", "y", "z", "yaw")}
        self._cat_geoms = {m.geom("body").id, m.geom("head").id}
        self._ground_geoms = {m.geom("floor").id, m.geom("box_floor").id}

    # ---- 상태 읽기 ----
    def _pos(self):
        q = self.data.qpos
        return q[self._q["x"]], q[self._q["y"]], BODY_RZ + q[self._q["z"]], q[self._q["yaw"]]

    def _dist(self):
        x, y, _, _ = self._pos()
        return math.hypot(x, y)

    def _on_ground(self):
        for c in self.data.contact[: self.data.ncon]:
            pair = {c.geom1, c.geom2}
            if pair & self._cat_geoms and pair & self._ground_geoms:
                return True
        return False

    def _inside(self):
        x, y, z, _ = self._pos()
        return abs(x) < BOX_HALF - 0.05 and abs(y) < BOX_HALF - 0.05 and z < BODY_RZ + 0.05

    def _obs(self):
        x, y, z, yaw = self._pos()
        c, s = math.cos(yaw), math.sin(yaw)
        # 상자(원점)가 푸름이 기준 어디 있는지: 앞(+)/뒤(-), 왼(+)/오른(-)
        bx, by = -x, -y
        fwd, left = c * bx + s * by, -s * bx + c * by
        v = self.data.qvel
        vx, vy = v[self._v["x"]], v[self._v["y"]]
        vf, vl = c * vx + s * vy, -s * vx + c * vy
        return np.array([fwd, left, math.hypot(bx, by), c, s, vf, vl, v[self._v["z"]], z,
                         float(self._on_ground()), float(self._inside())], dtype=np.float32)

    # ---- Gymnasium ----
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        mujoco.mj_resetData(self.model, self.data)
        r = self.np_random.uniform(0.85, 1.3)
        ang = self.np_random.uniform(-math.pi, math.pi)
        q = self.data.qpos
        q[self._q["x"]], q[self._q["y"]] = r * math.cos(ang), r * math.sin(ang)
        q[self._q["yaw"]] = self.np_random.uniform(-math.pi, math.pi)
        mujoco.mj_forward(self.model, self.data)
        self._steps = 0
        self._prev_dist = self._dist()
        return self._obs(), {}

    def place(self, x, y, yaw=0.0, z=0.0):
        """테스트·연출용: 푸름이를 원하는 자리에 놓기."""
        q = self.data.qpos
        q[self._q["x"]], q[self._q["y"]], q[self._q["z"]], q[self._q["yaw"]] = x, y, z, yaw
        self.data.qvel[:] = 0
        mujoco.mj_forward(self.model, self.data)
        self._prev_dist = self._dist()

    def step(self, action):
        push, turn, jump = np.clip(action, -1, 1)
        _, _, _, yaw = self._pos()
        jumped = False
        if jump > 0.5 and self._on_ground():
            self.data.qvel[self._v["z"]] = JUMP_SPEED
            jumped = True
        self.data.qvel[self._v["yaw"]] = turn * TURN_SPEED
        f = self.data.qfrc_applied
        f[:] = 0
        f[self._v["x"]] = push * MOVE_FORCE * math.cos(yaw)
        f[self._v["y"]] = push * MOVE_FORCE * math.sin(yaw)
        for _ in range(FRAME_SKIP):
            self.data.qvel[self._v["yaw"]] = turn * TURN_SPEED
            mujoco.mj_step(self.model, self.data)
        self._steps += 1

        dist = self._dist()
        reward = (self._prev_dist - dist) * 10.0 - 0.01
        self._prev_dist = dist
        if jumped:
            reward -= 0.05
        success = self._inside() and self._on_ground()
        if success:
            reward += 100.0
        truncated = self._steps >= MAX_STEPS or dist > 3.0
        return self._obs(), reward, success, truncated, {"success": success}

    def render(self):
        if self._renderer is None:
            self._renderer = mujoco.Renderer(self.model, *self._size)
        self._renderer.update_scene(self.data, camera="shorts")
        return self._renderer.render()

    def close(self):
        if self._renderer is not None:
            self._renderer.close()
            self._renderer = None
