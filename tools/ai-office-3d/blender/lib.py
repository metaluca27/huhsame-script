"""블렌더 도형 도우미. 모든 객체는 설계 문서의 이름 규칙대로 이름 붙인다."""
import math

import bpy
from mathutils import Vector

_mats = {}


def hexc(h):
    """'#RRGGBB' → 블렌더용 선형 색."""
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def reset_scene():
    """장면을 비운다. (read_factory_settings 는 MCP 애드온까지 꺼버려서 안 씀)"""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves,
                 bpy.data.cameras, bpy.data.lights):
        for d in list(coll):
            coll.remove(d)
    _mats.clear()


def mat(name, color_hex, emission=0.0, roughness=0.7):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    col = (*hexc(color_hex), 1.0)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = roughness
    if emission:
        b.inputs["Emission Color"].default_value = col
        b.inputs["Emission Strength"].default_value = emission
    _mats[name] = m
    return m


def _finish(o, name, material, smooth=False):
    o.name = name
    o.data.name = name
    if material is not None:
        o.data.materials.clear()
        o.data.materials.append(material)
    if smooth:
        bpy.ops.object.shade_smooth()
    return o


def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    return _finish(o, name, material)


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=loc, rotation=rot)
    return _finish(bpy.context.active_object, name, material)


def cone(name, r1, r2, depth, loc, material, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth,
                                    location=loc, rotation=rot)
    return _finish(bpy.context.active_object, name, material)


def ball(name, radius, loc, material, scale=(1, 1, 1), low=False):
    """low=True 면 각진 로우폴리 공(나무·돌), 아니면 매끈한 공."""
    if low:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=loc)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=radius, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name, material, smooth=not low)


def torus(name, major, minor, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc,
                                     rotation=rot, major_segments=24, minor_segments=8)
    return _finish(bpy.context.active_object, name, material, smooth=True)


def prism(name, width, depth, height, loc, material):
    """박공(삼각기둥). x폭 width, y깊이 depth, 위로 height. loc = 바닥 중앙."""
    w, d = width / 2, depth / 2
    verts = [(-w, -d, 0), (w, -d, 0), (0, -d, height), (-w, d, 0), (w, d, 0), (0, d, height)]
    faces = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    bpy.context.collection.objects.link(o)
    me.materials.append(material)
    return o


def text(name, body, loc, size, material, rot=(math.radians(90), 0, 0)):
    """세운 글자(기본: -y 쪽, 즉 카메라 쪽을 봄)."""
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.active_object
    o.data.body = body
    o.data.size = size
    o.data.align_x = "CENTER"
    o.data.align_y = "CENTER"
    o.data.extrude = 0.01
    bpy.ops.object.convert(target="MESH")
    return _finish(bpy.context.active_object, name, material)


def marker(name, loc):
    """캐릭터 자리 표시(빈 물체). 2·3차 웹이 이 이름으로 자리를 찾는다."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc, radius=0.2)
    o = bpy.context.active_object
    o.name = name
    return o


def setup_render(width=1600, height=1000):
    s = bpy.context.scene
    engines = [e.identifier for e in s.render.bl_rna.properties["engine"].enum_items]
    s.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    s.render.resolution_x = width
    s.render.resolution_y = height
    if s.world is None:
        s.world = bpy.data.worlds.new("world")
    s.world.use_nodes = True
    bg = s.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*hexc("4E4F7A"), 1.0)
    bg.inputs["Strength"].default_value = 0.8


def camera(name, loc, target, lens=40):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.name = name
    cam.data.lens = lens
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return cam


def light(name, kind, loc, energy, rot=(0, 0, 0), size=1.0, color="FFFFFF"):
    bpy.ops.object.light_add(type=kind, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.energy = energy
    o.data.color = hexc(color)
    if kind == "AREA":
        o.data.size = size
    return o
