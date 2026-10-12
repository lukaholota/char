"""Usage: python3 bulk_replace.py "<old>" "<new>" [--apply] [--skip slug,slug]

Replaces text in the Ukrainian fields of every compiled worksheet and rebuilds its draft. Without --apply only counts.
"""
import re, shutil, sys
sys.path.insert(0, "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
import retrofit_labels as r

old, new = sys.argv[1], sys.argv[2]
skip = set(next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--skip=")), []))
total = 0
for sheet in sorted((r.ROOT / "data/rpgbot/authoring").glob("*.md")):
    name = sheet.stem
    draft = r.ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
    if name in skip or not draft.exists():
        continue
    text = sheet.read_text(encoding="utf-8")
    lines = text.split("\n")
    count = 0
    for index, line in enumerate(lines):
        if line.startswith(("> ", "#", "<!--")) or old not in line:
            continue
        count += line.count(old)
        lines[index] = line.replace(old, new)
    if not count:
        continue
    total += count
    print(f"{name}: {count}")
    if "--apply" not in sys.argv:
        continue
    revision = r.revision_of(text)
    review = r.ROOT / f"data/rpgbot/reviews/{revision}.json"
    r.BACKUP.mkdir(parents=True, exist_ok=True)
    for source in (sheet, draft, review):
        shutil.copy2(source, r.BACKUP / f"{name}.bulk.{source.name}")
    sheet.write_text("\n".join(lines), encoding="utf-8")
    result = r.rebuild_draft(name, revision)
    if result.returncode:
        print("  REBUILD FAILED, restoring:", result.stderr[-300:], result.stdout[-300:])
        for source in (sheet, draft, review):
            shutil.copy2(r.BACKUP / f"{name}.bulk.{source.name}", source)
print("total replacements:", total)
