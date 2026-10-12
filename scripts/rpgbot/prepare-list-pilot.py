#!/usr/bin/env python3
"""Create a flat, source-pinned translation worksheet for a list-heavy pilot.

The worksheet is deliberately separate from the publishable article document.
It is generated once; an edited worksheet is never overwritten by --apply.
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


def rating_signals(stage):
    signals = []
    for index, issue in enumerate(stage["issues"]):
        if issue["code"] != "rating-signal-review":
            continue
        match = re.fullmatch(r"rating-([^\s]+) (.+)", issue["detail"])
        if not match:
            raise ValueError(f"Unrecognized rating signal at issue {index}: {issue['detail']}")
        signals.append((index, match.group(1), clean(match.group(2))))
    return signals


def list_rating_map(stage, legend_count=4):
    signals = rating_signals(stage)
    legend = signals[:legend_count]
    if [name.lower() for _, _, name in legend] != ["red", "orange", "green", "blue"][:legend_count]:
        raise ValueError("Rating legend differs from the expected red/orange/green/blue order")
    cursor = legend_count
    mapped = {}
    for section in stage["sections"]:
        if section["sectionId"] in ("section-2", "section-disclaimer"):
            continue
        for block in section["blocks"]:
            if block["type"] != "list":
                continue
            for item_index, item in enumerate(block["items"]):
                first = clean(item[0]["text"])
                key = f"{block['blockId']}/item/{item_index}"
                if cursor < len(signals) and first == signals[cursor][2]:
                    issue_index, raw_color, _ = signals[cursor]
                    mapped[key] = {"issueIndex": issue_index, "sourceClass": f"rating-{raw_color}",
                                   "sourceColor": raw_color if raw_color in ("red", "orange", "green", "blue") else None}
                    cursor += 1
                elif item[0]["type"] == "strong":
                    mapped[key] = None
                else:
                    raise ValueError(f"Unmatched item or shifted rating at {key}: {first}")
    if cursor != len(signals):
        raise ValueError(f"Unmatched rating signals: {len(signals) - cursor}")
    return mapped


def render(stage):
    mapped = list_rating_map(stage)
    lines = [f"# {stage['sourceRevision']['title']}", "",
             f"<!-- sourceRevisionId: {stage['sourceRevision']['revisionId']} -->", "",
             "Це робочий аркуш перекладу. Порожні поля не є опублікованим текстом. ",
             "Остаточний JSON звіряється з незмінним source HTML і staging AST.", ""]
    for section in stage["sections"]:
        lines += [f"## {section['heading']}", f"<!-- sectionId: {section['sectionId']} -->", "",
                  "**Український заголовок:**", ""]
        for block in section["blocks"]:
            if block["type"] == "list":
                for item_index, item in enumerate(block["items"]):
                    key = f"{block['blockId']}/item/{item_index}"
                    rating = mapped.get(key)
                    marker = rating["sourceClass"] if rating else "без оцінки"
                    links = [node["href"] for node in item if node["type"] == "link"]
                    lines += [f"### {key} · {marker}", "", f"> {inline_text(item)}", ""]
                    if links:
                        lines += ["Посилання джерела: " + ", ".join(links), ""]
                    lines += ["**Українською:**", ""]
            elif block["type"] == "paragraph":
                lines += [f"### {block['blockId']} · абзац", "", f"> {inline_text(block['content'])}", ""]
                links = [node["href"] for node in block["content"] if node["type"] == "link"]
                if links:
                    lines += ["Посилання джерела: " + ", ".join(links), ""]
                lines += ["**Українською:**", ""]
            else:
                raise ValueError(f"Unsupported pilot block: {block['type']}")
    return "\n".join(lines), mapped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--apply", action="store_true", help="create worksheet; never overwrite an existing file")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    content, mapped = render(stage)
    encoded = content.encode()
    digest = hashlib.sha256(encoded).hexdigest()
    print(json.dumps({"sourceRevisionId": stage["sourceRevision"]["revisionId"],
                      "ratingItems": sum(value is not None for value in mapped.values()),
                      "unratedItems": sum(value is None for value in mapped.values()),
                      "unknownColors": [key for key, value in mapped.items() if value and value["sourceColor"] is None],
                      "sha256": digest, "output": str(args.output)}, ensure_ascii=False))
    if args.apply:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as handle:
            handle.write(content)


if __name__ == "__main__":
    main()
