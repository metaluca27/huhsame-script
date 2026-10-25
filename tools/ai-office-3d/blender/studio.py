"""본관 4층 춤 연습실 + 다락 밴드 연습실 「다락방 밴드」."""
import math

from house import ATTIC_Z, BACK_Y, CY, W, floor_z
from lib import ball, box, cyl, mat

R90 = math.radians(90)


def dance():
    z = floor_z(4)
    box("studio_dance_floor", (W - 0.4, 5.6, 0.02), (0, CY, z + 0.01), mat("dance_floor", "D9B98C", roughness=0.25))
    box("studio_dance_mirror", (6.4, 0.04, 2.0), (0, BACK_Y - 0.13, z + 1.3), mat("mirror", "DDE8F0", roughness=0.03))
    metal = mat("bar_metal", "B8B8C0", roughness=0.2)
    cyl("studio_dance_bar", 0.03, 6.0, (0, BACK_Y - 0.45, z + 1.0), metal, rot=(0, R90, 0), verts=12)
    for i, x in enumerate((-2.8, 0.0, 2.8)):
        box(f"studio_dance_bar_bracket{i + 1}", (0.04, 0.35, 0.04), (x, BACK_Y - 0.3, z + 1.0), metal)
    for i, x in enumerate((-3.4, 3.4)):
        box(f"studio_dance_speaker{i + 1}", (0.5, 0.45, 0.9), (x, BACK_Y - 0.5, z + 0.45), mat("speaker", "2A2A2E"), bevel=0.03)
        cyl(f"studio_dance_speaker{i + 1}_cone", 0.15, 0.02, (x, BACK_Y - 0.735, z + 0.55), mat("speaker_cone", "555560"),
            rot=(R90, 0, 0))
    ball("studio_dance_discoball", 0.25, (0, CY, z + 2.45), mat("disco", "E8E8F0", emission=0.5, roughness=0.05))
    for i, (x, c) in enumerate(((-2.0, "FF8FB8"), (0.0, "8FD8FF"), (2.0, "FFE08A"))):
        cyl(f"studio_dance_spot{i + 1}", 0.18, 0.06, (x, CY + 1.0, z + 2.72), mat(f"spot_{c}", c, emission=4.0), verts=16)


def guitar(name, x, y, z, color, neck_len):
    ball(f"{name}_body", 0.22, (x, y, z + 0.45), mat(f"guitar_{color}", color, roughness=0.3), scale=(1, 0.35, 1.3))
    box(f"{name}_neck", (0.06, 0.03, neck_len), (x, y, z + 0.75 + neck_len / 2), mat("neck_wood", "7A5A3A"))
    box(f"{name}_stand", (0.3, 0.25, 0.04), (x, y, z + 0.02), mat("chrome", "D0D0D8", roughness=0.15))


def band():
    z = ATTIC_Z + 0.2
    chrome = mat("chrome", "D0D0D8", roughness=0.15)
    drum = mat("drum_red", "C8484A", roughness=0.4)
    cyl("studio_band_rug", 2.2, 0.02, (0, CY + 0.3, z + 0.01), mat("band_rug", "8A4A5A"), verts=32)
    dx, dy = 0.0, CY + 1.2
    cyl("studio_band_drum_kick", 0.32, 0.35, (dx, dy, z + 0.34), drum, rot=(R90, 0, 0))
    for i, (ox, oy, h) in enumerate(((-0.5, -0.25, 0.6), (0.45, -0.2, 0.7), (0.25, 0.15, 0.85))):
        cyl(f"studio_band_drum_tom{i + 1}", 0.17, 0.16, (dx + ox, dy + oy, z + h), drum)
    for i, (ox, oy, h) in enumerate(((-0.75, 0.2, 1.15), (0.75, 0.25, 1.2))):
        cyl(f"studio_band_cymbal{i + 1}_stand", 0.015, h, (dx + ox, dy + oy, z + h / 2), chrome, verts=8)
        cyl(f"studio_band_cymbal{i + 1}", 0.25, 0.01, (dx + ox, dy + oy, z + h), mat("cymbal", "D4AF37", roughness=0.25))
    cyl("studio_band_drum_stool", 0.18, 0.5, (dx, dy + 0.6, z + 0.25), mat("stool_dark", "2A2A2E"))
    kx, ky = -2.0, CY + 0.4
    box("studio_band_keyboard", (1.1, 0.32, 0.08), (kx, ky, z + 0.85), mat("keyboard_black", "1E1E22"))
    box("studio_band_keyboard_keys", (1.0, 0.14, 0.02), (kx, ky - 0.07, z + 0.9), mat("keys_white", "F4F4F0"))
    for i, o in enumerate((-0.4, 0.4)):
        box(f"studio_band_keyboard_leg{i + 1}", (0.04, 0.3, 0.8), (kx + o, ky, z + 0.4), chrome)
    box("studio_band_amp", (0.6, 0.35, 0.55), (2.0, CY + 0.9, z + 0.275), mat("amp", "2A2A2E"), bevel=0.02)
    box("studio_band_amp_grille", (0.5, 0.01, 0.35), (2.0, CY + 0.72, z + 0.25), mat("grille", "6A5A4A"))
    guitar("studio_band_guitar", 1.4, CY - 0.4, z, "F2A0B0", 0.55)
    guitar("studio_band_bass", -1.3, CY - 0.5, z, "4A7FA8", 0.75)
    cyl("studio_band_mic_stand", 0.015, 1.5, (0, CY - 0.8, z + 0.75), chrome, verts=8)
    ball("studio_band_mic", 0.05, (0, CY - 0.8, z + 1.52), mat("mic", "2A2A2E"))
    cyl("studio_band_mic_base", 0.15, 0.02, (0, CY - 0.8, z + 0.01), chrome)


def build():
    dance()
    band()
