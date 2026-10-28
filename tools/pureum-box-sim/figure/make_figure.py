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
from mathutils import Vector

HEIGHT = 0.42
YAW_DEG = 90  # TRELLIS 인형은 -y 를 보고 나온다 → +x 로
TEX_GAIN = 1.5
WHISKER_LEN = 0.06
WHISKER_RGB = (0.92, 0.91, 0.88)

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
# 작은 조각 지우기는 안 한다: TRELLIS 메시는 UV 이음매마다 수백 조각으로 갈라져 있어서 몸에 구멍이 남(10-28).
# 수염 부스러기는 그림에서 수염을 지우고 뽑는 걸로 해결 (아래 수염 막대 참고)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 돌리기는 점 좌표를 직접 돌린다 (rotation_euler + transform_apply 는 선택 상태에 따라 조용히 안 먹었음)
c, s_ = math.cos(math.radians(YAW_DEG)), math.sin(math.radians(YAW_DEG))
for v in fig.data.vertices:
    v.co.x, v.co.y = c * v.co.x - s_ * v.co.y, s_ * v.co.x + c * v.co.y

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

# 수염: TRELLIS 는 가는 수염을 검은 가시처럼 뭉개서(괴물 같다는 반응) 그림에서 지우고 뽑았다 → 가는 막대로 다시 붙인다.
# 코끝 = 얼굴 높이(귀 끝 제외)에서 가장 앞(+x)으로 나온 점. 막대 UV 는 텍스처 구석에 칠한 수염색 칸을 가리킨다.
head = [v.co.copy() for v in fig.data.vertices if HEIGHT * 0.58 < v.co.z < HEIGHT * 0.78 and abs(v.co.y) < 0.05]
nose = max(head, key=lambda c: c.x)
whiskers = []
for side in (-1, 1):
    for k, tilt in enumerate((0.2, 0.0, -0.2)):
        d = Vector((0.3, side, tilt)).normalized()
        start = nose + Vector((-0.012, side * 0.02, -0.008 - k * 0.005))
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0011, depth=WHISKER_LEN,
                                            location=start + d * (WHISKER_LEN / 2),
                                            rotation=d.to_track_quat("Z", "Y").to_euler())
        whiskers.append(bpy.context.active_object)
patch = 12
W, H = img.size
uv_spot = ((patch / 2) / W, (patch / 2) / H)
bpy.ops.object.select_all(action="DESELECT")
for o in whiskers:
    o.select_set(True)
fig.select_set(True)
bpy.context.view_layer.objects.active = fig
bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
uv = fig.data.uv_layers.active.data
for poly in fig.data.polygons[-len(whiskers) * 8:]:  # 방금 붙인 막대 면들 (육각기둥 = 옆 6 + 뚜껑 2)
    for li in poly.loop_indices:
        uv[li].uv = uv_spot
# 굵은 검은 외곽선 만화 그림은 TRELLIS 가 어둡게 굽는다 → 밝기 올림 (ai-office-3d 의 TEX_GAIN 과 같은 값)
px = np.empty(len(img.pixels), dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(-1, 4)
px[:, :3] = np.clip(px[:, :3] * TEX_GAIN, 0, 1)
grid = px.reshape(H, W, 4)  # 아래쪽 줄부터 (UV 0,0 = 왼쪽 아래)
grid[:patch, :patch, :3] = WHISKER_RGB
img.pixels.foreach_set(px.ravel())
scene = bpy.context.scene
scene.render.image_settings.file_format = "PNG"
img.save_render(os.path.join(out, "pureum_tex.png"), scene=scene)

bpy.ops.wm.obj_export(filepath=os.path.join(out, "pureum.obj"), export_selected_objects=True,
                      export_materials=False, export_uv=True, export_normals=True, forward_axis="Y", up_axis="Z")
print("FIGURE", len(fig.data.polygons), "faces", "size", [round((max(a) - min(a)) * s, 3) for a in (xs, ys, zs)])
