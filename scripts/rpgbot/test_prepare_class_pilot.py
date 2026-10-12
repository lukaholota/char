import importlib.util
import json
import unittest
from pathlib import Path


MODULE = Path(__file__).with_name("prepare-class-pilot.py")
SPEC = importlib.util.spec_from_file_location("prepare_class_pilot", MODULE)
pilot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pilot)


class ClassPilotWorksheetTest(unittest.TestCase):
    def test_real_sorcerer_stage_maps_every_signal_and_table_cell(self):
        root = MODULE.parents[2]
        stage = json.loads((root / "data/rpgbot/staging/rpgbot-533a8b744683d82c-0692270048c052bf.json").read_text())
        sheet, ratings = pilot.render(stage)
        self.assertEqual(len(ratings), 244)
        self.assertTrue(all(rating["sourceColor"] for rating in ratings.values()))
        self.assertIn("### block-section-ability-scores-8/row/0/1 · комірка таблиці · без оцінки\n\n> 8\n\n**Українською:**\n8", sheet)
        self.assertIn("### block-section-class-features-1 · абзац · rating-red", sheet)
        self.assertEqual(sheet.count("**Український заголовок:**"), 19)

    def test_rejects_shifted_rating_signal(self):
        root = MODULE.parents[2]
        stage = json.loads((root / "data/rpgbot/staging/rpgbot-533a8b744683d82c-0692270048c052bf.json").read_text())
        first = next(issue for issue in stage["issues"] if issue["detail"] == "rating-red Hit Points")
        first["detail"] = "rating-red Wrong Feature"
        with self.assertRaisesRegex(ValueError, "Unmatched rating signals"):
            pilot.rating_map(stage)


if __name__ == "__main__":
    unittest.main()
