import importlib.util
import pathlib
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location('crawl_pagination', pathlib.Path(__file__).with_name('crawl-pagination.py'))
pagination = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pagination)


class PaginationTests(unittest.TestCase):
    def test_only_numbered_continuations_of_parent_are_followed(self):
        parent = 'https://rpgbot.net/dnd5/characters/races/hobgoblin/'
        html = '''<a class="post-page-numbers" href="/dnd5/characters/races/hobgoblin/2/">2</a>
        <a class="post-page-numbers" href="https://rpgbot.net/dnd5/characters/races/hobgoblin/3/">3</a>
        <a class="post-page-numbers" href="/dnd5/characters/races/elf/2/">Other</a>
        <a class="post-page-numbers" href="https://elsewhere.example/2/">External</a>'''
        self.assertEqual(pagination.numbered_pages(html, parent), [parent + '2/', parent + '3/'])

    def test_supplement_is_immutable_and_keeps_parent_identity(self):
        parent = 'rpgbot-parent'
        url = 'https://rpgbot.net/dnd5/characters/races/hobgoblin/2/'
        checked = {'finalUrl': url, 'checkedAt': '2026-09-29T00:00:00+00:00'}
        details = {'canonicalUrl': url, 'heading': 'Hobgoblin', 'contentRegionFound': True}
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            first = pagination.save_supplement(directory, parent, url, '<article>Next page</article>', checked, details, ['Author'])
            self.assertEqual(first['status'], 'record-ready')
            self.assertEqual(first['parentSourceId'], parent)
            second = pagination.save_supplement(directory, parent, url, '<article>Next page</article>',
                                                 {**checked, 'checkedAt': '2026-09-30T00:00:00+00:00'}, details, ['Author'])
            self.assertEqual(second['revisionId'], first['revisionId'])
            self.assertEqual(len(list((directory / 'source-supplements').glob('*.html'))), 1)
            self.assertEqual(pagination.save_supplement(directory, parent, url, 'x', checked,
                                                         {**details, 'canonicalUrl': 'https://rpgbot.net/other/'}, ['Author'])['status'],
                             'identity-review-required')


if __name__ == '__main__':
    unittest.main()
