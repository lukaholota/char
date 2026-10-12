"""Usage: python3 patch_sheet.py <sheet-name> <old> <new>  — replaces text in the worksheet and rebuilds the draft."""
import shutil
import sys
from pathlib import Path

sys.path.insert(0, "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
import retrofit_labels as r

name, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
sheet = r.ROOT / f"data/rpgbot/authoring/{name}.md"
text = sheet.read_text(encoding="utf-8")
if text.count(old) != 1:
    sys.exit(f"expected exactly one match, found {text.count(old)}")
revision = r.revision_of(text)
draft = r.ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
review = r.ROOT / f"data/rpgbot/reviews/{revision}.json"
r.BACKUP.mkdir(parents=True, exist_ok=True)
for source in (sheet, draft, review):
    shutil.copy2(source, r.BACKUP / f"{name}.{source.name}")
sheet.write_text(text.replace(old, new), encoding="utf-8")
result = r.rebuild_draft(name, revision)
if result.returncode:
    print("REBUILD FAILED", result.stderr[-400:], result.stdout[-400:])
    for source in (sheet, draft, review):
        shutil.copy2(r.BACKUP / f"{name}.{source.name}", source)
else:
    print("patched and rebuilt")
