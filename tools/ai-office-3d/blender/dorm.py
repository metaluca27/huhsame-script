"""숙소동(3층) = 잠자는 곳. 개인 방 7개, 잘 자리 sleep_<이름>.
본관 왼쪽 뒤에 서서 앞(-y)을 본다. 앞벽 dorm_front_ 는 웹에서 숨김."""
from lib import box, cyl, light, mat, marker, prism

X0, X1 = -10.5, -4.6      # 좌우 (본관 왼쪽 벽 x=-4 과 0.6 띄움)
Y0, Y1 = 4.2, 7.8         # 앞뒤
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
    marker(f"sleep_{owner}", (bx, by, z + 0.5))


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
