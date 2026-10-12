"""Expands reference tokens in translation files.

<<Mage Armor>>            spell, catalog form: Обладунок мага [Mage Armor]
<<Mage Armor|Обладунку мага>>  spell with a declined Ukrainian form
<<m:Hat of Wizardry>>     item/feat marker: Капелюх чарівництва{{Hat of Wizardry}}
<<q:Metamagic Adept>>     quoted marker: «Адепт метамагії»{{Metamagic Adept}}
<<c:Acid Splash>>        plain spell name for table cells: Кислотні бризки
Add |форма after the English name to decline the Ukrainian part.
"""
import re
import sys

sys.path.insert(0, "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench")
import lookup

THING_FILES = ["feats.json", "magicItems.json", "classes.json", "races.json", "weapons.json", "armor.json",
               "backgrounds.json", "creator-content-2014.json", "creatures.json", "dictionary.json"]
TOKEN = re.compile(r"<<(?:(?P<kind>[mqc]):)?(?P<english>[^<>|]+?)(?:\|(?P<form>[^<>]+))?>>")
ENUM_LIKE = re.compile(r"[A-Z0-9_ ]+")
BRACKET_TAIL = re.compile(r"\s*\[([^\]]+)\]\s*$")


def find_spell(english):
    entries = lookup.index.get(english.strip().lower(), set())
    for ukrainian, source in sorted(entries):
        if source == "spells.json" and BRACKET_TAIL.search(ukrainian):
            return ukrainian
    for ukrainian, source in sorted(entries):
        if BRACKET_TAIL.search(ukrainian) and not ENUM_LIKE.fullmatch(ukrainian):
            return ukrainian
    return None


def find_thing(english):
    entries = lookup.index.get(english.strip().lower(), set())
    candidates = [(ukrainian, source) for ukrainian, source in entries if not ENUM_LIKE.fullmatch(ukrainian)]
    for preferred in THING_FILES:
        for ukrainian, source in sorted(candidates):
            if source == preferred:
                return BRACKET_TAIL.sub("", ukrainian)
    return None


def build_spell(english, form):
    catalog = find_spell(english)
    if catalog is None:
        return None
    if form is None:
        return catalog
    return f"{form} [{BRACKET_TAIL.search(catalog).group(1)}]"


def build_plain_spell(english, form):
    catalog = find_spell(english)
    if catalog is None:
        return None
    return form or BRACKET_TAIL.sub("", catalog)


def build_marked(english, form, quoted):
    ukrainian = form or find_thing(english)
    if ukrainian is None:
        return None
    if quoted:
        return f"«{ukrainian}»{{{{{english}}}}}"
    if len(ukrainian.split()) != len(english.split()) or ukrainian.endswith(")"):
        return f"{{{{{ukrainian}|{english}}}}}"
    return f"{ukrainian}{{{{{english}}}}}"


def expand(text, missing):
    def replace(match):
        english, form, kind = match.group("english").strip(), match.group("form"), match.group("kind")
        if kind is None:
            built = build_spell(english, form)
        elif kind == "c":
            built = build_plain_spell(english, form)
        else:
            built = build_marked(english, form, kind == "q")
        if built is None:
            missing.add(f"{kind or 's'}:{english}")
            return match.group(0)
        return built

    return TOKEN.sub(replace, text)


BOOK_CODE = r"\([A-Z][a-z]*[A-Z][A-Za-z]*\)"
LABEL_START = re.compile(r"^([^{}|:«»()\[\]*.;!?\n]+?)\{\{([^{}|]+)\}\}(?=:|\s?\[\[| \^\^\(| " + BOOK_CODE + ")")
SOURCE_LABEL_END = re.compile(r":|\^\^|\[\[")
TRAILING_BOOK_CODE = re.compile(r"\s*" + BOOK_CODE + "$")
COLOR_TAG = re.compile(r"<(?:red|orange|green|blue)>\s*")


def normalize_label(text):
    return " ".join(text.replace("’", "'").replace("ʼ", "'").lower().split())


def read_source_label(source):
    label = SOURCE_LABEL_END.split(COLOR_TAG.sub("", source), 1)[0]
    return normalize_label(TRAILING_BOOK_CODE.sub("", label))


def is_whole_source_label(source, original):
    return read_source_label(source) == normalize_label(original)


def has_source_lead_in(source, original):
    return read_source_label(source).endswith(" " + normalize_label(original))


def pair_label_marker(text, source=None):
    match = LABEL_START.match(text)
    if not match or source is None:
        return text
    ukrainian, original = match.group(1).strip(), match.group(2)
    if not is_whole_source_label(source, original) or not needs_paired_form(ukrainian, original):
        return text
    return "{{%s|%s}}" % (ukrainian, original) + text[match.end():]


def needs_paired_form(ukrainian, original):
    return len(ukrainian.split()) != len(original.split()) or "," in ukrainian


def expand_all(fragments):
    missing = set()
    expanded = {key: expand(value, missing) for key, value in fragments.items()}
    if missing:
        raise SystemExit(f"UNRESOLVED REFS: {sorted(missing)}")
    return expanded
