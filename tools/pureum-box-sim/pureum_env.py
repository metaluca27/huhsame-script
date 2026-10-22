"""푸름이 상자 세상 — MuJoCo 물리 + Gymnasium 규칙(관찰·행동·보상)."""
import math

import gymnasium as gym
import mujoco
import numpy as np

BOX_HALF = 0.30      # 상자 안쪽 반 너비 (m)
WALL_T = 0.02        # 벽 두께
WALL_H = 0.12        # 벽 높이 — 다리로 걸어서는 못 넘고 뛰어야 넘음
BODY_RZ = 0.17       # 서 있을 때 몸통 중심 높이 (다리 길이만큼 올라감)

LEG_HALF = 0.042     # 다리(캡슐) 반 길이
HIP_Z = -0.06        # 몸 중심 기준 엉덩이 높이
LEGS = {             # 이름: (앞뒤 x, 좌우 y)
    "leg_fl": (0.09, 0.065), "leg_fr": (0.09, -0.065),
    "leg_bl": (-0.09, 0.065), "leg_br": (-0.09, -0.065),
}

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
    legs = "\n".join(
        f'      <geom name="{n}" type="capsule" size=".024 {LEG_HALF}" pos="{x} {y} {HIP_Z - LEG_HALF}" '
        f'material="fur" contype="0" conaffinity="0" mass="0"/>'
        for n, (x, y) in LEGS.items()
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
    <camera name="shorts" mode="targetbody" target="box" pos="0 -2.9 1.9" fovy="58"/>
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
      <geom name="paws" type="box" size=".12 .07 .02" pos="0 0 {-BODY_RZ + 0.02}" rgba="0 0 0 0" mass=".3"/>
{legs}
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
        self._cat_geoms = {m.geom("body").id, m.geom("head").id, m.geom("paws").id}
        self._legs = {n: m.geom(n).id for n in LEGS}
        self._phase = 0.0
        self._ground_geoms = {m.geom("floor").id, m.geom("box_floor").id}
        self._wall_geoms = {m.geom(f"wall{i}").id for i in range(4)}
        self._touching_wall = False

    # ---- 상태 읽기 ----
    def _pos(self):
        q = self.data.qpos
        return q[self._q["x"]], q[self._q["y"]], BODY_RZ + q[self._q["z"]], q[self._q["yaw"]]

    def _dist(self):
        x, y, _, _ = self._pos()
        return math.hypot(x, y)

    def _touching(self, others):
        for c in self.data.contact[: self.data.ncon]:
            pair = {c.geom1, c.geom2}
            if pair & self._cat_geoms and pair & others:
                return True
        return False

    def _on_ground(self):
        return self._touching(self._ground_geoms)

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
        # 세로 화면에서 안 잘리게 상자 앞뒤 쪽에서 시작 (좌우는 0.75m 안쪽)
        r = self.np_random.uniform(0.85, 1.3)
        sx = self.np_random.uniform(-0.75, 0.75)
        sy = math.sqrt(r * r - sx * sx) * self.np_random.choice([-1, 1])
        q = self.data.qpos
        q[self._q["x"]], q[self._q["y"]] = sx, sy
        q[self._q["yaw"]] = self.np_random.uniform(-math.pi, math.pi)
        mujoco.mj_forward(self.model, self.data)
        self._steps = 0
        self._touching_wall = False
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
        touching = self._touching(self._wall_geoms)
        bump = touching and not self._touching_wall  # 효과음용: 벽에 막 부딪힌 순간
        self._touching_wall = touching
        return self._obs(), reward, success, truncated, {"success": success, "jumped": jumped, "bump": bump}

    def _pose_legs(self):
        """보기용 다리 흔들기 — 물리에는 영향 없음(충돌 안 하는 장식)."""
        x, y, z, yaw = self._pos()
        v = self.data.qvel
        speed = math.hypot(v[self._v["x"]], v[self._v["y"]]) + 0.15 * abs(v[self._v["yaw"]])
        self._phase += speed * 0.9
        airborne = z > BODY_RZ + 0.03
        for n, gid in self._legs.items():
            lx, ly = LEGS[n]
            front = lx > 0
            if airborne:  # 점프: 앞다리 앞으로, 뒷다리 뒤로 쭉
                th = 0.7 if front else -0.7
            else:         # 대각선 다리끼리 같이 움직이는 고양이 걸음
                sign = 1 if (front == (ly > 0)) else -1
                th = sign * min(1.0, speed / 0.5) * 0.55 * math.sin(self._phase)
            self.model.geom_pos[gid] = (lx + math.sin(th) * LEG_HALF, ly, HIP_Z - math.cos(th) * LEG_HALF)
            self.model.geom_quat[gid] = (math.cos(-th / 2), 0, math.sin(-th / 2), 0)
        mujoco.mj_kinematics(self.model, self.data)

    def render(self):
        self._pose_legs()
        if self._renderer is None:
            self._renderer = mujoco.Renderer(self.model, *self._size)
        self._renderer.update_scene(self.data, camera="shorts")
        return self._renderer.render()

    def close(self):
        if self._renderer is not None:
            self._renderer.close()
            self._renderer = None
