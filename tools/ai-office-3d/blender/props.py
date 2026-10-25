"""책상 소품. 모든 함수는 (x, y, z) = 책상 중심 x·y, 층 바닥 높이.
캐릭터는 +y 쪽 의자에 앉아 -y(카메라)를 본다 → 노트북 화면은 책상 -y 가장자리, 뒷면 로고가 카메라에 보임."""
import math

from desks import DESK_TOP
from house import BACK_Y
from lib import ball, box, cone, cyl, mat, torus

R90 = math.radians(90)


def laptop(name, x, y, top, color_hex, logo_hex="FFFFFF"):
    body = mat(f"laptop_{color_hex}", color_hex, roughness=0.4)
    box(name, (0.36, 0.25, 0.02), (x, y, top + 0.01), body)
    box(f"{name}_screen", (0.36, 0.02, 0.24), (x, y - 0.12, top + 0.13), body)
    cyl(f"{name}_logo", 0.035, 0.005, (x, y - 0.132, top + 0.14),
        mat(f"logo_{logo_hex}", logo_hex, emission=2.0), rot=(R90, 0, 0), verts=16)


def mug(name, x, y, top, color_hex):
    m = mat(f"mug_{color_hex}", color_hex, roughness=0.3)
    cyl(name, 0.045, 0.1, (x, y, top + 0.05), m, verts=16)
    torus(f"{name}_handle", 0.03, 0.008, (x + 0.055, y, top + 0.05), m, rot=(R90, 0, 0))


def books(name, x, y, top, colors):
    for i, c in enumerate(colors):
        box(f"{name}_{i + 1}", (0.22, 0.16, 0.04), (x, y, top + 0.02 + i * 0.042),
            mat(f"book_{c}", c), rot=(0, 0, math.radians(i * 7)))


def hermi(x, y, z):
    top = z + DESK_TOP
    dark = mat("metal_dark", "2A2A2A")
    laptop("prop_hermi_laptop", x, y, top, "2E2E33")
    box("prop_hermi_tablet", (0.22, 0.3, 0.015), (x - 0.45, y + 0.05, top + 0.008), mat("tablet_black", "1E1E22"))
    torus("prop_hermi_magnifier_rim", 0.07, 0.012, (x + 0.4, y + 0.1, top + 0.012), dark)
    cyl("prop_hermi_magnifier_lens", 0.062, 0.004, (x + 0.4, y + 0.1, top + 0.012),
        mat("glass", "CFE8F5", roughness=0.05))
    cyl("prop_hermi_magnifier_handle", 0.012, 0.14, (x + 0.52, y + 0.17, top + 0.012), dark,
        rot=(0, R90, math.radians(30)), verts=8)
    cone("prop_hermi_plane", 0.09, 0.0, 0.26, (x + 0.45, y - 0.2, top + 0.03), mat("paper", "FFFFFF"),
         rot=(0, R90, 0), verts=3)


def jujuya(x, y, z):
    top = z + DESK_TOP
    laptop("prop_jujuya_laptop", x, y, top, "F4A7B9")
    box("prop_jujuya_clipboard", (0.24, 0.32, 0.015), (x - 0.45, y + 0.05, top + 0.008), mat("clip_board", "5B4632"))
    box("prop_jujuya_clipboard_paper", (0.2, 0.26, 0.004), (x - 0.45, y + 0.04, top + 0.018), mat("paper", "FFFFFF"))
    mug("prop_jujuya_mug", x + 0.45, y + 0.15, top, "F4A7B9")


def luna(x, y, z):
    top = z + DESK_TOP
    laptop("prop_luna_laptop", x, y, top, "6B5BA8", logo_hex="FFE08A")
    cyl("prop_luna_moonlamp_base", 0.07, 0.06, (x + 0.45, y + 0.18, top + 0.03), mat("desk_leg", "5B4632"))
    ball("prop_luna_moonlamp", 0.12, (x + 0.45, y + 0.18, top + 0.18), mat("moon_glow", "FFE08A", emission=4.0))
    box("prop_luna_notebook", (0.3, 0.22, 0.015), (x - 0.42, y + 0.05, top + 0.008), mat("note_cream", "F6EBD0"))
    books("prop_luna_books", x + 0.45, y - 0.15, top, ["3D3F7A", "C9A84A", "5B3F7A"])


