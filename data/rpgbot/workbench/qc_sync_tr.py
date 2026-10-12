"""Usage: python3 qc_sync_tr.py <slug>... [--apply] — copies the Ukrainian fields of the worksheet back into tr_<slug>.py.

Keeps TITLE, TOPICS and the set of keys of the existing tr file, replaces every value with the sheet text and
ends the file with refs.expand_all only (the sheet text is final, so refs.pair_label_marker must not run again). The old tr file is saved in backup/qc-2026-10-03-original/ first.
"""
import importlib.util
import pprint
import re
import shutil
import sys
from pathlib import Path

WORKBENCH = Path("/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
ROOT = WORKBENCH.parent.parent.parent
sys.path.insert(0, str(WORKBENCH))
import qc_check

CLOSING_LINE = "FRAGMENTS = refs.expand_all(FRAGMENTS)\n"
OLD_CLOSING_LINE = "FRAGMENTS = {key: refs.pair_label_marker(value) for key, value in refs.expand_all(FRAGMENTS).items()}\n"


def load_tr(path):
    source = path.read_text(encoding="utf-8")
    source = source.replace(OLD_CLOSING_LINE, "").replace(CLOSING_LINE, "")
    spec = importlib.util.spec_from_loader("tr_module", loader=None)
    module = importlib.util.module_from_spec(spec)
    sys.modules.setdefault("refs", __import__("refs"))
    exec(compile(source, str(path), "exec"), module.__dict__)
    return module


def sync_one(slug, apply):
    path = WORKBENCH / f"tr_{slug}.py"
    module = load_tr(path)
    fields, _ = qc_check.read_fields(slug)
    fragments, headings, changed = {}, {}, 0
    for key, value in module.FRAGMENTS.items():
        sheet_value = fields.get(key, value)
        changed += sheet_value != value
        fragments[key] = sheet_value
    for key, value in getattr(module, "HEADINGS", {}).items():
        headings[key] = fields.get(f"heading:{key}", value)
    print(f"{slug}: keys={len(fragments)} values differing from sheet={changed}")
    if not apply:
        return
    backup = WORKBENCH / "backup" / "qc-2026-10-03-original"
    backup.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup / f"{slug}.tr.before-sync.py")
    text = "import refs\n\nTITLE = " + repr(getattr(module, "TITLE", "")) + "\nTOPICS = " + repr(getattr(module, "TOPICS", ""))
    text += "\n\nHEADINGS = " + pprint.pformat(headings, sort_dicts=False) + "\n\nFRAGMENTS = " + pprint.pformat(fragments, sort_dicts=False) + "\n\n" + CLOSING_LINE
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    for slug in [arg for arg in sys.argv[1:] if not arg.startswith("--")]:
        sync_one(slug, "--apply" in sys.argv)
