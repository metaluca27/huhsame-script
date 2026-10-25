"""앞마당 데크 카페 = 쉬는 곳. 쉴 자리 rest_<이름> 7개."""
from lib import box, cone, cyl, mat, marker

DECK_C = (4.8, -4.8)
DECK_SIZE = (5.2, 4.4)
DECK_Z = 0.25                                   # 데크 윗면 높이
TABLES = [(3.3, -4.2), (5.3, -5.0), (3.6, -6.2)]
REST_ORDER = ["hermi", "jujuya", "luna", "nova", "pureum", "rurik", "clo"]


def table_set(name, x, y):
    metal = mat("metal", "3A3D4A")
    cyl(f"{name}_top", 0.45, 0.05, (x, y, DECK_Z + 0.75), mat("cafe_table", "F4EFE6"))
    cyl(f"{name}_leg", 0.05, 0.75, (x, y, DECK_Z + 0.375), metal, verts=8)
    cyl(f"{name}_parasol_pole", 0.03, 2.2, (x, y, DECK_Z + 1.1), metal, verts=8)
    cone(f"{name}_parasol", 1.0, 0.05, 0.4, (x, y, DECK_Z + 2.2), mat("parasol", "E8A0A8"), verts=8)
    spots = []
    for k, dx in enumerate((-0.7, 0.7)):
        box(f"{name}_stool_{k + 1}", (0.38, 0.38, 0.45), (x + dx, y, DECK_Z + 0.225),
            mat("stool", "C9A27A"), bevel=0.04)
        spots.append((x + dx, y, DECK_Z + 0.5))
    return spots


def build():
    cx, cy = DECK_C
    box("deck_floor", (*DECK_SIZE, DECK_Z), (cx, cy, DECK_Z / 2), mat("deck_wood", "B08A62"), bevel=0.03)
    spots = []
    for i, (x, y) in enumerate(TABLES):
        spots += table_set(f"deck_table_{i + 1}", x, y)
    box("deck_counter", (1.6, 0.5, 1.0), (6.4, -3.0, DECK_Z + 0.5), mat("counter", "8A6A4A"), bevel=0.03)
    box("deck_counter_top", (1.7, 0.6, 0.06), (6.4, -3.0, DECK_Z + 1.03), mat("cafe_table", "F4EFE6"))
    box("deck_counter_stool", (0.36, 0.36, 0.6), (6.4, -3.6, DECK_Z + 0.3), mat("stool", "C9A27A"), bevel=0.04)
    spots.append((6.4, -3.6, DECK_Z + 0.65))
    for owner, loc in zip(REST_ORDER, spots):
        marker(f"rest_{owner}", loc)
