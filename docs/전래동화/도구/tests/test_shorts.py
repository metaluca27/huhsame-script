import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shorts import MAX_SEC, CTA_SEC, candidates, parse_range, vertical_filter

NUMS = [f"{i:03d}" for i in range(1, 21)]


class ParseRangeTest(unittest.TestCase):
    def test_range(self):
        self.assertEqual(parse_range("003-006", NUMS), ["003", "004", "005", "006"])

    def test_single_and_mixed(self):
        self.assertEqual(parse_range("002, 005-007", NUMS), ["002", "005", "006", "007"])

    def test_unknown_line_is_explained(self):
        with self.assertRaises(ValueError) as e:
            parse_range("900", NUMS)
        self.assertIn("900", str(e.exception))

    def test_backwards_range_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_range("008-003", NUMS)

    def test_empty_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_range(" ", NUMS)


class VerticalFilterTest(unittest.TestCase):
    def test_makes_a_1080x1920_frame_with_blurred_backdrop(self):
        f = vertical_filter(90)
        self.assertIn("crop=1080:1920", f)
        self.assertIn("boxblur", f)
        self.assertIn("overlay=0:(H-h)/2", f)

    def test_zoom_direction_alternates(self):
        self.assertIn("1+0.05", vertical_filter(90, zoom_in=True))
        self.assertIn("1.05-0.05", vertical_filter(90, zoom_in=False))


class CandidatesTest(unittest.TestCase):
    """훅은 허허서방이 인사하기 전까지, 반전은 마지막 웹 장면, 한마디는 끝 대목."""

    def setUp(self):
        self.rows = (
            [{"num": f"{i:03d}", "scene": "S01", "text": "훅"} for i in range(1, 4)]
            + [{"num": f"{i:03d}", "scene": "S02", "text": "인사"} for i in range(4, 6)]
            + [{"num": f"{i:03d}", "scene": "S03", "text": "이야기"} for i in range(6, 12)]
            + [{"num": f"{i:03d}", "scene": "S04", "text": "반전"} for i in range(12, 15)]
            + [{"num": f"{i:03d}", "scene": "S05", "text": "한마디"} for i in range(15, 18)]
        )
        self.durations = {r["num"]: 5.0 for r in self.rows}
        self.kinds = {"S01": "base", "S02": "huh", "S03": "base", "S04": "web", "S05": "huh"}

    def test_hook_stops_before_the_greeting(self):
        got = dict((name, picked) for name, picked, _ in candidates(self.rows, self.durations, self.kinds))
        self.assertEqual([r["num"] for r in got["훅"]], ["001", "002", "003"])

    def test_reversal_starts_at_the_last_web_scene(self):
        got = dict((name, picked) for name, picked, _ in candidates(self.rows, self.durations, self.kinds))
        self.assertEqual(got["반전"][0]["num"], "012")

    def test_every_candidate_fits_in_a_short(self):
        for _, _, sec in candidates(self.rows, self.durations, self.kinds):
            self.assertLessEqual(sec + CTA_SEC, MAX_SEC)

    def test_no_prompts_file_still_gives_a_hook(self):
        names = [name for name, _, _ in candidates(self.rows, self.durations, {})]
        self.assertIn("훅", names)


if __name__ == "__main__":
    unittest.main()
