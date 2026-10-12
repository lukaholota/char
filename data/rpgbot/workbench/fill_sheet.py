import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import os

import refs

SKIP_FILLED = os.environ.get("SKIP_FILLED") == "1"
CYRILLIC = "А-Яа-яІіЇїЄєҐґ"
APOSTROPHE = re.compile(f"(?<=[{CYRILLIC}])['’`´](?=[{CYRILLIC}])")
SHARED_PATH = Path("/Users/luka/Documents/code/spells.holota.family/data/rpgbot/authoring/shared-fragments.json")
HEADING_LABEL = "**Український заголовок:**"
FRAGMENT_LABEL = "**Українською:**"


def normalize(text):
    return APOSTROPHE.sub("ʼ", text).strip()


def load_translations(path):
    spec = importlib.util.spec_from_file_location("translations", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fill_lines(lines, headings, fragments):
    used_headings, used_fragments = set(), set()
    section_id = key = source_line = None
    for index, line in enumerate(lines):
        section = re.match(r"<!-- sectionId: ([^;]+);", line)
        fragment = re.match(r"### (\S+) · ", line)
        if section:
            section_id, key = section.group(1), None
        elif fragment:
            key = fragment.group(1)
        elif line.startswith("> "):
            source_line = line[2:]
        elif line == HEADING_LABEL and section_id in headings:
            require_empty(lines, index, section_id)
            lines[index + 1] = normalize(headings[section_id])
            used_headings.add(section_id)
        elif line == FRAGMENT_LABEL and key in fragments:
            if lines[index + 1] != "" and SKIP_FILLED:
                used_fragments.add(key)
                continue
            require_empty(lines, index, key)
            lines[index + 1] = refs.pair_label_marker(normalize(fragments[key]), source_line)
            used_fragments.add(key)
    unused = (set(headings) - used_headings) | (set(fragments) - used_fragments)
    if unused:
        raise ValueError(f"Translations without a field: {sorted(unused)}")


def require_empty(lines, index, name):
    if lines[index + 1] != "":
        raise ValueError(f"Field already filled: {name}")


def apply_shared(lines, shared):
    key = source = None
    for index, line in enumerate(lines):
        fragment = re.match(r"### (\S+) · ", line)
        if fragment:
            key = fragment.group(1)
        elif line.startswith("> "):
            source = line[2:]
        elif line == FRAGMENT_LABEL and lines[index + 1] == "" and source in shared["fragments"]:
            lines[index + 1] = normalize(shared["fragments"][source])
        elif line == HEADING_LABEL and lines[index + 1] == "" and lines[index - 3][3:] in shared["headings"]:
            lines[index + 1] = normalize(shared["headings"][lines[index - 3][3:]])


def find_empty_fields(lines):
    return [lines[index - 1] for index, line in enumerate(lines)
            if line in (HEADING_LABEL, FRAGMENT_LABEL) and lines[index + 1] == ""]


def finish_sheet(path, translations):
    lines = path.read_text(encoding="utf-8").split("\n")
    fill_lines(lines, translations.HEADINGS, translations.FRAGMENTS)
    apply_shared(lines, json.loads(SHARED_PATH.read_text(encoding="utf-8")))
    lines[0] = f"# {normalize(translations.TITLE)}"
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    content = "\n".join(lines).replace("<!-- issueReviewedAt: pending -->", f"<!-- issueReviewedAt: {stamp} -->")
    content = re.sub(r"<!-- topics: [^\n]* -->", f"<!-- topics: {translations.TOPICS} -->", content)
    return content, find_empty_fields(content.split("\n"))


if __name__ == "__main__":
    sheet_path, translation_path = Path(sys.argv[1]), Path(sys.argv[2])
    content, empty = finish_sheet(sheet_path, load_translations(translation_path))
    print("empty fields left:", [item[:70] for item in empty])
    if "--apply" in sys.argv and not empty:
        sheet_path.write_text(content, encoding="utf-8")
        print("written", sheet_path)
