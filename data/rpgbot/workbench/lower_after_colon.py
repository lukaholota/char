"""Usage: python3 lower_after_colon.py <sheet-name> <tr-part-module> — lowercases the first word after 'label ^^)^^:' for fragments of that module."""
import importlib.util, re, shutil, sys
sys.path.insert(0, "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
import retrofit_labels as r

name, module_path = sys.argv[1], sys.argv[2]
EXCEPTIONS = {"Чарівники", "Вогнекуля", "Я"}
spec = importlib.util.spec_from_file_location("m", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
keys = set(module.FRAGMENTS)
pattern = re.compile(r"^([^\n]*?\^\^\)\^\^[^:\n]*?:\s*)(\S+)")

sheet = r.ROOT / f"data/rpgbot/authoring/{name}.md"
text = sheet.read_text(encoding="utf-8")
lines = text.split("\n")
changed, key = 0, None
for index, line in enumerate(lines):
    header = re.match(r"### (\S+) · ", line)
    if header:
        key = header.group(1)
    elif line == "**Українською:**" and key in keys:
        target = lines[index + 1]
        match = pattern.match(target)
        if match and match.group(2)[0].isupper() and match.group(2).rstrip(",.") not in EXCEPTIONS:
            word = match.group(2)
            lines[index + 1] = match.group(1) + word[0].lower() + word[1:] + target[match.end():]
            changed += 1
print("lowercased:", changed)
if "--apply" in sys.argv:
    revision = r.revision_of(text)
    draft = r.ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
    review = r.ROOT / f"data/rpgbot/reviews/{revision}.json"
    r.BACKUP.mkdir(parents=True, exist_ok=True)
    for source in (sheet, draft, review):
        shutil.copy2(source, r.BACKUP / f"{name}.lower.{source.name}")
    sheet.write_text("\n".join(lines), encoding="utf-8")
    result = r.rebuild_draft(name, revision)
    print("rebuilt" if not result.returncode else "REBUILD FAILED " + result.stderr[-300:] + result.stdout[-300:])
