"""Usage: python3 refresh_tags.py <sheet-name>... [--apply]

Re-runs the worksheet planner into a temp file and rewrites only the rating tags (fragment headers and section comments)
of the existing sheet when the planner now assigns different ones. Translations are untouched.
"""
import re, subprocess, sys
from pathlib import Path
sys.path.insert(0, "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
import w

HEADER = re.compile(r"^### (\S+) · ([^\n]+?) · ([^\n]+)$", re.M)
SECTION = re.compile(r"^<!-- sectionId: ([^;]+); rating: (\S+) -->$", re.M)


def fresh_sheet(name, text):
    header = text[:800]
    fields = {key: re.search(rf"<!-- {key}: ([^\n]*?) -->", header).group(1) for key in ("articleSlug", "ruleset", "topics")}
    temp = Path(f"{w.ROOT}/data/rpgbot/authoring/.refresh-{name}.md")
    command = ["python3", str(w.ROOT / "scripts/rpgbot/article_worksheet.py"), str(w.stage_path(w.revision_of(name))), str(temp),
               "--slug", fields["articleSlug"], "--ruleset", fields["ruleset"], "--topics", fields["topics"], "--apply"]
    result = subprocess.run(command, capture_output=True, text=True, cwd=w.ROOT, env={"PYTHONDONTWRITEBYTECODE": "1", "PATH": "/usr/bin:/usr/local/bin:/opt/homebrew/bin"})
    if result.returncode:
        raise SystemExit("PLAN FAILED " + result.stderr[-300:])
    fresh = temp.read_text(encoding="utf-8")
    temp.unlink()
    return fresh


def refresh(name, apply):
    sheet = w.sheet_path(name)
    text = sheet.read_text(encoding="utf-8")
    fresh = fresh_sheet(name, text)
    new_tags = {m.group(1): (m.group(2), m.group(3)) for m in HEADER.finditer(fresh)}
    new_sections = {m.group(1): m.group(2) for m in SECTION.finditer(fresh)}
    changes = []

    def patch_header(match):
        key, kind, tag = match.groups()
        if key in new_tags and new_tags[key] != (kind, tag):
            changes.append((key, tag, new_tags[key][1]))
            return f"### {key} · {new_tags[key][0]} · {new_tags[key][1]}"
        return match.group(0)

    def patch_section(match):
        section, rating = match.groups()
        if section in new_sections and new_sections[section] != rating:
            changes.append((section, rating, new_sections[section]))
            return f"<!-- sectionId: {section}; rating: {new_sections[section]} -->"
        return match.group(0)

    patched = SECTION.sub(patch_section, HEADER.sub(patch_header, text))
    print(f"{name}: {len(changes)} tag changes", changes[:3])
    if apply and changes:
        sheet.write_text(patched, encoding="utf-8")


if __name__ == "__main__":
    for item in [a for a in sys.argv[1:] if not a.startswith("--")]:
        refresh(item, "--apply" in sys.argv)
