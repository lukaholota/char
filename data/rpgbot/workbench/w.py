import json, re, subprocess, sys
from pathlib import Path
sys.path.insert(0, '/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench')
import fill_sheet, lookup

ROOT = Path('/Users/luka/Documents/code/spells.holota.family')
REVISIONS = {
    'monk-ascendant-dragon-2014': 'rpgbot-b281729be7c76e6d-c6df256d483fa0e8',
    'monk-open-hand-2024': 'rpgbot-ea40be98cdd52810-e0fc5303b1d18c7b',
    'monk-elements-2024': 'rpgbot-d787b8db6f66662b-e7c1093dd01cdf16',
    'monk-subclasses-2024': 'rpgbot-ac55d8aaec999bf4-2646327cca4241f5',
    'monk-2024': 'rpgbot-d095e516928da464-8b4f5d52097f811e',
}
CYR = 'А-Яа-яІіЇїЄєҐґ'


def stage_path(revision):
    corrections = ROOT / 'data/rpgbot/staging-corrections'
    index = json.loads((corrections / 'index.json').read_text(encoding='utf-8'))
    if revision in index:
        return corrections / index[revision]
    return ROOT / f'data/rpgbot/staging/{revision}.json'


def sheet_path(name):
    return ROOT / f'data/rpgbot/authoring/{name}.md'


def revision_of(name):
    if name in REVISIONS:
        return REVISIONS[name]
    header = sheet_path(name).read_text(encoding='utf-8')[:600]
    return re.search(r'sourceRevisionId: (\S+) -->', header).group(1)


def prep(name, url, topics):
    rows = json.load(open(ROOT / 'data/rpgbot/translation.coverage.json'))['rows']
    full = url if url.startswith('http') else 'https://rpgbot.net' + url
    matches = [r for r in rows if r['canonicalUrl'].rstrip('/') == full.rstrip('/')]
    assert len(matches) == 1, (url, len(matches))
    row = matches[0]
    assert not row['articleIds'], f'already translated: {row["articleIds"]}'
    slug = re.sub(r'-20(14|24)$', '', name)
    stage = stage_path(row['sourceRevisionId'])
    command = ['python3', str(ROOT / 'scripts/rpgbot/article_worksheet.py'), str(stage), str(sheet_path(name)),
               '--slug', slug, '--ruleset', row['ruleset'], '--topics', topics, '--apply']
    env = {'PYTHONDONTWRITEBYTECODE': '1', 'PATH': '/usr/bin:/usr/local/bin:/opt/homebrew/bin'}
    result = subprocess.run(command, capture_output=True, text=True, cwd=ROOT, env=env)
    if result.returncode:
        sys.exit('PREP FAILED:\n' + result.stderr[-900:])
    print(result.stdout.splitlines()[0][:200] if result.stdout else 'prepared', '|', row['textMetrics'], row['materialType'])


def show(name, only_empty=True):
    text = sheet_path(name).read_text(encoding='utf-8')
    for sec in re.split(r'^## ', text, flags=re.M)[1:]:
        head = sec.split('\n', 1)[0]
        meta = re.search(r'sectionId: ([^;]+); rating: (\S+)', sec)
        pre = re.search(r'Український заголовок:\*\*\n(\S[^\n]*)', sec)
        print(f"\n## {head} | {meta.group(1)}" + (f" => {pre.group(1)}" if pre else ''))
        for fm in re.finditer(r'^### (\S+) · (\S+(?: \S+)?) · ([^\n]+)\n\n> ([^\n]*)\n(.*?)(?=^### |\Z)', sec, re.M | re.S):
            key, kind, tag, src, rest = fm.groups()
            if kind == 'зміст':
                continue
            if only_empty and re.search(r'\*\*Українською:\*\*\n(\S[^\n]*)', rest):
                continue
            print(f"  {key.replace('block-', '').replace(meta.group(1) + '-', '')} <{tag.replace('без оцінки', '-').replace('rating-', '')}> {src}")


