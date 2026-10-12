"""Usage: python3 qc_rebuild.py <slug> — rebuilds the draft JSON from the edited worksheet.

Backs up the sheet, draft and review first; on a failed rebuild the draft and review are restored (the sheet is left as edited).
"""
import shutil
import subprocess
import sys
import time
from pathlib import Path

WORKBENCH = Path("/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
sys.path.insert(0, str(WORKBENCH))
import retrofit_labels as r

slug = sys.argv[1]
sheet = r.ROOT / f"data/rpgbot/authoring/{slug}.md"
revision = r.revision_of(sheet.read_text(encoding="utf-8"))
draft = r.ROOT / f"data/rpgbot/uk/rpgbot-{slug}.json"
review = r.ROOT / f"data/rpgbot/reviews/{revision}.json"
backup = WORKBENCH / "backup" / "qc-2026-10-03-rebuilds"
backup.mkdir(parents=True, exist_ok=True)
stamp = time.strftime("%H%M%S")
for source in (sheet, draft, review):
    if source.exists():
        shutil.copy2(source, backup / f"{slug}.{stamp}.{source.name}")
draft.unlink(missing_ok=True)
review.unlink(missing_ok=True)
result = subprocess.run(["python3", str(WORKBENCH / "w.py"), "finish", slug, "--recompile"], capture_output=True, text=True, cwd=r.ROOT)
if result.returncode or not draft.exists():
    print("REBUILD FAILED")
    print(result.stderr[-700:], result.stdout[-700:])
    for source in (draft, review):
        saved = backup / f"{slug}.{stamp}.{source.name}"
        if saved.exists():
            shutil.copy2(saved, source)
    sys.exit(1)
print(result.stdout[-600:])
print("rebuilt", slug)
