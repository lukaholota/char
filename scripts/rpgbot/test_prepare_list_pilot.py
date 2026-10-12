import importlib.util
import json
import unittest
from pathlib import Path


MODULE = Path(__file__).with_name("prepare-list-pilot.py")
SPEC = importlib.util.spec_from_file_location("prepare_list_pilot", MODULE)
pilot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pilot)
COMPILER_SPEC = importlib.util.spec_from_file_location("compile_list_pilot", MODULE.with_name("compile-list-pilot.py"))
compiler = importlib.util.module_from_spec(COMPILER_SPEC)
COMPILER_SPEC.loader.exec_module(compiler)


def stage_with_ratings(second_label="Iron Bands"):
    labels = ["Red", "Orange", "Green", "Blue", "Alchemy Jug", second_label]
    colors = ["red", "orange", "green", "blue", "green", "bluee"]
    return {
        "sourceRevision": {"revisionId": "fixture-revision", "title": "Fixture guide"},
        "issues": [{"code": "rating-signal-review", "detail": f"rating-{color} {label}"}
                   for color, label in zip(colors, labels)],
        "sections": [{"sectionId": "section-options", "heading": "Options", "blocks": [{
            "blockId": "block-options", "type": "list", "items": [
                [{"type": "text", "text": "Alchemy Jug"}, {"type": "text", "text": ": Great."}],
                [{"type": "strong", "text": "See below"}],
                [{"type": "text", "text": "Iron Bands"}, {"type": "text", "text": ": Situational."}],
            ],
        }]}],
    }


class PilotWorksheetTest(unittest.TestCase):
    def test_preserves_unknown_color_and_unrated_item(self):
        stage = stage_with_ratings()
        ratings = pilot.list_rating_map(stage)
        self.assertEqual(ratings["block-options/item/0"]["sourceColor"], "green")
        self.assertIsNone(ratings["block-options/item/1"])
        self.assertEqual(ratings["block-options/item/2"]["sourceClass"], "rating-bluee")
        self.assertIsNone(ratings["block-options/item/2"]["sourceColor"])
        sheet, _ = pilot.render(stage)
        self.assertIn("block-options/item/2 · rating-bluee", sheet)
        self.assertIn("block-options/item/1 · без оцінки", sheet)

    def test_rejects_shifted_rating(self):
        with self.assertRaisesRegex(ValueError, "Unmatched item or shifted rating"):
            pilot.list_rating_map(stage_with_ratings("Wrong item"))

    def test_real_pilot_preserves_links_and_unknown_score(self):
        root = MODULE.parents[2]
        stage = json.loads((root / "data/rpgbot/staging/rpgbot-04d290c759f47c8b-e5aead1169614d96.json").read_text())
        sheet = (root / "data/rpgbot/authoring/replicate-magic-item-2024.md").read_text()
        document, review, metrics = compiler.compile_document(stage, sheet)
        self.assertEqual(metrics, {"sections": 17, "rows": 176, "links": 149,
                                   "ratings": 131, "unknownColors": 1, "issueDecisions": 271,
                                   "unresolvedRatingIssues": 1})
        self.assertEqual(document["article"]["status"], "unpublished")
        self.assertEqual(document["translations"][0]["status"], "draft")
        unknown = [rating for rating in document["ratings"] if "score" not in rating]
        self.assertEqual([rating["context"] for rating in unknown], ["Залізні пути Біларо"])
        self.assertEqual(review["reviewedAt"], "2026-09-30T20:29:39Z")
        self.assertNotIn(125, [decision["issueIndex"] for decision in review["issueDecisions"]])
        with self.assertRaisesRegex(ValueError, "Missing or ambiguous source abbreviation"):
            compiler.compile_document(stage, sheet.replace(
                "Зброя +2{{Weapon, +2}} (DMG)", "Зброя +2{{Weapon, +2}} (DMX)", 1))


if __name__ == "__main__":
    unittest.main()
