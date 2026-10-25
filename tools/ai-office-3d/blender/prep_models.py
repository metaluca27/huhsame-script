"""허깅페이스 TRELLIS 원본 인형(models/raw/<이름>.glb)을 사무실용으로 줄인다 → web/characters/char_<이름>.glb
(인형은 office.glb 에 안 넣고 따로 둔다: 웹에서 인형만 자리 옮기기 + office.glb 5MB 제한)

인형 만드는 순서 (2026-10-25, 허깅페이스 HF_TOKEN 사용자 환경변수 필요):
1. 설정표 그림(tools/ai-office/characters/원본시트/<이름>.webp) → FLUX.1-Kontext-Dev 로 앉은 그림
   프롬프트: "Make this exact same character sit down as if on an invisible chair: seated pose facing the
   viewer, thighs horizontal, knees bent, lower legs hanging down, both hands resting on the knees, no chair
   visible, full body visible, same outfit, same face, same art style, plain white background"
   → tools/ai-office/characters/앉은자세/<이름>.png (의자가 그려지거나 서 있으면 시드 바꿔 다시)
   비스듬히 앉거나 고개를 숙이면 3D에서 앞머리가 얼굴을 덮어 귀신처럼 됨(헤르미) → 프롬프트에
   "strict front view ... head up, looking directly at the viewer ... hair behind the shoulders not covering the face" 추가
   얼굴이 무서우면(메롱 혀, 작은 눈 → 3D에서 까만 구멍) 앉은 그림을 Kontext 로 한 번 더:
   "Keep the exact same character, same seated pose ... close the mouth, no tongue visible ..." /
   "... large bright anime eyes with visible irises and white highlights, looking directly at the viewer ..."
2. 앉은 그림 → trellis-community/TRELLIS /generate_and_extract_glb (texture_size 2048, mesh_simplify 0.95)
   → models/raw/<이름>.glb
3. 이 스크립트 → web/characters/char_<이름>.glb
터미널: blender --background --factory-startup --python prep_models.py -- [이름 ...]

- 면 수는 줄이지 않는다: Decimate 를 걸면 UV 가 깨져 텍스처의 검은 빈칸이 몸에 번져 유령처럼 됨(10-25 v10).
  "면 방향 통일"(normals_make_consistent)도 TRELLIS 의 구멍 난 메시에선 면을 뒤집어 같은 얼룩이 생겨서 안 씀.
  대신 Draco 압축으로 용량을 줄인다 (웹은 DRACOLoader 필요). 텍스처는 TEX 크기 JPEG.
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
TEX = 1024
UPPER_H = 0.85         # 의자 위로 보이는 키 (엉덩이 ~ 머리 꼭대기)
BACK_Y = 0.18         # 원점(의자 seat_)에서 등판까지 (의자 등받이 앞면이 +0.2)
LEG_MAX = 0.57        # 엉덩이 아래로 늘어질 수 있는 최대 길이 (의자 seat_ 가 바닥 + 0.6, desks.SEAT_H)
# 엉덩이 높이 비율 (앉은자세 그림 기준). 공중의자 자세는 다리가 아래로 늘어져 높고, 바닥에 앉으면 낮다
SEAT = {"hermi": 0.44, "luna": 0.4, "nova": 0.44, "pureum": 0.33, "rurik": 0.3, "jujuya": 0.1, "clo": 0.12}
# 텍스처 밝기 배율. 굵은 검은 외곽선 만화 그림(푸름이·루릭)은 TRELLIS 가 시드를 바꿔도 어둡게 구워서 올려 준다
TEX_GAIN = {"pureum": 2.5, "rurik": 1.7}
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

    verts = [v.co for v in o.data.vertices]
    bottom, top = min(v.z for v in verts), max(v.z for v in verts)
    seat_z = bottom + SEAT[name] * (top - bottom)
    xs = [v.x for v in verts]
    # 늘어진 다리가 바닥(의자 높이 0.5m 아래)을 뚫지 않게 크기 상한
    s = min(UPPER_H / (top - seat_z), LEG_MAX / max(seat_z - bottom, 1e-6))
    # 앞뒤는 상자 가운데가 아니라 엉덩이 바로 위 몸통 등판을 의자 등받이(+y)에 붙인다.
    # (가운데로 맞추면 앞으로 뻗은 무릎 때문에 몸이 뒤로 밀려 방석이 무릎 앞에 보임. 머리카락·꼬리는 제외)
    waist = [v.y for v in verts if seat_z < v.z < seat_z + 0.3 * (top - seat_z)]
    back_y = max(waist) - BACK_Y / s
    center = Vector(((min(xs) + max(xs)) / 2, back_y, seat_z))
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
        gain = TEX_GAIN.get(name)
        if gain:
            px = list(img.pixels[:])
            for i in range(0, len(px), 4):
                px[i], px[i + 1], px[i + 2] = (min(1.0, c * gain) for c in px[i:i + 3])
            img.pixels[:] = px
        img.name = f"char_{name}_tex"
    os.makedirs(os.path.join(ROOT, "web", "characters"), exist_ok=True)
    out = os.path.join(ROOT, "web", "characters", f"char_{name}.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False,
                              export_image_format="JPEG", export_jpeg_quality=85,
                              export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7,
                              export_cameras=False, export_lights=False)
    zs = [v.co.z for v in o.data.vertices]
    print(f"✅ {name}: 면 {len(o.data.polygons)}, 키 {max(zs) - min(zs):.2f}m "
          f"(엉덩이 아래 {-min(zs):.2f}m), {os.path.getsize(out) / 1e6:.2f}MB")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in args or NAMES:
        prep(n)
