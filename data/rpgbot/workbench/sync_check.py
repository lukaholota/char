"""Usage: python3 sync_check.py <slug> — compares the Ukrainian fields of the sheet with tr_<slug>.py FRAGMENTS."""
import importlib.util, re, sys
S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
slug = sys.argv[1]
spec = importlib.util.spec_from_file_location("t", f"{S}/tr_{slug}.py"); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
text = open(f"/Users/luka/Documents/code/spells.holota.family/data/rpgbot/authoring/{slug}.md", encoding="utf-8").read()
fields = {}
for block in re.finditer(r"^### (\S+) · [^\n]+\n\n> [^\n]*\n\n\*\*Українською:\*\*\n(.*?)(?=\n\n### |\n\n## |\Z)", text, re.M | re.S):
    fields[block.group(1)] = block.group(2).strip()
norm = lambda s: re.sub(r"['’`´](?=[А-Яа-яІіЇїЄєҐґ])|(?<=[А-Яа-яІіЇїЄєҐґ])['’`´]", "ʼ", s).strip()
diff = [k for k, v in m.FRAGMENTS.items() if k in fields and norm(v) != fields[k]]
print(f"{slug}: {len(m.FRAGMENTS)} keys, {len(diff)} differ", diff[:5])
