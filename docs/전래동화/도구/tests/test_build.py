import json, os, sys, tempfile, unittest, wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build


def write_silence(path, sec=1.0, rate=24000):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    n = int(sec * rate)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * n)


ROWS = [
    {"num": "001", "scene": "S01", "text": "첫 줄입니다."},
    {"num": "002", "scene": "S01", "text": "둘째 줄입니다."},
]


class BuildAudioScriptMismatchTest(unittest.TestCase):
    def setUp(self):
        self.d = Path(tempfile.mkdtemp())
        self.old_cwd = Path.cwd()
        os.chdir(self.d)

    def tearDown(self):
        os.chdir(self.old_cwd)

    def write_script(self, rows):
        lines = [f"| {r['num']} | {r['scene']} | {r['text']} |" for r in rows]
        Path("대본.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def write_durations(self, rows):
        durations = [{**r, "sec": 1.0} for r in rows]
        Path("audio").mkdir(exist_ok=True)
        Path("audio/durations.json").write_text(json.dumps(durations, ensure_ascii=False, indent=1), encoding="utf-8")

    def test_matching_script_and_durations_builds(self):
        self.write_script(ROWS)
        self.write_durations(ROWS)
        for r in ROWS:
            write_silence(f"audio/{r['num']}.wav")
        build.build_audio()
        self.assertTrue(Path("narration.wav").exists())

    def test_changed_scene_after_tts_exits(self):
        self.write_script(ROWS)
        self.write_durations(ROWS)
        for r in ROWS:
            write_silence(f"audio/{r['num']}.wav")
        changed = [dict(ROWS[0]), {**ROWS[1], "scene": "S02"}]
        self.write_script(changed)
        with self.assertRaises(SystemExit) as ctx:
            build.build_audio()
        self.assertIn("002", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
