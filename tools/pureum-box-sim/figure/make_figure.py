"""TRELLIS 푸름이 인형(GLB) → 무조코용 OBJ + PNG 텍스처.
터미널: blender --background --factory-startup --python make_figure.py -- <입력.glb> <출력폴더>

- 발바닥이 z=0, 몸 가운데가 x=y=0, 얼굴이 +x(무조코에서 푸름이 앞쪽)를 보게 맞춘다.
- 키는 HEIGHT(m). 시뮬레이터 물리 몸(타원체)은 그대로 두고 겉모습만 바꾼다.
- 면 수는 안 줄인다 (줄이면 TRELLIS UV 가 깨져 얼룩 — ai-office-3d/prep_models.py 참고)."""
import math
import os
import sys

import bpy
import numpy as np

HEIGHT = 0.42
YAW_DEG = 90  # TRELLIS 인형은 -y 를 보고 나온다 → +x 로
TEX_GAIN = 1.5

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
os.makedirs(out, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
fig = bpy.context.view_layer.objects.active
fig.parent = None
# TRELLIS 는 가는 수염을 너덜너덜한 부스러기로 만든다 → 떨어져 나온 작은 조각은 버린다
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")
parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
big = max(len(o.data.polygons) for o in parts)
keep = [o for o in parts if len(o.data.polygons) >= big * 0.02]
for o in parts:
    if o not in keep:
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in keep:
    o.select_set(True)
bpy.context.view_layer.objects.active = keep[0]
if len(keep) > 1:
    bpy.ops.object.join()
fig = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

fig.rotation_euler = (0, 0, math.radians(YAW_DEG))
bpy.ops.object.transform_apply(rotation=True)

xs = [v.co.x for v in fig.data.vertices]
ys = [v.co.y for v in fig.data.vertices]
zs = [v.co.z for v in fig.data.vertices]
s = HEIGHT / (max(zs) - min(zs))
cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
for v in fig.data.vertices:
    v.co.x = (v.co.x - cx) * s
    v.co.y = (v.co.y - cy) * s
    v.co.z = (v.co.z - z0) * s

# 텍스처를 PNG 로 꺼낸다 (무조코는 PNG 만 읽음)
img = next(n.image for m in fig.data.materials for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
# 굵은 검은 외곽선 만화 그림은 TRELLIS 가 어둡게 굽는다 → 밝기 올림 (ai-office-3d 의 TEX_GAIN 과 같은 값)
px = np.empty(len(img.pixels), dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(-1, 4)
px[:, :3] = np.clip(px[:, :3] * TEX_GAIN, 0, 1)
img.pixels.foreach_set(px.ravel())
scene = bpy.context.scene
scene.render.image_settings.file_format = "PNG"
img.save_render(os.path.join(out, "pureum_tex.png"), scene=scene)

bpy.ops.wm.obj_export(filepath=os.path.join(out, "pureum.obj"), export_selected_objects=True,
                      export_materials=False, export_uv=True, export_normals=True, forward_axis="Y", up_axis="Z")
print("FIGURE", len(fig.data.polygons), "faces", "size", [round((max(a) - min(a)) * s, 3) for a in (xs, ys, zs)])
