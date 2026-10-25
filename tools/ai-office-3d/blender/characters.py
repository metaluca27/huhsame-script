"""직원 7명 클레이 인형(앉은 자세). 지금 설정표(원본시트) 기준 — 새 프로필 나오면 SPECS만 고친다.
인형마다 빈 물체 char_<이름> 아래로 부품을 묶어서, 2차 웹에서 통째로 seat_/rest_/sleep_ 자리로 옮긴다.
얼굴은 앞(-y, 카메라 쪽)을 본다."""
import math

import bpy
from mathutils import Matrix, Vector

import lib
from lib import cone, marker, mat, torus

R90 = math.radians(90)


def ball(*args, **kw):
    kw.setdefault("segments", 16)  # 인형 부품이 많아서 GLB 크기 아끼려고 조금 덜 매끈하게
    return lib.ball(*args, **kw)

# kind: human / cat / dog. 색은 설정표에서 뽑음.
SPECS = {
    "hermi":  dict(kind="human", skin="F2D2BC", hair="1E1B1E", top="F4F1EA", legs="2A2A2E",
                   style="long", extras=("glasses", "headband")),
    "jujuya": dict(kind="dog", fur="F7F4EE", top="F2B8C6", eye="2A2420", ears="pointy", inner="F2A7B5",
                   extras=("heart",)),
    "luna":   dict(kind="human", skin="F4D6C4", hair="221E2C", top="A9CBEA", style="bob", extras=("star",)),
    "nova":   dict(kind="human", skin="EBC4A8", hair="1E1B1E", streak="8E5BD0", top="2A2A2E", legs="4A4A50",
                   style="bun", extras=()),
    "pureum": dict(kind="cat", fur="8A8D93", top="3F6FD0", legs="3A3C42", eye="B9D86A", ears="pointy",
                   inner="B88A8A", extras=("bell",)),
    "rurik":  dict(kind="cat", fur="EBCFC4", top="2A2530", arms="8E5BD0", eye="3FA9D9", ears="big",
                   inner="E89A9A", extras=("bell",)),
    "clo":    dict(kind="dog", fur="E6CCA0", top="EADBC0", eye="3A2418", ears="floppy", extras=("glasses",)),
}


