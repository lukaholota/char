import importlib.util

S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
TITLE = 'Кривавий мисливець — класовий гайд D&D 5e 2014 (версія 2020)'
TOPICS = 'Кривавий мисливець, класовий гайд, ордени, багряні обряди, криваві прокляття, раси, мультикласування'


def load_part(number):
    spec = importlib.util.spec_from_file_location(f"part{number}", f"{S}/tr_blood-hunter-2014.part{number}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merge_parts(names):
    merged = {}
    for number in range(1, 5 + 1):
        part = getattr(load_part(number), names, {})
        duplicates = set(merged) & set(part)
        if duplicates:
            raise SystemExit(f"Duplicate {names} keys in part{number}: {sorted(duplicates)[:5]}")
        merged.update(part)
    return merged


HEADINGS = merge_parts("HEADINGS")
FRAGMENTS = merge_parts("FRAGMENTS")
