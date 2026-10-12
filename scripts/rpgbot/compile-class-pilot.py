#!/usr/bin/env python3
"""Compile the Sorcerer 2024 worksheet into a private unpublished draft.

Preview is read-only. --apply creates the article and technical review only when
both destinations are absent, so a subsequent run cannot replace editorial work.
"""

import argparse
import copy
import hashlib
import json
import re
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = spec_from_file_location("prepare_class_pilot", HERE / "prepare-class-pilot.py")
PREPARE = module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)

ARTICLE_ID = "rpgbot-sorcerer-2024"
TRANSLATION_ID = "translation-rpgbot-sorcerer-2024-draft1"
SCORE = {"red": 1, "orange": 2, "green": 3, "blue": 4}
TEXT_LINK_LABELS = {
    "block-section-introduction-4": ["класовий гайд Чародія для D&D 5e 2014"],
    "block-section-disclaimer-3": ["стан оптимізації персонажів D&D 2024", "виправлення правил"],
    "block-section-class-features-10": ["гайд із підкласів Чародія"],
    "block-section-2024-sorcerer-changes-from-2014-rules-1": ["гайда переходу на правила D&D 2024 року"],
    "block-section-backgrounds-2": ["гайд з адаптації походжень D&D 5e до D&D 5.5"],
    "block-section-feats-1": ["гайдах рис D&D 2024"],
    "block-section-multiclassing-1": ["практичному гайді з мультикласування"],
}


def parse_worksheet(content):
    first = content.splitlines()[0]
    if not first.startswith("# ") or not first[2:].strip():
        raise ValueError("Missing Ukrainian article title")
    headings = {}
    for match in re.finditer(r"^<!-- sectionId: ([^ ]+) -->\n\n\*\*Український заголовок:\*\*\n([^\n]+)", content, re.M):
        key, heading = match.groups()
        if key in headings:
            raise ValueError(f"Duplicate section: {key}")
        headings[key] = heading.strip()
    rows = {}
    pattern = r"^### ([^ \n]+) · (абзац|пункт|заголовок таблиці|комірка таблиці) · ([^\n]+)\n(.*?)(?=^### |^## |\Z)"
    for match in re.finditer(pattern, content, re.M | re.S):
        key, kind, tag, body = match.groups()
        if key in rows:
            raise ValueError(f"Duplicate worksheet key: {key}")
        answer = re.search(r"\*\*Українською:\*\*\n([^\n]+)", body)
        if not answer or not answer.group(1).strip():
            raise ValueError(f"Untranslated worksheet key: {key}")
        rows[key] = (answer.group(1).strip(), kind, tag)
    if len(headings) != content.count("<!-- sectionId:") or len(rows) != content.count("\n### "):
        raise ValueError("Worksheet contains malformed section or fragment headers")
    return first[2:].strip(), headings, rows


def restore_unpaired_link_markers(value, links):
    for link in links:
        paired_marker = re.compile(r"\{\{([^{}|]+)\|" + re.escape(link["text"]) + r"\}\}")
        value = paired_marker.sub(lambda match: f"{match.group(1)}{{{{{link['text']}}}}}", value)
    return value


def inline_nodes(value, source_nodes, key):
    links = [node for node in source_nodes if node["type"] == "link"]
    value = restore_unpaired_link_markers(value, links)
    if not links:
        return [{"type": "text", "text": value}]
    labels = TEXT_LINK_LABELS.get(key)
    if labels is not None and len(labels) != len(links):
        raise ValueError(f"Incorrect link-label count: {key}")
    spans = []
    for index, link in enumerate(links):
        label = link["text"]
        if labels is not None:
            translated = labels[index]
            if value.count(translated) != 1:
                raise ValueError(f"Missing or ambiguous translated link: {key}: {translated}")
            start = value.index(translated)
            end = start + len(translated)
            superscript = translated == label and f"({label})" in value
            if superscript:
                start -= 1
                end += 1
        elif f"({label})" in value:
            if value.count(f"({label})") != 1:
                raise ValueError(f"Ambiguous abbreviation: {key}: {label}")
            start = value.index(f"({label})")
            end = start + len(label) + 2
            superscript = True
        elif f"{{{{{label}}}}}" in value and "/item/" in key:
            marker = value.index(f"{{{{{label}}}}}")
            if value.count(f"{{{{{label}}}}}") != 1 or marker == 0 or ":" in value[:marker]:
                raise ValueError(f"Ambiguous linked item name: {key}: {label}")
            start, end, superscript = 0, marker, False
        else:
            raise ValueError(f"No translated link label: {key}: {label}")
        spans.append((start, end, superscript, link))
    if spans != sorted(spans, key=lambda item: item[0]):
        raise ValueError(f"Translated links changed source order: {key}")
    result = []
    cursor = 0
    for start, end, superscript, link in spans:
        if start < cursor:
            raise ValueError(f"Overlapping link labels: {key}")
        if start > cursor:
            result.append({"type": "text", "text": value[cursor:start]})
        label = value[start:end]
        if superscript:
            if label != f"({link['text']})":
                raise ValueError(f"Invalid source abbreviation: {key}")
            result += [{"type": "superscript", "text": "("},
                       {"type": "link", "text": link["text"], "href": link["href"]},
                       {"type": "superscript", "text": ")"}]
        else:
            result.append({"type": "link", "text": label, "href": link["href"]})
        cursor = end
    if cursor < len(value):
        result.append({"type": "text", "text": value[cursor:]})
    return result


