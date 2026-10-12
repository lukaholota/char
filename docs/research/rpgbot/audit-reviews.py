import argparse
import concurrent.futures
import importlib.util
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('manifest', HERE / 'build-manifest.py')
manifest = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manifest)


def inspect_page(client, url):
    record, raw = client.read(url)
    record['checkedAt'] = manifest.datetime.datetime.now(manifest.datetime.timezone.utc).isoformat()
    contexts = []
    if raw is not None and 'text/html' in record.get('contentType', ''):
        parser = manifest.ParseMetadata()
        parser.feed(raw)
        record.update(parser.extract(record['finalUrl']))
        text = re.sub(r'\s+', ' ', ' '.join(parser.article_fragments or parser.fragments)).strip()
        matches = list(re.finditer(r'2014|2024|DnD\s*5\.5', text, re.I))
        record['editionMentions'] = sorted(set(match.group() for match in matches))
        for match in matches[:4]:
            contexts.append(text[max(0, match.start() - 100):match.end() + 170])
    elif raw is not None:
        record['error'] = 'non-html'
    return record, contexts


def main():
    args_parser = argparse.ArgumentParser()
    args_parser.add_argument('--audit-file', type=pathlib.Path, default=HERE / 'review-audit-2026-09-29.json')
    args_parser.add_argument('--recheck', action='append', default=[])
    args_parser.add_argument('--delay', type=float, default=1.2)
    args = args_parser.parse_args()
    current = json.loads((manifest.ROOT / 'data/rpgbot/manifest.json').read_text())
    urls = sorted({entry['canonicalUrl'] for entry in current['entries'] if entry['disposition'] == 'review'})
    snapshot_path = HERE / 'observations.json'
    snapshot = json.loads(snapshot_path.read_text())
    audit_path = args.audit_file
    audit = json.loads(audit_path.read_text()) if audit_path.exists() else {'mode': 'review-metadata-only', 'fullArticleTextsStored': False, 'requestedUrls': urls, 'checks': {}}
    urls = audit['requestedUrls']
    audit['editionMentionHintsAreNotEditionEvidence'] = True
    for url in args.recheck:
        if url not in audit['requestedUrls']:
            raise ValueError('URL not in original review audit: ' + url)
        audit['checks'].pop(url, None)
    client = manifest.FetchMetadata(args.delay)
    client.load_robots()
    audit['robots'] = {'userAgent': manifest.AGENT, 'text': client.robots_text, 'minimumDelaySeconds': client.delay}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        pending = urls[:]
        while pending:
            batch, pending = pending[:2], pending[2:]
            tasks = {url: pool.submit(inspect_page, client, url) for url in batch if url not in audit['checks']}
            for url in batch:
                if url not in tasks:
                    continue
                record, contexts = tasks[url].result()
                audit['checks'][url] = record
                snapshot['observations'][url] = record
                manifest.write_json(audit_path, audit)
                manifest.write_json(snapshot_path, snapshot)
                print(json.dumps({'url': url, 'status': record.get('httpStatus'), 'canonicalBasis': record.get('canonicalBasis'), 'edition': record.get('editionEvidence'), 'temporaryContexts': contexts}, ensure_ascii=False), flush=True)
                if record.get('httpStatus') == 429:
                    raise RuntimeError('Rate limited; audit checkpoint saved')
    print(json.dumps({'reviewUrlsAudited': len(audit['checks']), 'snapshot': str(snapshot_path)}), flush=True)


if __name__ == '__main__':
    main()
