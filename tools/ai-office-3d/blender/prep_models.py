"""허깅페이스 TRELLIS 원본 인형(models/raw/<이름>.glb)을 사무실용으로 줄인다 → web/characters/char_<이름>.glb
(인형은 office.glb 에 안 넣고 따로 둔다: 웹에서 인형만 자리 옮기기 + office.glb 5MB 제한)

인형 만드는 순서 (2026-10-25, 허깅페이스 HF_TOKEN 사용자 환경변수 필요):
1. 설정표 그림(tools/ai-office/characters/원본시트/<이름>.webp) → FLUX.1-Kontext-Dev 로 앉은 그림
   프롬프트: "Make this exact same character sit down as if on an invisible chair: seated pose facing the
   viewer, thighs horizontal, knees bent, lower legs hanging down, both hands resting on the knees, no chair
   visible, full body visible, same outfit, same face, same art style, plain white background"
   → tools/ai-office/characters/앉은자세/<이름>.png (의자가 그려지거나 서 있으면 시드 바꿔 다시)
2. 앉은 그림 → trellis-community/TRELLIS /generate_and_extract_glb → models/raw/<이름>.glb
3. 이 스크립트 → web/characters/char_<이름>.glb
터미널: blender --background --factory-startup --python prep_models.py -- [이름 ...]

- 면 수를 TARGET_FACES 로 줄이고, 텍스처는 TEX 크기 JPEG 로.
- 엉덩이(앉는 면) 높이를 원점으로 → characters.py 가 의자 seat_ 에 원점을 맞춘다.
  엉덩이 높이는 그림마다 달라서 SEAT 표(발끝 0 ~ 머리 꼭대기 1)를 눈으로 맞춰 둔다.
- 엉덩이~머리꼭대기가 UPPER_H 가 되게 크기를 맞춘다 (전체 키 대신 윗몸 기준).
- 얼굴은 -y(카메라 쪽). 그림이 비스듬하면 YAW 로 돌린다."""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import lib  # noqa: E402

NAMES = ["hermi", "jujuya", "luna", "nova", "pureum", "rurik", "clo"]
TARGET_FACES = 7000
TEX = 512
UPPER_H = 0.85         # 의자 위로 보이는 키 (엉덩이 ~ 머리 꼭대기)
LEG_MAX = 0.57         # 엉덩이 아래로 늘어질 수 있는 최대 길이 (의자 seat_ 가 바닥 + 0.6, desks.SEAT_H)
# 엉덩이 높이 비율 (앉은자세 그림 기준). 공중의자 자세는 다리가 아래로 늘어져 높고, 바닥에 앉으면 낮다
SEAT = {"hermi": 0.42, "luna": 0.4, "nova": 0.39, "pureum": 0.33, "rurik": 0.3, "jujuya": 0.1, "clo": 0.12}
YAW = {}               # 이름: 도. 그림이 비스듬히 앉아 있으면 정면으로 돌림


def prep(name):
    lib.reset_scene()
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "models", "raw", f"{name}.glb"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = world
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    for e in [e for e in bpy.data.objects if e.type == "EMPTY"]:
        bpy.data.objects.remove(e, do_unlink=True)
    o.rotation_euler.z += math.radians(YAW.get(name, 0))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    faces = len(o.data.polygons)
    if faces > TARGET_FACES:
        mod = o.modifiers.new("decimate", "DECIMATE")
        mod.ratio = TARGET_FACES / faces
        bpy.ops.object.modifier_apply(modifier=mod.name)

    verts = [v.co for v in o.data.vertices]
    bottom, top = min(v.z for v in verts), max(v.z for v in verts)
    seat_z = bottom + SEAT[name] * (top - bottom)
    xs, ys = [v.x for v in verts], [v.y for v in verts]
    center = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, seat_z))
    # 늘어진 다리가 바닥(의자 높이 0.5m 아래)을 뚫지 않게 크기 상한
    s = min(UPPER_H / (top - seat_z), LEG_MAX / max(seat_z - bottom, 1e-6))
    o.location = -center * s
    o.scale = (s, s, s)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

    o.name = o.data.name = f"char_{name}_model"
    for i, m in enumerate(o.data.materials):
        m.name = f"char_{name}_skin" + (f"_{i}" if i else "")
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Metallic"].default_value = 0.0  # TRELLIS 는 금속 100% 로 와서 시커멓게 보임
        b.inputs["Roughness"].default_value = 0.85
    for img in bpy.data.images:
        if img.size[0] > TEX:
            img.scale(TEX, TEX)
        img.name = f"char_{name}_tex"
    os.makedirs(os.path.join(ROOT, "web", "characters"), exist_ok=True)
    out = os.path.join(ROOT, "web", "characters", f"char_{name}.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False,
                              export_image_format="JPEG", export_jpeg_quality=85,
                              export_cameras=False, export_lights=False)
    zs = [v.co.z for v in o.data.vertices]
    print(f"✅ {name}: 면 {faces}→{len(o.data.polygons)}, 키 {max(zs) - min(zs):.2f}m "
          f"(엉덩이 아래 {-min(zs):.2f}m), {os.path.getsize(out) / 1e6:.2f}MB")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in args or NAMES:
        prep(n)
