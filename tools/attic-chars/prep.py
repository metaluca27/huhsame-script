"""TRELLIS 서 있는 인형(raw/<이름>.glb) → 다락방 웹용 landing/attic/models/<이름>.glb
터미널: blender --background --factory-startup --python prep.py -- <이름> [...]

- 발바닥 가운데가 원점, 키 1m (웹에서 stories.js 의 height 로 늘리고 줄임)
- 얼굴은 -y (glTF 로 나가면 three.js +z = 카메라 쪽)
- 면 수는 안 줄이고 Draco 압축 + 1024 JPEG 텍스처 (줄이면 TRELLIS UV 가 깨짐, ai-office-3d/prep_models.py 참고)
- 바닥 그림자가 판으로 굳어 나오면 prep_models.remove_floor 로 지움"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "ai-office-3d", "blender"))
import lib  # noqa: E402
from prep_models import remove_floor  # noqa: E402

TEX = 1024
TEX_GAIN = {}   # 이름: 배율. 텍스처가 어둡게 구워지면 올림
# 이름: (R, G, B) 배율. 다락방 노을빛이 따뜻해서 러시안블루 털이 갈색으로 보임 → 살짝 푸르게
TEX_TINT = {"pureum": (0.92, 0.97, 1.1)}
# 이름: 텍스처 크기. 얼굴이 작게 들어간 인형은 줄이면 눈이 뭉개짐 → 크게 남김
TEX_SIZE = {"luna": 2048}
# 잘라낼 군더더기: 이름 → [(x범위, y범위, 발바닥에서 높이 범위)] (TRELLIS 원래 좌표, 키 1 기준, -y = 얼굴 앞)
# 푸름이: 수염이 코 옆에서 검은 가시처럼 삐죽 나옴(루카 "아예 제거") → 코끝 높이에서 얼굴 앞쪽 양옆을 자름
CUT = {"pureum": [((0.135, 1), (-1, -0.2), (0.64, 0.78)), ((-1, -0.135), (-1, -0.2), (0.64, 0.78))]}  # 0.09 로 하면 볼까지 패여 구멍 남
OUT = os.path.join(ROOT, "landing", "attic", "models")


def prep(name):
    lib.reset_scene()
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "raw", f"{name}.glb"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = world
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    for e in [e for e in bpy.data.objects if e.type == "EMPTY"]:
        bpy.data.objects.remove(e, do_unlink=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    if name in CUT:
        import bmesh
        lo = min(v.co.z for v in o.data.vertices)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        inside = lambda c, r: r[0] <= c <= r[1]
        cut = [f for f in bm.faces
               if any(all(inside(v, r) for v, r in zip((c.x, c.y, c.z - lo), box))
                      for c in [f.calc_center_median()] for box in CUT[name])]
        bmesh.ops.delete(bm, geom=cut, context="FACES")
        bm.to_mesh(o.data)
        bm.free()
        print(f"   {name}: 군더더기 면 {len(cut)}개 잘라냄")
    removed = remove_floor(o)
    if removed:
        print(f"   {name}: 바닥 판 면 {removed}개 지움")
    vs = [v.co for v in o.data.vertices]
    bottom, top = min(v.z for v in vs), max(v.z for v in vs)
    feet = [v for v in vs if v.z < bottom + 0.1 * (top - bottom)]
    cx = (min(v.x for v in feet) + max(v.x for v in feet)) / 2
    cy = (min(v.y for v in feet) + max(v.y for v in feet)) / 2
    s = 1.0 / (top - bottom)
    o.location = (-cx * s, -cy * s, -bottom * s)
    o.scale = (s, s, s)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

    o.name = o.data.name = f"attic_{name}"
    for m in o.data.materials:
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b:
            b.inputs["Metallic"].default_value = 0.0   # TRELLIS 는 금속 100% 로 와서 시커멓게 보임
            b.inputs["Roughness"].default_value = 0.85
    for img in bpy.data.images:
        size = TEX_SIZE.get(name, TEX)
        if img.size[0] > size:
            img.scale(size, size)
        gain = TEX_GAIN.get(name, 1.0)
        tint = TEX_TINT.get(name, (1.0, 1.0, 1.0))
        if gain != 1.0 or tint != (1.0, 1.0, 1.0):
            px = list(img.pixels[:])
            for i in range(0, len(px), 4):
                for k in range(3):
                    px[i + k] = min(1.0, px[i + k] * gain * tint[k])
            img.pixels[:] = px
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False,
                              export_image_format="JPEG", export_jpeg_quality=85,
                              export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7,
                              export_cameras=False, export_lights=False)
    print(f"✅ {name}: 면 {len(o.data.polygons)}, {os.path.getsize(out) / 1e6:.2f}MB")


if __name__ == "__main__":
    for n in sys.argv[sys.argv.index("--") + 1:]:
        prep(n)
