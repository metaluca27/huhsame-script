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

PARTS = ["island", "house", "deck", "desks"]  # 파일이 있는 것만 만든다


def build_scene():
    importlib.reload(lib)
    lib.reset_scene()
    lib.setup_render()
    for part in PARTS:
        if os.path.exists(os.path.join(HERE, f"{part}.py")):
            mod = importlib.reload(importlib.import_module(part))
            mod.build()
    lib.camera("cam_main", (24, -31, 19), (0.5, -1.0, 3.0), lens=40)
    lib.camera("cam_inside", (0, -24, 7.0), (0, 1.5, 5.6), lens=35)
    lib.light("light_sun", "SUN", (6, -8, 14), 2.5,
              rot=(math.radians(55), 0, math.radians(35)), color="FFD9B0")
    lib.light("light_fill", "AREA", (0, -6, 12), 600, size=14, color="C9C8FF")


def set_front_hidden(hidden):
    for o in bpy.data.objects:
        if o.name.startswith("house_front_"):
            o.hide_render = hidden


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
    bpy.context.scene.camera = bpy.data.objects["cam_main"]
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "office.blend"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, "web", "office.glb"),
                              export_format="GLB", export_apply=True,
                              export_cameras=False, export_lights=False)
    print(f"✅ 빌드 완료: {version}")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    main(args[0] if args else "dev")