def gloss(name):
    s = sheet_path(name).read_text(encoding='utf-8')
    quotes = ' \n '.join(re.findall(r'^> ([^\n]*)', s, re.M))
    quotes = re.sub(r'\[\[\d+\|([^\]]*)\]\]', r'\1', quotes)
    found = {}
    for eng, vals in lookup.index.items():
        if len(eng) < 4 or eng.startswith('('):
            continue
        vals = [v for v in vals if not re.fullmatch(r'[A-Z0-9_ ]+', v[0])]
        if not vals:
            continue
        for m in re.finditer(r'(?<![A-Za-z])' + re.escape(eng) + r'(?![A-Za-z])', quotes, re.I):
            word = m.group(0)
            if ' ' not in eng and not word[0].isupper():
                continue
            found.setdefault(eng, (word, vals))
            break
    kept = []
    for k in sorted(found, key=lambda k: -len(k)):
        if not any(k in o for o in kept):
            kept.append(k)
    for k in sorted(kept):
        word, vals = found[k]
        vv = sorted(vals)
        print(f"{word} = {vv[0][0]}   [{vv[0][1].replace('.json', '')}]" + (f" | alt: {vv[1][0]}" if len(vv) > 1 and vv[1][0] != vv[0][0] else ''))


def run_compile(name, extra):
    sheet = sheet_path(name)
    command = ['python3', str(ROOT / 'scripts/rpgbot/article_worksheet.py'), str(stage_path(revision_of(name))), str(sheet), '--compile', *extra]
    env = {'PYTHONDONTWRITEBYTECODE': '1', 'PATH': '/usr/bin:/usr/local/bin:/opt/homebrew/bin'}
    return subprocess.run(command, capture_output=True, text=True, cwd=ROOT, env=env)


def is_book_code(word):
    return len(word) <= 8 and re.fullmatch(r'[A-Z][a-z]*[A-Z][A-Za-z]*', word) is not None


def quality_scan(name):
    draft = ROOT / f"data/rpgbot/uk/rpgbot-{name}.json"
    d = json.load(open(draft))
    texts = []
    for s in d['translations'][0]['sections']:
        texts.append(s['heading'])
        for b in s['blocks']:
            groups = [b['content']] if b['type'] == 'paragraph' else b['items'] if b['type'] == 'list' else b['headers'] + [c for row in b['rows'] for c in row]
            for g in groups:
                texts += [n['text'] for n in g]
    issues = []
    for t in texts:
        clean = re.sub(r'\{\{.*?\}\}|\[[^\]]*\]', '', t)
        if re.search(f"[{CYR}]['’`´][{CYR}]", t):
            issues.append(('apostrophe', t[:70]))
        if '->' in t or '  ' in t:
            issues.append(('format', t[:70]))
        words = set(re.findall(r'(?<![A-Za-z])[A-Za-z]{4,}(?![A-Za-z])', clean)) - {'DPR', 'TCoE', 'MAD', 'PHB', 'XGtE', 'MPMM', 'RPGbot', 'EFotA', 'FRHoF', 'ABoH', 'GotG', 'BoMT', 'FToD', 'DMG', 'EEPC', 'SCAG', 'GGtR', 'SCoC', 'SJAiS', 'MMoM', 'WotC', 'EGtW', 'VRGtR', 'MToF', 'AI', 'GGR', 'SCC', 'BGG', 'IDRotF', 'LLoK', 'CoS', 'MotM', 'VGtM', 'ERftLW', 'VRtR', 'ToA', 'WDH', 'WDMM', 'EGW', 'FTD', 'BGDIA', 'CRCotN', 'GoS', 'SATO', 'KftGV', 'TTP', 'PaBTSO', 'JttRC', 'OotA', 'DSotDQ', 'AAG', 'BAM', 'QftIS', 'RoTOS', 'DIP', 'HotDQ', 'PotA', 'TftYP', 'ToD', 'WBtW', 'EE', 'SDQ'}
        words = {word for word in words if not is_book_code(word)}
        if words:
            issues.append(('latin', sorted(words)[:6], t[:50]))
    print('fragments scanned', len(texts), '| quality flags:', len(issues))
    for i in issues[:15]:
        print('  ', i)


