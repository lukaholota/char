import json
import re
import unittest
from functools import lru_cache
from pathlib import Path

import lxml.etree
import lxml.html


RPG = Path(__file__).resolve().parents[2] / "data/rpgbot"
COLOR_SCORES = {"red": 1, "orange": 2, "green": 3, "blue": 4}
COLOR_CLASS = re.compile(r"(?:^|\s)rating-(red|orange|green|blue)(?:\s|$)")
SIGNAL_CLASS = re.compile(r"(^|[\s_-])(red|orange|green|blue|rating)([\s_-]|$)", re.I)
INLINE_COLOR_STYLE = re.compile(r"(^|;)\s*color\s*:", re.I)
BLOCK_TAGS = {"li", "p", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "dt", "dd", "blockquote", "figcaption"}
IGNORED_TAGS = ("nav", "aside", "footer", "script", "style", "form", "iframe")
IGNORED_CLASSES = ("comments", "advertisement", "ads", "newsletter", "sharedaddy", "social-share", "pagination")
SPLIT_SEPARATORS = ("", "/", "&", "-", "–", "—")
ORPHAN_ITEM_LOCATION = re.compile(r"(^|/)li\[\d+\]$")
PILOT_FORMAT_REASON = "pilot-format 2024 article without a rating legend; plan_ratings cannot run on it"
STALE_REVIEW_REASON = "its review indexes issues past the end of the staged source; recompile it before sweeping"
STALE_REVIEW_ARTICLES = {"rpgbot-hobgoblin-2014"}
PILOT_FORMAT_ARTICLES = {
    "rpgbot-aberrant-anatomy-2024", "rpgbot-bloodlust-2024", "rpgbot-bomber-2024", "rpgbot-cloying-mists-2024",
    "rpgbot-delicious-pain-2024", "rpgbot-echoing-soul-2024", "rpgbot-fairy-trickster-2024",
    "rpgbot-gathered-whispers-2024", "rpgbot-genie-magic-2024", "rpgbot-light-bringer-2024",
    "rpgbot-living-shadow-2024", "rpgbot-love-bites-2024", "rpgbot-mist-walker-2024",
    "rpgbot-orders-resilience-2024", "rpgbot-putrefy-2024", "rpgbot-reborn-2024", "rpgbot-rebuke-2024",
    "rpgbot-second-skin-2024", "rpgbot-spellfire-spark-2024", "rpgbot-street-justice-2024",
    "rpgbot-symbiotic-being-2024", "rpgbot-tireless-reveler-2024", "rpgbot-touch-of-death-2024",
    "rpgbot-treacherous-allure-2024", "rpgbot-tyro-of-the-gauntlet-2024", "rpgbot-vampires-plaything-2024",
}


def collapse_whitespace(value):
    return re.sub(r"\s+", " ", value or "").strip()


@lru_cache(maxsize=None)
def load_articles_by_revision():
    articles = {}
    for path in sorted((RPG / "uk").glob("*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        for revision in document["sourceRevisions"]:
            articles[revision["revisionId"]] = document
    return articles


@lru_cache(maxsize=None)
def load_correction_index():
    return json.loads((RPG / "staging-corrections/index.json").read_text(encoding="utf-8"))


def load_stage(revision_id):
    index = load_correction_index()
    path = RPG / "staging-corrections" / index[revision_id] if revision_id in index else RPG / "staging" / f"{revision_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def load_review(revision_id):
    return json.loads((RPG / "reviews" / f"{revision_id}.json").read_text(encoding="utf-8"))


def map_rating_ids_by_issue(review):
    return {decision["issueIndex"]: decision.get("ratingIds", []) for decision in review["issueDecisions"]}


def find_content_root(tree):
    found = tree.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' entry-content ')]")
    return found[0] if len(found) == 1 else None


def strip_ignored_nodes(root):
    selectors = [f".//{tag}" for tag in IGNORED_TAGS]
    selectors += [f".//*[contains(concat(' ', normalize-space(@class), ' '), ' {name} ')]" for name in IGNORED_CLASSES]
    selectors += [".//*[@aria-hidden='true'] | .//*[@id='comments']"]
    for selector in selectors:
        for node in root.xpath(selector):
            node.drop_tree()


def is_rating_signal(element):
    if not INLINE_COLOR_STYLE.search(element.get("style") or "") and not SIGNAL_CLASS.search(element.get("class") or ""):
        return False
    return bool(collapse_whitespace(element.text_content()))


def find_enclosing_block(element):
    node = element.getparent()
    while node is not None and node.tag not in BLOCK_TAGS:
        node = node.getparent()
    return node


def collect_text_between(block, first, second):
    collecting, parts = False, []
    for event, node in lxml.etree.iterwalk(block, events=("start", "end")):
        if node is first and event == "end":
            collecting = True
            parts.append(node.tail or "")
        elif node is second and event == "start":
            break
        elif collecting:
            parts.append((node.text if event == "start" else node.tail) or "")
    return collapse_whitespace("".join(parts))


def find_color(element):
    match = COLOR_CLASS.search(element.get("class") or "")
    return match.group(1) if match else None


def list_source_signals(html_path):
    root = find_content_root(lxml.html.fromstring(html_path.read_bytes()))
    if root is None:
        return []
    strip_ignored_nodes(root)
    return [node for node in root.iter() if isinstance(node.tag, str) and is_rating_signal(node)]


