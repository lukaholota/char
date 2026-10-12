import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("compile_class_pilot", HERE / "compile-class-pilot.py")
compiler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(compiler)
ROOT = HERE.parents[1]
STAGE = json.loads((ROOT / "data/rpgbot/staging/rpgbot-533a8b744683d82c-0692270048c052bf.json").read_text())
SHEET = (ROOT / "data/rpgbot/authoring/sorcerer-2024.md").read_text()


class ClassCompilerTest(unittest.TestCase):
    def test_real_article_preserves_links_table_and_paragraph_ratings(self):
        document, review, metrics = compiler.compile_document(STAGE, SHEET)
        self.assertEqual(metrics, {"sections": 19, "fragments": 339, "links": 229,
                                   "ratings": 244, "issueDecisions": 459})
        self.assertEqual(document["article"]["status"], "unpublished")
        self.assertEqual(document["translations"][0]["status"], "draft")
        self.assertEqual(compiler.all_links(document["translations"][0]["sections"]),
                         compiler.all_links(STAGE["sections"]))
        source_table = next(block for section in STAGE["sections"] for block in section["blocks"]
                            if block["type"] == "table")
        translated_table = next(block for section in document["translations"][0]["sections"]
                                for block in section["blocks"] if block["type"] == "table")
        self.assertEqual([[compiler.PREPARE.inline_text(cell) for cell in row[1:]]
                          for row in source_table["rows"]],
                         [[compiler.PREPARE.inline_text(cell) for cell in row[1:]]
                          for row in translated_table["rows"]])
        self.assertEqual(sum("-block-" in rating["optionId"] for rating in document["ratings"]), 16)
        self.assertEqual(len([item for item in review["issueDecisions"]
                              if item["disposition"] == "preserved" and "ratingIds" in item]), 244)

    def test_changed_rating_or_link_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Changed source kind or rating"):
            compiler.compile_document(STAGE, SHEET.replace(
                "block-section-general-feats-1/item/0 · пункт · rating-red",
                "block-section-general-feats-1/item/0 · пункт · rating-blue", 1))
        with self.assertRaisesRegex(ValueError, "No translated link label|Missing or ambiguous translated link"):
            compiler.compile_document(STAGE, SHEET.replace(
                "наш класовий гайд Чародія для D&D 5e 2014",
                "наш класовий огляд Чародія для D&D 5e 2014", 1))


if __name__ == "__main__":
    unittest.main()
