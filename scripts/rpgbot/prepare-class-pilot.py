#!/usr/bin/env python3
"""Create a flat translation worksheet for a class guide with lists and tables.

This export does not publish anything. --apply creates a new worksheet and
refuses to replace one that has been edited by a translator.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path


def clean(value):
    return re.sub(r"\s+", " ", value).strip()


def inline_text(nodes):
    return clean("".join(node["text"] for node in nodes))


def content_rows(stage):
    for section in stage["sections"]:
        for block in section["blocks"]:
            block_id = block["blockId"]
            if block["type"] == "paragraph":
                yield section["sectionId"], block_id, block["content"]
            elif block["type"] == "list":
                for index, item in enumerate(block["items"]):
                    yield section["sectionId"], f"{block_id}/item/{index}", item
            elif block["type"] == "table":
                continue
            else:
                raise ValueError(f"Unsupported source block: {block['type']}")


def rating_map(stage):
    signals = []
    for issue_index, issue in enumerate(stage["issues"]):
        if issue["code"] != "rating-signal-review":
            continue
        match = re.fullmatch(r"rating-([^\s]+) (.+)", issue["detail"])
        if not match:
            raise ValueError(f"Unrecognized rating signal at issue {issue_index}")
        signals.append((issue_index, match.group(1), clean(match.group(2))))
    if [(color, label.lower()) for _, color, label in signals[:4]] != [
        ("red", "red"), ("orange", "orange"), ("green", "green"), ("blue", "blue")
    ]:
        raise ValueError("Unexpected rating legend")
    mapped = {}
    cursor = 4
    for section_id, key, nodes in content_rows(stage):
        if section_id == "section-disclaimer":
            continue
        text = re.sub(r"^\d+\.\s*", "", inline_text(nodes))
        if cursor < len(signals):
            issue_index, color, label = signals[cursor]
            suffix = text[len(label):] if text.startswith(label) else None
            if suffix is not None and (not suffix or suffix[0].isspace() or suffix[0] in ":.!?(—-"):
                mapped[key] = {"issueIndex": issue_index, "sourceClass": f"rating-{color}",
                               "sourceColor": color if color in ("red", "orange", "green", "blue") else None}
                cursor += 1
    if cursor != len(signals):
        raise ValueError(f"Unmatched rating signals: {len(signals) - cursor}; next={signals[cursor]}")
    return mapped


def render(stage, mapped=None):
    mapped = rating_map(stage) if mapped is None else mapped
    lines = [f"# {stage['sourceRevision']['title']}", "",
             f"<!-- sourceRevisionId: {stage['sourceRevision']['revisionId']} -->", "",
             "Робочий аркуш перекладу: порожні поля не є опублікованим текстом.",
             "Числа таблиці попередньо перенесено без зміни; зміст звіряється з HTML.", ""]
    for section in stage["sections"]:
        lines += [f"## {section['heading']}", f"<!-- sectionId: {section['sectionId']} -->", "",
                  "**Український заголовок:**", ""]
        for block in section["blocks"]:
            block_id = block["blockId"]
            if block["type"] == "paragraph":
                rows = [(block_id, block["content"], "абзац")]
            elif block["type"] == "list":
                rows = [(f"{block_id}/item/{index}", item, "пункт")
                        for index, item in enumerate(block["items"])]
            elif block["type"] == "table":
                rows = [(f"{block_id}/header/{index}", cell, "заголовок таблиці")
                        for index, cell in enumerate(block["headers"]) if inline_text(cell)]
                rows += [(f"{block_id}/row/{row_index}/{cell_index}", cell, "комірка таблиці")
                         for row_index, row in enumerate(block["rows"])
                         for cell_index, cell in enumerate(row) if inline_text(cell)]
            else:
                raise ValueError(f"Unsupported source block: {block['type']}")
            for key, nodes, kind in rows:
                signal = mapped.get(key)
                tag = signal["sourceClass"] if signal else "без оцінки"
                source = inline_text(nodes)
                links = [node["href"] for node in nodes if node["type"] == "link"]
                lines += [f"### {key} · {kind} · {tag}", "", f"> {source}", ""]
                if links:
                    lines += ["Посилання джерела: " + ", ".join(links), ""]
                default = source if kind == "комірка таблиці" and re.fullmatch(r"[0-9]+", source) else ""
                lines += ["**Українською:**", default, ""]
    return "\n".join(lines), mapped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--apply", action="store_true", help="create worksheet; never overwrite existing translation")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    content, mapped = render(stage)
    print(json.dumps({"sourceRevisionId": stage["sourceRevision"]["revisionId"],
                      "ratingItems": len(mapped),
                      "unknownColors": [key for key, value in mapped.items() if value["sourceColor"] is None],
                      "sha256": hashlib.sha256(content.encode()).hexdigest(), "output": str(args.output)},
                     ensure_ascii=False))
    if args.apply:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as handle:
            handle.write(content)


if __name__ == "__main__":
    main()
