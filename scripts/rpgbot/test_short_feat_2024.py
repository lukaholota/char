import copy
import importlib.util
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("short_feat_2024", HERE / "short-feat-2024.py")
short = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(short)
ROOT = HERE.parents[1]
CASES = {
    "delicious-pain": ("rpgbot-81ad60b671b592ee-a14af4053431af29", 3, 3, 2, 0),
    "rebuke": ("rpgbot-89066c62d07b09b4-7e67d4d1f9ffff69", 3, 5, 2, 0),
    "light-bringer": ("rpgbot-32d37b91ebab4386-8bd82b9bd7030939", 5, 5, 4, 0),
    "putrefy": ("rpgbot-1d56483e3c2bf01e-3cd519e3dc09f133", 3, 4, 2, 0),
    "bomber": ("rpgbot-9c155d51ead6826d-45fb71440fa96545", 4, 4, 3, 0),
    "vampires-plaything": ("rpgbot-2a8d99546e9ae47f-011b525720c3cf68", 4, 6, 1, 0),
    "love-bites": ("rpgbot-4e42beb263dc266d-0f14682e6b770198", 3, 5, 2, 0),
    "cloying-mists": ("rpgbot-f229e5aaf0a32512-a51ae4aa78519aff", 4, 6, 2, 0),
    "treacherous-allure": ("rpgbot-749237cd52acfc9a-bfbe040d33744dd4", 4, 8, 3, 0),
    "bloodlust": ("rpgbot-96327fa371130db5-29e0c05b27ac3340", 4, 7, 3, 0),
    "symbiotic-being": ("rpgbot-8932a836e36feadc-31c295a5e346d79a", 6, 11, 3, 0),
    "orders-resilience": ("rpgbot-d889e18c07443da4-c4ce04aa509623e2", 4, 4, 3, 1),
    "tyro-of-the-gauntlet": ("rpgbot-464c3a5730d2f3ad-fdcef78a68be48bc", 3, 4, 2, 1),
    "touch-of-death": ("rpgbot-d372ef9d9fbfdb44-d6486414ac64fb78", 3, 3, 2, 1),
    "genie-magic": ("rpgbot-1ec82e4e6ca1386d-f51ba650f0e487fc", 3, 5, 2, 1),
    "tireless-reveler": ("rpgbot-98196fbc8b0859f6-d70f3a44e6a919fd", 2, 4, 1, 1),
    "fairy-trickster": ("rpgbot-e989b7de0b868239-df75d3dc88a7ec03", 4, 5, 3, 1),
    "street-justice": ("rpgbot-7a872a13d415eac2-42bf5ca9b5e117db", 5, 8, 4, 1),
    "spellfire-spark": ("rpgbot-0f50ac05f1284d7b-b16c6efbcc9aca42", 3, 7, 2, 1),
    "second-skin": ("rpgbot-5d3293394e65792b-da255fcf1eccda34", 4, 8, 2, 1),
    "mist-walker": ("rpgbot-8dd468140bbd206a-4e24bef139d9be03", 5, 8, 2, 1),
    "living-shadow": ("rpgbot-f1fda13ee33735bb-4cc1d13501110067", 5, 10, 3, 1),
    "aberrant-anatomy": ("rpgbot-4f4be0ef312e484a-3908399c4400da5d", 5, 9, 3, 1),
    "echoing-soul": ("rpgbot-37c8d24a117226f3-c4f2baa38a6d5615", 5, 9, 2, 1),
    "gathered-whispers": ("rpgbot-b58d48584c1b400e-cc3c165080b46e5a", 5, 9, 3, 1),
}


class ShortFeatTest(unittest.TestCase):
    def test_real_feats_keep_heading_ratings_and_all_prose(self):
        for slug, (revision, section_count, block_count, rating_count, splash_count) in CASES.items():
            with self.subTest(slug=slug):
                stage = json.loads((ROOT / f"data/rpgbot/staging/{revision}.json").read_text())
                sheet = (ROOT / f"data/rpgbot/authoring/{slug}-2024.md").read_text()
                document, review, metrics = short.compile_document(stage, sheet)
                self.assertEqual(metrics, {"sections": section_count, "blocks": block_count,
                                           "ratings": rating_count,
                                           "issueDecisions": rating_count + splash_count})
                self.assertEqual(document["article"]["status"], "unpublished")
                self.assertEqual(document["translations"][0]["status"], "draft")
                self.assertEqual({rating["ratingId"] for rating in document["ratings"]},
                                 {rid for decision in review["issueDecisions"]
                                  for rid in decision.get("ratingIds", [])})
                self.assertEqual({rating["targetBlockId"] for rating in document["ratings"]},
                                 {next(section["blocks"][0]["blockId"] for section in document["translations"][0]["sections"]
                                       if section["sectionId"] == rating["sectionId"])
                                  for rating in document["ratings"]})

    def test_bad_rating_missing_section_and_link_are_rejected(self):
        revision = CASES["delicious-pain"][0]
        stage = json.loads((ROOT / f"data/rpgbot/staging/{revision}.json").read_text())
        sheet = (ROOT / "data/rpgbot/authoring/delicious-pain-2024.md").read_text()
        with self.assertRaisesRegex(ValueError, "Changed heading rating"):
            short.compile_document(stage, sheet.replace("section-toughened-flesh; rating: orange",
                                                        "section-toughened-flesh; rating: blue", 1))
        with self.assertRaisesRegex(ValueError, "Missing translated section"):
            short.compile_document(stage, sheet.replace("section-toughened-flesh; rating: orange",
                                                        "section-lost; rating: orange", 1))
        linked = copy.deepcopy(stage)
        linked["sections"][0]["blocks"][0]["content"].append(
            {"type": "link", "text": "extra", "href": "https://rpgbot.net/"})
        with self.assertRaisesRegex(ValueError, "Unsupported inline markup"):
            short.rating_map(linked)

    def test_splash_image_is_excluded_but_other_unsupported_blocks_are_rejected(self):
        revision = CASES["delicious-pain"][0]
        stage = json.loads((ROOT / f"data/rpgbot/staging/{revision}.json").read_text())
        sheet = (ROOT / "data/rpgbot/authoring/delicious-pain-2024.md").read_text()
        splash = copy.deepcopy(stage)
        splash["issues"].append({"code": "unsupported-block",
                                 "detail": '<figure class="wp-block-image size-large article-splash-image"><img src="data:image/gif,GIF89a"'})
        _, review, metrics = short.compile_document(splash, sheet)
        splash_index = len(stage["issues"])
        decisions = {item["issueIndex"]: item for item in review["issueDecisions"]}
        self.assertEqual(decisions[splash_index]["disposition"], "excluded-noncontent")
        self.assertEqual(metrics["issueDecisions"], CASES["delicious-pain"][3] + 1)
        video = copy.deepcopy(stage)
        video["issues"].append({"code": "unsupported-block",
                                "detail": '<figure class="wp-block-embed is-type-video"><div class="wp-block-embed__wrapper">'})
        with self.assertRaisesRegex(ValueError, "Unsupported source issue"):
            short.rating_map(video)


if __name__ == "__main__":
    unittest.main()
