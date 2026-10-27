"""네모 블록 받침(22×22), 길모퉁이(남·동 가장자리), 나무, 가로등, 연못 정원(마당 왼쪽).
코너 가게 미니어처 참고 이미지 스타일."""
import math

import bpy

from lib import ball, box, cone, cyl, light, mat, torus

HALF = 11.0           # 받침 반 폭
ROAD_W = 2.5          # 차도 폭 (남쪽 y -11~-8.5, 동쪽 x 8.5~11)
POND = (-5.0, -4.6)   # 연못 중심 (데크 카페 맞은편)
POND_R = 2.0
POLE_H = 3.6          # 가로등 높이


def tree(name, x, y, h=2.2):
    cyl(f"{name}_trunk", 0.12, h * 0.5, (x, y, h * 0.25), mat("trunk", "7A5A3A"), verts=8)
    ball(f"{name}_leaves", h * 0.35, (x, y, h * 0.65), mat("leaves", "5E9A5E"), low=True)


def lamp(name, x, y):
    cyl(f"{name}_pole", 0.04, 2.0, (x, y, 1.0), mat("lamp_pole", "3A3D4A"), verts=8)
    ball(f"{name}_bulb", 0.14, (x, y, 2.1), mat("lamp_bulb", "FFE9B0", emission=6), low=True)


def pond():
    px, py = POND
    cyl("island_pond_water", POND_R, 0.06, (px, py, 0.02), mat("water", "5FA8C8", roughness=0.05), verts=48)
    stone = mat("stone", "9A968E")
    for i in range(14):
        a = 2 * math.pi * i / 14
        ball(f"island_pond_stone_{i + 1}", 0.22 + 0.06 * (i % 3),
             (px + (POND_R + 0.12) * math.cos(a), py + (POND_R + 0.12) * math.sin(a), 0.08),
             stone, scale=(1, 1, 0.6), low=True)
    lily = mat("lily", "6FB36A")
    for i, (dx, dy) in enumerate(((-0.6, 0.4), (0.5, -0.3), (0.1, 0.9))):
        cyl(f"island_pond_lily_{i + 1}", 0.25, 0.01, (px + dx, py + dy, 0.06), lily, verts=16)
    ball("island_pond_lily_flower", 0.07, (px + 0.5, py - 0.3, 0.1), mat("lily_flower", "F4A7B9"))
    reed = mat("reed", "8BA85A")
    for i, a in enumerate((2.2, 2.5, 2.8, 3.1)):
        cone(f"island_pond_reed_{i + 1}", 0.03, 0.0, 0.9,
             (px + (POND_R - 0.15) * math.cos(a), py + (POND_R - 0.15) * math.sin(a), 0.45), reed, verts=6)
    wood = mat("bench_wood", "9B7653")
    box("island_pond_bench", (1.4, 0.4, 0.08), (px, py - POND_R - 0.8, 0.45), wood, bevel=0.02)
    for i, dx in enumerate((-0.55, 0.55)):
        box(f"island_pond_bench_leg{i + 1}", (0.08, 0.35, 0.42), (px + dx, py - POND_R - 0.8, 0.21), wood)
    for i, k in enumerate(KOI, start=1):
        koi(i, *k)


# 잉어: (몸통 색, 무늬 색, 연못 중심에서 거리, 처음 각도). 웹(check-viewer)이 이 반지름으로 빙글빙글 헤엄치게 한다
KOI = [("F07A2A", "F7F4EE", 1.2, 0.0), ("F7F4EE", "D8352A", 0.8, 2.2),
       ("F2B83A", "F7F4EE", 1.45, 3.8), ("F7F4EE", "2A2420", 0.55, 5.0)]


def koi(i, body_hex, spot_hex, r, a):
    """잉어 한 마리 = 몸통·무늬·꼬리·지느러미를 합친 객체 하나 (웹에서 통째로 움직이게). 머리는 +x."""
    px, py = POND
    n = f"island_pond_koi_{i}"
    body = mat(f"koi_{body_hex}", body_hex, roughness=0.4)
    parts = [
        ball(f"{n}_body", 0.1, (0, 0, 0), body, scale=(2.2, 0.85, 0.6)),
        ball(f"{n}_spot", 0.07, (0.06, 0, 0.03), mat(f"koi_{spot_hex}", spot_hex, roughness=0.4), scale=(1.4, 0.8, 0.5)),
        cone(f"{n}_tail", 0.09, 0.0, 0.14, (-0.27, 0, 0), body, rot=(0, math.radians(90), 0), verts=8),
    ]
    for s in (-1, 1):
        parts.append(cone(f"{n}_fin{s}", 0.04, 0.0, 0.08, (0.05, s * 0.09, -0.01), body,
                          rot=(math.radians(90 * s), 0, 0), verts=6))
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    k = bpy.context.view_layer.objects.active
    k.name = k.data.name = n
    k.location = (px + r * math.cos(a), py + r * math.sin(a), 0.07)   # 물 윗면(0.05) 바로 위
    k.rotation_euler = (0, 0, a + math.pi / 2)                      # 반시계로 도는 방향을 보게
    return k


