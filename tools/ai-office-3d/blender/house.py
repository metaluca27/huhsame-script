"""4층 집(1~3층 사무실, 4층 춤 연습실) + 박공지붕 다락(밴드 연습실).
앞벽은 house_front_ 로 시작 → 웹에서 숨김. 연습실 안 소품은 studio.py."""
import math

from lib import box, cyl, light, mat, prism, text

W, D, CY = 8.0, 6.0, 1.5          # 가로, 세로, 중심 y
FLOOR_H = 3.0
FLOORS = 4
FRONT_Y = CY - D / 2               # -1.5
BACK_Y = CY + D / 2                # 4.5
ATTIC_Z = FLOORS * FLOOR_H         # 12.0
ROOF_H = 3.5


def floor_z(floor):
    """floor층(1부터) 바닥 윗면 높이."""
    return (floor - 1) * FLOOR_H + 0.2


def inner_window(name, x, y, z):
    """옆벽 안쪽 창: 틀 + 밤하늘색 유리 + 십자 창살 (숙소동 방 창과 같은 재질)."""
    frame = mat("window_frame", "F4EFE6")
    s = 1 if x < 0 else -1          # 방 안쪽(+x 또는 -x)으로 살짝 띄우는 방향
    box(f"{name}_frame", (0.04, 1.1, 1.5), (x + s * 0.01, y, z), frame)
    box(f"{name}_glass", (0.02, 1.0, 1.4), (x + s * 0.035, y, z), mat("night_glass", "6F8FD0", emission=0.8))
    box(f"{name}_bar_v", (0.03, 0.035, 1.4), (x + s * 0.05, y, z), frame)
    box(f"{name}_bar_h", (0.03, 1.0, 0.035), (x + s * 0.05, y, z), frame)


def build():
    wall = mat("house_wall", "E9E4DA")
    trim = mat("house_trim", "8A6A4A")
    wood = mat("house_floor", "C9A27A")
    glow = mat("window_glow", "FFE6B0", emission=3.0)
    for f in range(1, FLOORS + 1):
        z0 = (f - 1) * FLOOR_H
        zc = z0 + FLOOR_H / 2
        box(f"house_floor_f{f}", (W + 0.3, D + 0.3, 0.2), (0, CY, z0 + 0.1), wood)
        box(f"house_wall_back_f{f}", (W, 0.2, FLOOR_H), (0, BACK_Y, zc), wall)
        box(f"house_wall_left_f{f}", (0.2, D, FLOOR_H), (-W / 2, CY, zc), wall)
        box(f"house_wall_right_f{f}", (0.2, D, FLOOR_H), (W / 2, CY, zc), wall)
        box(f"house_front_f{f}", (W, 0.2, FLOOR_H), (0, FRONT_Y, zc), wall)
        light(f"light_house_f{f}", "POINT", (0, CY, z0 + 2.5), 350, color="FFE2B8")
        for i, x in enumerate((-2.6, 0.0, 2.6)):
            if f == 1 and x == 0.0:
                continue  # 1층 가운데는 문
            box(f"house_front_f{f}_window{i + 1}", (1.2, 0.06, 1.5), (x, FRONT_Y - 0.12, z0 + 1.6), glow)
        for side, sx, inner_x in (("left", -W / 2 - 0.12, -W / 2 + 0.12), ("right", W / 2 + 0.12, W / 2 - 0.12)):
            for j, y in enumerate((0.3, 2.9)):
                box(f"house_wall_{side}_f{f}_window{j + 1}", (0.06, 1.0, 1.4), (sx, y, z0 + 1.6), glow)
                # 안쪽 면에도 같은 자리에 창 (안에서 보면 밤하늘) — 벽이 두꺼운 상자라 바깥 창만으론 안이 막혀 보임
                inner_window(f"house_wall_{side}_f{f}_window{j + 1}_in", inner_x, y, z0 + 1.6)
    # 문·간판
    box("house_front_f1_door", (1.1, 0.08, 2.1), (0, FRONT_Y - 0.12, 1.25), trim)
    box("house_front_canopy", (1.8, 0.7, 0.08), (0, FRONT_Y - 0.4, 2.4), trim)
    for i, x in ((1, -2.6), (3, 2.6)):  # 1층 창문 위 차양 (코너 가게 참고)
        box(f"house_front_f1_awning{i}", (1.5, 0.6, 0.06), (x, FRONT_Y - 0.35, 2.55),
            mat("awning", "E8A0A8"), rot=(math.radians(-20), 0, 0))
    lamp_glow = mat("wall_lamp_glow", "FFE2A8", emission=8.0)
    for i, x in enumerate((-0.95, 0.95)):  # 문 양옆 벽등
        box(f"house_front_lamp{i + 1}_bracket", (0.08, 0.14, 0.08), (x, FRONT_Y - 0.17, 2.0), trim)
        cyl(f"house_front_lamp{i + 1}", 0.08, 0.22, (x, FRONT_Y - 0.26, 2.0), lamp_glow, verts=12)
    light("light_house_door", "POINT", (0, FRONT_Y - 0.9, 2.2), 120, color="FFD9A0", shadow=False)
    box("house_front_sign_board", (3.6, 0.1, 0.5), (0, FRONT_Y - 0.17, 2.72), mat("sign_bg", "3A3550"))
    text("house_front_sign_text", "DIGITAL ATTIC", (0, FRONT_Y - 0.23, 2.72), 0.32,
         mat("sign_text", "FFE9A8", emission=3.0))
    # 다락 (박공지붕)
    roof = mat("roof", "6E4A5A")
    box("attic_floor", (W + 0.3, D + 0.3, 0.2), (0, CY, ATTIC_Z + 0.1), wood)
    half = (W + 0.6) / 2
    slope = math.hypot(half, ROOF_H)
    angle = math.atan2(ROOF_H, half)
    box("attic_roof_left", (slope, D + 0.6, 0.15), (-half / 2, CY, ATTIC_Z + ROOF_H / 2), roof, rot=(0, -angle, 0))
    box("attic_roof_right", (slope, D + 0.6, 0.15), (half / 2, CY, ATTIC_Z + ROOF_H / 2), roof, rot=(0, angle, 0))
    prism("attic_gable_back", W, 0.2, ROOF_H - 0.1, (0, BACK_Y, ATTIC_Z + 0.2), wall)
    prism("house_front_attic_gable", W, 0.2, ROOF_H - 0.1, (0, FRONT_Y, ATTIC_Z + 0.2), wall)
    cyl("house_front_attic_window", 0.7, 0.1, (0, FRONT_Y - 0.12, ATTIC_Z + 1.4), glow,
        rot=(math.radians(90), 0, 0), verts=32)
    light("light_house_attic", "POINT", (0, CY, ATTIC_Z + 1.6), 150, color="C9B8FF")
    box("attic_chimney", (0.6, 0.6, 1.6), (2.5, 2.5, ATTIC_Z + 2.2), mat("chimney", "8A5A4A"))
