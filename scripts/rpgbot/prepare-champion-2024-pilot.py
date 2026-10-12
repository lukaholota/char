#!/usr/bin/env python3
"""Export the 2024 Champion worksheet, excluding its uncolored heading marker."""

import argparse
import copy
import hashlib
import json
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


HERE = Path(__file__).resolve().parent
SPEC = spec_from_file_location("prepare_class_pilot", HERE / "prepare-class-pilot.py")
PREPARE = module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)


def rating_map(stage):
    if stage["sourceRevision"]["sourceId"] != "rpgbot-ec7af736a93c9ec0":
        raise ValueError("This exporter is specific to Champion 2024")
    if stage["issues"][4]["detail"] != "wp-block-heading rating- Champion Features":
        raise ValueError("Unrecognized decorative heading rating")
    clean_stage = copy.deepcopy(stage)
    clean_stage["issues"][4]["code"] = "decorative-heading-rating"
    mapped = PREPARE.rating_map(clean_stage)
    if len(mapped) != 13 or any(item["sourceColor"] is None for item in mapped.values()):
        raise ValueError("Unexpected author rating count or color")
    return mapped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--apply", action="store_true", help="create absent worksheet only")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    content, mapped = PREPARE.render(stage, rating_map(stage))
    encoded = content.encode()
    print(json.dumps({"sourceRevisionId": stage["sourceRevision"]["revisionId"],
                      "ratedOptions": len(mapped), "sha256": hashlib.sha256(encoded).hexdigest(),
                      "output": str(args.output), "exists": args.output.exists()}, ensure_ascii=False))
    if args.apply:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("xb") as handle:
            handle.write(encoded)


if __name__ == "__main__":
    main()
