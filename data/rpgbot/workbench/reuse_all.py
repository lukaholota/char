import collections
import glob
import re
import sys
from pathlib import Path

ROOT = Path('/Users/luka/Documents/code/spells.holota.family')
AUTHORING = ROOT / 'data/rpgbot/authoring'
PAIR = re.compile(r'^### (\S+) · (?!зміст)[^\n]+\n\n> ([^\n]+)\n\n\*\*Українською:\*\*\n([^\n].*?)\n\n(?=^### |^## |\Z)', re.M | re.S)
MIN_WORDS = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--min-words=')), '4'))


UNTRUSTED_SHEETS = {'fighter-2014.md', 'champion-2014.md', 'hexbuckler-2014.md', 'plasmoid-2014.md',
                    'super-mario-jump-2014.md', 'animating-the-dead-2014.md', 'planescape-backgrounds-feats-2014.md'}
CLASS_NAMES = {'Fighter': 'Воїн', 'Monk': 'Монах', 'Barbarian': 'Варвар', 'Bard': 'Бард', 'Cleric': 'Клірик',
               'Druid': 'Друїд', 'Paladin': 'Паладин', 'Ranger': 'Рейнджер', 'Rogue': 'Пройдисвіт',
               'Sorcerer': 'Чародій', 'Warlock': 'Чорнокнижник', 'Wizard': 'Чарівник', 'Artificer': 'Винахідник'}


def mentions_foreign_class(source, translation):
    return any(stem in translation and english.lower() not in source.lower() for english, stem in CLASS_NAMES.items())


def collect_known(target):
    known = collections.defaultdict(collections.Counter)
    for path in sorted(glob.glob(str(AUTHORING / '*-2014.md'))):
        if Path(path) == target or Path(path).name in UNTRUSTED_SHEETS:
            continue
        for match in PAIR.finditer(Path(path).read_text(encoding='utf-8')):
            if '\n### ' not in match.group(3) and not mentions_foreign_class(match.group(2), match.group(3)):
                known[match.group(2)][match.group(3)] += 1
    return known


def fill_target(target, known, show):
    lines = target.read_text(encoding='utf-8').split('\n')
    source = None
    filled = remaining = 0
    for index, line in enumerate(lines):
        if line.startswith('> '):
            source = line[2:]
        elif line == '**Українською:**' and lines[index + 1] == '' and source is not None:
            if source in known and len(source.split()) >= MIN_WORDS:
                lines[index + 1] = known[source].most_common(1)[0][0]
                filled += 1
                if show:
                    print('  +', source[:90])
            else:
                remaining += 1
    return lines, filled, remaining


if __name__ == '__main__':
    target = AUTHORING / f'{sys.argv[1]}.md'
    lines, filled, remaining = fill_target(target, collect_known(target), '--show' in sys.argv)
    if '--apply' in sys.argv:
        target.write_text('\n'.join(lines), encoding='utf-8')
    print('reused:', filled, '| still empty:', remaining)
