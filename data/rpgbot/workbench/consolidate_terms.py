"""Usage: python3 consolidate_terms.py <slug-prefix> "<Section title>" > out.md

Merges terms_<prefix>*.md and notes_<prefix>*.md from the scratchpad into one markdown section.
"""
import glob
import re
import sys

S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
prefix, title = sys.argv[1], sys.argv[2]


def page_of(path, kind):
    name = path.split("/")[-1][len(kind) + 1:-3]
    return re.sub(r"-part\d+$", "", name)


def cell(value):
    return value.replace("|", "∣").strip()


rows, seen = [], set()
for path in sorted(glob.glob(f"{S}/terms_{prefix}*.md")):
    page = page_of(path, "terms")
    for line in open(path, encoding="utf-8").read().splitlines():
        parts = [p.strip() for p in line.split(" | ")]
        if len(parts) < 3 or "→" not in parts[0]:
            continue
        english, ukrainian = [p.strip() for p in parts[0].split("→", 1)]
        key = (english.lower(), ukrainian)
        if key in seen:
            continue
        seen.add(key)
        rows.append((english, ukrainian, page, " | ".join(parts[2:])))

print(f"### {title}\n")
print("| Англійською | Українською | Сторінка | Чому |\n|---|---|---|---|")
for english, ukrainian, page, why in rows:
    print(f"| {cell(english)} | {cell(ukrainian)} | {page} | {cell(why)} |")

print(f"\n### {title}: розбіжності в джерелі\n")
for path in sorted(glob.glob(f"{S}/notes_{prefix}*.md")):
    page = page_of(path, "notes")
    body = open(path, encoding="utf-8").read().strip()
    body = re.sub(r"^[^\n]*\n+", "", body, count=1) if not body.startswith("-") else body
    print(f"**{page}**\n")
    print(body + "\n")
