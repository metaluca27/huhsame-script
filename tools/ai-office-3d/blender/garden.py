"""정문 앞 화분들, 건물 뒤(북쪽)로 이어 붙인 숲 땅."""
import math
import random

from lib import ball, box, cone, cyl, mat

FOREST_Y = (11.0, 19.0)  # 받침(y -11~11) 뒤에 붙이는 숲 땅

# (x, y, 종류, 크기) — 문 양옆 큰 나무, 앞벽 따라, 정문 길 양옆
POTS = [
    (-1.05, -2.0, "tall", 1.2), (1.05, -2.0, "tall", 1.2),
    (-1.9, -1.95, "flowers", 0.9), (-3.4, -1.95, "bush", 1.0), (-4.3, -1.95, "flowers", 0.85),
    (1.9, -1.95, "flowers", 0.9),
    (-1.15, -3.6, "bush", 0.8), (1.15, -3.6, "flowers", 0.8),
    (-1.15, -5.4, "flowers", 0.8), (1.15, -5.4, "bush", 0.8),
    (-1.15, -7.2, "bush", 0.75),
]
FLOWERS = [("flower_pink", "F2A0B8"), ("flower_yellow", "FAD877"), ("flower_white", "F7F7F0")]


def pot(i, x, y, kind, s):
    name = f"island_pot_{i}"
    h, r = 0.45 * s, 0.28 * s
    body = mat("pot_cream", "EDE4CF") if i % 3 == 0 else mat("pot_terracotta", "CC8A63")
    cone(f"{name}_pot", r * 0.72, r, h, (x, y, 0.04 + h / 2), body, verts=8)
    cyl(f"{name}_soil", r * 0.9, 0.02, (x, y, h), mat("pot_soil", "755C45"), verts=8)
    top = 0.04 + h
    leaves = mat("leaves", "5E9A5E")
    if kind == "bush":
        ball(f"{name}_leaves", 0.38 * s, (x, y, top + 0.25 * s), leaves, scale=(1, 1, 0.85), low=True)
    elif kind == "tall":
        cyl(f"{name}_stem", 0.035, 0.6 * s, (x, y, top + 0.3 * s), mat("trunk", "7A5A3A"), verts=6)
        ball(f"{name}_leaves", 0.3 * s, (x, y, top + 0.75 * s), leaves, scale=(0.8, 0.8, 1.5), low=True)
    else:
        ball(f"{name}_leaves", 0.3 * s, (x, y, top + 0.12 * s), leaves, scale=(1, 1, 0.6), low=True)
        fm = mat(*FLOWERS[i % 3])
        for k in range(5):
            a = 2 * math.pi * k / 5 + 0.3 * k
            ball(f"{name}_flower{k + 1}", 0.07 * s,
                 (x + 0.17 * s * math.cos(a), y + 0.17 * s * math.sin(a), top + 0.24 * s), fm, low=True)


def pine(name, x, y, h):
    cyl(f"{name}_trunk", 0.12, h * 0.3, (x, y, h * 0.15), mat("trunk", "7A5A3A"), verts=8)
    green = mat("pine", "3F7A50")
    for k, (r, z) in enumerate(((0.75, 0.38), (0.58, 0.6), (0.4, 0.8))):
        cone(f"{name}_leaves{k + 1}", r * h * 0.55, 0.0, h * 0.35, (x, y, h * z), green, verts=7)


def round_tree(name, x, y, h, green):
    cyl(f"{name}_trunk", 0.12, h * 0.5, (x, y, h * 0.25), mat("trunk", "7A5A3A"), verts=8)
    ball(f"{name}_leaves", h * 0.35, (x, y, h * 0.68), green, low=True)


def forest():
    y0, y1 = FOREST_Y
    depth = y1 - y0
    box("island_forest_ground", (22.0, depth, 0.6), (0, y0 + depth / 2, -0.3), mat("grass", "7FA36B"))
    box("island_forest_rim", (22.1, depth + 0.05, 0.8), (0, y0 + depth / 2, -0.75), mat("soil", "6B5A48"))
    greens = [mat("leaves", "5E9A5E"), mat("leaves_dark", "4A8452"), mat("leaves_light", "79B36A")]
    rnd = random.Random(25)  # 매번 같은 숲
    n = 0
    for row, y in enumerate((11.9, 13.5, 15.1, 16.7, 18.2)):
        for col in range(13):
            x = -10.2 + col * 1.7 + (0.85 if row % 2 else 0) + rnd.uniform(-0.35, 0.35)
            if x > 10.4:
                continue
            n += 1
            yy = y + rnd.uniform(-0.3, 0.3)
            h = 2.0 + row * 0.35 + rnd.uniform(-0.3, 0.6)  # 뒤로 갈수록 키 큼
            if rnd.random() < 0.55:
                pine(f"island_forest_tree_{n}", x, yy, h + 0.6)
            else:
                round_tree(f"island_forest_tree_{n}", x, yy, h, rnd.choice(greens))
    for i in range(9):  # 숲 가장자리 덤불
        x = -9.5 + i * 2.3 + rnd.uniform(-0.4, 0.4)
        ball(f"island_forest_bush_{i + 1}", 0.45 + rnd.uniform(0, 0.2), (x, 11.2, 0.25),
             rnd.choice(greens), scale=(1.3, 1, 0.7), low=True)


def build():
    for i, (x, y, kind, s) in enumerate(POTS, 1):
        pot(i, x, y, kind, s)
    forest()
