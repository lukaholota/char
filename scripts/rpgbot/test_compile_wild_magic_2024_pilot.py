import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("compile_wild_magic_2024_pilot", HERE / "compile-wild-magic-2024-pilot.py")
compiler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(compiler)
ROOT = HERE.parents[1]
STAGE = json.loads((ROOT / "data/rpgbot/staging/rpgbot-de91ea2e4bfde5b1-83f90d1641a0ab12.json").read_text())
SHEET = (ROOT / "data/rpgbot/authoring/wild-magic-2024.md").read_text()


class WildMagicCompilerTest(unittest.TestCase):
    def test_real_article_keeps_links_ratings_and_disambiguated_sections(self):
        document, review, metrics = compiler.compile_document(STAGE, SHEET)
        self.assertEqual(metrics, {"sections": 18, "fragments": 143, "links": 34,
                                   "ratings": 5, "issueDecisions": 13})
        self.assertEqual(document["article"]["ruleset"], "RULES_2024")
        self.assertEqual(compiler.all_links(document["translations"][0]["sections"]),
                         compiler.all_links(STAGE["sections"]))
        self.assertEqual({rating["targetBlockId"] for rating in document["ratings"]},
                         {"block-section-features-1"})
        self.assertEqual({item["issueIndex"] for item in review["issueDecisions"]
                          if item["disposition"] == "preserved" and "ratingIds" in item},
                         {5, 6, 7, 8, 9})
        sections = {section["sectionId"] for section in document["translations"][0]["sections"]}
        self.assertTrue({"section-ability-scores", "section-ability-scores-2",
                         "section-species", "section-species-2"} <= sections)

    def test_rating_on_toc_or_changed_link_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Changed source kind or rating"):
            compiler.compile_document(STAGE, SHEET.replace(
                "block-section-2-1/item/2 · пункт · без оцінки",
                "block-section-2-1/item/2 · пункт · rating-orange", 1))
        with self.assertRaisesRegex(ValueError, "Missing or ambiguous translated link"):
            compiler.compile_document(STAGE, SHEET.replace(
                "наш гайд із підкласу Чародія Дикої Магії 2014",
                "наш огляд підкласу Чародія Дикої Магії 2014", 1))


if __name__ == "__main__":
    unittest.main()
