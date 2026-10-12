import concurrent.futures
import datetime
import json
import pathlib
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser

BASE = 'https://rpgbot.net/'
AGENT = 'CharacterCatalogInventory/0.1'
OUTPUT = pathlib.Path(__file__).resolve().with_name('inventory.json')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.geturl(), response.read().decode('utf-8', 'replace')


def normalize(url, parent=BASE):
    parsed = urllib.parse.urlsplit(urllib.parse.urljoin(parent, url))
    if parsed.hostname not in ('rpgbot.net', 'www.rpgbot.net'):
        return None
    path = parsed.path.rstrip('/') + '/'
    return urllib.parse.urlunsplit(('https', 'rpgbot.net', path, '', ''))


class ParseArticleLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.article_depth = 0
        self.title_depth = False
        self.title = ''
        self.links = set()

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'article':
            self.article_depth += 1
        if tag == 'title':
            self.title_depth = True
        if tag == 'a' and self.article_depth and attributes.get('href'):
            self.links.add(attributes['href'])

    def handle_endtag(self, tag):
        if tag == 'article':
            self.article_depth = max(0, self.article_depth - 1)
        if tag == 'title':
            self.title_depth = False

    def handle_data(self, value):
        if self.title_depth:
            self.title += value


def classify(url):
    path = urllib.parse.urlsplit(url).path
    if path.startswith('/dnd5/characters/'):
        return '2014', 'character-optimization', 'path'
    if path.startswith('/2024-dnd/'):
        core = any(path.startswith('/2024-dnd/' + section + '/') for section in ('classes', 'species', 'feats', 'backgrounds', 'spells', 'magic-items'))
        return '2024', 'character-optimization' if core else 'review', 'path'
    return None, 'review', None


def run_inventory():
    _, robots_text = fetch(BASE + 'robots.txt')
    robots = urllib.robotparser.RobotFileParser()
    robots.parse(robots_text.splitlines())
    sitemap_url = BASE + 'sitemap.xml'
    if not robots.can_fetch(AGENT, sitemap_url):
        raise RuntimeError('robots.txt disallows sitemap access')
    _, sitemap_text = fetch(sitemap_url)
    sitemap_root = ET.fromstring(sitemap_text)
    sitemap_urls = [node.text for node in sitemap_root.findall('.//{*}loc') if '/page-sitemap' in node.text or '/post-sitemap' in node.text]
    entries = {}
    fetched_sitemaps = []
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(fetch, url): url for url in sitemap_urls if robots.can_fetch(AGENT, url)}
        for future in concurrent.futures.as_completed(futures):
            url = futures[future]
            try:
                final_url, raw = future.result()
                root = ET.fromstring(raw)
                count = 0
                for item in root.findall('{*}url'):
                    loc = item.find('{*}loc')
                    canonical = normalize(loc.text) if loc is not None else None
                    if canonical is None:
                        continue
                    ruleset, scope, basis = classify(canonical)
                    if ruleset is None:
                        continue
                    lastmod = item.find('{*}lastmod')
                    entries[canonical] = {
                        'url': canonical,
                        'rulesetCandidate': ruleset,
                        'rulesetBasis': basis,
                        'scope': scope,
                        'sitemapLastModified': lastmod.text if lastmod is not None else None,
                        'sitemaps': sorted(set(entries.get(canonical, {}).get('sitemaps', []) + [url])),
                        'linkedFrom': [],
                        'httpStatus': None,
                    }
                    count += 1
                fetched_sitemaps.append({'url': url, 'finalUrl': final_url, 'matchedEntries': count})
            except Exception as error:
                errors.append({'url': url, 'error': str(error)})
    index_paths = ['dnd5/characters/', 'dnd5/characters/classes/', 'dnd5/characters/races/', 'dnd5/characters/feats/', 'dnd5/characters/spells/', '2024-dnd/', '2024-dnd/classes/', '2024-dnd/species/', '2024-dnd/feats/']
    indexes = []
    outside = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(fetch, BASE + path): BASE + path for path in index_paths if robots.can_fetch(AGENT, BASE + path)}
        for future in concurrent.futures.as_completed(futures):
            url = futures[future]
            try:
                final_url, raw = future.result()
                parser = ParseArticleLinks()
                parser.feed(raw)
                indexes.append({'url': url, 'finalUrl': final_url, 'title': parser.title, 'articleLinks': len(parser.links), 'status': 200})
                if url in entries:
                    entries[url]['httpStatus'] = 200
                    entries[url]['title'] = parser.title
                for link in parser.links:
                    canonical = normalize(link, final_url)
                    if canonical is None or canonical == url:
                        continue
                    ruleset, scope, basis = classify(canonical)
                    if ruleset is not None:
                        entry = entries.setdefault(canonical, {'url': canonical, 'rulesetCandidate': ruleset, 'rulesetBasis': basis, 'scope': scope, 'sitemapLastModified': None, 'sitemaps': [], 'linkedFrom': [], 'httpStatus': None})
                        entry['linkedFrom'] = sorted(set(entry['linkedFrom'] + [url]))
                    elif urllib.parse.urlsplit(canonical).path.startswith('/dnd5/'):
                        outside.setdefault(canonical, set()).add(url)
            except Exception as error:
                errors.append({'url': url, 'error': str(error)})
    counts = Counter((entry['rulesetCandidate'], entry['scope']) for entry in entries.values())
    report = {
        'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'mode': 'url-metadata-inventory',
        'fullArticleTextsStored': False,
        'robots': {'url': BASE + 'robots.txt', 'userAgent': AGENT, 'allowed': robots.can_fetch(AGENT, BASE + 'dnd5/characters/'), 'text': robots_text},
        'sitemapIndex': sitemap_url,
        'fetchedSitemaps': sorted(fetched_sitemaps, key=lambda item: item['url']),
        'fetchedIndexes': sorted(indexes, key=lambda item: item['url']),
        'counts': [{'rulesetCandidate': edition, 'scope': scope, 'urls': count} for (edition, scope), count in sorted(counts.items())],
        'entries': sorted(entries.values(), key=lambda item: item['url']),
        'outsideRootCandidates': [{'url': url, 'linkedFrom': sorted(parents), 'scope': 'review'} for url, parents in sorted(outside.items())],
        'errors': errors,
        'limits': ['Article availability checked only for fetchedIndexes.', 'Edition inferred from URL; cross-edition links require content review.', '2024 paths outside core categories require scope review.', 'No article text, ratings, translations or entity bindings collected.', 'No recursive traversal of every article link performed.'],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(OUTPUT), 'entries': len(entries), 'counts': report['counts'], 'outsideRootCandidates': len(outside), 'fetchedSitemaps': len(fetched_sitemaps), 'fetchedIndexes': len(indexes), 'errors': errors}, ensure_ascii=False), flush=True)


run_inventory()