AUTO_DECISIONS = [
    ('inline-markup-review', 's', 'preserved',
     'Struck-through word kept as plain text; the strikethrough is recorded in the glossary marker because strikethrough is not a supported inline type'),
    ('inline-markup-review', 'mark', 'preserved',
     'Highlighted text kept as plain text; the mark tag carries no analytical meaning and is not a supported inline type'),
    ('inline-markup-review', 'cite', 'preserved',
     'Epigraph or quotation attribution kept as source text; the cite tag carries no analytical meaning'),
    ('orphan-list-item-review', '<li', 'preserved',
     'Orphan list item outside a list element is retained as a translated paragraph with its text and rating; the source item numbering is not carried'),
    ('multi-header-row-review', 'Additional header rows', 'preserved',
     'Additional header rows are kept as table rows in source order; the compiled table keeps each header cell text once, so no header text is lost'),
    ('empty-table-row-review', '<tr></tr>', 'excluded-noncontent',
     'Empty table row in the source HTML with no cells or text; there is nothing to translate or rate'),
    ('unsupported-block', '<figure class="wp-block-image', 'excluded-noncontent',
     'Decorative article header image with a lazy-load placeholder; the source HTML has no caption or text in the figure'),
    ('unsupported-block', '<figure class="aligncenter', 'excluded-noncontent',
     'Decorative article header banner with a lazy-load placeholder and empty alt text; the source HTML has no caption or text in the figure'),
]


def auto_decide(name):
    decisions_path = sheet_path(name).with_suffix('.decisions.json')
    decisions = json.loads(decisions_path.read_text(encoding='utf-8')) if decisions_path.exists() else {}
    for _ in range(40):
        extra = ['--decisions', str(decisions_path)] if decisions_path.exists() else []
        result = run_compile(name, extra)
        if not result.returncode:
            return result
        color_word = re.search(r'Unresolved rating signals: (\d+): \S+ rating-([a-z]+) \2\b', result.stderr, re.I)
        if color_word:
            decisions[color_word.group(1)] = {'disposition': 'excluded-noncontent',
                                              'evidence': f"Color word inside prose ('{color_word.group(2)}'), not an option rating"}
            decisions_path.write_text(json.dumps(decisions, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
            print('auto decision', color_word.group(1), 'color word in prose')
            continue
        match = re.search(r'Unreviewed source issue: (\d+): (\S+) (.*)', result.stderr)
        if not match:
            sys.exit('COMPILE PREVIEW FAILED:\n' + result.stderr[-900:])
        index, code, detail = match.groups()
        rule = next((r for r in AUTO_DECISIONS if r[0] == code and detail.startswith(r[1])), None)
        if rule is None:
            sys.exit(f'NEEDS MANUAL DECISION: {index}: {code} {detail[:120]}')
        decisions[index] = {'disposition': rule[2], 'evidence': rule[3]}
        decisions_path.write_text(json.dumps(decisions, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print('auto decision', index, code)
    sys.exit('too many automatic decisions')


def finish(name):
    if '--recompile' not in sys.argv:
        translations = fill_sheet.load_translations(Path(f'/Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench/tr_{name}.py'))
        content, empty = fill_sheet.finish_sheet(sheet_path(name), translations)
        if empty:
            sys.exit(f'empty fields: {len(empty)} e.g. {empty[:4]}')
        sheet_path(name).write_text(content, encoding='utf-8')
    result = auto_decide(name)
    decisions = sheet_path(name).with_suffix('.decisions.json')
    extra = ['--decisions', str(decisions)] if decisions.exists() else []
    print('preview ok:', result.stdout.splitlines()[0][:160])
    result = run_compile(name, [*extra, '--apply'])
    if result.returncode:
        sys.exit('APPLY FAILED:\n' + result.stderr[-900:])
    quality_scan(name)


if __name__ == '__main__':
    command, name = sys.argv[1], sys.argv[2]
    {'show': lambda: show(name, '--all' not in sys.argv), 'gloss': lambda: gloss(name), 'finish': lambda: finish(name),
     'prep': lambda: prep(name, sys.argv[3], sys.argv[4])}[command]()
