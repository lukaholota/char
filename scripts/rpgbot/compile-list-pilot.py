#!/usr/bin/env python3
"""Compile the Replicate Magic Item pilot worksheet into an unpublished article.

The source HTML and staging extraction remain immutable. --apply only creates
previously absent article/review files, protecting hand-edited translations.
"""

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

from importlib.util import module_from_spec, spec_from_file_location


HERE = Path(__file__).resolve().parent
SPEC = spec_from_file_location("prepare_list_pilot", HERE / "prepare-list-pilot.py")
PREPARE = module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)

ARTICLE_ID = "rpgbot-replicate-magic-item-2024"
TRANSLATION_ID = "translation-rpgbot-replicate-magic-item-2024-draft1"
CUSTOM_LINK_LABELS = {
    "block-section-introduction-2": ["Вливання"],
    "block-section-introduction-3": ["гайд із Вливань Винахідника"],
    "block-section-disclaimer-3": ["стан оптимізації персонажів D&D 2024", "виправлення правил"],
    "block-section-level-10-magic-item-plans-1": ["правила Бастіонів"],
    "block-section-uncommon-wondrous-items-1": ["дивовижних предметів"],
}
SCORE = {"red": 1, "orange": 2, "green": 3, "blue": 4}


def parse_worksheet(content):
    title = content.splitlines()[0].removeprefix("# ").strip()
    if not title or title == content.splitlines()[0]:
        raise ValueError("Missing Ukrainian article title")
    headings = {}
    for match in re.finditer(r"^<!-- sectionId: ([^ ]+) -->\n\n\*\*Український заголовок:\*\*\n([^\n]+)", content, re.M):
        section_id, heading = match.groups()
        if section_id in headings:
            raise ValueError(f"Duplicate section: {section_id}")
        headings[section_id] = heading.strip()
    rows = {}
    for match in re.finditer(r"^### ([^\n]+) · [^\n]+\n(.*?)(?=^### |^## |\Z)", content, re.M | re.S):
        key, body = match.groups()
        if key in rows:
            raise ValueError(f"Duplicate worksheet key: {key}")
        answer = re.search(r"\*\*Українською:\*\*\n(.*)$", body, re.S)
        if not answer or not answer.group(1).strip():
            raise ValueError(f"Untranslated worksheet key: {key}")
        rows[key] = answer.group(1).strip()
    return title, headings, rows


def read_rating_context(value):
    paired_label = re.match(r"\{\{([^{}|]+)\|[^{}|]+\}\}", value)
    return paired_label.group(1) if paired_label else value.split("{{", 1)[0].strip()


def inline_nodes(text, source_nodes, row_key):
    source_links = [node for node in source_nodes if node["type"] == "link"]
    if not source_links:
        return [{"type": "text", "text": text}]
    if row_key.startswith("block-section-2-1/item/"):
        if len(source_links) != 1:
            raise ValueError(f"Unexpected TOC links: {row_key}")
        return [{"type": "link", "text": text, "href": source_links[0]["href"]}]
    if "/item/" in row_key:
        if len(source_links) != 1:
            raise ValueError(f"Unexpected list links: {row_key}")
        label = source_links[0]["text"]
        needle = f"({label})"
        if text.count(needle) != 1:
            raise ValueError(f"Missing or ambiguous source abbreviation in {row_key}: {label}")
        before, after = text.split(needle)
        return ([{"type": "text", "text": before}] if before else []) + [
            {"type": "superscript", "text": "("},
            {"type": "link", "text": label, "href": source_links[0]["href"]},
            {"type": "superscript", "text": ")"},
        ] + ([{"type": "text", "text": after}] if after else [])
    labels = CUSTOM_LINK_LABELS.get(row_key)
    if not labels or len(labels) != len(source_links):
        raise ValueError(f"No explicit translated link labels for {row_key}")
    result = []
    remaining = text
    for label, source_link in zip(labels, source_links):
        if remaining.count(label) != 1:
            raise ValueError(f"Missing or ambiguous translated link in {row_key}: {label}")
        before, remaining = remaining.split(label, 1)
        if before:
            result.append({"type": "text", "text": before})
        result.append({"type": "link", "text": label, "href": source_link["href"]})
    if remaining:
        result.append({"type": "text", "text": remaining})
    return result


