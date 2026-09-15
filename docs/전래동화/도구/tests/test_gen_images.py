import os, sys, tempfile, unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import gen_images
from gen_images import cmd_huh

PROMPTS = {
    "styles": {"base": "MINHWA.", "sil": "SUNSET.", "web": "WEBSTYLE."},
    "characters": {},
    "scenes": {
        "S01": "[HUH:껄껄]",
        "S02": "[HUH:없는포즈]",
    },
}


class CmdHuhTest(unittest.TestCase):
    def setUp(self):
        self.d = Path(tempfile.mkdtemp())
        self.old_cwd = Path.cwd()
        os.chdir(self.d)
        self.huh_dir = Path(tempfile.mkdtemp())
        Image.new("RGB", (1200, 1600), "red").save(self.huh_dir / "껄껄.png")
        self.orig_huh_dir = gen_images.HUH_DIR
        gen_images.HUH_DIR = self.huh_dir

    def tearDown(self):
        os.chdir(self.old_cwd)
        gen_images.HUH_DIR = self.orig_huh_dir

    def test_missing_pose_exits_after_fitting_existing_ones(self):
        used = ["S01", "S02"]
        with self.assertRaises(SystemExit) as ctx:
            cmd_huh(PROMPTS, used)
        self.assertIn("없는포즈", str(ctx.exception))
        self.assertEqual(Image.open("images/S01.png").size, (1920, 1080))


if __name__ == "__main__":
    unittest.main()
