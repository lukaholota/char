"""Usage: python3 data/rpgbot/workbench/status.py > data/rpgbot/workbench/STATUS.md

Reports compiled drafts, worksheets in progress (with how much of them the tr_*.py files already cover)
and 2014 pages from the coverage ledger that have no worksheet yet.
"""
import collections
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path("/Users/luka/Documents/code/spells.holota.family")
WORKBENCH = ROOT / "data/rpgbot/workbench"
SHEETS = ROOT / "data/rpgbot/authoring"
DRAFTS = ROOT / "data/rpgbot/uk"
FRAGMENT = re.compile(r"^### (\S+) · (\S+(?: \S+)?) · [^\n]+\n\n> [^\n]*\n(.*?)(?=^### |\Z)", re.M | re.S)
ANSWER = re.compile(r"\*\*Українською:\*\*\n(\S[^\n]*)")


def load_fragments(path):
    spec = importlib.util.spec_from_file_location("t", path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except BaseException:
        return None
    return set(getattr(module, "FRAGMENTS", {}))


def collect_translated_keys(name):
    keys, files = set(), []
    for path in sorted(WORKBENCH.glob(f"tr_{name}.py")) + sorted(WORKBENCH.glob(f"tr_{name}.part*.py")):
        loaded = load_fragments(path)
        if loaded:
            keys |= loaded
            files.append(path.name)
    return keys, files


def read_sheet(path):
    text = path.read_text(encoding="utf-8")
    revision = re.search(r"sourceRevisionId: (\S+) -->", text[:600]).group(1)
    empty = [m.group(1) for m in FRAGMENT.finditer(text) if m.group(2) != "зміст" and not ANSWER.search(m.group(3))]
    return revision, empty


def main():
    ledger = json.loads((ROOT / "data/rpgbot/translation.coverage.json").read_text(encoding="utf-8"))["rows"]
    drafts = {p.stem.removeprefix("rpgbot-") for p in DRAFTS.glob("rpgbot-*.json")}
    prepared_revisions, in_progress = set(), []
    for sheet in sorted(SHEETS.glob("*.md")):
        revision, empty = read_sheet(sheet)
        prepared_revisions.add(revision)
        if sheet.stem in drafts or sheet.stem.endswith("-2024"):
            continue
        keys, files = collect_translated_keys(sheet.stem)
        covered = sum(1 for key in empty if key in keys)
        in_progress.append((sheet.stem, len(empty), covered, files))

    by_ruleset = collections.Counter("2024" if name.endswith("-2024") else "2014" for name in drafts)
    print(f"# Стан перекладу оптимізаційних статей RPGbot\n\nЧернеток скомпільовано: {len(drafts)} (2014: {by_ruleset['2014']}, 2024: {by_ruleset['2024']}).\n")
    print("## Аркуші в роботі\n")
    print("| Аркуш | Порожніх фрагментів | Уже переведено в tr-файлах | Файли |\n|---|---|---|---|")
    for name, empty, covered, files in in_progress:
        state = "готово до збирання" if empty and covered == empty else ""
        print(f"| {name} | {empty} | {covered} {state} | {', '.join(files) or '—'} |")
    waiting = [row for row in ledger if not row["articleIds"] and row["ruleset"] == "RULES_2014" and row["sourceRevisionId"] not in prepared_revisions]
    print(f"\n## Сторінки 2014 без аркуша ({len(waiting)})\n")
    grouped = collections.defaultdict(list)
    for row in waiting:
        grouped[row["materialType"]].append(row["canonicalUrl"].replace("https://rpgbot.net", ""))
    for material, urls in sorted(grouped.items()):
        print(f"- **{material}** ({len(urls)}): " + ", ".join(sorted(urls)[:60]))


if __name__ == "__main__":
    main()
