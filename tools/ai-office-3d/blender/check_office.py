"""office.blend 검사. 사용: blender office.blend --python check_office.py -- [묶음 ...]
묶음: island garden house studio dorm deck desks characters export (안 주면 전부)."""
import os
import sys

import bpy

OWNERS = ["hermi", "jujuya", "luna", "nova", "pureum", "rurik", "clo"]
PREFIXES = ("island_", "house_", "attic_", "studio_", "dorm_", "deck_", "desk_", "chair_", "seat_",
            "rest_", "sleep_", "prop_", "char_", "cam_", "light_")
GLB_LIMIT = 5 * 1024 * 1024

GROUPS = {
    "island": ["island_ground", "island_path", "island_tree_1_leaves", "island_lamp_1_bulb",
               "island_road_south", "island_road_east", "island_sidewalk_south",
               "island_crosswalk_s1", "island_crosswalk_e1", "island_streetlamp_1", "island_streetlamp_1_bulb",
               "island_bike_frame",
               "island_pond_water", "island_pond_stone_1", "island_pond_lily_1", "island_pond_bench"],
    "garden": ["island_pot_1_pot", "island_pot_3_flower1", "island_forest_ground", "island_forest_tree_1_trunk",
               "island_forest_bush_1"],
    "house": ["house_floor_f1", "house_floor_f4", "house_front_f1", "house_front_f4",
              "house_front_f1_door", "house_front_f1_awning1", "house_front_lamp1", "house_front_sign_text", "house_front_attic_gable",
              "house_front_attic_window", "attic_floor", "attic_roof_left", "attic_roof_right"],
    "studio": ["studio_dance_mirror", "studio_dance_bar", "studio_dance_discoball", "studio_dance_speaker1",
               "studio_band_drum_kick", "studio_band_keyboard", "studio_band_guitar_body", "studio_band_bass_body",
               "studio_band_amp", "studio_band_mic"],
    "dorm": ["dorm_floor_f1", "dorm_front_f1", "dorm_front_f3", "dorm_roof"]
            + [n for o in OWNERS for n in (f"dorm_room_{o}_bed", f"sleep_{o}")],
    "deck": ["deck_floor", "deck_counter", "deck_table_1_top", "deck_table_3_parasol"]
            + [f"rest_{o}" for o in OWNERS],
    "desks": [n for o in OWNERS for n in (f"desk_{o}", f"chair_{o}_seat", f"seat_{o}", f"prop_{o}_laptop", f"desk_{o}_lamp_bulb")],
    "characters": [n for o in OWNERS for n in (f"char_{o}", f"char_{o}_head", f"char_{o}_body")],
    "export": ["cam_main", "cam_inside", "light_sun"],
}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    groups = argv or list(GROUPS)
    names = set(bpy.data.objects.keys())
    errors = []
    if not bpy.data.filepath:
        errors.append("office.blend 을 열지 못함 (아직 빌드 전?)")
    for g in groups:
        for n in GROUPS[g]:
            if n not in names:
                errors.append(f"[{g}] 없음: {n}")
    for n in sorted(names):
        if not n.startswith(PREFIXES):
            errors.append(f"이름 규칙 위반: {n}")
    if "export" in groups:
        glb = os.path.join(os.path.dirname(bpy.data.filepath), "..", "web", "office.glb")
        if not os.path.exists(glb):
            errors.append("GLB 없음: web/office.glb")
        elif os.path.getsize(glb) > GLB_LIMIT:
            errors.append(f"GLB 너무 큼: {os.path.getsize(glb) / 1e6:.1f}MB (5MB 이하)")
    if errors:
        for e in errors:
            print("❌", e)
        raise RuntimeError(f"검사 실패 {len(errors)}건")
    print(f"✅ 검사 통과: {', '.join(groups)} (객체 {len(names)}개)")


main()
