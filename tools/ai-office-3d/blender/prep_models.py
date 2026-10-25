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
SEAT = {"hermi": 0.2, "luna": 0.4, "nova": 0.44, "pureum": 0.33, "rurik": 0.3, "jujuya": 0.1, "clo": 0.12}
# 텍스처 밝기 배율. 굵은 검은 외곽선 만화 그림(푸름이·루릭)은 TRELLIS 가 시드를 바꿔도 어둡게 구워서 올려 준다
TEX_GAIN = {"pureum": 2.5, "rurik": 1.7}
YAW = {}               # 이름: 도. 그림이 비스듬히 앉아 있으면 정면으로 돌림
# TRELLIS 는 가는 털을 못 만들어 수염이 통나무처럼 굵게 나옴 → 그림에서 수염을 지우고 여기서 가는 수염을 붙인다
WHISKERS = {"pureum": "F2F0EA", "rurik": "F2F0EA"}


# 안경도 TRELLIS 가 눈과 뭉개서 까만 구멍이 됨 → 그림에서 안경을 빼고 여기서 가는 테를 붙인다
# 이름: (테 색, 눈 높이(엉덩이 원점 기준 m), 눈 사이 반폭, 렌즈 반지름)
# 눈 높이는 자동으로 못 찾음(앞머리·태블릿이 코보다 튀어나옴) → 가운데 세로 단면을 찍어 보고 눈으로 맞춤
GLASSES = {"hermi": ("2A2420", 0.575, 0.055, 0.042)}


def nose_tip(o):
    """머리 높이에서 가장 앞(-y)으로 나온 점 = 코끝."""
    head = [v.co for v in o.data.vertices if v.co.z > UPPER_H * 0.55 and abs(v.co.x) < 0.15]
    return min(head, key=lambda v: v.y).copy()


def remove_floor(o):
    """그림의 바닥 그림자까지 3D가 돼서 생긴 넓은 판(CLO·주주야 엉덩이 밑)을 지운다.
    아래쪽 1cm 층마다 수평면 넓이를 재서, 몸통으론 나올 수 없는 넓이(0.3㎡ 넘음)면 그 층의 수평면을 삭제."""
    import bmesh
    from collections import defaultdict
    bm = bmesh.new()
    bm.from_mesh(o.data)
    zs = [v.co.z for v in bm.verts]
    zmin, zmax = min(zs), max(zs)
    flat = [f for f in bm.faces if abs(f.normal.z) > 0.9 and f.calc_center_median().z < zmin + 0.25 * (zmax - zmin)]
    area = defaultdict(float)
    for f in flat:
        area[round(f.calc_center_median().z, 2)] += f.calc_area()
    bad = {z for z, a in area.items() if a > 0.3}
    doomed = set(f for f in flat if any(abs(round(f.calc_center_median().z, 2) - z) < 0.015 for z in bad))
    # 판 가장자리 테두리도: 같은 높이대에서 바로 위 몸통보다 바깥으로 나간 면
    import math
    for z in bad:
        body = [f.calc_center_median() for f in bm.faces if z + 0.03 < f.calc_center_median().z < z + 0.08]
        if not body:
            continue
        cx = sum(c.x for c in body) / len(body)
        cy = sum(c.y for c in body) / len(body)
        reach = max(math.hypot(c.x - cx, c.y - cy) for c in body) + 0.02
        for f in bm.faces:
            c = f.calc_center_median()
            if abs(c.z - z) < 0.06 and math.hypot(c.x - cx, c.y - cy) > reach:
                doomed.add(f)
    bmesh.ops.delete(bm, geom=list(doomed), context="FACES")
    bm.to_mesh(o.data)
    bm.free()
    return len(doomed)


def join_into(o, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()


def add_glasses(o, name):
    """동그란 가는 안경테 두 알 + 코다리 + 다리를 눈 앞에 붙여 모델에 합친다."""
    color, z, half, r = GLASSES[name]
    band = [v.co for v in o.data.vertices if abs(v.co.z - z) < 0.02]
    x = (min(v.x for v in band) + max(v.x for v in band)) / 2         # 머리 가운데
    y = min(v.y for v in band if abs(v.x - x) < 0.1) - 0.008           # 얼굴 면 바로 앞
    frame = lib.mat(f"char_{name}_glasses", color, roughness=0.4)
    parts = []
    for i, s in enumerate((-1, 1)):
        parts.append(lib.torus(f"char_{name}_glasses_{i}", r, 0.004,
                               (x + s * half, y, z), frame, rot=(math.radians(90), 0, 0)))
        parts.append(lib.cyl(f"char_{name}_glasses_arm{i}", 0.003, 0.12,
                             (x + s * (half + r), y + 0.06, z), frame, rot=(math.radians(90), 0, 0), verts=6))
    parts.append(lib.cyl(f"char_{name}_glasses_bridge", 0.003, 2 * (half - r), (x, y, z + 0.005),
                         frame, rot=(0, math.radians(90), 0), verts=6))
    join_into(o, parts)


def add_whiskers(o, name):
    """코(머리 높이에서 가장 앞으로 나온 점) 양옆에 가는 수염 3가닥씩 붙여 모델에 합친다."""
    nose = nose_tip(o)
    whisker = lib.mat(f"char_{name}_whisker", WHISKERS[name], roughness=0.5)
    parts = []
    for side in (-1, 1):
        for k, tilt in enumerate((0.18, 0.0, -0.18)):        # 위·가운데·아래로 살짝 퍼지게
            d = Vector((side, -0.35, tilt)).normalized()      # 바깥 + 살짝 앞
            start = nose + Vector((side * 0.035, 0.03, -0.02 - k * 0.012))
            length = 0.2
            rot = d.to_track_quat("Z", "Y").to_euler()
            parts.append(lib.cyl(f"char_{name}_whisker_{side}_{k}", 0.0035, length,
                                 tuple(start + d * (length / 2)), whisker, rot=tuple(rot), verts=6))
    join_into(o, parts)


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

    removed = remove_floor(o)
    if removed:
        print(f"   {name}: 바닥 판 면 {removed}개 지움")
    o.name = o.data.name = f"char_{name}_model"
    for i, m in enumerate(o.data.materials):
        m.name = f"char_{name}_skin" + (f"_{i}" if i else "")
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Metallic"].default_value = 0.0  # TRELLIS 는 금속 100% 로 와서 시커멓게 보임
        b.inputs["Roughness"].default_value = 0.85
    if name in WHISKERS:
        add_whiskers(o, name)
    if name in GLASSES:
        add_glasses(o, name)
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
