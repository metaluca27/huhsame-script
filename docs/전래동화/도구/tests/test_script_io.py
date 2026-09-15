import sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from script_io import parse_script, scene_kind, build_prompt, Z_MAX

SAMPLE = """# 대본
| 번호 | 장면 | 내레이션 |
|---|---|---|
| 001 | S01 | 옛날 옛적, 돌쇠라는 머슴이 살았습니다. |
| 002 | S01 | 돌쇠는 글자 한 자 몰랐지요. |
| 003 | S02 | 그러던 어느 겨울날이었습니다. |
"""

PROMPTS = {
    "styles": {"base": "MINHWA.", "sil": "SUNSET.", "web": "WEBSTYLE."},
    "characters": {"DOLSOE": "a ragged servant", "CHOI": "a fat rich man"},
    "scenes": {
        "S01": "DOLSOE sweeps the yard.",
        "S02": "[SIL] CHOI sneaks to the storehouse.",
        "S03": "[WEB] DOLSOE holds up a fan before CHOI.",
        "S04": "[HUH:부채탁]",
    },
}


class ParseScriptTest(unittest.TestCase):
    def write(self, text):
        f = Path(tempfile.mkdtemp()) / "대본.md"
        f.write_text(text, encoding="utf-8")
        return f

    def test_reads_rows_in_order(self):
        rows = parse_script(self.write(SAMPLE))
        self.assertEqual([r["num"] for r in rows], ["001", "002", "003"])
        self.assertEqual(rows[2], {"num": "003", "scene": "S02", "text": "그러던 어느 겨울날이었습니다."})

    def test_rejects_line_over_200_chars(self):
        long = "가" * 201
        with self.assertRaises(ValueError):
            parse_script(self.write(f"| 001 | S01 | {long} |\n"))

    def test_rejects_malformed_data_row(self):
        with self.assertRaises(ValueError):
            parse_script(self.write("| 01 | S01 | 두 자리 번호 |\n"))
        # 헤더/구분선은 여전히 조용히 스킵되어야 함
        rows = parse_script(self.write(SAMPLE))
        self.assertEqual([r["num"] for r in rows], ["001", "002", "003"])

    def test_rejects_duplicate_line_numbers(self):
        dup = "| 001 | S01 | 첫 줄입니다. |\n| 001 | S02 | 번호가 겹칩니다. |\n"
        with self.assertRaises(ValueError):
            parse_script(self.write(dup))


class SceneKindTest(unittest.TestCase):
    def test_tags(self):
        self.assertEqual(scene_kind("plain scene"), ("base", "plain scene"))
        self.assertEqual(scene_kind("[SIL] dusk"), ("sil", "dusk"))
        self.assertEqual(scene_kind("[WEB] action"), ("web", "action"))
        self.assertEqual(scene_kind("[HUH:껄껄]"), ("huh", "껄껄"))


class BuildPromptTest(unittest.TestCase):
    def test_base_replaces_characters(self):
        kind, prompt = build_prompt(PROMPTS, "S01")
        self.assertEqual(kind, "base")
        self.assertEqual(prompt, "MINHWA. Scene: a ragged servant sweeps the yard.")

    def test_sil_uses_sunset_style(self):
        self.assertEqual(build_prompt(PROMPTS, "S02"), ("sil", "SUNSET. Scene: a fat rich man sneaks to the storehouse."))

    def test_web_uses_web_style(self):
        kind, prompt = build_prompt(PROMPTS, "S03")
        self.assertEqual(kind, "web")
        self.assertTrue(prompt.startswith("WEBSTYLE. Scene: a ragged servant holds up"))

    def test_huh_returns_pose_name(self):
        self.assertEqual(build_prompt(PROMPTS, "S04"), ("huh", "부채탁"))

    def test_z_prompt_length_limit(self):
        p = {**PROMPTS, "scenes": {"S09": "x" * Z_MAX}}
        with self.assertRaises(ValueError):
            build_prompt(p, "S09")

    def test_longer_character_key_wins(self):
        p = {
            **PROMPTS,
            "characters": {"CHOI": "a fat rich man", "CHOIWIFE": "his stern wife"},
            "scenes": {"S05": "CHOIWIFE scolds CHOI."},
        }
        self.assertEqual(
            build_prompt(p, "S05"),
            ("base", "MINHWA. Scene: his stern wife scolds a fat rich man."),
        )


if __name__ == "__main__":
    unittest.main()