def all_links(sections):
    result = []
    for section in sections:
        for block in section["blocks"]:
            if block["type"] == "paragraph":
                groups = [block["content"]]
            elif block["type"] == "list":
                groups = block["items"]
            elif block["type"] == "table":
                groups = block["headers"] + [cell for row in block["rows"] for cell in row]
            else:
                raise ValueError(f"Unsupported source block: {block['type']}")
            result.extend(node["href"] for nodes in groups for node in nodes if node["type"] == "link")
    return result


def compile_document(stage, sheet):
    title, headings, rows = parse_worksheet(sheet)
    revision = stage["sourceRevision"]
    if f"<!-- sourceRevisionId: {revision['revisionId']} -->" not in sheet:
        raise ValueError("Worksheet source revision differs from staging")
    match = re.search(r"^<!-- issueReviewedAt: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) -->$", sheet, re.M)
    if not match:
        raise ValueError("Missing technical issue review timestamp")
    rating_map = PREPARE.rating_map(stage)
    remaining_rows = set(rows)
    remaining_headings = set(headings)
    sections = []
    ratings = []
    issue_ratings = {}

    def add_rating(key, section_id, block_id, option_id, signal):
        rating_id = f"rating-sorcerer-2024-{len(ratings) + 1:03d}"
        context = re.split(r"\{\{| \(|:", rows[key][0], 1)[0].strip()
        ratings.append({"ratingId": rating_id, "articleId": ARTICLE_ID,
                        "translationRevisionId": TRANSLATION_ID, "sectionId": section_id,
                        "targetBlockId": block_id, "optionId": option_id,
                        "context": context, "explanationBlockId": block_id,
                        "sourceColor": signal["sourceColor"],
                        "score": SCORE[signal["sourceColor"]]})
        issue_ratings[signal["issueIndex"]] = rating_id

    def translate(key, nodes, kind, tag):
        if key not in remaining_rows:
            raise ValueError(f"Missing translated fragment: {key}")
        remaining_rows.remove(key)
        value, actual_kind, actual_tag = rows[key]
        if (actual_kind, actual_tag) != (kind, tag):
            raise ValueError(f"Changed source kind or rating: {key}")
        if kind == "комірка таблиці" and re.fullmatch(r"[0-9]+", PREPARE.inline_text(nodes)):
            if value != PREPARE.inline_text(nodes):
                raise ValueError(f"Changed numeric table cell: {key}")
        return inline_nodes(value, nodes, key)

    for original in stage["sections"]:
        section = copy.deepcopy(original)
        section_id = section["sectionId"]
        if section_id not in remaining_headings:
            raise ValueError(f"Missing translated section: {section_id}")
        remaining_headings.remove(section_id)
        section["heading"] = headings[section_id]
        for block in section["blocks"]:
            block_id = block["blockId"]
            if block["type"] == "paragraph":
                signal = rating_map.get(block_id)
                block["content"] = translate(block_id, block["content"], "абзац",
                                             signal["sourceClass"] if signal else "без оцінки")
                if signal:
                    add_rating(block_id, section_id, block_id, f"{section_id}-block-{block_id}", signal)
            elif block["type"] == "list":
                for index, nodes in enumerate(block["items"]):
                    key = f"{block_id}/item/{index}"
                    signal = rating_map.get(key)
                    tag = signal["sourceClass"] if signal else "без оцінки"
                    block["items"][index] = translate(key, nodes, "пункт", tag)
                    if signal:
                        add_rating(key, section_id, block_id, f"{section_id}-item-{index}", signal)
            elif block["type"] == "table":
                for index, nodes in enumerate(block["headers"]):
                    if nodes:
                        block["headers"][index] = translate(f"{block_id}/header/{index}", nodes,
                                                              "заголовок таблиці", "без оцінки")
                for row_index, row in enumerate(block["rows"]):
                    for cell_index, nodes in enumerate(row):
                        if nodes:
                            row[cell_index] = translate(f"{block_id}/row/{row_index}/{cell_index}", nodes,
                                                         "комірка таблиці", "без оцінки")
            else:
                raise ValueError(f"Unsupported source block: {block['type']}")
        sections.append(section)
    if remaining_rows or remaining_headings:
        raise ValueError(f"Extra translated fragments or sections: {sorted(remaining_rows)}, {sorted(remaining_headings)}")
    source_links = all_links(stage["sections"])
    if all_links(sections) != source_links:
        raise ValueError("Translated link targets or order differ from staging")
    decisions = []
    for index, issue in enumerate(stage["issues"]):
        code = issue["code"]
        if code == "provisional-id":
            continue
        if code == "rating-signal-review":
            if index in issue_ratings:
                decision = {"issueIndex": index, "disposition": "preserved",
                            "evidence": "Source-rated list item matched by text and order; color retained",
                            "ratingIds": [issue_ratings[index]]}
            elif index < 4:
                decision = {"issueIndex": index, "disposition": "excluded-noncontent",
                            "evidence": "Rating legend, not an option recommendation"}
            else:
                raise ValueError(f"Unmatched source rating issue: {index}")
        elif code == "nested-markup-review" and issue["detail"] == "link inside superscript":
            decision = {"issueIndex": index, "disposition": "preserved",
                        "evidence": "Abbreviation URL and superscript delimiters retained in translated item"}
        elif code == "unsupported-block" and "article-splash-image" in issue["detail"]:
            decision = {"issueIndex": index, "disposition": "excluded-noncontent",
                        "evidence": "Decorative splash image without analytical prose"}
        else:
            raise ValueError(f"Unreviewed source issue: {index}: {code}")
        decisions.append(decision)
    document = {"sources": [{"sourceId": revision["sourceId"], "rulesets": ["RULES_2024"]}],
                "sourceRevisions": [revision],
                "article": {"articleId": ARTICLE_ID, "sourceId": revision["sourceId"],
                            "slug": "sorcerer-2024", "ruleset": "RULES_2024",
                            "titleUk": title, "titleEn": revision["title"],
                            "topics": ["Чародій", "класовий гайд", "риси"], "status": "unpublished"},
                "translations": [{"translationRevisionId": TRANSLATION_ID, "articleId": ARTICLE_ID,
                                  "sourceRevisionId": revision["revisionId"],
                                  "status": "draft", "sections": sections}],
                "ratings": ratings}
    review = {"sourceRevisionId": revision["revisionId"], "reviewedAt": match.group(1),
              "issueDecisions": decisions}
    metrics = {"sections": len(sections), "fragments": len(rows), "links": len(source_links),
               "ratings": len(ratings), "issueDecisions": len(decisions)}
    return document, review, metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("worksheet", type=Path)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--apply", action="store_true", help="create absent outputs, never replace drafts")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    document, review, metrics = compile_document(stage, args.worksheet.read_text())
    paths = [(args.directory / "uk" / f"{ARTICLE_ID}.json", document),
             (args.directory / "reviews" / f"{stage['sourceRevision']['revisionId']}.json", review)]
    if args.apply and any(path.exists() for path, _ in paths):
        raise FileExistsError("At least one output already exists; refusing to replace either")
    for path, payload in paths:
        encoded = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode()
        print(json.dumps({**metrics, "output": str(path), "sha256": hashlib.sha256(encoded).hexdigest(),
                          "exists": path.exists()}, ensure_ascii=False))
        if args.apply:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as handle:
                handle.write(encoded)


if __name__ == "__main__":
    main()