def nova(x, y, z):
    top = z + DESK_TOP
    laptop("prop_nova_laptop", x, y, top, "1E1E22", logo_hex="B38CFF")
    cyl("prop_nova_crystal_base", 0.06, 0.05, (x + 0.45, y + 0.15, top + 0.025), mat("gold", "C9A84A", roughness=0.3))
    ball("prop_nova_crystal", 0.1, (x + 0.45, y + 0.15, top + 0.15), mat("crystal_glow", "9B6BFF", emission=3.0))
    box("prop_nova_note", (0.22, 0.3, 0.03), (x - 0.45, y + 0.05, top + 0.015), mat("nova_note", "5B3F8A"))
    box("prop_nova_dashboard", (1.4, 0.05, 0.8), (x, BACK_Y - 0.13, z + 1.9), mat("dash_bg", "2A2140"))
    for i, h in enumerate((0.25, 0.45, 0.35)):
        box(f"prop_nova_dashboard_bar{i + 1}", (0.12, 0.02, h), (x - 0.4 + i * 0.25, BACK_Y - 0.165, z + 1.6 + h / 2),
            mat("dash_glow", "B38CFF", emission=3.0))


def pureum(x, y, z):
    top = z + DESK_TOP
    laptop("prop_pureum_laptop", x - 0.45, y + 0.08, top, "8A8F99", logo_hex="B8A6FF")
    dark = mat("monitor_black", "26262B")
    box("prop_pureum_monitor", (0.62, 0.04, 0.38), (x, y - 0.2, top + 0.34), dark)
    box("prop_pureum_monitor_screen", (0.56, 0.005, 0.32), (x, y - 0.178, top + 0.34), mat("screen_glow", "8FE3C8", emission=2.0))
    cyl("prop_pureum_monitor_stand", 0.03, 0.15, (x, y - 0.2, top + 0.075), dark, verts=8)
    mug("prop_pureum_mug", x + 0.45, y + 0.15, top, "FFFFFF")
    books("prop_pureum_books", x + 0.45, y - 0.15, top, ["5B3F8A", "3D3F7A"])


def rurik(x, y, z):
    top = z + DESK_TOP
    laptop("prop_rurik_laptop", x, y, top, "F2C4C4")
    box("prop_rurik_tablet_stand", (0.16, 0.12, 0.02), (x + 0.45, y - 0.05, top + 0.01), mat("tablet_black", "1E1E22"))
    box("prop_rurik_tablet", (0.28, 0.02, 0.2), (x + 0.45, y - 0.1, top + 0.13), mat("tablet_black", "1E1E22"),
        rot=(math.radians(-15), 0, 0))
    box("prop_rurik_ideanote", (0.22, 0.24, 0.03), (x - 0.45, y + 0.05, top + 0.015), mat("idea_pink", "F2A0B0"))
    mug("prop_rurik_mug", x - 0.45, y - 0.2, top, "F4A7B9")
    box("prop_rurik_board", (1.3, 0.04, 0.7), (x, BACK_Y - 0.12, z + 1.7), mat("cork", "C9A27A"))
    colors = ["FFE38A", "F4A7B9", "A8D8F0"]
    for i in range(6):
        box(f"prop_rurik_sticky{i + 1}", (0.16, 0.01, 0.16),
            (x - 0.4 + (i % 3) * 0.4, BACK_Y - 0.145, z + 1.55 + (i // 3) * 0.3),
            mat(f"sticky_{colors[i % 3]}", colors[i % 3]))


def clo(x, y, z):
    top = z + DESK_TOP
    lamp = mat("lamp_dark", "3A3D4A")
    laptop("prop_clo_laptop", x, y, top, "B8B2A8", logo_hex="F2B27A")
    mug("prop_clo_mug", x + 0.45, y + 0.15, top, "F3E3C3")
    box("prop_clo_notebook", (0.2, 0.26, 0.02), (x + 0.42, y - 0.15, top + 0.01), mat("clo_note", "E9DCC4"))
    cyl("prop_clo_lamp_base", 0.07, 0.03, (x - 0.5, y + 0.2, top + 0.015), lamp)
    cyl("prop_clo_lamp_arm", 0.012, 0.4, (x - 0.5, y + 0.12, top + 0.2), lamp, rot=(math.radians(25), 0, 0), verts=8)
    cone("prop_clo_lamp_shade", 0.09, 0.03, 0.1, (x - 0.5, y + 0.03, top + 0.38), lamp)
    ball("prop_clo_lamp_bulb", 0.03, (x - 0.5, y + 0.03, top + 0.33), mat("bulb_warm", "FFE6B0", emission=5.0))


BUILDERS = {"hermi": hermi, "jujuya": jujuya, "luna": luna, "nova": nova,
            "pureum": pureum, "rurik": rurik, "clo": clo}
