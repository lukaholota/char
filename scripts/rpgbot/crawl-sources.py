"""Fetch full HTML for the manifest's included RPGbot URLs, with resumable checkpoints."""

import argparse
import datetime
import gzip
import hashlib
import importlib.util
import json
import pathlib
import re
import urllib.error
import urllib.parse
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST_TOOL = ROOT / 'docs/research/rpgbot/build-manifest.py'
SPEC = importlib.util.spec_from_file_location('rpgbot_manifest_tool', MANIFEST_TOOL)
manifest_tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manifest_tool)


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


class PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.authors = []
        self.ldjson = []
        self.in_ldjson = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name', '').lower() == 'author' and attrs.get('content'):
            self.authors.append(attrs['content'].strip())
        if tag == 'script' and attrs.get('type', '').lower() == 'application/ld+json':
            self.in_ldjson = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_ldjson = False

    def handle_data(self, data):
        if self.in_ldjson:
            self.ldjson.append(data)

    def get_authors(self):
        names = self.authors[:]
        for chunk in self.ldjson:
            try:
                value = json.loads(chunk)
            except json.JSONDecodeError:
                continue
            for node in walk_json(value):
                if not isinstance(node, dict) or node.get('@type') not in ('Article', 'BlogPosting', 'NewsArticle'):
                    continue
                authors = node.get('author', [])
                for author in authors if isinstance(authors, list) else [authors]:
                    name = author.get('name') if isinstance(author, dict) else author if isinstance(author, str) else None
                    if isinstance(name, str) and name.strip():
                        names.append(name.strip())
        return sorted(set(names))


def walk_json(value):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk_json(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_json(child)


class FullHtmlClient(manifest_tool.FetchMetadata):
    MAX_BODY = 20_000_000

    def read(self, url, bootstrap=False):
        current = url
        chain = []
        seen = set()
        for _ in range(12):
            if current in seen:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'error': 'redirect-loop'}, None
            seen.add(current)
            if not bootstrap and not self.robots.can_fetch(manifest_tool.AGENT, current):
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'error': 'robots-disallowed'}, None
            if manifest_tool.normalize(current) is None:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'error': 'off-domain-redirect'}, None
            try:
                with self.request(current) as response:
                    status = response.code
                    if status in (301, 302, 303, 307, 308):
                        target = urllib.parse.urljoin(current, response.headers.get('Location', ''))
                        chain.append({'from': current, 'to': target, 'httpStatus': status})
                        current = target
                        continue
                    result = {'requestedUrl': url, 'finalUrl': current, 'redirects': chain,
                              'httpStatus': status, 'contentType': response.headers.get('Content-Type', ''),
                              'etag': response.headers.get('ETag'), 'lastModified': response.headers.get('Last-Modified')}
                    if status != 200 or not bootstrap and 'text/html' not in result['contentType']:
                        result['error'] = 'non-html-or-http-error'
                        return result, None
                    body = response.read(self.MAX_BODY + 1)
                    if len(body) > self.MAX_BODY:
                        result['error'] = 'body-too-large'
                        return result, None
                    if response.headers.get('Content-Encoding') == 'gzip':
                        body = gzip.decompress(body)
                    if len(body) > self.MAX_BODY:
                        result['error'] = 'decoded-body-too-large'
                        return result, None
                    try:
                        return result, body.decode('utf-8')
                    except UnicodeDecodeError:
                        result['error'] = 'utf8-decode-error'
                        return result, None
            except (OSError, urllib.error.URLError) as error:
                return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'error': str(error)}, None
        return {'requestedUrl': url, 'finalUrl': current, 'redirects': chain, 'error': 'redirect-limit'}, None


def page_details(html, final_url):
    parsed = manifest_tool.ParseMetadata()
    parsed.feed(html)
    details = parsed.extract(final_url)
    metadata = PageMetadata()
    metadata.feed(html)
    return details, metadata.get_authors()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def save_source(directory, source_id, html):
    encoded = html.encode('utf-8')
    revision_id = source_id + '-' + sha256(encoded)[:16]
    path = directory / 'source' / (revision_id + '.html')
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != encoded:
            raise RuntimeError('Immutable source collision: ' + str(path))
    else:
        with path.open('xb') as handle:
            handle.write(encoded)
    return revision_id, path


