"""Fetch numbered continuation pages for already included RPGbot articles."""

import argparse
import importlib.util
import json
import pathlib
import re
import urllib.parse
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('crawl_sources', pathlib.Path(__file__).with_name('crawl-sources.py'))
crawler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(crawler)


class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        attrs = dict(attrs)
        if 'post-page-numbers' in attrs.get('class', '').split() and attrs.get('href'):
            self.urls.append(attrs['href'])


def numbered_pages(html, parent_url):
    if 'post-page-numbers' not in html:
        return []
    parser = PageLinks()
    parser.feed(html)
    parent = urllib.parse.urlsplit(parent_url)
    matches = set()
    for href in parser.urls:
        url = urllib.parse.urljoin(parent_url, href)
        parts = urllib.parse.urlsplit(url)
        if parts.scheme != parent.scheme or parts.netloc != parent.netloc:
            continue
        if re.fullmatch(re.escape(parent.path) + r'[2-9][0-9]*/', parts.path) and not parts.query and not parts.fragment:
            matches.add(url)
    return sorted(matches)


def save_supplement(directory, parent_id, url, html, checked, details, authors):
    if checked.get('finalUrl') != url or details.get('canonicalUrl') != url:
        return {'parentSourceId': parent_id, 'url': url, 'status': 'identity-review-required',
                'finalUrl': checked.get('finalUrl'), 'declaredCanonical': details.get('canonicalUrl')}
    if not authors or not details.get('contentRegionFound'):
        return {'parentSourceId': parent_id, 'url': url, 'status': 'metadata-review-required'}
    raw = html.encode('utf-8')
    page = urllib.parse.urlsplit(url).path.rstrip('/').rsplit('/', 1)[-1]
    revision_id = f'{parent_id}-page{page}-{crawler.sha256(raw)[:16]}'
    target = directory / 'source-supplements' / (revision_id + '.html')
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.read_bytes() != raw:
            raise RuntimeError('Immutable supplement collision: ' + str(target))
    else:
        with target.open('xb') as handle:
            handle.write(raw)
    record = {'parentSourceId': parent_id, 'url': url, 'revisionId': revision_id,
              'htmlFile': target.name, 'rawHtmlSha256': crawler.sha256(raw),
              'fetchedAt': checked['checkedAt'], 'authors': authors, 'title': details.get('heading') or details.get('title'),
              'sourceUpdatedAt': details.get('sourceModifiedAt'), 'contentSelector': '.entry-content'}
    record_path = target.with_suffix('.record.json')
    if record_path.exists():
        previous = json.loads(record_path.read_text(encoding='utf-8'))
        if any(previous.get(key) != record.get(key) for key in record if key != 'fetchedAt'):
            return {'parentSourceId': parent_id, 'url': url, 'status': 'metadata-review-required'}
    else:
        crawler.save_json(record_path, record)
    return {'parentSourceId': parent_id, 'url': url, 'status': 'record-ready',
            'revisionId': revision_id, 'rawHtmlSha256': crawler.sha256(raw), 'bytes': len(raw)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'data/rpgbot')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--delay', type=float, default=1.2)
    args = parser.parse_args()
    directory = args.output.resolve()
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    crawl = json.loads((directory / 'source-crawl.json').read_text(encoding='utf-8'))['checks']
    ledger_path = directory / 'source-pagination.json'
    ledger = json.loads(ledger_path.read_text(encoding='utf-8')) if ledger_path.exists() else {'schemaVersion': 1, 'checks': {}}
    queue = []
    for entry in manifest['entries']:
        if entry['disposition'] != 'included':
            continue
        check = crawl[entry['sourceId']]
        html = (directory / check['sourceFile']).read_text(encoding='utf-8')
        queue.extend((entry['sourceId'], entry['canonicalUrl'], url) for url in numbered_pages(html, entry['canonicalUrl']))
    seen = set()
    client = None
    while queue:
        parent_id, parent_url, url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        existing = ledger['checks'].get(url)
        if existing and existing['status'] == 'record-ready':
            html = (directory / 'source-supplements' / (existing['revisionId'] + '.html')).read_text(encoding='utf-8')
        elif not args.apply:
            print(json.dumps({'mode': 'preview', 'parentSourceId': parent_id, 'url': url}, ensure_ascii=False))
            continue
        else:
            if client is None:
                client = crawler.FullHtmlClient(args.delay)
                client.load_robots()
            checked, html = client.read(url)
            checked['checkedAt'] = crawler.utc_now()
            if html is None:
                result = {'parentSourceId': parent_id, 'url': url, 'status': 'fetch-failed', 'check': checked}
            else:
                details, authors = crawler.page_details(html, checked['finalUrl'])
                result = save_supplement(directory, parent_id, url, html, checked, details, authors)
            ledger['checks'][url] = result
            crawler.save_json(ledger_path, ledger)
            print(json.dumps(result, ensure_ascii=False), flush=True)
            if result['status'] != 'record-ready':
                continue
        queue.extend((parent_id, parent_url, next_url) for next_url in numbered_pages(html, parent_url))
    print(json.dumps({'mode': 'apply' if args.apply else 'preview', 'numberedUrls': len(seen),
                      'checks': len(ledger['checks'])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
