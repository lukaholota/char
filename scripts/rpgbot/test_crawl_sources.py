import importlib.util
import json
import pathlib
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location('crawl_sources', pathlib.Path(__file__).with_name('crawl-sources.py'))
crawler = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(crawler)


class CrawlSourcesTests(unittest.TestCase):
    def test_page_metadata_keeps_author_names(self):
        html = '''<html><head><meta name="author" content="First Author"/>
        <script type="application/ld+json">{"@graph":[{"@type":"Article","author":{"name":"Second Author"}}]}</script>
        <link rel="canonical" href="https://rpgbot.net/dnd5/characters/classes/fighter/"/></head>
        <body><h1>Fighter Guide</h1><div class="entry-content"><p>Analysis text.</p></div></body></html>'''
        details, authors = crawler.page_details(html, 'https://rpgbot.net/dnd5/characters/classes/fighter/')
        self.assertEqual(authors, ['First Author', 'Second Author'])
        self.assertEqual(details['canonicalUrl'], 'https://rpgbot.net/dnd5/characters/classes/fighter/')
        self.assertTrue(details['contentRegionFound'])

    def test_source_and_record_are_immutable(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            html = '<html><article>Original fixture</article></html>'
            revision_id, path = crawler.save_source(directory, 'fixture-source', html)
            self.assertEqual(path.read_text(), html)
            self.assertEqual(crawler.save_source(directory, 'fixture-source', html)[0], revision_id)
            entry = {'sourceId': 'fixture-source', 'canonicalUrl': 'https://rpgbot.net/fixture/'}
            checked = {'checkedAt': '2026-09-29T00:00:00+00:00'}
            details = {'heading': 'Fixture', 'contentRegionFound': True}
            self.assertEqual(crawler.save_record(directory, entry, checked, details, ['Test author'], revision_id, path), 'record-ready')
            record = json.loads((directory / 'source' / (revision_id + '.record.json')).read_text())
            self.assertEqual(record['htmlFile'], path.name)
            self.assertEqual(record['provenance']['kind'], 'owner-requested-crawl')
            later = {'checkedAt': '2026-09-30T00:00:00+00:00'}
            self.assertEqual(crawler.save_record(directory, entry, later, details, ['Test author'], revision_id, path), 'record-ready')
            self.assertEqual(json.loads((directory / 'source' / (revision_id + '.record.json')).read_text()), record)
            self.assertEqual(crawler.save_record(directory, entry, checked, details, [], revision_id, path), 'metadata-review-required')


if __name__ == '__main__':
    unittest.main()
