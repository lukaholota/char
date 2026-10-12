"""Usage: python3 plan_parts.py <sheet-name> <parts>  — balanced split of empty fragments by consecutive sections."""
import re, sys
SHEETS = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/authoring"
name, parts = sys.argv[1], int(sys.argv[2])
text = open(f"{SHEETS}/{name}.md", encoding="utf-8").read()
counts = []
for block in re.split(r"^## ", text, flags=re.M)[1:]:
    section_id = re.search(r"sectionId: ([^;]+);", block).group(1)
    empty = 0
    for m in re.finditer(r"^### (\S+) · (\S+(?: \S+)?) · [^\n]+\n\n> ([^\n]*)\n(.*?)(?=^### |\Z)", block, re.M | re.S):
        if m.group(2) != "зміст" and not re.search(r"\*\*Українською:\*\*\n(\S[^\n]*)", m.group(4)):
            empty += 1
    counts.append((section_id, empty))
total = sum(c for _, c in counts)
target = total / parts
groups, current, size = [], [], 0
for section_id, empty in counts:
    current.append((section_id, empty)); size += empty
    if size >= target and len(groups) < parts - 1:
        groups.append(current); current, size = [], 0
groups.append(current)
print(f"{name}: {total} empty fragments")
for i, g in enumerate(groups, 1):
    print(f"  part{i}: {sum(c for _, c in g)} | " + " ".join(s for s, _ in g))
