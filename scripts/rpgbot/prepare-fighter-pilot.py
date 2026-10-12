#!/usr/bin/env python3
"""Export the Fighter 2014 class-guide worksheet with explicit rating anomalies.

The two split ability labels retain both source colors for review. Two color
words inside item prose are deliberately excluded from option ratings.
"""

import argparse
import hashlib
import json
import re
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = spec_from_file_location("prepare_class_pilot", HERE / "prepare-class-pilot.py")
PREPARE = module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)

INLINE_COLOR_WORDS = {
    233: ("green", "Green"),  # Conditional Luck Blade assessment.
    236: ("blue", "blue"),    # Hypothetical Ring of Spell Turning assessment.
}


def rating_map(stage):
    if stage["sourceRevision"]["sourceId"] != "rpgbot-2c6409607d154834":
        raise ValueError("This exporter is specific to the Fighter 2014 source revision")
    signals = []
    for index, issue in enumerate(stage["issues"]):
        if issue["code"] != "rating-signal-review":
            continue
        match = re.fullmatch(r"rating-([^\s]+) (.+)", issue["detail"])
        if not match:
            raise ValueError(f"Unrecognized rating signal: {index}")
        signals.append((index, match.group(1), PREPARE.clean(match.group(2))))
    if [(color, label.lower()) for _, color, label in signals[:4]] != [
        ("red", "red"), ("orange", "orange"), ("green", "green"), ("blue", "blue")
    ]:
        raise ValueError("Unexpected rating legend")
    mapped = {}
    skipped = []
    cursor = 4
    for section_id, key, nodes in PREPARE.content_rows(stage):
        if section_id == "section-disclaimer":
            continue
        source = re.sub(r"^\d+\.\s*", "", PREPARE.inline_text(nodes))
        group = []
        while cursor < len(signals):
            index, color, label = signals[cursor]
            if index in INLINE_COLOR_WORDS:
                break
            combined = "".join(item[2] for item in group) + label
            if not source.startswith(combined):
                break
            group.append(signals[cursor])
            cursor += 1
            suffix = source[len(combined):]
            if not suffix or suffix[0].isspace() or suffix[0] in ":.!?(—-":
                break
        if group:
            colors = [item[1] for item in group]
            mapped[key] = {"issueIndices": [item[0] for item in group],
                           "sourceClass": "rating-" + "+".join(colors),
                           "sourceColor": colors[0] if len(colors) == 1 and colors[0] in
                           ("red", "orange", "green", "blue") else None}
            while cursor < len(signals) and signals[cursor][0] in INLINE_COLOR_WORDS:
                index, color, label = signals[cursor]
                if (color, label) != INLINE_COLOR_WORDS[index] or label not in source:
                    raise ValueError(f"Changed inline color word: {index}")
                skipped.append(index)
                cursor += 1
    if cursor != len(signals) or skipped != sorted(INLINE_COLOR_WORDS):
        raise ValueError(f"Unmatched rating signals: next={signals[cursor:cursor + 3]}, skipped={skipped}")
    mixed = {key: value["issueIndices"] for key, value in mapped.items()
             if "+" in value["sourceClass"]}
    if mixed != {"block-section-ability-scores-2": [25, 26],
                 "block-section-ability-scores-3": [27, 28]}:
        raise ValueError(f"Unexpected mixed-color options: {mixed}")
    return mapped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--apply", action="store_true", help="create an absent worksheet only")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    content, mapped = PREPARE.render(stage, rating_map(stage))
    encoded = content.encode()
    print(json.dumps({"sourceRevisionId": stage["sourceRevision"]["revisionId"],
                      "ratedOptions": len(mapped), "mixedColorOptions": 2,
                      "unknownColorOptions": sum(value["sourceColor"] is None for value in mapped.values()),
                      "conditionalColorWords": len(INLINE_COLOR_WORDS),
                      "sha256": hashlib.sha256(encoded).hexdigest(),
                      "output": str(args.output), "exists": args.output.exists()}, ensure_ascii=False))
    if args.apply:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("xb") as handle:
            handle.write(encoded)


if __name__ == "__main__":
    main()
