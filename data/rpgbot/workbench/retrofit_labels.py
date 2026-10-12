"""Converts label-start markers that would underline only part of the label into the paired form.

Usage: python3 retrofit_labels.py <sheet-name>... [--apply]
Without --apply only reports what would change.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/luka/Documents/code/spells.holota.family")
SCRATCHPAD = Path("/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
BACKUP = SCRATCHPAD / "backup" / "marker-retrofit"
LABEL = re.compile(r"^([^{}|:«»()\[\]*.,;!?\n]+?)\{\{([^{}|]+)\}\}")
MAX_LABEL_WORDS = 6
LABEL_FOLLOWERS = (":", " (", " [[", "[[", " ^^", "^^")


def pair_label_marker(line):
    match = LABEL.match(line)
    if not match:
        return line
    ukrainian, original = match.group(1).strip(), match.group(2)
    ukrainian_words = len(ukrainian.split())
    if ukrainian_words <= len(original.split()) or ukrainian_words > MAX_LABEL_WORDS:
        return line
    rest = line[match.end():]
    if rest != "" and not rest.startswith(LABEL_FOLLOWERS):
        return line
    return "{{%s|%s}}" % (ukrainian, original) + rest


def patch_sheet_lines(lines):
    changes = []
    for index, line in enumerate(lines):
        if line.strip() != "**Українською:**" or index + 1 >= len(lines):
            continue
        patched = pair_label_marker(lines[index + 1])
        if patched != lines[index + 1]:
            changes.append((lines[index + 1], patched))
            lines[index + 1] = patched
    return changes


def revision_of(sheet_text):
    return re.search(r"sourceRevisionId: (\S+) -->", sheet_text[:600]).group(1)


def rebuild_draft(name, revision):
    draft = ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
    review = ROOT / f"data/rpgbot/reviews/{revision}.json"
    draft.unlink()
    review.unlink()
    result = subprocess.run(["python3", str(SCRATCHPAD / "w.py"), "finish", name, "--recompile"], capture_output=True, text=True, cwd=ROOT)
    return result


def process_sheet(name, apply):
    sheet = ROOT / f"data/rpgbot/authoring/{name}.md"
    text = sheet.read_text(encoding="utf-8")
    lines = text.split("\n")
    changes = patch_sheet_lines(lines)
    print(f"{name}: {len(changes)} label markers")
    if not apply or not changes:
        return
    revision = revision_of(text)
    draft = ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
    review = ROOT / f"data/rpgbot/reviews/{revision}.json"
    BACKUP.mkdir(parents=True, exist_ok=True)
    for source in (sheet, draft, review):
        shutil.copy2(source, BACKUP / f"{name}.{source.name}")
    sheet.write_text("\n".join(lines), encoding="utf-8")
    result = rebuild_draft(name, revision)
    if result.returncode:
        print("  REBUILD FAILED, restoring:", result.stderr[-300:], result.stdout[-300:])
        shutil.copy2(BACKUP / f"{name}.{sheet.name}", sheet)
        shutil.copy2(BACKUP / f"{name}.{draft.name}", draft)
        shutil.copy2(BACKUP / f"{name}.{review.name}", review)
        return
    print("  rebuilt")


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    for name in [arg for arg in sys.argv[1:] if not arg.startswith("--")]:
        process_sheet(name, apply)
