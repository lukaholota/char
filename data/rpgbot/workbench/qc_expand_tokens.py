"""Usage: python3 qc_expand_tokens.py <slug> [--apply] — expands leftover <<Spell>> tokens in the Ukrainian lines of a worksheet."""
import shutil
import sys
from pathlib import Path

WORKBENCH = Path("/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
sys.path.insert(0, str(WORKBENCH))
import re
import refs
import retrofit_labels as r

NESTED_TAIL = re.compile(r"\[\[(\d+)\|([^\[\]]*?) (\[[^\[\]]+\])\]\]")


def move_tail_out_of_link(line):
    return NESTED_TAIL.sub(lambda match: f"[[{match.group(1)}|{match.group(2)}]] {match.group(3)}", line)


slug = sys.argv[1]
sheet = r.ROOT / f"data/rpgbot/authoring/{slug}.md"
lines = sheet.read_text(encoding="utf-8").split("\n")
missing, replaced = set(), 0
for index, line in enumerate(lines):
    if line.startswith(("> ", "#", "<!--")) or "<<" not in line:
        continue
    expanded = move_tail_out_of_link(refs.expand(line, missing))
    if expanded != line:
        replaced += 1
        lines[index] = expanded
print(f"{slug}: lines with tokens expanded={replaced} unresolved={sorted(missing)}")
if "--apply" in sys.argv and not missing:
    backup = WORKBENCH / "backup" / "qc-2026-10-03-rebuilds"
    backup.mkdir(parents=True, exist_ok=True)
    shutil.copy2(sheet, backup / f"{slug}.pre-expand.{sheet.name}")
    sheet.write_text("\n".join(lines), encoding="utf-8")
    print("sheet updated")