def save_record(directory, entry, checked, details, authors, revision_id, source_path):
    title = details.get('heading') or details.get('title') or entry.get('title')
    if not title or not authors or not details.get('contentRegionFound'):
        return 'metadata-review-required'
    record = {'sourceId': entry['sourceId'], 'canonicalUrl': entry['canonicalUrl'],
              'htmlFile': source_path.name, 'contentSelector': '.entry-content',
              'fetchedAt': checked['checkedAt'], 'authors': authors, 'title': title,
              'provenance': {'kind': 'owner-requested-crawl',
                             'evidence': 'Owner explicitly requested the RPGbot full-text crawl on 2026-09-29'}}
    if details.get('sourceModifiedAt'):
        try:
            datetime.datetime.fromisoformat(details['sourceModifiedAt'].replace('Z', '+00:00'))
            record['sourceUpdatedAt'] = details['sourceModifiedAt']
        except ValueError:
            pass
    for source_name, destination in [('etag', 'etag'), ('lastModified', 'lastModified')]:
        if checked.get(source_name):
            record[destination] = checked[source_name]
    record_path = directory / 'source' / (revision_id + '.record.json')
    if record_path.exists():
        previous = json.loads(record_path.read_text(encoding='utf-8'))
        stable_fields = ('sourceId', 'canonicalUrl', 'htmlFile', 'contentSelector', 'authors', 'title', 'provenance', 'sourceUpdatedAt')
        if any(previous.get(field) != record.get(field) for field in stable_fields):
            return 'metadata-review-required'
    else:
        save_json(record_path, record)
    return 'record-ready'


def crawl_one(client, directory, entry):
    checked, html = client.read(entry['canonicalUrl'])
    checked['checkedAt'] = utc_now()
    if html is None:
        return dict(checked, sourceId=entry['sourceId'], status='fetch-failed')
    details, authors = page_details(html, checked['finalUrl'])
    expected = entry['canonicalUrl']
    if manifest_tool.normalize(checked['finalUrl']) != expected or details.get('canonicalUrl') != expected:
        return dict(checked, sourceId=entry['sourceId'], status='identity-review-required',
                    declaredCanonical=details.get('canonicalUrl'), declaredCanonicalBasis=details.get('canonicalBasis'))
    revision_id, source_path = save_source(directory, entry['sourceId'], html)
    status = save_record(directory, entry, checked, details, authors, revision_id, source_path)
    return dict(checked, sourceId=entry['sourceId'], status=status, revisionId=revision_id,
                sourceFile=str(source_path.relative_to(directory)), rawHtmlSha256=sha256(html.encode('utf-8')),
                bytes=len(html.encode('utf-8')), authors=authors, title=details.get('heading') or details.get('title'),
                sourceModifiedAt=details.get('sourceModifiedAt'), contentRegionFound=details.get('contentRegionFound'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'data/rpgbot')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--delay', type=float, default=1.2)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    directory = args.output.resolve()
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    included = sorted((entry for entry in manifest['entries'] if entry['disposition'] == 'included'),
                      key=lambda entry: entry['sourceId'])
    ledger_path = directory / 'source-crawl.json'
    ledger = json.loads(ledger_path.read_text(encoding='utf-8')) if ledger_path.exists() else {'schemaVersion': 1, 'checks': {}}
    client = FullHtmlClient(args.delay)
    client.load_robots()
    ledger['robots'] = {'checkedAt': utc_now(), 'userAgent': manifest_tool.AGENT,
                        'sha256': sha256(client.robots_text.encode('utf-8')), 'minimumDelaySeconds': client.delay}
    pending = [entry for entry in included if args.refresh or entry['sourceId'] not in ledger['checks']
               or ledger['checks'][entry['sourceId']]['status'] == 'fetch-failed']
    if args.limit is not None:
        pending = pending[:args.limit]
    print(json.dumps({'included': len(included), 'pending': len(pending), 'robots': ledger['robots']}, ensure_ascii=False), flush=True)
    for index, entry in enumerate(pending, 1):
        result = crawl_one(client, directory, entry)
        ledger['checks'][entry['sourceId']] = result
        save_json(ledger_path, ledger)
        print(json.dumps({'done': index, 'of': len(pending), 'sourceId': entry['sourceId'],
                          'status': result['status'], 'bytes': result.get('bytes'), 'error': result.get('error')}, ensure_ascii=False), flush=True)
        if result.get('httpStatus') == 429:
            raise RuntimeError('Rate limited; checkpoint saved')
    counts = {}
    for item in ledger['checks'].values():
        counts[item['status']] = counts.get(item['status'], 0) + 1
    print(json.dumps({'checked': len(ledger['checks']), 'counts': counts}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
