import importlib.util

S = "/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench"
TITLE = 'Дика форма Друїда — гайд D&D 5e 2014'
TOPICS = 'Друїд, Дика форма, звірині форми, елементалі'


def load_part(number):
    spec = importlib.util.spec_from_file_location(f"part{number}", f"{S}/tr_druid-wild-shape-2014.part{number}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merge_parts(names):
    merged = {}
    for number in range(1, 2 + 1):
        part = getattr(load_part(number), names, {})
        duplicates = set(merged) & set(part)
        if duplicates:
            raise SystemExit(f"Duplicate {names} keys in part{number}: {sorted(duplicates)[:5]}")
        merged.update(part)
    return merged


HEADINGS = merge_parts("HEADINGS")
FRAGMENTS = merge_parts("FRAGMENTS")
