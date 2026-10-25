"""네모 블록 받침(22×22), 길모퉁이(남·동 가장자리), 나무, 가로등, 연못 정원(마당 왼쪽).
코너 가게 미니어처 참고 이미지 스타일."""
import math

from mathutils import Vector

from lib import ball, box, cone, cyl, mat, torus

HALF = 11.0           # 받침 반 폭
ROAD_W = 2.5          # 차도 폭 (남쪽 y -11~-8.5, 동쪽 x 8.5~11)
POND = (-5.0, -4.6)   # 연못 중심 (데크 카페 맞은편)
POND_R = 2.0
POLE_H = 5.0


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


def pole(name, x, y):
    wood = mat("pole_wood", "7A6A5A")
    cyl(name, 0.08, POLE_H, (x, y, POLE_H / 2), wood, verts=8)
    box(f"{name}_arm", (1.2, 0.08, 0.08), (x, y, POLE_H - 0.4), wood)
    return Vector((x, y, POLE_H - 0.35))


def wire(name, a, b):
    """두 점 사이 전깃줄(가는 원통)."""
    mid = (a + b) / 2
    rot = (b - a).to_track_quat("Z", "Y").to_euler()
    cyl(name, 0.012, (b - a).length, tuple(mid), mat("wire", "2A2A2A"), rot=tuple(rot), verts=6)


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
    tops = [pole("island_pole_1", 7.9, -7.9), pole("island_pole_2", -6.0, -7.9), pole("island_pole_3", 7.9, 5.0)]
    wire("island_wire_1", tops[1], tops[0])
    wire("island_wire_2", tops[0], tops[2])
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
    trees = [(-8, 3), (-7.5, -0.5), (7.0, 3.0), (7.4, 0.2), (6, 6.5), (-6.5, 9.4), (-3, 8.5), (3.5, 8.5)]
    for i, (x, y) in enumerate(trees):
        tree(f"island_tree_{i + 1}", x, y)
    lamp("island_lamp_1", -1.3, -6.5)
    lamp("island_lamp_2", 1.3, -6.5)
    street()
    pond()
