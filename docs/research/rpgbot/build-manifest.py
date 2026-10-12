import argparse
import datetime
import concurrent.futures
import gzip
import threading
import hashlib
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[3]
RESEARCH = ROOT / 'docs/research/rpgbot'
BASE = 'https://rpgbot.net/'
AGENT = 'CharacterCatalogInventory/0.2'
ROOT_ALLOWLIST = {'/general-tabletop/players/why-character-optimization/'}
DM_CHARACTER_ALLOWLIST = {'/dnd5/dungeonmasters/optional-class-features/', '/dnd5/dungeonmasters/dark-gifts-or-distinctive-quirks/'}
CHARACTER_TUTORIALS = {'character-optimization', 'choose-background', 'choose-race-and-class', 'choose-starting-equipment', 'choosing-ability-scores'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


def normalize(url, parent=BASE):
    parsed = urllib.parse.urlsplit(urllib.parse.urljoin(parent, url))
    if parsed.scheme not in ('http', 'https') or parsed.hostname not in ('rpgbot.net', 'www.rpgbot.net'):
        return None
    if parsed.port not in (None, 80, 443) or parsed.username:
        return None
    path = re.sub('/+', '/', parsed.path)
    if not pathlib.PurePosixPath(path).suffix:
        path = path.rstrip('/') + '/'
    return urllib.parse.urlunsplit(('https', 'rpgbot.net', path, '', ''))


def is_candidate(url):
    path = urllib.parse.urlsplit(url).path
    return (path.startswith(('/dnd5/', '/2024-dnd/', '/rpgbot.net/')) or path in ROOT_ALLOWLIST or len(path.strip('/').split('/')) == 1 and path != '/' or '&sa=' in path) and not pathlib.PurePosixPath(path).suffix


class ParseMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.title = ''
        self.heading = ''
        self.canonical = None
        self.publisher_url = None
        self.published = None
        self.article_fragments = []
        self.modified = None
        self.links = set()
        self.fragments = []
        self.has_content = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        parent_content = bool(self.stack and self.stack[-1][1])
        parent_skip = bool(self.stack and self.stack[-1][2])
        content = parent_content or 'entry-content' in attrs.get('class', '').split()
        skip = parent_skip or tag in ('script', 'style', 'nav', 'aside', 'footer') or any(
            word in attrs.get('class', '').split() for word in ('sharedaddy', 'related-posts', 'topad'))
        if content:
            self.has_content = True
        if tag == 'link' and 'canonical' in attrs.get('rel', '').split():
            self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('property') == 'og:url':
            self.publisher_url = attrs.get('content')
        if tag == 'meta' and attrs.get('property') == 'article:published_time':
            self.published = attrs.get('content')
        if tag == 'meta' and attrs.get('property') == 'article:modified_time':
            self.modified = attrs.get('content')
        if tag == 'a' and content and not skip and attrs.get('href'):
            self.links.add(attrs['href'])
        if tag not in VOID:
            self.stack.append((tag, content, skip))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        tags = [item[0] for item in self.stack]
        if 'title' in tags:
            self.title += value
        if 'h1' in tags:
            self.heading += value
        if self.stack and not self.stack[-1][2]:
            if 'article' in tags or 'main' in tags:
                self.article_fragments.append(value)
            if self.stack[-1][1]:
                self.fragments.append(value)

    def extract(self, final):
        text = re.sub(r'\s+', ' ', ' '.join(self.fragments)).strip()
        article_text = re.sub(r'\s+', ' ', ' '.join(self.article_fragments)).strip() or text
        evidence = find_edition_evidence(article_text, self.heading or self.title)
        canonical = normalize(self.canonical, final) if self.canonical else None
        basis = 'rel-canonical' if self.canonical else 'absent'
        if not self.canonical and normalize(self.publisher_url or '', final) == normalize(final) and self.publisher_url:
            canonical = normalize(final)
            basis = 'publisher-og-url-confirmed-by-http-final'
        return {'title': self.title.strip(), 'heading': self.heading.strip(),
                'canonicalUrl': canonical, 'canonicalBasis': basis,
                'publisherUrlDeclared': self.publisher_url, 'sourcePublishedAt': self.published,
                'canonicalDeclared': self.canonical, 'sourceModifiedAt': self.modified,
                'contentRegionFound': self.has_content,
                'editionEvidence': evidence,
                'links': sorted({link for href in self.links if (link := normalize(href, final)) and link != normalize(final)}),
                'topics': find_topics(text),
                'thirdPartySignals': sorted(set(re.findall(r'Kobold Press|Critical Role|Matt Mercer|Drakkenheim|Grim Hollow|Valda|Humblewood|Laserllama|Blood Hunter|MCDM|Keith Baker|Steinhardt|Tal.Dorei|Astarion', text + ' ' + self.title, re.I)))}


def find_article_edition(text, title):
    notice = re.search(r'(?:This (?:article|page|guide) (?:is for|covers|is primarily focused on) |(?:article|page|guide) covers (?:the )?)(?:the )?(2014|2024).+?\.(?!\d)', text, re.I)
    if notice:
        return {'ruleset': notice.group(1), 'basis': 'explicit-article-notice', 'excerpt': ' '.join(notice.group().split()[:25])}
    meta_notice = re.search(r'advice offered below is based on the current State of the (2014|2024) DnD[^.]*?Meta', text, re.I)
    if meta_notice:
        return {'ruleset': meta_notice.group(1), 'basis': 'explicit-article-meta-notice', 'excerpt': ' '.join(meta_notice.group().split()[:25])}
    if re.search(r'2024|5\.5', title):
        return {'ruleset': '2024', 'basis': 'explicit-article-title', 'excerpt': title}
    if re.search(r'2014', title):
        return {'ruleset': '2014', 'basis': 'explicit-article-title', 'excerpt': title}
    return {'ruleset': None, 'basis': 'unconfirmed', 'excerpt': None}


def find_edition_evidence(text, title):
    evidence = find_article_edition(text, title)
    title_edition = '2024' if re.search(r'2024|5\.5', title) else '2014' if '2014' in title else None
    if evidence['ruleset'] and title_edition and evidence['ruleset'] != title_edition:
        return {'ruleset': None, 'basis': 'conflicting-explicit-edition-evidence',
                'noticeEvidence': evidence, 'titleEvidence': {'ruleset': title_edition, 'title': title}}
    return evidence


def find_topics(text):
    patterns = {'race': r'\braces?\b|\bspecies\b', 'subrace': r'\bsubraces?\b|\blineages?\b',
                'feat': r'\bfeats?\b', 'background': r'\bbackgrounds?\b', 'spell': r'\bspells?\b',
                'magic-item': r'\bmagic items?\b', 'equipment': r'\bequipment\b|\bweapons?\b|\barmor\b',
                'multiclass': r'\bmulticlass', 'example-build': r'\bexample build|\bsample build'}
    return sorted(key for key, pattern in patterns.items() if re.search(pattern, text, re.I))


class StopRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


class CheckRobots(urllib.robotparser.RobotFileParser):
    def can_fetch(self, useragent, url):
        if self.disallow_all:
            return False
        if self.allow_all:
            return True
        if not self.last_checked:
            return False
        agent = useragent.split('/')[0].lower()
        groups = [(max((len(name) for name in entry.useragents if name.lower() in agent), default=0), entry)
                  for entry in self.entries]
        specificity = max((size for size, _ in groups), default=0)
        entries = [entry for size, entry in groups if size == specificity and size] if specificity else [self.default_entry]
        path = urllib.parse.urlsplit(url).path or '/'
        matching = []
        for entry in entries:
            if entry is None:
                continue
            for rule in entry.rulelines:
                pattern = urllib.parse.unquote(rule.path)
                regex = re.escape(pattern).replace(r'\*', '.*')
                if regex.endswith(r'\$'):
                    regex = regex[:-2] + '$'
                if re.match(regex, path):
                    matching.append((len(pattern.replace('*', '').rstrip('$')), rule.allowance))
        return max(matching, default=(0, True))[1]


class FetchMetadata:
    def __init__(self, delay):
        self.delay = max(1.0, delay)
        self.last_request = 0
        self.opener = urllib.request.build_opener(StopRedirects())
        self.robots = CheckRobots()
        self.request_lock = threading.Lock()
        self.robots_text = None
        self.requests = 0

    def request(self, url):
        with self.request_lock:
            time.sleep(max(0, self.last_request + self.delay - time.monotonic()))
            self.last_request = time.monotonic()
            self.requests += 1
        request = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept': 'text/html,application/xml,text/plain', 'Accept-Encoding': 'gzip'})
        try:
            return self.opener.open(request, timeout=30)
        except urllib.error.HTTPError as error:
            return error

    def read(self, url, bootstrap=False):
        chain = []
        current = url
        seen = set()
        for _ in range(12):
            if current in seen:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'httpStatus': None, 'error': 'redirect-loop'}, None
            seen.add(current)
            if not bootstrap and not self.robots.can_fetch(AGENT, current):
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'httpStatus': None, 'error': 'robots-disallowed'}, None
            if normalize(current) is None:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'httpStatus': None, 'error': 'off-domain-redirect'}, None
            try:
                with self.request(current) as response:
                    status = response.code
                    headers = response.headers
                    if status in (301, 302, 303, 307, 308):
                        target = urllib.parse.urljoin(current, headers.get('Location', ''))
                        chain.append({'from': current, 'to': target, 'httpStatus': status})
                        current = target
                        continue
                    record = {'requestedUrl': url, 'finalUrl': current, 'redirects': chain,
                              'httpStatus': status, 'contentType': headers.get('Content-Type', ''),
                              'etag': headers.get('ETag'), 'lastModified': headers.get('Last-Modified')}
                    raw = None
                    if status == 200:
                        body = response.read(8000000)
                        if headers.get('Content-Encoding') == 'gzip':
                            body = gzip.decompress(body)
                        raw = body.decode('utf-8', 'replace')
                    if status != 200:
                        record['error'] = 'http-error'
                    return record, raw
            except (OSError, urllib.error.URLError) as error:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'httpStatus': None, 'error': str(error)}, None
        return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'httpStatus': None, 'error': 'redirect-limit'}, None

    def load_robots(self):
        record, raw = self.read(BASE + 'robots.txt', bootstrap=True)
        if record['httpStatus'] != 200 or raw is None:
            raise RuntimeError('Cannot verify robots.txt: ' + str(record))
        self.robots_text = raw
        self.robots.parse(raw.splitlines())
        self.delay = max(self.delay, self.robots.crawl_delay(AGENT) or 0)

    def fetch_page(self, url):
        record, raw = self.read(url)
        record['checkedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if raw is not None and 'text/html' in record.get('contentType', ''):
            parser = ParseMetadata()
            parser.feed(raw)
            record.update(parser.extract(record['finalUrl']))
        elif raw is not None:
            record['error'] = 'non-html'
        return record


def find_exclusion(url):
    path = urllib.parse.urlsplit(url).path
    if path.startswith('/rpgbot.net/') or '&sa=' in path:
        return 'malformed-content-link'
    if path.startswith(('/pathfinder/', '/pf2/', '/tov/', '/video-games/')):
        return 'other-game-system'
    if not is_candidate(url):
        return 'outside-DnD-character-scope'
    if re.search(r'podcast|episode|rpgbot-news|/news/|/feed/', path, re.I):
        return 'news-or-podcast'
    if re.search(r'playtest|unearthed-arcana|transition-guide|change-log|new-backgrounds-encourage', path):
        return 'news-playtest-or-edition-change-log'
    if path in ('/about/', '/faq/', '/contact/', '/patreon/', '/privacy-policy/', '/terms-of-service/'):
        return 'site-service-page'
    if path.startswith('/dnd5/how-to-play/') and path.strip('/').split('/')[-1] not in CHARACTER_TUTORIALS:
        return 'general-rules-or-play-tutorial'
    if path.startswith('/dnd5/tools/'):
        return 'DM-tool-not-character-analysis'
    if path.startswith('/dnd5/dungeonmasters/') and path not in DM_CHARACTER_ALLOWLIST:
        return 'DM-only'
    if re.search(r'roleplay|how-to-rp-|playing-druids-naturally|playing-inspired-bards|mastering-the-magic-within|otherworldly-patrons-and-you', path):
        return 'roleplay-without-character-optimization'
    if path in ('/dnd5/', '/dnd5/players/', '/dnd5/abbreviations/', '/2024-dnd/abbreviations/'):
        return 'general-index-or-glossary'
    return None


def find_material_type(url, record):
    path = urllib.parse.urlsplit(url).path
    title = record.get('title', '').lower()
    if 'dark-gifts' in path:
        return 'character-option'
    if re.search(r'podcast|episode', path + title):
        return 'podcast'
    if re.search(r'roleplay|how-to-rp-', path + title):
        return 'roleplay'
    if re.search(r'example[-_ ]?build|\bbuild\b', path + ' ' + title):
        return 'example-build'
    if 'multiclass' in path:
        return 'multiclass'
    if 'magic-item' in path or 'replicate-magic-item' in path:
        return 'magic-item'
    for segment, kind in [('background', 'background'), ('spells', 'spell'), ('feats', 'feat'), ('races', 'race'), ('species', 'race')]:
        if segment in path:
            return 'index' if path.rstrip('/').endswith(segment) else kind
    if 'subclasses' in path:
        return 'subclass-comparison' if path.rstrip('/').endswith('subclasses') else 'subclass'
    if 'classes' in path:
        if path.rstrip('/').endswith('classes'):
            return 'index'
        return 'class' if len(path.rstrip('/').split('/')) == 5 and path.startswith('/dnd5/') or len(path.rstrip('/').split('/')) == 4 and path.startswith('/2024-dnd/') else 'class-option'
    return 'index' if path in ('/dnd5/characters/', '/2024-dnd/') else 'practical-guide'


def classify(url, record, overrides):
    exclusion = find_exclusion(url)
    if url.startswith(BASE + 'dnd5/dmsguild/') or url == BASE + 'dnd5/players/writing-homebrew-character-options/':
        exclusion = 'content-authoring-not-character-optimization'
    if not exclusion and re.search(r'podcast|rpgbot[. ]news', record.get('title', ''), re.I):
        exclusion = 'news-or-podcast'
    if exclusion:
        return 'excluded', exclusion
    if record.get('httpStatus') != 200 or record.get('error'):
        return 'review', record.get('error', 'not-checked')
    if not record.get('contentRegionFound'):
        return 'review', 'content-region-missing'
    if not record.get('canonicalUrl'):
        return 'review', 'canonical-missing-or-outside-domain'
    evidence = record.get('editionEvidence', {})
    override = overrides.get(url)
    if override:
        return override['disposition'], override['reason']
    if not evidence.get('ruleset'):
        return 'review', 'edition-evidence-conflict' if evidence.get('basis') == 'conflicting-explicit-edition-evidence' else 'edition-not-confirmed'
    if url.startswith((BASE + 'dnd5/characters/', BASE + '2024-dnd/')):
        return 'included', 'character-optimization-with-article-edition-evidence'
    return 'review', 'outside-root-content-review'


def discover_graph(seeds, observations, fetch_page, checkpoint):
    candidates = {url: dict(value) for url, value in seeds.items()}
    queue = sorted(candidates)
    visited = set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        while queue:
            batch = []
            while queue and len(batch) < 2:
                url = queue.pop(0)
                if url in visited:
                    continue
                visited.add(url)
                if not find_exclusion(url):
                    batch.append(url)
            pending = {url: pool.submit(fetch_page, url) for url in batch if url not in observations}
            for url in batch:
                if url in pending:
                    observations[url] = pending[url].result()
                    checkpoint(observations)
                    if observations[url].get('httpStatus') == 429:
                        raise RuntimeError('Rate limited; checkpoint saved. Stop and resume later: ' + url)
                record = observations[url]
                if record.get('httpStatus') != 200 or record.get('error') or re.search(r'podcast|rpgbot[. ]news', record.get('title', ''), re.I):
                    continue
                for alias in [record.get('canonicalUrl'), normalize(record.get('finalUrl', url))]:
                    if alias and is_candidate(alias) and alias not in candidates:
                        candidates[alias] = {'origins': ['canonical-or-redirect'], 'linkedFrom': [url]}
                        queue.append(alias)
                for target in record.get('links', []):
                    if not is_candidate(target):
                        continue
                    if target not in candidates:
                        candidates[target] = {'origins': ['content-link'], 'linkedFrom': []}
                        queue.append(target)
                    candidates[target]['linkedFrom'] = sorted(set(candidates[target].get('linkedFrom', []) + [url]))
    return candidates


def resolve_canonical(url, observations):
    seen = []
    while url not in seen:
        seen.append(url)
        record = observations.get(url, {})
        target = record.get('canonicalUrl') or normalize(record.get('finalUrl', url)) or url
        if target == url:
            return url
        url = target
    return min(seen[seen.index(url):])


def build_manifest(candidates, observations, overrides, previous, checked_at=None):
    groups = {}
    for url, candidate in sorted(candidates.items()):
        record = observations.get(url, {'requestedUrl': url, 'checkedAt': checked_at})
        canonical = resolve_canonical(url, observations)
        groups.setdefault(canonical, []).append((url, candidate, record))
    old_ids = {url: entry['sourceId'] for entry in previous.get('entries', []) for url in [entry['canonicalUrl']] + entry['aliases']}
    entries = []
    for canonical, members in sorted(groups.items()):
        primary = next((record for url, _, record in members if url == canonical), members[0][2])
        dispositions = [(url, *classify(url, record, overrides)) for url, _, record in members]
        disposition, reason = classify(canonical, primary, overrides)
        if (primary.get('canonicalUrl') and primary['canonicalUrl'] != canonical) or normalize(primary.get('finalUrl', canonical)) != canonical:
            disposition, reason = 'review', 'canonical-chain-needs-review'
        evidence = primary.get('editionEvidence', {'ruleset': None, 'basis': 'unconfirmed', 'excerpt': None})
        override = overrides.get(canonical, {})
        if override.get('editionEvidence'):
            evidence = override['editionEvidence']
        entries.append({'sourceId': old_ids.get(canonical) or next((old_ids[url] for url, _, _ in members if url in old_ids), 'rpgbot-' + hashlib.sha256(canonical.encode()).hexdigest()[:16]),
                        'canonicalUrl': canonical, 'aliases': sorted(({url for url, _, _ in members} | {alias for _, _, record in members for hop in record.get('redirects', []) for endpoint in ('from', 'to') if (alias := normalize(hop[endpoint]))}) - {canonical}),
                        'disposition': disposition, 'reason': reason, 'ruleset': evidence.get('ruleset'),
                        'rulesets': evidence.get('rulesets') or ([evidence['ruleset']] if evidence.get('ruleset') else []),
                        'editionEvidence': evidence, 'editionPolicy': 'preserve-section-edition-context' if len(evidence.get('rulesets', [])) > 1 else 'single-edition-or-unconfirmed', 'materialType': override.get('materialType', find_material_type(canonical, primary)),
                        'title': primary.get('title'), 'sourceModifiedAt': primary.get('sourceModifiedAt'),
                        'topics': primary.get('topics', []), 'thirdPartySignals': primary.get('thirdPartySignals', []),
                        'scopeEvidence': override.get('scopeEvidence', {'basis': 'article-title-topics-and-content-link-provenance' if primary.get('title') else 'URL-scope-policy', 'policyReason': reason}),
                        'entityBindings': 'unknown-not-part-of-KR49.1',
                        'textMetrics': {key: 'unknown' for key in ('words', 'sections', 'tables', 'ratingBlocks')},
                        'checks': [dict(record, availability='available' if record.get('httpStatus') == 200 and not record.get('error') else 'unavailable' if record.get('error') or record.get('httpStatus') else 'not-requested-scope-excluded', origins=candidate.get('origins', []), linkedFrom=candidate.get('linkedFrom', []), sitemaps=candidate.get('sitemaps', []), sitemapLastModified=candidate.get('sitemapLastModified'), rulesetCandidate=candidate.get('rulesetCandidate') or ('2024' if url.startswith(BASE + '2024-dnd/') else '2014' if url.startswith(BASE + 'dnd5/') else None), candidateDisposition=disp, candidateReason=why) for (url, candidate, record), (_, disp, why) in zip(members, dispositions)]})
    return {'schemaVersion': 1, 'mode': 'url-metadata-only', 'fullArticleTextsStored': False,
            'initialInventory': 'docs/research/rpgbot/inventory-2026-09-28.json',
            'entries': entries}


def build_diff(previous, manifest):
    before = {entry['sourceId']: entry for entry in previous.get('entries', [])}
    after = {entry['sourceId']: entry for entry in manifest['entries']}
    return {'added': sorted(after.keys() - before.keys()), 'removed': sorted(before.keys() - after.keys()),
            'changed': sorted(key for key in before.keys() & after.keys() if before[key] != after[key])}


def write_json(path, value):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def collect_seeds(inventory):
    return {normalize(item['url']): dict(item, origins=['initial-inventory']) for item in inventory['entries'] + inventory['outsideRootCandidates']}


def load_sitemaps(client, seeds):
    record, raw = client.read(BASE + 'sitemap.xml')
    if raw is None:
        raise RuntimeError('Sitemap index unavailable: ' + str(record))
    records = [record]
    maps = sorted(node.text for node in ET.fromstring(raw).findall('.//{*}loc') if re.search(r'/(page|post)-sitemap', node.text))
    for url in maps:
        record, raw = client.read(url)
        records.append(record)
        if raw is None:
            raise RuntimeError('Sitemap unavailable: ' + str(record))
        for item in ET.fromstring(raw).findall('{*}url'):
            url = normalize(item.findtext('{*}loc'))
            if url and urllib.parse.urlsplit(url).path.startswith(('/dnd5/', '/2024-dnd/')) and is_candidate(url):
                seeds.setdefault(url, {'origins': ['live-sitemap'], 'linkedFrom': []})
                seeds[url]['sitemapLastModified'] = item.findtext('{*}lastmod')
    return records


def build_coverage(manifest, candidates, snapshot):
    entries = manifest['entries']
    counts = Counter((item['disposition'], 'shared-2014-2024' if len(item.get('rulesets', [])) > 1 else item['ruleset'] or 'unknown', item['materialType']) for item in entries)
    return {'candidateUrls': len(candidates), 'uniqueSources': len(entries),
            'aliasesRemoved': len(candidates) - len(entries),
            'redirectAndCanonicalAliasesRecorded': sum(len(item['aliases']) for item in entries),
            'includedSharedSources': sum(item['disposition'] == 'included' and len(item.get('rulesets', [])) > 1 for item in entries),
            'candidateDispositions': dict(sorted(Counter(check['candidateDisposition'] for item in entries for check in item['checks']).items())),
            'dispositions': dict(sorted(Counter(item['disposition'] for item in entries).items())),
            'counts': [{'disposition': d, 'ruleset': r, 'materialType': t, 'sources': n} for (d, r, t), n in sorted(counts.items())],
            'reasons': dict(sorted(Counter(item['reason'] for item in entries).items())),
            'includedTopicCoverage': dict(sorted(Counter(topic for item in entries if item['disposition'] == 'included' for topic in item['topics']).items())),
            'unresolved': [{'url': item['canonicalUrl'], 'reason': item['reason']} for item in entries if item['disposition'] == 'review'],
            'initialCandidatesAccounted': sum('initial-inventory' in check['origins'] for item in entries for check in item['checks']),
            'newCandidateUrls': len(candidates) - 497,
            'editionPathMismatches': [{'url': check['requestedUrl'], 'pathCandidate': check['rulesetCandidate'], 'confirmedRuleset': item['ruleset']} for item in entries if item['ruleset'] for check in item['checks'] if check['rulesetCandidate'] and check['rulesetCandidate'] != item['ruleset']],
            'crossEditionLinks': [{'from': url, 'to': link, 'fromRuleset': record['editionEvidence']['ruleset'], 'toRuleset': snapshot['observations'][link]['editionEvidence']['ruleset']} for url, record in sorted(snapshot['observations'].items()) if record.get('editionEvidence', {}).get('ruleset') for link in record.get('links', []) if snapshot['observations'].get(link, {}).get('editionEvidence', {}).get('ruleset') and record['editionEvidence']['ruleset'] != snapshot['observations'][link]['editionEvidence']['ruleset']],
            'checkedRange': {'from': min((record['checkedAt'] for record in snapshot['observations'].values()), default=None), 'to': max((record['checkedAt'] for record in snapshot['observations'].values()), default=None)},
            'snapshotCapturedAt': snapshot.get('capturedAt'), 'robots': snapshot.get('robots'),
            'sitemaps': snapshot.get('sitemaps'), 'textMetrics': 'unknown: no supplied full-text corpus',
            'includedGraphClosureVerified': True,
            'crawlPolicy': 'Follow DnD content links from scope candidates, including review pages to resolve scope; never fetch excluded news, podcasts, roleplay, other systems or DM-only pages.'}


def render_coverage(coverage):
    lines = ['# KR49.1 — Покриття manifest RPGbot', '',
             'Metadata snapshot started: ' + str(coverage['snapshotCapturedAt']),
             'HTTP check range: ' + str(coverage['checkedRange']), '',
             f"Початкових кандидатів обліковано: **{coverage['initialCandidatesAccounted']} / 497**.",
             f"Усього URL: **{coverage['candidateUrls']}**; унікальних sources: **{coverage['uniqueSources']}**; aliases усунено: **{coverage['aliasesRemoved']}**.",
             f"Disposition: `{json.dumps(coverage['dispositions'], ensure_ascii=False)}`.", '',
             'Це реєстр джерел, а не підтверджена кількість самостійних статей. Індекси та comparison guides враховані окремо. Review не входить у verified included corpus. Shared sources рахуються один раз; їхні розділи й оцінки потребують власного редакційного контексту.', '',
             '## Редакція, тип і disposition', '', '| Disposition | Редакція | Тип | Sources |', '|---|---|---|---:|']
    lines.extend(f"| {row['disposition']} | {row['ruleset']} | {row['materialType']} | {row['sources']} |" for row in coverage['counts'])
    lines.extend(['', '## Причини', '', '| Причина | Sources |', '|---|---:|'])
    lines.extend(f'| {reason} | {count} |' for reason, count in coverage['reasons'].items())
    lines.extend(['', '## Теми included сторінок', '', 'Це наявність тематичних розділів у тимчасово прочитаному content region; не кількість окремих статей чи recipe builds.', '', '| Тема | Sources |', '|---|---:|'])
    lines.extend(f'| {topic} | {count} |' for topic, count in coverage['includedTopicCoverage'].items())
    lines.extend(['', '## Залишки review', '', '| URL | Причина |', '|---|---|'])
    lines.extend(f"| {row['url']} | {row['reason']} |" for row in coverage['unresolved'])
    lines.extend(['', '## Межі перевірки', '',
                  coverage['crawlPolicy'], '',
                  'Повні HTML/тексти не збережені. Words, sections, tables, rating blocks: **unknown**; немає наданого повнотекстового корпусу.',
                  'Entity bindings і повне ручне визначення сторонніх видавців належать наступним KR; thirdPartySignals у manifest є лише сигналами для їхньої перевірки.',
                  f"Cross-edition links з явними доказами редакції обох кінців: {len(coverage['crossEditionLinks'])}; path/edition mismatches: {len(coverage['editionPathMismatches'])}. Обидва списки є в coverage JSON. Посилання або URL не переносить належність статті до іншої редакції.",
                  'Scope exclusions класифіковано без завантаження явно сторонніх матеріалів; їхня HTTP-доступність невідома. Included адреси перевірені мережевим прогоном.', ''])
    return '\n'.join(lines)


def validate_manifest(manifest, inventory):
    entries = manifest['entries']
    ids = [item['sourceId'] for item in entries]
    urls = [item['canonicalUrl'] for item in entries]
    if len(ids) != len(set(ids)) or len(urls) != len(set(urls)):
        raise ValueError('Duplicate source ID or canonical URL')
    accounted = {check['requestedUrl'] for item in entries for check in item['checks']}
    initial = {normalize(item['url']) for item in inventory['entries'] + inventory['outsideRootCandidates']}
    if not initial <= accounted:
        raise ValueError('Initial candidates missing: ' + str(sorted(initial - accounted)))
    for entry in entries:
        if not all(check.get('checkedAt') for check in entry['checks']):
            raise ValueError('Missing check date: ' + entry['canonicalUrl'])
        if entry['disposition'] == 'included':
            verified = [check for check in entry['checks'] if check.get('httpStatus') == 200 and not check.get('error') and check.get('canonicalUrl') == entry['canonicalUrl'] and normalize(check.get('finalUrl', '')) == entry['canonicalUrl']]
            explicit_shared = entry.get('rulesets') == ['2014', '2024'] and entry['editionEvidence'].get('rulesets') == ['2014', '2024'] and entry['editionEvidence']['basis'] in ('explicit-cross-edition-source-references', 'explicit-edition-section-headings')
            if not verified or not (entry['ruleset'] or explicit_shared) or entry['editionEvidence']['basis'] == 'unconfirmed':
                raise ValueError('Unverified included URL: ' + entry['canonicalUrl'])


def validate_graph_closure(manifest):
    accounted = {check['requestedUrl'] for entry in manifest['entries'] for check in entry['checks']}
    missing = sorted({link for entry in manifest['entries'] if entry['disposition'] == 'included'
                      for check in entry['checks'] for link in check.get('links', [])
                      if is_candidate(link) and link not in accounted})
    if missing:
        raise ValueError('Included content links not accounted: ' + str(missing))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--recheck-unconfirmed', action='store_true')
    parser.add_argument('--delay', type=float, default=1.2)
    parser.add_argument('--snapshot', type=pathlib.Path, default=RESEARCH / 'observations.json')
    parser.add_argument('--output', type=pathlib.Path, default=RESEARCH / 'manifest.preview.json')
    parser.add_argument('--previous', type=pathlib.Path, default=ROOT / 'data/rpgbot/manifest.json')
    args = parser.parse_args()
    inventory = json.loads((RESEARCH / 'inventory-2026-09-28.json').read_text())
    snapshot = json.loads(args.snapshot.read_text()) if args.snapshot.exists() else {'observations': {}}
    observations = snapshot['observations']
    seeds = collect_seeds(inventory)
    if args.live:
        client = FetchMetadata(args.delay)
        client.load_robots()
        snapshot['robots'] = {'userAgent': AGENT, 'text': client.robots_text, 'minimumDelaySeconds': client.delay}
        snapshot['capturedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        snapshot['sitemaps'] = load_sitemaps(client, seeds)
        snapshot['seeds'] = seeds
        if args.refresh:
            observations.clear()
        elif args.recheck_unconfirmed:
            observations = {url: record for url, record in observations.items() if record.get('editionEvidence', {}).get('ruleset') or record.get('httpStatus') != 200}
        def checkpoint(value):
            snapshot['observations'] = value
            write_json(args.snapshot, snapshot)
            if len(value) % 25 == 0:
                print(json.dumps({'checked': len(value), 'lastUrl': next(reversed(value))}), flush=True)
        fetch_page = client.fetch_page
    else:
        if 'seeds' not in snapshot:
            raise RuntimeError('Replay requires a live metadata snapshot')
        seeds = snapshot['seeds']
        def fetch_page(url):
            raise RuntimeError('Incomplete snapshot: ' + url)
        def checkpoint(value):
            pass
    for url, candidate in snapshot.get('candidates', {}).items():
        seeds.setdefault(url, candidate)
    candidates = discover_graph(seeds, observations, fetch_page, checkpoint)
    for url in observations:
        candidates.setdefault(url, {'origins': ['previous-metadata-observation'], 'linkedFrom': sorted(parent for parent, record in observations.items() if url in record.get('links', []))})
    if args.live:
        snapshot['candidates'] = candidates
        write_json(args.snapshot, snapshot)
    override_path = RESEARCH / 'scope-overrides.json'
    overrides = json.loads(override_path.read_text()) if override_path.exists() else {}
    previous = json.loads(args.previous.read_text()) if args.previous.exists() else {}
    manifest = build_manifest(candidates, observations, overrides, previous, snapshot.get('capturedAt'))
    manifest['collection'] = {'capturedAt': snapshot.get('capturedAt'), 'metadataSnapshotSha256': hashlib.sha256(args.snapshot.read_bytes()).hexdigest(), 'initialInventorySha256': hashlib.sha256((RESEARCH / 'inventory-2026-09-28.json').read_bytes()).hexdigest(), 'userAgent': snapshot.get('robots', {}).get('userAgent'), 'toolingSha256': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(), 'scopeOverridesSha256': hashlib.sha256(override_path.read_bytes()).hexdigest() if override_path.exists() else None}
    validate_manifest(manifest, inventory)
    validate_graph_closure(manifest)
    coverage = build_coverage(manifest, candidates, snapshot)
    write_json(args.output, manifest)
    write_json(args.output.with_suffix('.diff.json'), build_diff(previous, manifest))
    write_json(args.output.with_suffix('.coverage.json'), coverage)
    args.output.with_suffix('.coverage.md').write_text(render_coverage(coverage))
    print(json.dumps({key: coverage[key] for key in ('candidateUrls', 'uniqueSources', 'aliasesRemoved', 'dispositions', 'initialCandidatesAccounted')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
