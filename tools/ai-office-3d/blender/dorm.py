"""숙소동(3층) = 잠자는 곳. 개인 방 7개, 잘 자리 sleep_<이름>.
본관 왼쪽 옆에 앞줄을 맞춰 서서 앞(-y, 카메라 쪽)을 본다 → 바깥 카메라에서 건물 2개가 다 보임.
앞벽 dorm_front_ 는 웹에서 숨김."""
from lib import ball, box, cyl, light, mat, marker, prism

X0, X1 = -10.5, -4.6      # 좌우 (본관 왼쪽 벽 x=-4 과 0.6 띄움)
Y0, Y1 = -1.0, 2.6        # 앞뒤 (본관 앞면 y=-1.5 와 거의 나란히)
FLOOR_H = 2.6
ROOMS = [["hermi", "jujuya", "luna"], ["nova", "pureum"], ["rurik", "clo"]]   # 1층, 2층, 3층
COLORS = {"hermi": "D9D9E3", "jujuya": "F4A7B9", "luna": "9B8BD8", "nova": "6B4FA8",
          "pureum": "7FA8D8", "rurik": "5B3F6A", "clo": "E9D8B8"}


def room(owner, x, z, rw):
    """x = 방 가운데, z = 바닥 윗면, rw = 방 폭. 침대는 왼쪽 벽에 붙이고 머리는 뒷벽 쪽."""
    c = COLORS[owner]
    by = Y1 - 1.15
    bx = x - rw / 2 + 0.65
    box(f"dorm_room_{owner}_bed", (0.95, 1.9, 0.3), (bx, by, z + 0.15), mat("bed_frame", "9B7653"), bevel=0.03)
    box(f"dorm_room_{owner}_blanket", (0.97, 1.3, 0.08), (bx, by - 0.3, z + 0.33), mat(f"blanket_{c}", c, roughness=0.9), bevel=0.03)
    box(f"dorm_room_{owner}_pillow", (0.6, 0.35, 0.12), (bx, by + 0.7, z + 0.36), mat("pillow", "FAF7F0"), bevel=0.04)
    box(f"dorm_room_{owner}_nightstand", (0.4, 0.4, 0.45), (bx + 0.75, by + 0.7, z + 0.225), mat("desk_wood", "9B7653"))
    cyl(f"dorm_room_{owner}_lamp", 0.1, 0.18, (bx + 0.75, by + 0.7, z + 0.54), mat(f"lamp_{c}", c, emission=2.0), verts=12)
    box(f"dorm_room_{owner}_rug", (rw - 0.5, 0.9, 0.01), (x, Y0 + 0.9, z + 0.005), mat(f"rug_{c}", c, roughness=0.95))
    window(owner, x + 0.25, z, c)
    ceiling_lamp(owner, x, z)
    marker(f"sleep_{owner}", (bx, by, z + 0.5))


def ceiling_lamp(owner, x, z):
    """방 천장 가운데 둥근 등 (천장 = 방 바닥 + 2.45)."""
    n = f"dorm_room_{owner}_lamp_ceiling"
    cy = (Y0 + Y1) / 2
    top = z + FLOOR_H - 0.15
    cyl(f"{n}_base", 0.16, 0.04, (x, cy, top - 0.02), mat("window_frame", "F4EFE6"), verts=16)
    ball(f"{n}_bulb", 0.14, (x, cy, top - 0.06), mat("dorm_bulb", "FFE6B8", emission=6), scale=(1, 1, 0.5))
    light(f"light_dorm_{owner}", "POINT", (x, cy, top - 0.3), 45, color="FFD9A8", shadow=False)


def window(owner, x, z, c):
    """뒷벽 창문 (앞벽을 숨긴 인형의 집 시점에서 방마다 보이게). 유리는 은은한 밤하늘색."""
    n = f"dorm_room_{owner}_window"
    wy = Y1 - 0.09                      # 뒷벽 안쪽 면 바로 앞
    zc, w, h = z + 1.45, 0.8, 0.8
    frame = mat("window_frame", "F4EFE6")
    box(f"{n}_frame", (w + 0.1, 0.04, h + 0.1), (x, wy, zc), frame)
    box(f"{n}_glass", (w, 0.02, h), (x, wy - 0.025, zc), mat("night_glass", "6F8FD0", emission=0.8))
    box(f"{n}_bar_v", (0.035, 0.03, h), (x, wy - 0.04, zc), frame)
    box(f"{n}_bar_h", (w, 0.03, 0.035), (x, wy - 0.04, zc), frame)
    box(f"{n}_sill", (w + 0.2, 0.12, 0.04), (x, wy - 0.06, zc - h / 2 - 0.05), frame)
    # 바깥(뒷벽 바깥 면)에도 같은 자리에 불 켜진 창 — 안쪽 창만 있으면 밖에선 막힌 벽으로 보임
    box(f"{n}_out_frame", (w + 0.1, 0.04, h + 0.1), (x, Y1 + 0.09, zc), frame)
    box(f"{n}_out_glass", (w, 0.02, h), (x, Y1 + 0.115, zc), mat("window_glow", "FFE6B0", emission=3.0))
    curtain = mat(f"curtain_{c}", c, roughness=0.95)
    for i, s in enumerate((-1, 1)):     # 양옆으로 묶어 둔 커튼
        box(f"{n}_curtain{i + 1}", (0.14, 0.05, h + 0.25), (x + s * (w / 2 + 0.08), wy - 0.07, zc - 0.05), curtain)


def build():
    w, d = X1 - X0, Y1 - Y0
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    wall = mat("dorm_wall", "F2E6D8")
    wood = mat("house_floor", "C9A27A")
    glow = mat("window_glow", "FFE6B0", emission=3.0)
    for f, owners in enumerate(ROOMS, start=1):
        z0 = (f - 1) * FLOOR_H
        zc = z0 + FLOOR_H / 2
        box(f"dorm_floor_f{f}", (w + 0.2, d + 0.2, 0.15), (cx, cy, z0 + 0.075), wood)
        box(f"dorm_wall_back_f{f}", (w, 0.15, FLOOR_H), (cx, Y1, zc), wall)
        box(f"dorm_wall_left_f{f}", (0.15, d, FLOOR_H), (X0, cy, zc), wall)
        box(f"dorm_wall_right_f{f}", (0.15, d, FLOOR_H), (X1, cy, zc), wall)
        box(f"dorm_front_f{f}", (w, 0.15, FLOOR_H), (cx, Y0, zc), wall)
        rw = w / len(owners)
        for i, owner in enumerate(owners):
            rx = X0 + rw * (i + 0.5)
            if i > 0:
                box(f"dorm_wall_part_f{f}_{i}", (0.08, d, FLOOR_H), (X0 + rw * i, cy, zc), wall)
            box(f"dorm_front_f{f}_window{i + 1}", (min(1.0, rw - 0.5), 0.05, 0.9), (rx, Y0 - 0.1, z0 + 1.4), glow)
            room(owner, rx, z0 + 0.15, rw)
        light(f"light_dorm_f{f}", "POINT", (cx, cy, z0 + 2.2), 120, color="FFD9A8")
    top = len(ROOMS) * FLOOR_H
    roof = mat("roof", "6E4A5A")
    box("dorm_roof_base", (w + 0.4, d + 0.4, 0.15), (cx, cy, top + 0.075), roof)
    prism("dorm_roof", w + 0.4, d + 0.4, 1.4, (cx, cy, top + 0.15), roof)
