import copy
import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("prepare_fighter_pilot", HERE / "prepare-fighter-pilot.py")
pilot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pilot)
STAGE = json.loads((HERE.parents[1] / "data/rpgbot/staging/rpgbot-2c6409607d154834-653485f2ad5270a8.json").read_text())


class FighterWorksheetTest(unittest.TestCase):
    def test_real_source_accounts_for_every_color_signal(self):
        mapped = pilot.rating_map(STAGE)
        self.assertEqual(len(mapped), 233)
        self.assertEqual(sum(len(value["issueIndices"]) for value in mapped.values()), 235)
        self.assertEqual(mapped["block-section-ability-scores-2"]["sourceClass"], "rating-blue+red")
        self.assertEqual(mapped["block-section-ability-scores-3"]["sourceClass"], "rating-red+blue")
        self.assertEqual(mapped["block-section-magic-items-uncommon-1/item/7"]["sourceClass"], "rating-none")
        self.assertIsNone(mapped["block-section-magic-items-uncommon-1/item/7"]["sourceColor"])
        sheet, _ = pilot.PREPARE.render(STAGE, mapped)
        self.assertIn("block-section-ability-scores-2 · абзац · rating-blue+red", sheet)
        self.assertNotIn("block-section-abilities-2/header/0 ·", sheet)
        self.assertEqual(sheet.count("\n### "), 436)
        self.assertEqual(sheet.count("**Українською:**"), sheet.count("\n### "))

    def test_shifted_source_signal_is_rejected(self):
        stage = copy.deepcopy(STAGE)
        stage["issues"][233]["detail"] = "rating-green Unexpected"
        with self.assertRaisesRegex(ValueError, "Changed inline color word"):
            pilot.rating_map(stage)


if __name__ == "__main__":
    unittest.main()
