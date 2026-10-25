"""사무실 층(1~3층) 오른쪽 벽 커피 코너: 수납장 위 커피머신 + 미니 냉장고."""
from house import floor_z
from lib import ball, box, cyl, mat

X = 3.55            # 오른쪽 벽(x=4) 안쪽
CAB_Y, FRIDGE_Y = 0.35, 1.35
OFFICE_FLOORS = (1, 2, 3)


def corner(f):
    z = floor_z(f)
    n = f"house_f{f}_pantry"
    wood = mat("desk_wood", "9B7653")
    box(f"{n}_cabinet", (0.6, 1.0, 0.9), (X, CAB_Y, z + 0.45), wood, bevel=0.02)
    box(f"{n}_cabinet_top", (0.66, 1.06, 0.05), (X, CAB_Y, z + 0.925), mat("counter_top", "EDE4CF"))
    # 커피머신
    body = mat("coffee_body", "2E2E34")
    top = z + 0.95
    box(f"{n}_coffee", (0.32, 0.3, 0.42), (X + 0.05, CAB_Y - 0.15, top + 0.21), body, bevel=0.02)
    box(f"{n}_coffee_head", (0.2, 0.12, 0.06), (X - 0.12, CAB_Y - 0.15, top + 0.3), mat("metal", "B8BCC4"))
    ball(f"{n}_coffee_button", 0.025, (X - 0.12, CAB_Y - 0.22, top + 0.38), mat("coffee_led", "8FE3C8", emission=4))
    cyl(f"{n}_coffee_cup", 0.045, 0.08, (X - 0.12, CAB_Y - 0.15, top + 0.04), mat("mug_white", "F7F7F0"), verts=12)
    # 머그 몇 개와 원두통
    for i, (dy, c) in enumerate(((0.2, "F2A0B8"), (0.32, "A9CBEA"))):
        cyl(f"{n}_mug{i + 1}", 0.05, 0.1, (X - 0.1, CAB_Y + dy, top + 0.05), mat(f"mug_{c}", c), verts=12)
    cyl(f"{n}_beans", 0.07, 0.18, (X + 0.1, CAB_Y + 0.3, top + 0.09), mat("beans_jar", "8A5A3A"), verts=12)
    # 미니 냉장고
    box(f"{n}_fridge", (0.55, 0.55, 0.85), (X, FRIDGE_Y, z + 0.425), mat("fridge", "F2F0EA"), bevel=0.04)
    box(f"{n}_fridge_handle", (0.03, 0.04, 0.3), (X - 0.29, FRIDGE_Y + 0.2, z + 0.55), mat("metal", "B8BCC4"))
    ball(f"{n}_fridge_magnet", 0.035, (X - 0.285, FRIDGE_Y - 0.12, z + 0.7), mat("magnet", "FAD877"),
         scale=(0.4, 1, 1))


def build():
    for f in OFFICE_FLOORS:
        corner(f)
