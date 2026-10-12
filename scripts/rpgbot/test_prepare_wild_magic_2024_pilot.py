import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("prepare_wild_magic_2024_pilot", HERE / "prepare-wild-magic-2024-pilot.py")
prepare = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(prepare)
ROOT = HERE.parents[1]
STAGE = json.loads((ROOT / "data/rpgbot/staging/rpgbot-de91ea2e4bfde5b1-83f90d1641a0ab12.json").read_text())


class WildMagicExporterTest(unittest.TestCase):
    def test_toc_title_does_not_consume_wild_magic_rating(self):
        mapped = prepare.rating_map(STAGE)
        self.assertEqual(set(mapped), {f"block-section-features-1/item/{index}" for index in range(5)})
        self.assertEqual(mapped["block-section-features-1/item/0"]["sourceClass"], "rating-orange")
        content, _ = prepare.PREPARE.render(STAGE, mapped)
        self.assertIn("block-section-2-1/item/2 · пункт · без оцінки", content)
        self.assertIn("block-section-features-1/item/0 · пункт · rating-orange", content)


if __name__ == "__main__":
    unittest.main()
