"""Usage: python3 fix_paren_markers.py [--apply]

The glossary marker cannot cover a term whose last token ends with ")" or is a bare number: "Стійкий (Статура){{Resilient (Constitution)}}"
and "натуральної 1{{Natural 1}}" give an empty term. Rewrites such markers in the Ukrainian fields of every compiled worksheet
(and in tr_*.py) to the paired form "{{Стійкий (Статура)|Resilient (Constitution)}}", then rebuilds the drafts.
"""
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import retrofit_labels as r

MARKER = re.compile(r"\{\{([^{}|]+)\}\}")


def convert_line(line):
    pieces, cursor, changed = [], 0, 0
    for match in MARKER.finditer(line):
        before = line[cursor:match.start()]
        original = match.group(1).strip()
        wanted = len(original.split())
        tokens = re.findall(r"\S+", line[:match.start()])
        if not tokens:
            continue
        last = tokens[-1]
        if not (last.endswith(")") or re.fullmatch(r"\d+", last)):
            continue
        term_start = len(line[:match.start()].rstrip())
        words = list(re.finditer(r"\S+", line[:match.start()]))[-wanted:]
        if len(words) < wanted:
            continue
        term_start = words[0].start()
        if term_start < cursor:
            continue
        pieces.append(line[cursor:term_start])
        pieces.append("{{%s|%s}}" % (line[term_start:match.start()].strip(), original))
        cursor = match.end()
        changed += 1
    pieces.append(line[cursor:])
    return "".join(pieces), changed


def convert_text(text, ukrainian_only):
    lines, total, in_answer = text.split("\n"), 0, False
    for index, line in enumerate(lines):
        if ukrainian_only:
            if line == "**Українською:**" or line == "**Український заголовок:**":
                in_answer = True
                continue
            if not in_answer:
                continue
            in_answer = False
        if "{{" not in line or line.startswith(("> ", "<!--", "#")):
            continue
        lines[index], changed = convert_line(line)
        total += changed
    return "\n".join(lines), total


def main():
    apply = "--apply" in sys.argv
    grand = 0
    for sheet in sorted((r.ROOT / "data/rpgbot/authoring").glob("*.md")):
        name = sheet.stem
        draft = r.ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
        if not draft.exists():
            continue
        text = sheet.read_text(encoding="utf-8")
        fixed, count = convert_text(text, True)
        if not count:
            continue
        grand += count
        print(f"{name}: {count}")
        if not apply:
            continue
        revision = r.revision_of(text)
        review = r.ROOT / f"data/rpgbot/reviews/{revision}.json"
        r.BACKUP.mkdir(parents=True, exist_ok=True)
        for source in (sheet, draft, review):
            shutil.copy2(source, r.BACKUP / f"{name}.paren.{source.name}")
        sheet.write_text(fixed, encoding="utf-8")
        result = r.rebuild_draft(name, revision)
        if result.returncode:
            print("  REBUILD FAILED, restoring:", result.stderr[-300:], result.stdout[-300:])
            for source in (sheet, draft, review):
                shutil.copy2(r.BACKUP / f"{name}.paren.{source.name}", source)
    print("total markers:", grand)


if __name__ == "__main__":
    main()
