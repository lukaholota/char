import json
import tempfile
import unittest
from pathlib import Path

import audit_links


def build_document(article_id, nodes):
    article = {"articleId": article_id, "ruleset": "RULES_2014"}
    block = {"blockId": "block-1", "type": "paragraph", "content": nodes}
    return {"article": article, "translations": [{"sections": [{"sectionId": "section-1", "blocks": [block]}]}]}


def link(text, href):
    return {"type": "link", "text": text, "href": href}


class ClassifyLinkTest(unittest.TestCase):
    def test_links_are_grouped_by_what_could_replace_them(self):
        expected = {
            "https://rpgbot.net/dnd5/abbreviations/#PHB": "book-tag",
            "https://rpgbot.net/dnd5/characters/classes/monk/": "rpgbot-article",
            "https://www.dndbeyond.com/spells/2161-jump": "dndbeyond-spell",
            "https://dndbeyond.com/feats/athlete": "dndbeyond-feat",
            "https://www.dndbeyond.com/sources/dnd/phb-2014/adventuring#Jumping": "dndbeyond-rules",
            "https://www.dndbeyond.com/changelog#2024CoreRulesErrata": "dndbeyond-changelog",
            "https://www.youtube.com/watch?v=x": "external-no-counterpart",
            "https://example.com/": "external-other",
            "/rules/combat": "local",
        }
        for href, kind in expected.items():
            self.assertEqual(audit_links.classify_link(href), kind, href)


class CollectLinksTest(unittest.TestCase):
    def test_links_are_found_in_paragraphs_lists_and_tables(self):
        with tempfile.TemporaryDirectory() as directory:
            document = build_document("rpgbot-a", [{"type": "text", "text": "x"}, link("PHB", "https://rpgbot.net/dnd5/abbreviations/")])
            blocks = document["translations"][0]["sections"][0]["blocks"]
            blocks.append({"blockId": "b2", "type": "list", "ordered": False, "items": [[link("Jump", "https://dndbeyond.com/spells/jump")]]})
            blocks.append({"blockId": "b3", "type": "table", "headers": [[{"type": "text", "text": "h"}]],
                           "rows": [[[link("Monk", "https://rpgbot.net/dnd5/characters/classes/monk/")]]]})
            (Path(directory) / "rpgbot-a.json").write_text(json.dumps(document), encoding="utf-8")
            links = audit_links.collect_links(directory)
        self.assertEqual([entry["text"] for entry in links], ["PHB", "Jump", "Monk"])

    def test_rpgbot_targets_are_split_into_translated_queued_and_outside(self):
        rows = [
            {"canonicalUrl": "https://rpgbot.net/dnd5/characters/classes/monk/", "articleIds": ["rpgbot-monk-2014"], "materialType": "class"},
            {"canonicalUrl": "https://rpgbot.net/dnd5/characters/grapple/", "articleIds": [], "materialType": "practical-guide"},
        ]
        links = [{"href": "https://rpgbot.net/dnd5/characters/classes/monk"}, {"href": "https://rpgbot.net/dnd5/characters/grapple/"},
                 {"href": "https://rpgbot.net/dnd5/characters/grapple/#x"}, {"href": "https://rpgbot.net/dnd5/characters/unknown/"},
                 {"href": "https://rpgbot.net/dnd5/abbreviations/"}]
        counts, queue, outside = audit_links.count_rpgbot_targets(links, rows)
        self.assertEqual(dict(counts), {"has-draft": 1, "in-corpus-not-translated": 2, "outside-corpus": 1})
        self.assertEqual(queue[("practical-guide", "https://rpgbot.net/dnd5/characters/grapple/")], 2)
        self.assertEqual(list(outside), ["rpgbot.net/dnd5/characters/unknown"])


if __name__ == "__main__":
    unittest.main()
