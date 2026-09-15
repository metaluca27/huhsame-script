import json, sys, unittest
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


class SaveWavTest(unittest.TestCase):
    def test_save_wav_is_atomic_and_readable(self):
        import tempfile, wave
        from tts import save_wav, wav_sec
        d = Path(tempfile.mkdtemp())
        sec = save_wav(b"\x00\x00" * 24000, 24000, d / "audio" / "001.wav")
        self.assertAlmostEqual(sec, 1.0, places=3)
        self.assertAlmostEqual(wav_sec(d / "audio" / "001.wav"), 1.0, places=3)
        self.assertEqual([p.name for p in (d / "audio").iterdir()], ["001.wav"])  # 임시 파일 안 남음


class MakeManifestTest(unittest.TestCase):
    def test_regenerates_only_when_missing_only_or_text_changed(self):
        import os, tempfile
        import tts as tts_module
        from tts import make

        d = Path(tempfile.mkdtemp())
        old_cwd = Path.cwd()
        os.chdir(d)
        try:
            Path("대본.md").write_text(
                "| 001 | S01 | 첫 줄입니다. |\n| 002 | S01 | 둘째 줄입니다. |\n",
                encoding="utf-8",
            )
            calls = []

            def fake_tts(text, retries=3):
                calls.append(text)
                return b"\x00\x00" * 24000, 24000

            orig_tts = tts_module.tts
            tts_module.tts = fake_tts
            try:
                from script_io import parse_script

                rows = parse_script("대본.md")
                make(rows, set())
                self.assertEqual(len(calls), 2)

                # 다시 실행해도 텍스트가 그대로면 재생성하지 않음
                calls.clear()
                rows = parse_script("대본.md")
                make(rows, set())
                self.assertEqual(len(calls), 0)

                # 002번 줄 텍스트만 수정
                Path("대본.md").write_text(
                    "| 001 | S01 | 첫 줄입니다. |\n| 002 | S01 | 둘째 줄이 바뀌었습니다. |\n",
                    encoding="utf-8",
                )
                calls.clear()
                rows = parse_script("대본.md")
                make(rows, set())
                self.assertEqual(calls, ["둘째 줄이 바뀌었습니다."])

                durations = json.loads(Path("audio/durations.json").read_text(encoding="utf-8"))
                d002 = next(x for x in durations if x["num"] == "002")
                self.assertEqual(d002["text"], "둘째 줄이 바뀌었습니다.")
            finally:
                tts_module.tts = orig_tts
        finally:
            os.chdir(old_cwd)


class CheckResilienceTest(unittest.TestCase):
    def test_one_stt_failure_does_not_discard_others(self):
        import os, tempfile
        import tts as tts_module
        from tts import save_wav, check

        d = Path(tempfile.mkdtemp())
        old_cwd = Path.cwd()
        os.chdir(d)
        try:
            rows = [
                {"num": "001", "scene": "S01", "text": "사흘 뒤 1번째"},
                {"num": "002", "scene": "S01", "text": "사흘 뒤 2번째"},
                {"num": "003", "scene": "S01", "text": "사흘 뒤 3번째"},
            ]
            for r in rows:
                save_wav(b"\x00\x00" * 100, 24000, Path("audio") / f"{r['num']}.wav")

            calls = {"n": 0}

            def fake_post(path, body, timeout=180):
                calls["n"] += 1
                if calls["n"] == 2:
                    raise RuntimeError("네트워크 오류")
                return {"text": "사흘 뒤"}

            orig_post = tts_module.post
            tts_module.post = fake_post
            try:
                result = check(rows, set())
            finally:
                tts_module.post = orig_post

            content = Path("받아쓰기.md").read_text(encoding="utf-8")
            lines = [ln for ln in content.splitlines() if ln.strip()]
            self.assertEqual(len(lines), 5)  # 헤더 2줄 + 데이터 3줄
            self.assertIn("⚠️", content)
            self.assertEqual(result["checked"], 3)
            self.assertEqual(result["error"], 1)
        finally:
            os.chdir(old_cwd)


if __name__ == "__main__":
    unittest.main()
