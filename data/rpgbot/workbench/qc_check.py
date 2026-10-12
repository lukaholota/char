"""Usage: python3 qc_check.py <slug> [--no-canon] — read-only checks of the Ukrainian fields of a worksheet.

ERROR lines must be fixed; CANON lines point at forms that differ from the project catalog (qc_canon.py).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/luka/Documents/code/spells.holota.family")
WORKBENCH = ROOT / "data/rpgbot/workbench"
sys.path.insert(0, str(WORKBENCH))
import qc_canon
import refs

CYR = "А-Яа-яІіЇїЄєҐґ"
LIST_MARKER_END = re.compile(r"(?:^|\s)(?:[А-ЯІЇЄҐA-Z]|\d{1,2})\)$")
PAIRED_LABEL_START = re.compile(r"^\{\{[^{}|]+\|([^{}|]+)\}\}(?=:|\s?\[\[| \^\^\(| " + refs.BOOK_CODE + ")")
ALLOWED_LATIN = {"DPR", "TCoE", "MAD", "PHB", "XGtE", "MPMM", "RPGbot", "RPGBOT", "DMG", "SCAG", "AI", "XP", "SRD", "NPC", "DM",
                 "RAW", "DMsGuild", "Wizards", "Coast", "LLC", "UA", "PHB", "MM", "Kickstarter", "MonkeyDM", "dScryb"}


FRAGMENT_LABEL = "**Українською:**\n"
FRAGMENT_HEADER = re.compile(r"### (\S+)(?: · ([^\n]+))?\n")
BLOCK_START = re.compile(r"^(?=#{2,3} )", re.M)


def read_fields(slug):
    text = (ROOT / f"data/rpgbot/authoring/{slug}.md").read_text(encoding="utf-8")
    fields, english = read_fragments(text)
    for block in re.finditer(r"<!-- sectionId: ([^;]+);[^\n]*-->\n\n\*\*Український заголовок:\*\*\n([^\n]*)", text):
        fields[f"heading:{block.group(1)}"] = block.group(2).strip()
    return fields, english


def read_fragments(text):
    fields, english = {}, {}
    for block in BLOCK_START.split(text):
        header = FRAGMENT_HEADER.match(block)
        if not header or FRAGMENT_LABEL not in block:
            continue
        key, kind = header.group(1), header.group(2) or ""
        if kind.startswith("зміст"):
            continue
        before_label, ukrainian = block.split(FRAGMENT_LABEL, 1)
        source = re.search(r"^> ([^\n]*)", before_label, re.M)
        fields[key] = ukrainian.strip()
        english[key] = source.group(1) if source else ""
    return fields, english


def run_marker_check(slug, fields):
    scratch = WORKBENCH / f"frag_tmp_qc_{slug}.json"
    scratch.write_text(json.dumps(fields, ensure_ascii=False), encoding="utf-8")
    try:
        result = subprocess.run(["bun", str(WORKBENCH / "check_markers.ts"), str(scratch)], capture_output=True, text=True, cwd=ROOT)
    finally:
        scratch.unlink(missing_ok=True)
    return result.stdout.strip().splitlines()


def strip_known_latin(text):
    text = re.sub(r"\{\{.*?\}\}", " ", text)
    text = re.sub(r"\[\[\d+\|[^\]]*\]\]", " ", text)
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = text.replace("Wizards of the Coast", " ")
    return text


def has_unbalanced_parentheses(text):
    depth = 0
    for match in re.finditer(r"[()]", text):
        if match.group() == "(":
            depth += 1
        elif depth > 0:
            depth -= 1
        elif not LIST_MARKER_END.search(text[:match.end()]):
            return True
    return depth != 0


def check_field(key, text, english):
    problems = []
    if not text:
        if english.strip():
            problems.append(("ERROR", key, "EMPTY translation"))
        return problems
    if re.search(r"<<|>>", text):
        problems.append(("ERROR", key, "unexpanded token " + re.search(r"<<[^>]*>>?", text).group(0)))
    if re.search(rf"[{CYR}]['’`´][{CYR}]", text):
        problems.append(("ERROR", key, "apostrophe must be ʼ: " + re.search(rf".{{0,12}}[{CYR}]['’`´][{CYR}].{{0,8}}", text).group(0)))
    if text.count("{{") != text.count("}}"):
        problems.append(("ERROR", key, "unbalanced {{ }}"))
    if text.count("«") != text.count("»"):
        problems.append(("ERROR", key, "unbalanced « »"))
    if has_unbalanced_parentheses(text):
        problems.append(("ERROR", key, "unbalanced ( )"))
    if re.search(r"<(?:red|orange|green|blue)", text):
        problems.append(("ERROR", key, "colour tag in text"))
    nested = re.search(r"\[\[\d+\|[^\[\]]*\[[^\[\]]+\][^\[\]]*\]\]", text)
    if nested:
        problems.append(("ERROR", key, "[English] tail inside link text breaks the link; put it after ]]: " + nested.group(0)[:80]))
    duplicate = re.search(r"(\S+(?: \S+){0,5})\{\{\1\|[^{}]+\}\}", text)
    if duplicate:
        problems.append(("ERROR", key, "paired marker repeats the plain text before it: " + duplicate.group(0)[:90]))
    paired_label = PAIRED_LABEL_START.match(text)
    if paired_label and refs.has_source_lead_in(english, paired_label.group(1)):
        problems.append(("ERROR", key, "paired marker at the start also covers an introductory phrase: " + text[:80]))
    plain = strip_known_latin(text)
    for match in re.finditer(r"(?<![A-Za-z])[A-Za-z][A-Za-z'’\-]{2,}(?![A-Za-z])", plain):
        if match.group(0) not in ALLOWED_LATIN:
            problems.append(("LATIN", key, f"{match.group(0)} … {plain[max(0, match.start() - 25):match.end() + 20]!r}"))
    if re.search(rf"[A-Za-z]+[{CYR}]|[{CYR}]+[A-Za-z]", plain):
        problems.append(("ERROR", key, "mixed Latin/Cyrillic word: " + re.search(rf"\S*(?:[A-Za-z]+[{CYR}]|[{CYR}]+[A-Za-z])\S*", plain).group(0)))
    if "  " in text:
        problems.append(("WARN", key, "double space"))
    if re.search(r"\s[,.;:!?](?!\.)", text):
        problems.append(("WARN", key, "space before punctuation: " + re.search(r".{0,15}\s[,.;:!?].{0,6}", text).group(0)))
    return problems


def main():
    slug = sys.argv[1]
    fields, english = read_fields(slug)
    problems = []
    for key, text in fields.items():
        problems += check_field(key, text, english.get(key, "x"))
    marker_lines = run_marker_check(slug, fields)
    flagged = [line for line in marker_lines if not line.startswith("flagged: ")]
    for line in flagged:
        problems.append(("ERROR", "marker", line.strip()))
    canon = []
    if "--no-canon" not in sys.argv:
        for key, text in fields.items():
            for form, advice in qc_canon.find_canon_violations(text, english.get(key, "")):
                canon.append(("CANON", key, f"«{form}» → {advice}"))
    errors = [p for p in problems if p[0] == "ERROR"]
    for severity, key, message in problems + canon:
        print(f"{severity:5} {key} | {message}")
    print(f"{slug}: fields={len(fields)} errors={len(errors)} latin/warn={len(problems) - len(errors)} canon={len(canon)}")
    print("OK" if not errors else "FIX ERRORS")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