def compile_document(stage, sheet):
    title, headings, rows = parse_worksheet(sheet)
    if f"<!-- sourceRevisionId: {stage['sourceRevision']['revisionId']} -->" not in sheet:
        raise ValueError("Worksheet source revision differs from staging")
    reviewed_at = re.search(r"^<!-- issueReviewedAt: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) -->$", sheet, re.M)
    if not reviewed_at:
        raise ValueError("Missing technical issue review timestamp")
    rating_map = PREPARE.list_rating_map(stage)
    remaining_rows = set(rows)
    remaining_headings = set(headings)
    sections = []
    ratings = []
    rating_issues = {}
    for source_section in stage["sections"]:
        section = copy.deepcopy(source_section)
        section_id = section["sectionId"]
        if section_id not in remaining_headings:
            raise ValueError(f"Missing translated section: {section_id}")
        remaining_headings.remove(section_id)
        section["heading"] = headings[section_id]
        for block in section["blocks"]:
            block_id = block["blockId"]
            if block["type"] == "paragraph":
                if block_id not in remaining_rows:
                    raise ValueError(f"Missing translated block: {block_id}")
                remaining_rows.remove(block_id)
                block["content"] = inline_nodes(rows[block_id], block["content"], block_id)
            elif block["type"] == "list":
                for index, source_item in enumerate(block["items"]):
                    key = f"{block_id}/item/{index}"
                    if key not in remaining_rows:
                        raise ValueError(f"Missing translated list item: {key}")
                    remaining_rows.remove(key)
                    block["items"][index] = inline_nodes(rows[key], source_item, key)
                    signal = rating_map.get(key)
                    if signal is None:
                        continue
                    rating_id = f"rating-replicate-magic-item-2024-{len(ratings) + 1:03d}"
                    context = read_rating_context(rows[key])
                    rating = {"ratingId": rating_id, "articleId": ARTICLE_ID,
                              "translationRevisionId": TRANSLATION_ID, "sectionId": section_id,
                              "targetBlockId": block_id, "optionId": f"{section_id}-item-{index}",
                              "context": context, "explanationBlockId": block_id}
                    if signal["sourceColor"] is not None:
                        rating["sourceColor"] = signal["sourceColor"]
                        rating["score"] = SCORE[signal["sourceColor"]]
                    ratings.append(rating)
                    rating_issues[signal["issueIndex"]] = rating_id
            else:
                raise ValueError(f"Unsupported pilot block: {block['type']}")
        sections.append(section)
    if remaining_rows or remaining_headings:
        raise ValueError(f"Worksheet has extra rows/sections: {sorted(remaining_rows)}, {sorted(remaining_headings)}")
    source_links = [node["href"] for section in stage["sections"] for block in section["blocks"]
                    for item in block.get("items", [block.get("content", [])]) for node in item if node["type"] == "link"]
    translated_links = [node["href"] for section in sections for block in section["blocks"]
                        for item in block.get("items", [block.get("content", [])]) for node in item if node["type"] == "link"]
    if translated_links != source_links:
        raise ValueError("Translated link targets or order differ from staging")
    revision = stage["sourceRevision"]
    document = {"sources": [{"sourceId": revision["sourceId"], "rulesets": ["RULES_2024"]}],
                "sourceRevisions": [revision],
                "article": {"articleId": ARTICLE_ID, "sourceId": revision["sourceId"],
                            "slug": "replicate-magic-item-2024", "ruleset": "RULES_2024",
                            "titleUk": title, "titleEn": revision["title"],
                            "topics": ["Винахідник", "магічні предмети", "репліка"], "status": "unpublished"},
                "translations": [{"translationRevisionId": TRANSLATION_ID, "articleId": ARTICLE_ID,
                                  "sourceRevisionId": revision["revisionId"], "status": "draft", "sections": sections}],
                "ratings": ratings}
    decisions = []
    for index, issue in enumerate(stage["issues"]):
        code = issue["code"]
        if code == "provisional-id":
            continue
        if code == "rating-signal-review":
            if index in rating_issues:
                rating = next(item for item in ratings if item["ratingId"] == rating_issues[index])
                if "sourceColor" not in rating:
                    continue  # Keep malformed source color unresolved for editorial review.
                decision = {"issueIndex": index, "disposition": "preserved",
                            "evidence": "Matched the source list item in order; unusual source class remains an editorial issue",
                            "ratingIds": [rating_issues[index]]}
            elif index < 4:
                decision = {"issueIndex": index, "disposition": "excluded-noncontent",
                            "evidence": "Color legend, not an item recommendation"}
            else:
                raise ValueError(f"Unmatched source rating issue: {index}")
        elif code == "nested-markup-review":
            decision = {"issueIndex": index, "disposition": "preserved",
                        "evidence": "Source abbreviation link retained with superscript delimiters in translated item"}
        elif code == "list-paragraphs-review":
            decision = {"issueIndex": index, "disposition": "preserved",
                        "evidence": "Source item's additional paragraphs checked and retained in worksheet translation"}
        elif code == "unsupported-block":
            decision = {"issueIndex": index, "disposition": "excluded-noncontent",
                        "evidence": "Decorative article splash image, no analytical prose"}
        else:
            raise ValueError(f"Unreviewed source issue code: {code}")
        decisions.append(decision)
    review = {"sourceRevisionId": revision["revisionId"], "reviewedAt": reviewed_at.group(1),
              "issueDecisions": decisions}
    return document, review, {"sections": len(sections), "rows": len(rows), "links": len(source_links),
                              "ratings": len(ratings), "unknownColors": sum("sourceColor" not in item for item in ratings),
                              "issueDecisions": len(decisions), "unresolvedRatingIssues":
                              len(rating_issues) - sum(item["issueIndex"] in rating_issues for item in decisions)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("worksheet", type=Path)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--apply", action="store_true", help="create output files; never overwrite existing drafts")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    document, review, metrics = compile_document(stage, args.worksheet.read_text())
    files = [(args.directory / "uk" / f"{ARTICLE_ID}.json", document),
             (args.directory / "reviews" / f"{stage['sourceRevision']['revisionId']}.json", review)]
    for path, payload in files:
        encoded = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode()
        print(json.dumps({**metrics, "output": str(path), "sha256": hashlib.sha256(encoded).hexdigest(),
                          "exists": path.exists()}, ensure_ascii=False))
        if args.apply:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as handle:
                handle.write(encoded)


if __name__ == "__main__":
    main()
