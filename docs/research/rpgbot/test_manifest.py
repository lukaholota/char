import importlib.util
import io
import json
import pathlib
import unittest
from unittest.mock import patch

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('manifest', HERE / 'build-manifest.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def parse_fixture(name, url):
    parser = m.ParseMetadata()
    parser.feed((HERE / 'fixtures' / name).read_text())
    return dict(parser.extract(url), requestedUrl=url, finalUrl=url, httpStatus=200, checkedAt='2026-09-29', redirects=[])


class Response(io.BytesIO):
    def __init__(self, status, location=None):
        super().__init__(b'<html></html>')
        self.code = status
        self.headers = {'Content-Type': 'text/html'}
        if location:
            self.headers['Location'] = location


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.old = m.BASE + 'dnd5/characters/classes/warrior/'
        self.new = m.BASE + '2024-dnd/classes/warrior/'

    def test_normalize_preserves_distinct_editions_and_drops_tracking(self):
        self.assertEqual(m.normalize('http://www.RPGBOT.net/dnd5//characters/classes/warrior?utm=x#feat'), self.old)
        self.assertNotEqual(m.normalize(self.new), self.old)
        self.assertIsNone(m.normalize('https://evil.test/dnd5/characters/'))
        self.assertIsNone(m.normalize('mailto:author@rpgbot.net'))
        self.assertEqual(m.normalize('/robots.txt'), m.BASE + 'robots.txt')

    def test_content_parser_ignores_navigation_ads_and_scripts(self):
        record = parse_fixture('article-2014.html', self.old)
        self.assertEqual(record['links'], [self.new, m.BASE + 'dnd5/characters/races/example/'])
        self.assertEqual(record['editionEvidence']['ruleset'], '2014')
        self.assertEqual(record['editionEvidence']['basis'], 'explicit-article-notice')
        self.assertIn('magic-item', record['topics'])
        self.assertIn('example-build', record['topics'])

    def test_edition_notice_takes_precedence_over_cross_edition_link(self):
        record = parse_fixture('article-2024.html', self.new)
        self.assertEqual(record['editionEvidence']['ruleset'], '2024')
        self.assertEqual(record['editionEvidence']['basis'], 'explicit-article-notice')
        self.assertIsNone(m.find_edition_evidence('For 2024 rules see another page.', 'DnD 5e Guide')['ruleset'])

    def test_meta_notice_confirms_edition_without_using_url(self):
        text = 'The advice offered below is based on the current State of the 2014 DnD 5e Character Optimization Meta as of when updated.'
        evidence = m.find_edition_evidence(text, 'Armorer Artificer 5e')
        self.assertEqual(evidence['ruleset'], '2014')
        self.assertEqual(evidence['basis'], 'explicit-article-meta-notice')
        self.assertLessEqual(len(evidence['excerpt'].split()), 25)

    def test_redirect_chain_and_robots_checked_at_every_hop(self):
        client = m.FetchMetadata(0)
        client.robots.parse(['User-agent: *', 'Allow: /', 'Disallow: /private/'])
        with patch.object(client, 'request', side_effect=[Response(301, '/alias/'), Response(302, '/private/')]) as request:
            record, raw = client.read(self.old)
        self.assertIsNone(raw)
        self.assertEqual(record['error'], 'robots-disallowed')
        self.assertEqual(request.call_count, 2)
        self.assertEqual([item['httpStatus'] for item in record['redirects']], [301, 302])

    def test_redirect_loop_and_external_redirect_never_followed(self):
        client = m.FetchMetadata(1)
        client.robots.parse(['User-agent: *', 'Allow: /'])
        with patch.object(client, 'request', return_value=Response(301, self.old)):
            self.assertEqual(client.read(self.old)[0]['error'], 'redirect-loop')
        with patch.object(client, 'request', return_value=Response(302, 'https://elsewhere.test/')) as request:
            self.assertEqual(client.read(self.old)[0]['error'], 'off-domain-redirect')
            self.assertEqual(request.call_count, 1)

    def test_alias_dedup_stable_ids_and_replay_diff(self):
        alias = m.BASE + 'dnd5/characters/old-warrior/'
        record = parse_fixture('article-2014.html', self.old)
        observations = {self.old: record, alias: dict(record, requestedUrl=alias, finalUrl=self.old)}
        candidates = {url: {'origins': ['initial-inventory']} for url in observations}
        manifest = m.build_manifest(candidates, observations, {}, {})
        self.assertEqual(len(manifest['entries']), 1)
        entry = manifest['entries'][0]
        self.assertEqual(entry['aliases'], [alias])
        self.assertEqual(entry['disposition'], 'included')
        replay = m.build_manifest(candidates, observations, {}, manifest)
        self.assertEqual(m.build_diff(manifest, replay), {'added': [], 'removed': [], 'changed': []})
        moved = m.BASE + 'dnd5/characters/classes/warrior-v2/'
        observations = {alias: dict(record, requestedUrl=alias, finalUrl=moved, canonicalUrl=moved)}
        result = m.build_manifest({alias: candidates[alias]}, observations, {}, manifest)
        self.assertEqual(result['entries'][0]['sourceId'], entry['sourceId'])

    def test_graph_reaches_unsitemapped_pages_handles_cycles_and_boundary(self):
        race = m.BASE + 'dnd5/characters/races/example/'
        podcast = m.BASE + 'dnd5/podcast/episode-one/'
        records = {self.old: parse_fixture('article-2014.html', self.old),
                   self.new: parse_fixture('article-2024.html', self.new),
                   race: {'httpStatus': 200, 'links': [self.old, podcast, m.BASE + 'pf2/example/']}}
        fetched = []
        def fetch(url):
            fetched.append(url)
            return records[url]
        candidates = m.discover_graph({self.old: {'origins': ['initial-inventory']}}, {}, fetch, lambda _: None)
        self.assertEqual(set(fetched), {self.old, self.new, race})
        self.assertIn(podcast, candidates)
        self.assertNotIn(m.BASE + 'pf2/example/', candidates)
        self.assertEqual(candidates[race]['linkedFrom'], [self.old])

    def test_unavailable_or_unconfirmed_page_is_review(self):
        self.assertEqual(m.classify(self.old, {'httpStatus': 403}, {})[0], 'review')
        self.assertEqual(m.classify(self.old, {'httpStatus': 200, 'contentRegionFound': True, 'canonicalUrl': self.old}, {})[1], 'edition-not-confirmed')

    def test_sitemap_filter_preserves_old_seeds_and_ignores_other_systems(self):
        class SitemapClient:
            def read(self, url):
                if url.endswith('sitemap.xml'):
                    raw = '<sitemapindex><sitemap><loc>https://rpgbot.net/page-sitemap1.xml</loc></sitemap></sitemapindex>'
                else:
                    raw = (HERE / 'fixtures/sitemap.xml').read_text()
                return {'requestedUrl': url, 'httpStatus': 200}, raw
        seeds = {self.old: {'origins': ['initial-inventory']}}
        records = m.load_sitemaps(SitemapClient(), seeds)
        self.assertEqual(len(records), 2)
        self.assertEqual(seeds[self.old]['origins'], ['initial-inventory'])
        self.assertEqual(seeds[self.old]['sitemapLastModified'], '2026-09-01')
        self.assertIn(self.new, seeds)
        self.assertNotIn(m.BASE + 'pf2/classes/warrior/', seeds)

    def test_validation_rejects_missing_candidates_or_unverified_included(self):
        record = parse_fixture('article-2014.html', self.old)
        seeds = {self.old: {'origins': ['initial-inventory']}}
        inventory = {'entries': [{'url': self.old}], 'outsideRootCandidates': []}
        result = m.build_manifest(seeds, {self.old: record}, {}, {})
        m.validate_manifest(result, inventory)
        result['entries'][0]['checks'][0]['httpStatus'] = 403
        with self.assertRaisesRegex(ValueError, 'Unverified included'):
            m.validate_manifest(result, inventory)
        with self.assertRaisesRegex(ValueError, 'Initial candidates missing'):
            m.validate_manifest({'entries': []}, inventory)

    def test_canonical_chain_resolves_to_one_terminal_source(self):
        moved = m.BASE + 'dnd5/characters/classes/warrior-two/'
        final = m.BASE + 'dnd5/characters/classes/warrior-three/'
        old = parse_fixture('article-2014.html', self.old)
        middle = dict(old, requestedUrl=moved, finalUrl=moved, canonicalUrl=final)
        old['canonicalUrl'] = moved
        seeds = {url: {'origins': ['fixture']} for url in [self.old, moved]}
        result = m.build_manifest(seeds, {self.old: old, moved: middle}, {}, {})
        self.assertEqual(len(result['entries']), 1)
        self.assertEqual(result['entries'][0]['canonicalUrl'], final)
        self.assertEqual(result['entries'][0]['reason'], 'canonical-chain-needs-review')

    def test_robots_specificity_wildcards_end_anchor_and_agent_group(self):
        robots = m.CheckRobots()
        robots.parse(['User-agent: BlockedBot', 'Disallow: /', '', 'User-agent: *', 'Allow: /', 'Disallow: /private/*', 'Allow: /private/open$', 'Disallow: /tie/', 'Allow: /tie/'])
        self.assertFalse(robots.can_fetch('BlockedBot/1', m.BASE + 'public/'))
        self.assertFalse(robots.can_fetch(m.AGENT, m.BASE + 'private/secret/'))
        self.assertTrue(robots.can_fetch(m.AGENT, m.BASE + 'private/open'))
        self.assertFalse(robots.can_fetch(m.AGENT, m.BASE + 'private/open/child'))
        self.assertTrue(robots.can_fetch(m.AGENT, m.BASE + 'tie/'))

    def test_conflicting_title_and_notice_remain_unconfirmed(self):
        evidence = m.find_edition_evidence('This article is for the 2014 DnD rules.', 'DnD 5.5 Example Guide')
        self.assertIsNone(evidence['ruleset'])
        self.assertEqual(evidence['basis'], 'conflicting-explicit-edition-evidence')
        self.assertEqual(evidence['noticeEvidence']['ruleset'], '2014')
        self.assertEqual(evidence['titleEvidence']['ruleset'], '2024')

    def test_included_graph_closure_rejects_missing_content_candidate(self):
        record = parse_fixture('article-2014.html', self.old)
        manifest = m.build_manifest({self.old: {'origins': ['fixture']}}, {self.old: record}, {}, {})
        with self.assertRaisesRegex(ValueError, 'Included content links not accounted'):
            m.validate_graph_closure(manifest)
        targets = record['links']
        manifest['entries'].extend({'disposition': 'review', 'checks': [{'requestedUrl': target}]} for target in targets)
        m.validate_graph_closure(manifest)

    def test_article_header_notice_does_not_expand_content_link_scope(self):
        parser = m.ParseMetadata()
        parser.feed('<main><p>This page is for the 2014 DnD rules.</p><a href="/dnd5/header/">Header</a><div class="entry-content"><p>Body</p></div></main>')
        record = parser.extract(self.old)
        self.assertEqual(record['editionEvidence']['ruleset'], '2014')
        self.assertEqual(record['links'], [])

    def test_publisher_url_requires_match_with_actual_final_url(self):
        parser = m.ParseMetadata()
        parser.feed('<meta property="og:url" content="' + self.old + '"><div class="entry-content">Body</div>')
        record = parser.extract(self.old)
        self.assertEqual(record['canonicalUrl'], self.old)
        self.assertEqual(record['canonicalBasis'], 'publisher-og-url-confirmed-by-http-final')
        self.assertIsNone(parser.extract(self.new)['canonicalUrl'])
        parser.feed('<link rel="canonical" href="https://outside.test/">')
        self.assertIsNone(parser.extract(self.old)['canonicalUrl'])

    def test_primary_focus_notice_and_decimal_edition_are_complete(self):
        old = m.find_edition_evidence('This page is primarily focused on the 2014 DnD 5e rules. For updated rules see another page.', 'Class Index')
        self.assertEqual(old['ruleset'], '2014')
        current = m.find_edition_evidence('This page is for the 2024 DnD 5.5 rules.', 'Class Index')
        self.assertEqual(current['excerpt'], 'This page is for the 2024 DnD 5.5 rules.')

    def test_shared_sources_require_explicit_verified_edition_evidence(self):
        record = parse_fixture('article-2014.html', self.old)
        inventory = {'entries': [{'url': self.old}], 'outsideRootCandidates': []}
        override = {self.old: {'disposition': 'included', 'reason': 'shared-index', 'editionEvidence': {'ruleset': None, 'rulesets': ['2014', '2024'], 'basis': 'explicit-edition-section-headings', 'headings': ['2014 Feats', '2024 Feats']}}}
        result = m.build_manifest({self.old: {'origins': ['fixture']}}, {self.old: record}, override, {})
        m.validate_manifest(result, inventory)
        self.assertIsNone(result['entries'][0]['ruleset'])
        self.assertEqual(result['entries'][0]['rulesets'], ['2014', '2024'])
        self.assertEqual(result['entries'][0]['editionPolicy'], 'preserve-section-edition-context')
        result['entries'][0]['editionEvidence']['basis'] = 'URL-paths-only'
        with self.assertRaisesRegex(ValueError, 'Unverified included'):
            m.validate_manifest(result, inventory)

    def test_minimum_rate_limit(self):
        self.assertEqual(m.FetchMetadata(0).delay, 1)


if __name__ == '__main__':
    unittest.main()