def streetlamp(name, x, y, dx, dy):
    """길가 가로등(전봇대·전선 대신). (dx, dy) = 팔이 뻗는 차도 쪽 방향."""
    metal = mat("lamp_pole", "3A3D4A")
    cyl(name, 0.07, POLE_H, (x, y, POLE_H / 2), metal, verts=12)
    cyl(f"{name}_base", 0.14, 0.3, (x, y, 0.15), metal, verts=12)
    ax, ay = x + dx * 0.45, y + dy * 0.45
    box(f"{name}_arm", (0.9 if dx else 0.06, 0.9 if dy else 0.06, 0.06), (ax, ay, POLE_H - 0.05), metal)
    hx, hy = x + dx * 0.85, y + dy * 0.85
    cone(f"{name}_head", 0.28, 0.08, 0.22, (hx, hy, POLE_H - 0.15), metal, verts=12)
    ball(f"{name}_bulb", 0.14, (hx, hy, POLE_H - 0.28), mat("streetlamp_bulb", "FFE2A8", emission=10))
    light(f"light_{name}", "POINT", (hx, hy, POLE_H - 0.5), 250, color="FFD9A0", shadow=False)


def street():
    asphalt = mat("asphalt", "55585F")
    walk = mat("sidewalk", "D8D2C6")
    white = mat("road_white", "F4F4F0")
    box("island_road_south", (2 * HALF, ROAD_W, 0.04), (0, -HALF + ROAD_W / 2, 0.02), asphalt)
    box("island_road_east", (ROAD_W, 2 * HALF, 0.04), (HALF - ROAD_W / 2, 0, 0.021), asphalt)
    box("island_sidewalk_south", (2 * HALF - ROAD_W, 0.6, 0.12), (-ROAD_W / 2, -HALF + ROAD_W + 0.3, 0.06), walk)
    box("island_sidewalk_east", (0.6, 2 * HALF - ROAD_W, 0.12), (HALF - ROAD_W - 0.3, ROAD_W / 2, 0.06), walk)
    for i in range(6):  # 남쪽 차도를 건너는 횡단보도
        box(f"island_crosswalk_s{i + 1}", (0.35, ROAD_W - 0.3, 0.01), (4.6 + i * 0.6, -HALF + ROAD_W / 2, 0.045), white)
    for i in range(6):  # 동쪽 차도를 건너는 횡단보도
        box(f"island_crosswalk_e{i + 1}", (ROAD_W - 0.3, 0.35, 0.01), (HALF - ROAD_W / 2, -6.2 + i * 0.6, 0.046), white)
    for i, (x, y, dx, dy) in enumerate(((7.9, -7.9, 0, -1), (-6.0, -7.9, 0, -1), (7.9, -1.5, 1, 0),
                                         (7.9, 5.0, 1, 0), (-10.0, -7.9, 0, -1))):
        streetlamp(f"island_streetlamp_{i + 1}", x, y, dx, dy)
    bike = mat("bike", "4A7FA8")
    for i, dx in enumerate((-0.35, 0.35)):
        torus(f"island_bike_wheel{i + 1}", 0.22, 0.025, (1.6 + dx, -7.6, 0.25), mat("tire", "2A2A2A"), rot=(math.radians(90), 0, 0))
    box("island_bike_frame", (0.7, 0.04, 0.04), (1.6, -7.6, 0.45), bike, rot=(0, math.radians(-10), 0))
    box("island_bike_seat", (0.16, 0.08, 0.04), (1.35, -7.6, 0.62), mat("tire", "2A2A2A"))
    cyl("island_bike_handle", 0.015, 0.4, (1.9, -7.6, 0.62), bike, rot=(math.radians(90), 0, 0), verts=8)


def build():
    box("island_ground", (2 * HALF, 2 * HALF, 0.6), (0, 0, -0.3), mat("grass", "7FA36B"))
    box("island_rim", (2 * HALF + 0.1, 2 * HALF + 0.1, 0.8), (0, 0, -0.75), mat("soil", "6B5A48"))
    box("island_path", (1.6, 6.4, 0.04), (0, -4.7, 0.02), mat("path", "CFC8BC"))
    trees = [(-8.5, 4.2), (-9.6, -6.4), (7.0, 3.0), (7.4, 0.2), (6, 6.5), (-6.5, 9.4), (-3, 8.5), (3.5, 8.5)]
    for i, (x, y) in enumerate(trees):
        tree(f"island_tree_{i + 1}", x, y)
    lamp("island_lamp_1", -1.3, -6.5)
    lamp("island_lamp_2", 1.3, -6.5)
    street()
    pond()
