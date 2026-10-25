"""디지털 다락방 장면 만들기.
터미널: blender --background --factory-startup --python build_office.py -- v1
MCP(열린 블렌더): exec(open(P, encoding='utf-8').read(), {'__file__': P, '__name__': 'mcp'}) 후 build_scene()"""
import importlib
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import lib  # noqa: E402

PARTS = ["island", "garden", "house", "studio", "dorm", "deck", "desks", "pantry", "characters"]  # 파일이 있는 것만 만든다
FRONT_PREFIXES = ("house_front_", "dorm_front_")  # 안을 들여다볼 때 숨기는 앞벽
NIGHT = True  # 기본은 밤 (루카 10-25: "밤이 더 이뿌네"). 반대 시간대 그림을 한 장 더 뽑는다


def build_scene():
    importlib.reload(lib)
    lib.reset_scene()
    lib.setup_render()
    for part in PARTS:
        if os.path.exists(os.path.join(HERE, f"{part}.py")):
            mod = importlib.reload(importlib.import_module(part))
            mod.build()
    lib.camera("cam_main", (26, -34, 24), (-0.5, 0.0, 4.5), lens=40)
    lib.camera("cam_inside", (-3.0, -32, 9.0), (-3.0, 2.5, 7.5), lens=35)
    lib.light("light_sun", "SUN", (6, -8, 14), 2.5,
              rot=(math.radians(55), 0, math.radians(35)), color="FFD9B0")
    lib.light("light_fill", "AREA", (0, -6, 12), 600, size=14, color="C9C8FF")
    set_night(NIGHT)


def set_front_hidden(hidden):
    for o in bpy.data.objects:
        if o.name.startswith(FRONT_PREFIXES):
            o.hide_render = hidden


def set_night(night):
    """밤: 하늘 어둡게 + 해 대신 푸른 달빛 → 창문·전등·가로등 불빛이 살아난다."""
    bg = bpy.context.scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*lib.hexc("141830" if night else "4E4F7A"), 1.0)
    bg.inputs["Strength"].default_value = 0.35 if night else 0.8
    sun = bpy.data.objects["light_sun"].data
    sun.energy = 0.25 if night else 2.5
    sun.color = lib.hexc("9FB4FF" if night else "FFD9B0")
    bpy.data.objects["light_fill"].data.energy = 60 if night else 600


def render(cam_name, path):
    s = bpy.context.scene
    s.camera = bpy.data.objects[cam_name]
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main(version):
    build_scene()
    for d in ("renders", "web"):
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)
    render("cam_main", os.path.join(ROOT, "renders", f"office_outside_{version}.png"))
    set_front_hidden(True)
    render("cam_inside", os.path.join(ROOT, "renders", f"office_inside_{version}.png"))
    set_front_hidden(False)
    set_night(not NIGHT)
    render("cam_main", os.path.join(ROOT, "renders", f"office_{'day' if NIGHT else 'night'}_{version}.png"))
    set_night(NIGHT)
    bpy.context.scene.camera = bpy.data.objects["cam_main"]
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "office.blend"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, "web", "office.glb"),
                              export_format="GLB", export_apply=True,
                              export_cameras=False, export_lights=False)
    print(f"✅ 빌드 완료: {version}")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    main(args[0] if args else "dev")