def build_doll(owner, spec, seat):
    sx, sy, sz = seat
    parts = []

    def at(dx, dy, dz):
        return (sx + dx, sy + dy, sz + dz)

    def add(o):
        parts.append(o)
        return o

    n = f"char_{owner}"
    face = mat(f"char_{owner}_skin", spec.get("skin") or spec["fur"])
    top = mat(f"char_{owner}_top", spec["top"])
    legs = mat(f"char_{owner}_legs", spec["legs"]) if "legs" in spec else (top if spec["kind"] == "human" else face)
    arms = mat(f"char_{owner}_arms", spec["arms"]) if "arms" in spec else top
    eye = mat(f"char_{owner}_eye", spec.get("eye", "2A2420"))
    dark = mat("char_dark", "2A2420")

    add(ball(f"{n}_body", 0.24, at(0, 0.02, 0.27), top, scale=(1, 0.85, 1.15)))
    for i, dx in enumerate((-0.1, 0.1)):
        add(ball(f"{n}_leg{i + 1}", 0.09, at(dx, -0.18, 0.07), legs, scale=(1, 2, 1)))
    for i, dx in enumerate((-0.2, 0.2)):  # 책상 위 노트북 쪽으로 뻗은 팔
        add(ball(f"{n}_arm{i + 1}", 0.075, at(dx, -0.2, 0.3), arms, scale=(1, 2.6, 1)))
        add(ball(f"{n}_hand{i + 1}", 0.06, at(dx, -0.42, 0.3), face))
    add(ball(f"{n}_head", 0.26, at(0, -0.02, 0.72), face, scale=(1, 0.95, 1)))
    for i, dx in enumerate((-0.09, 0.09)):
        add(ball(f"{n}_eye{i + 1}", 0.035, at(dx, -0.265, 0.73), eye, scale=(1, 0.5, 1.25)))
        add(ball(f"{n}_blush{i + 1}", 0.04, at(dx * 1.7, -0.235, 0.66), mat("char_blush", "F2A0A8"),
                 scale=(1, 0.3, 0.6)))

    if spec["kind"] == "human":
        hair = mat(f"char_{owner}_hair", spec["hair"])
        add(ball(f"{n}_hair_back", 0.285, at(0, 0.07, 0.76), hair))
        add(ball(f"{n}_hair_bangs", 0.2, at(0, -0.17, 0.88), hair, scale=(1.25, 0.5, 0.5)))
        style = spec["style"]
        if style == "long":
            add(ball(f"{n}_hair_long", 0.28, at(0, 0.1, 0.55), hair, scale=(1.15, 0.6, 1.5)))
        elif style == "bob":
            add(ball(f"{n}_hair_bob", 0.28, at(0, 0.05, 0.66), hair, scale=(1.12, 0.9, 0.85)))
        elif style == "bun":
            add(ball(f"{n}_hair_bun", 0.11, at(0, 0.03, 1.01), hair))
            add(ball(f"{n}_hair_long", 0.28, at(0, 0.1, 0.55), hair, scale=(1.15, 0.6, 1.5)))
        if "streak" in spec:
            for i, dx in enumerate((-0.27, 0.27)):
                add(ball(f"{n}_hair_streak{i + 1}", 0.07, at(dx, 0.0, 0.58), mat(f"char_{owner}_streak", spec["streak"]),
                         scale=(0.7, 0.8, 2.0)))
    else:
        add(ball(f"{n}_muzzle", 0.08, at(0, -0.245, 0.64), mat(f"char_{owner}_muzzle", spec["fur"]),
                 scale=(1.25, 0.7, 0.8)))
        nose = "E8A0A8" if spec["kind"] == "cat" else "2A2420"
        add(ball(f"{n}_nose", 0.03, at(0, -0.3, 0.67), mat(f"char_{owner}_nose", nose)))
        ears = spec["ears"]
        if ears in ("pointy", "big"):
            r, h = (0.09, 0.2) if ears == "pointy" else (0.13, 0.3)
            inner = mat(f"char_{owner}_inner", spec["inner"])
            for i, s in enumerate((-1, 1)):
                tilt = (0, math.radians(18) * s, 0)
                add(cone(f"{n}_ear{i + 1}", r, 0.0, h, at(0.15 * s, 0.0, 0.92 + h * 0.25), face, rot=tilt, verts=16))
                add(cone(f"{n}_ear{i + 1}_inner", r * 0.6, 0.0, h * 0.7, at(0.15 * s, -0.04, 0.9 + h * 0.25), inner,
                         rot=tilt, verts=16))
        else:  # floppy
            for i, s in enumerate((-1, 1)):
                add(ball(f"{n}_ear{i + 1}", 0.1, at(0.27 * s, 0.0, 0.66), face, scale=(0.7, 0.6, 1.6)))

    extras = spec["extras"]
    if "glasses" in extras:
        frame = mat("char_glasses", "4A3426")
        for i, dx in enumerate((-0.09, 0.09)):
            add(torus(f"{n}_glasses{i + 1}", 0.075, 0.012, at(dx, -0.28, 0.73), frame, rot=(R90, 0, 0)))
    if "headband" in extras:
        add(torus(f"{n}_headband", 0.275, 0.022, at(0, 0.0, 0.75), mat("char_white", "F7F7F0"),
                  rot=(math.radians(-20), R90, 0)))
    if "star" in extras:
        add(ball(f"{n}_star", 0.045, at(0.2, -0.13, 0.92), mat("char_star", "BFD3FF")))
    if "heart" in extras:
        add(ball(f"{n}_heart", 0.04, at(0, -0.21, 0.42), mat("char_gold", "E8B84A"), scale=(1, 0.5, 1)))
    if "bell" in extras:
        add(torus(f"{n}_collar", 0.14, 0.022, at(0, -0.02, 0.5), mat("char_collar", "6B4A2E")))
        add(ball(f"{n}_bell", 0.045, at(0, -0.17, 0.46), mat("char_gold", "E8B84A")))

    root = marker(n, seat)
    inv = Matrix.Translation(Vector(seat)).inverted()
    for o in parts:
        o.parent = root
        o.matrix_parent_inverse = inv
    return root


def build():
    for owner, spec in SPECS.items():
        seat = tuple(bpy.data.objects[f"seat_{owner}"].location)
        build_doll(owner, spec, seat)