def find_two_colour_pairs(signals):
    by_block = {}
    for position, node in enumerate(signals):
        block = find_enclosing_block(node)
        if find_color(node) and block is not None:
            by_block.setdefault(block, []).append((position, node))
    pairs = []
    for block, nodes in by_block.items():
        for (first_position, first), (_, second) in zip(nodes, nodes[1:]):
            colors = (find_color(first), find_color(second))
            if colors[0] != colors[1] and collect_text_between(block, first, second) in SPLIT_SEPARATORS:
                pairs.append((first_position, colors, collapse_whitespace(first.text_content() + second.text_content())))
    return pairs


def find_split_rating_problem(rating, colors):
    if rating is None:
        return "no compiled rating for the first span"
    alternative = rating.get("alternative") or {}
    expected = (colors[0], COLOR_SCORES[colors[0]], colors[1], COLOR_SCORES[colors[1]])
    actual = (rating.get("sourceColor"), rating.get("score"), alternative.get("sourceColor"), alternative.get("score"))
    if actual != expected:
        return f"expected main/alternative {expected}, got {actual}"
    if not collapse_whitespace(alternative.get("condition")):
        return "alternative without a condition"
    return None


def collect_split_rating_failures():
    failures = []
    articles = load_articles_by_revision()
    for html_path in sorted((RPG / "source").glob("*.html")):
        document = articles.get(html_path.stem)
        signals = list_source_signals(html_path) if document else []
        pairs = find_two_colour_pairs(signals)
        if not pairs:
            continue
        stage_signals = [index for index, issue in enumerate(load_stage(html_path.stem)["issues"])
                         if issue["code"] == "rating-signal-review"]
        if len(stage_signals) != len(signals):
            failures.append((document["article"]["articleId"], html_path.stem, "source spans do not align with stage signals"))
            continue
        rating_ids_by_issue = map_rating_ids_by_issue(load_review(html_path.stem))
        ratings = {rating["ratingId"]: rating for rating in document["ratings"]}
        for position, colors, label in pairs:
            rating_ids = rating_ids_by_issue.get(stage_signals[position]) or [None]
            problem = find_split_rating_problem(ratings.get(rating_ids[0]), colors)
            if problem:
                failures.append((document["article"]["articleId"], label, problem))
    return failures


def list_orphan_item_blocks(stage):
    return {issue["detail"].strip() for issue in stage["issues"]
            if issue["code"] == "provisional-id" and ORPHAN_ITEM_LOCATION.search(issue.get("location", ""))}


def collect_list_item_texts(stage, orphan_blocks):
    texts = []
    for section in stage["sections"]:
        for block in section["blocks"]:
            if block["type"] == "list":
                texts += [plain_text(nodes) for nodes in block["items"]]
            elif block["type"] == "paragraph" and block["blockId"] in orphan_blocks:
                texts.append(plain_text(block["content"]))
    return texts


def plain_text(nodes):
    return collapse_whitespace("".join(node["text"] for node in nodes))


def map_block_types(stage):
    return {block["blockId"]: block["type"] for section in stage["sections"] for block in section["blocks"]}


def is_list_item_target(rating, block_types, orphan_blocks):
    return block_types.get(rating["targetBlockId"]) == "list" or rating["targetBlockId"] in orphan_blocks


def find_signal_label(issue):
    return collapse_whitespace(issue["detail"]).split(" ", 1)[-1]


def has_list_item_for_label(item_texts, label):
    return any(text.startswith(label) for text in item_texts)


def collect_list_item_rating_failures(document):
    revision_id = document["sourceRevisions"][0]["revisionId"]
    stage = load_stage(revision_id)
    orphan_blocks = list_orphan_item_blocks(stage)
    block_types, item_texts = map_block_types(stage), collect_list_item_texts(stage, orphan_blocks)
    ratings = {rating["ratingId"]: rating for rating in document["ratings"]}
    failures = []
    for issue_index, rating_ids in map_rating_ids_by_issue(load_review(revision_id)).items():
        issue = stage["issues"][issue_index]
        if issue["code"] != "rating-signal-review" or not issue.get("location", "").startswith("li/"):
            continue
        for rating in (ratings[rating_id] for rating_id in rating_ids):
            if (not is_list_item_target(rating, block_types, orphan_blocks)
                    and has_list_item_for_label(item_texts, find_signal_label(issue))):
                failures.append((rating["ratingId"], issue["detail"], rating["targetBlockId"]))
    return failures


class TwoColourRatingCorpusTest(unittest.TestCase):
    def test_every_name_rated_in_two_colours_keeps_the_second_colour_as_an_alternative(self):
        for article_id, label, problem in collect_split_rating_failures():
            with self.subTest(article=article_id, label=label):
                self.fail(problem)


class ListItemRatingCorpusTest(unittest.TestCase):
    def test_every_rating_from_a_list_item_targets_a_list_item(self):
        for document in load_articles_by_revision().values():
            article_id = document["article"]["articleId"]
            with self.subTest(article=article_id):
                if article_id in PILOT_FORMAT_ARTICLES:
                    self.skipTest(PILOT_FORMAT_REASON)
                if article_id in STALE_REVIEW_ARTICLES:
                    self.skipTest(STALE_REVIEW_REASON)
                for rating_id, detail, target in collect_list_item_rating_failures(document):
                    with self.subTest(rating=rating_id):
                        self.fail(f"{detail} is rated on {target}, not on its list item")

    def test_known_skips_still_exist(self):
        article_ids = {document["article"]["articleId"] for document in load_articles_by_revision().values()}
        self.assertEqual((PILOT_FORMAT_ARTICLES | STALE_REVIEW_ARTICLES) - article_ids, set())


if __name__ == "__main__":
    unittest.main()
