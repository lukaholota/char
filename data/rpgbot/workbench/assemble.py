"""Usage: python3 assemble.py <slug> <part-count> "<TITLE>" "<TOPICS>"

Writes tr_<slug>.py that merges tr_<slug>.part1.py … partN.py (HEADINGS and FRAGMENTS) and fails on duplicate keys.
"""
import sys

S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
slug, count, title, topics = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]

source = f'''import importlib.util

S = "{S}"
TITLE = {title!r}
TOPICS = {topics!r}


def load_part(number):
    spec = importlib.util.spec_from_file_location(f"part{{number}}", f"{{S}}/tr_{slug}.part{{number}}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merge_parts(names):
    merged = {{}}
    for number in range(1, {count} + 1):
        part = getattr(load_part(number), names, {{}})
        duplicates = set(merged) & set(part)
        if duplicates:
            raise SystemExit(f"Duplicate {{names}} keys in part{{number}}: {{sorted(duplicates)[:5]}}")
        merged.update(part)
    return merged


HEADINGS = merge_parts("HEADINGS")
FRAGMENTS = merge_parts("FRAGMENTS")
'''
open(f"{S}/tr_{slug}.py", "w", encoding="utf-8").write(source)
print("assembled", slug, "from", count, "parts")
