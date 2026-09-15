import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tts import payload, needs_check, similar


class TtsTest(unittest.TestCase):
    def test_payload_uses_umbriel(self):
        p = payload("안녕하시게")
        self.assertEqual(p["voice"], "Umbriel")
        self.assertEqual(p["preset"], "middleM")
        self.assertEqual(p["tone"], "calm")
        self.assertEqual(p["text"], "안녕하시게")
        self.assertLessEqual(len(p["style"]), 200)

    def test_needs_check_flags_digits_and_quotes(self):
        self.assertTrue(needs_check("사흘 뒤 3명이 왔다"))
        self.assertTrue(needs_check("“암행어사 출두요!”"))
        self.assertTrue(needs_check('"쉿"'))
        self.assertFalse(needs_check("돌쇠는 마당을 쓸었지요."))

    def test_similar_ignores_punctuation_and_spaces(self):
        self.assertTrue(similar("허허, 어서들 오시게.", "허허 어서들 오시게"))
        self.assertFalse(similar("사흘 뒤", "나흘 뒤"))


if __name__ == "__main__":
    unittest.main()
