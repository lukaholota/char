import importlib.util
import json
import re
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("compile_champion_2024_pilot", HERE / "compile-champion-2024-pilot.py")
compiler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(compiler)
ROOT = HERE.parents[1]
STAGE = json.loads((ROOT / "data/rpgbot/staging/rpgbot-ec7af736a93c9ec0-8f6b96b373215685.json").read_text())
SHEET = (ROOT / "data/rpgbot/authoring/champion-2024.md").read_text()


class Champion2024CompilerTest(unittest.TestCase):
    def test_real_article_keeps_links_tables_and_separate_ability_sections(self):
        document, review, metrics = compiler.compile_document(STAGE, SHEET)
        self.assertEqual(metrics, {"sections": 19, "fragments": 172, "links": 29,
                                   "ratings": 13, "issueDecisions": 20})
        self.assertEqual(document["article"]["ruleset"], "RULES_2024")
        self.assertEqual(compiler.all_links(document["translations"][0]["sections"]),
                         compiler.all_links(STAGE["sections"]))
        self.assertEqual(sum(block["type"] == "table" for section in document["translations"][0]["sections"]
                             for block in section["blocks"]), 3)
        source_numbers = [(block["blockId"], row_index, cell_index, compiler.BASE.inline_text(cell))
                          for section in STAGE["sections"] for block in section["blocks"]
                          if block["type"] == "table" for row_index, row in enumerate(block["rows"])
                          for cell_index, cell in enumerate(row)
                          if re.fullmatch(r"[0-9]+", compiler.BASE.inline_text(cell))]
        translated_numbers = [(block["blockId"], row_index, cell_index, compiler.BASE.inline_text(cell))
                              for section in document["translations"][0]["sections"]
                              for block in section["blocks"] if block["type"] == "table"
                              for row_index, row in enumerate(block["rows"])
                              for cell_index, cell in enumerate(row)
                              if re.fullmatch(r"[0-9]+", compiler.BASE.inline_text(cell))]
        self.assertEqual(source_numbers, translated_numbers)
        self.assertEqual({section["sectionId"] for section in document["translations"][0]["sections"]
                          if section["sectionId"].startswith("section-ability-scores")},
                         {"section-ability-scores", "section-ability-scores-2"})
        self.assertEqual({item["score"] for item in document["ratings"]}, {1, 2, 3, 4})
        self.assertIn(47, {decision["issueIndex"] for decision in review["issueDecisions"]})

    def test_changed_rating_or_link_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Changed source kind or rating"):
            compiler.compile_document(STAGE, SHEET.replace(
                "block-section-features-1/item/0 · пункт · rating-blue",
                "block-section-features-1/item/0 · пункт · rating-red", 1))
        with self.assertRaisesRegex(ValueError, "Missing or ambiguous translated link"):
            compiler.compile_document(STAGE, SHEET.replace(
                "наш гайд із підкласу Чемпіона 2014", "наш огляд підкласу Чемпіона 2014", 1))


if __name__ == "__main__":
    unittest.main()
