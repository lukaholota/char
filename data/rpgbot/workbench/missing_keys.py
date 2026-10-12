"""Usage: python3 missing_keys.py <sheet-name> [<module-suffix>] [section-id ...]

Lists fragments of the sheet that are still empty and absent from tr_<sheet-name><suffix>.py FRAGMENTS,
and keys of FRAGMENTS that do not match any fragment of the sheet. Section ids limit the check.
"""
import importlib.util
import re
import sys

S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
SHEETS = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/authoring"

name = sys.argv[1]
suffix = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("section") else ""
sections = [a for a in sys.argv[2:] if a.startswith("section")]

spec = importlib.util.spec_from_file_location("t", f"{S}/tr_{name}{suffix}.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
translated = set(module.FRAGMENTS)

text = open(f"{SHEETS}/{name}.md", encoding="utf-8").read()
all_keys, empty = set(), []
for block in re.split(r"^## ", text, flags=re.M)[1:]:
    section_id = re.search(r"sectionId: ([^;]+);", block).group(1)
    if sections and section_id not in sections:
        continue
    for match in re.finditer(r"^### (\S+) · (\S+(?: \S+)?) · [^\n]+\n\n> ([^\n]*)\n(.*?)(?=^### |\Z)", block, re.M | re.S):
        key, kind, source, rest = match.groups()
        if kind == "зміст":
            continue
        all_keys.add(key)
        if not re.search(r"\*\*Українською:\*\*\n(\S[^\n]*)", rest):
            empty.append((key, source))

missing = [(k, s) for k, s in empty if k not in translated]
extra = sorted(k for k in translated if k not in all_keys) if not sections else []
print(f"empty in sheet: {len(empty)} | translated here: {len(translated)} | still missing: {len(missing)} | keys without fragment: {len(extra)}")
for key, source in missing:
    print("  MISSING", key, "|", source[:90])
for key in extra:
    print("  NO-FRAGMENT", key)
