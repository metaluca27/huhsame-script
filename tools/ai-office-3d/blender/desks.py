"""층별 책상 7개. 자리 좌표는 이 표 한 곳에서만 바꾼다.
책상은 뒷벽을 등지고 앞(-y, 카메라 쪽)을 본다: 의자는 책상 뒤(+y)."""
from house import floor_z
from lib import ball, box, cone, cyl, light, mat, marker

DESK_TOP = 0.78   # 층 바닥에서 책상 윗면까지
SEAT_H = 0.6      # 의자 방석 윗면 (다리 늘어뜨린 인형이 바닥을 안 뚫게 조금 높은 의자)

#        이름:   (층, x,    y)
DESKS = {
    "hermi":  (1, -1.4, 2.6),
    "jujuya": (1,  1.4, 2.6),
    "nova":   (2, -1.4, 2.6),
    "luna":   (2,  1.4, 2.6),
    "pureum": (3, -2.4, 2.6),
    "rurik":  (3,  0.0, 2.6),
    "clo":    (3,  2.4, 2.6),
}


def build_desk(owner):
    floor, x, y = DESKS[owner]
    z = floor_z(floor)
    wood = mat("desk_wood", "9B7653")
    leg = mat("desk_leg", "5B4632")
    chair = mat("chair", "6B6F7A")
    box(f"desk_{owner}", (1.4, 0.75, 0.06), (x, y, z + DESK_TOP - 0.03), wood, bevel=0.02)
    leg_h = DESK_TOP - 0.06
    for i, (dx, dy) in enumerate(((-0.62, -0.3), (0.62, -0.3), (-0.62, 0.3), (0.62, 0.3))):
        box(f"desk_{owner}_leg{i + 1}", (0.06, 0.06, leg_h), (x + dx, y + dy, z + leg_h / 2), leg)
    cy = y + 0.75
    box(f"chair_{owner}_seat", (0.5, 0.5, 0.08), (x, cy, z + SEAT_H - 0.04), chair, bevel=0.03)
    box(f"chair_{owner}_back", (0.5, 0.08, 0.5), (x, cy + 0.24, z + SEAT_H + 0.3), chair, bevel=0.03)
    cyl(f"chair_{owner}_stem", 0.04, SEAT_H - 0.08, (x, cy, z + (SEAT_H - 0.08) / 2), chair, verts=8)
    marker(f"seat_{owner}", (x, cy, z + SEAT_H))
    # 책상 위 펜던트 조명 (천장 = 바닥 + 2.8)
    cyl(f"desk_{owner}_lamp_cord", 0.01, 0.6, (x, y + 0.2, z + 2.5), leg, verts=6)
    cone(f"desk_{owner}_lamp_shade", 0.24, 0.07, 0.18, (x, y + 0.2, z + 2.12), mat("lamp_shade", "3A3550"), verts=16)
    ball(f"desk_{owner}_lamp_bulb", 0.07, (x, y + 0.2, z + 2.04), mat("pendant_bulb", "FFE2A8", emission=10))
    light(f"light_desk_{owner}", "POINT", (x, y + 0.2, z + 1.9), 60, color="FFD9A0", shadow=False)
    return x, y, z


def build():
    import importlib

    import props
    importlib.reload(props)  # MCP로 여러 번 돌릴 때 고친 소품이 반영되게
    for owner in DESKS:
        x, y, z = build_desk(owner)
        props.BUILDERS[owner](x, y, z)
