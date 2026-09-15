import sys, tempfile, unittest
from pathlib import Path
from PIL import Image, ImageStat
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from imaging import fit_cover, web_tone, make_end_card, kenburns_filter, SIZE


class ImagingTest(unittest.TestCase):
    def test_fit_cover_any_ratio_to_1920x1080(self):
        for size in [(1024, 1536), (2048, 1152), (800, 800)]:
            self.assertEqual(fit_cover(Image.new("RGB", size, "red")).size, SIZE)

    def test_web_tone_raises_saturation(self):
        img = Image.new("RGB", SIZE, (150, 120, 100))
        before = ImageStat.Stat(img.convert("HSV")).mean[1]
        after = ImageStat.Stat(web_tone(img).convert("HSV")).mean[1]
        self.assertGreater(after, before)

    def test_end_card_size(self):
        d = Path(tempfile.mkdtemp())
        Image.new("RGB", (600, 800), "orange").save(d / "art.jpg")
        make_end_card(d / "art.jpg", d / "end.png")
        self.assertEqual(Image.open(d / "end.png").size, SIZE)

    def test_kenburns_filter(self):
        f_in = kenburns_filter(90, zoom_in=True)
        f_out = kenburns_filter(90, zoom_in=False)
        self.assertIn("d=90", f_in)
        self.assertIn("s=1920x1080", f_in)
        self.assertIn("1+0.08*on/90", f_in)
        self.assertIn("1.08-0.08*on/90", f_out)


if __name__ == "__main__":
    unittest.main()
