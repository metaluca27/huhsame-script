import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from timeline import build_timeline, split_cues, wrap, to_srt, GAP_LINE, GAP_SCENE

LINES = [
    {"num": "001", "scene": "S01", "text": "가", "sec": 2.0},
    {"num": "002", "scene": "S01", "text": "나", "sec": 3.0},
    {"num": "003", "scene": "S02", "text": "다", "sec": 1.0},
]


class TimelineTest(unittest.TestCase):
    def test_gaps_and_scene_spans(self):
        lines, scenes, total = build_timeline(LINES)
        self.assertEqual([l["start"] for l in lines], [0.0, 2.0 + GAP_LINE, 5.0 + GAP_LINE + GAP_SCENE])
        self.assertEqual(lines[1]["gap"], GAP_SCENE)  # 다음 줄이 다른 장면
        self.assertEqual(total, round(6.0 + GAP_LINE + GAP_SCENE + GAP_LINE, 3))
        self.assertEqual([s["scene"] for s in scenes], ["S01", "S02"])
        self.assertAlmostEqual(sum(s["dur"] for s in scenes), total, places=2)
        self.assertEqual(scenes[1]["start"], lines[2]["start"])

    def test_repeated_scene_later_is_new_segment(self):
        seq = LINES + [{"num": "004", "scene": "S01", "text": "라", "sec": 1.0}]
        _, scenes, _ = build_timeline(seq)
        self.assertEqual([s["scene"] for s in scenes], ["S01", "S02", "S01"])


class CueTest(unittest.TestCase):
    def test_wrap_24(self):
        text = "옛날 옛적 경상도 어느 고을에 돌쇠라는 머슴이 살았습니다"
        for line in wrap(text).split("\n"):
            self.assertLessEqual(len(line), 24)

    def test_short_line_is_one_cue(self):
        cues = split_cues("짧은 문장입니다.", start=10.0, sec=2.0)
        self.assertEqual(len(cues), 1)
        self.assertEqual((cues[0][0], cues[0][1]), (10.0, 12.0))

    def test_long_line_splits_by_length_and_covers_duration(self):
        text = "돌쇠는 글자 한 자 읽을 줄 몰랐지만 새벽닭이 울기도 전에 일어나 소죽을 끓이고 마당을 쓸었지요 주인집 최 부자는 그런 돌쇠를 사람 취급도 하지 않았습니다"
        cues = split_cues(text, start=0.0, sec=9.0)
        self.assertGreater(len(cues), 1)
        self.assertEqual(cues[0][0], 0.0)
        self.assertAlmostEqual(cues[-1][1], 9.0, places=2)
        for _, _, body in cues:
            self.assertLessEqual(len(body.split("\n")), 2)
        self.assertEqual(" ".join(b.replace("\n", " ") for _, _, b in cues), text)

    def test_srt_format(self):
        srt = to_srt([(0.0, 1.5, "첫 줄"), (61.25, 62.0, "둘째")])
        self.assertIn("1\n00:00:00,000 --> 00:00:01,500\n첫 줄\n", srt)
        self.assertIn("2\n00:01:01,250 --> 00:01:02,000\n둘째\n", srt)


if __name__ == "__main__":
    unittest.main()
