import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("compile_fighter_pilot", HERE / "compile-fighter-pilot.py")
compiler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(compiler)
ROOT = HERE.parents[1]
STAGE = json.loads((ROOT / "data/rpgbot/staging/rpgbot-2c6409607d154834-653485f2ad5270a8.json").read_text())
SHEET = (ROOT / "data/rpgbot/authoring/fighter-2014.md").read_text()


class FighterCompilerTest(unittest.TestCase):
    def test_real_article_preserves_links_tables_and_unresolved_colors(self):
        document, review, metrics = compiler.compile_document(STAGE, SHEET)
        self.assertEqual(metrics, {"sections": 26, "fragments": 436, "links": 231,
                                   "ratings": 233, "issueDecisions": 419})
        self.assertEqual(document["article"]["ruleset"], "RULES_2014")
        self.assertEqual(document["article"]["status"], "unpublished")
        self.assertEqual(document["translations"][0]["status"], "draft")
        self.assertEqual(compiler.all_links(document["translations"][0]["sections"]),
                         compiler.all_links(STAGE["sections"]))
        self.assertEqual(sum("score" not in rating for rating in document["ratings"]), 3)
        decided = {decision["issueIndex"] for decision in review["issueDecisions"]}
        self.assertEqual({25, 26, 27, 28, 139} - decided, {25, 26, 27, 28, 139})
        source_levels = next(block for section in STAGE["sections"] for block in section["blocks"]
                             if block["blockId"] == "block-section-levels-1")
        translated_levels = next(block for section in document["translations"][0]["sections"]
                                 for block in section["blocks"] if block["blockId"] == "block-section-levels-1")
        self.assertEqual([compiler.BASE.inline_text(row[0]) for row in source_levels["rows"]],
                         [compiler.BASE.inline_text(row[0]) for row in translated_levels["rows"]])
        self.assertTrue(any("\n\n" in node.get("text", "")
                            for row in translated_levels["rows"] for node in row[2]))

    def test_changed_rating_and_numeric_level_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Changed source kind or rating"):
            compiler.compile_document(STAGE, SHEET.replace(
                "block-section-magic-items-legendary-1/item/0 · пункт · rating-green",
                "block-section-magic-items-legendary-1/item/0 · пункт · rating-blue", 1))
        with self.assertRaisesRegex(ValueError, "Changed numeric table cell"):
            compiler.compile_document(STAGE, SHEET.replace(
                "block-section-levels-1/row/19/0 · комірка таблиці · без оцінки\n\n> 20\n\n**Українською:**\n20",
                "block-section-levels-1/row/19/0 · комірка таблиці · без оцінки\n\n> 20\n\n**Українською:**\n19", 1))


if __name__ == "__main__":
    unittest.main()
