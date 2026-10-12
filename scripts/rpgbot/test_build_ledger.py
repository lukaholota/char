import copy
import json
import tempfile
import unittest
from pathlib import Path

from build_ledger import BUILD_HEADING, build_ledger, collect_article


def build_document():
    sections = [
        {"sectionId": "feats", "sourceAnchor": "feats", "heading": "Feats", "blocks": [{"blockId": "feat-block"}]},
        {"sectionId": "example-one", "sourceAnchor": "example-one", "heading": "First", "blocks": []},
        {"sectionId": "abilities-one", "sourceAnchor": "abilities-one", "heading": "Abilities", "blocks": []},
        {"sectionId": "example-two", "sourceAnchor": "example-two", "heading": "Second", "blocks": []},
        {"sectionId": "levels-two", "sourceAnchor": "levels-two", "heading": "Levels", "blocks": []},
    ]
    return {
        "article": {"articleId": "article", "sourceId": "source", "slug": "fixture-2014", "ruleset": "RULES_2014", "titleEn": "Fixture"},
        "translations": [{"translationRevisionId": "translation-r1", "sourceRevisionId": "source-r1", "sections": sections}],
        "sourceRevisions": [{"revisionId": "source-r1", "contentHash": "original-source-hash", "sourceFile": "source/source.html"}],
        "ratings": [{"ratingId": "rating1", "translationRevisionId": "translation-r1", "sectionId": "feats", "score": 4, "context": "Fixture option", "targetBlockId": "feat-block"}],
    }


HTML = '<h2 id="feats">Feats</h2><h2 id="example-one">Example Build &ndash; One</h2><h3 id="abilities-one">Abilities</h3><h2 id="example-two">Example Build &ndash; Two</h2><h3 id="levels-two">Levels</h3>'


class BuildLedgerTests(unittest.TestCase):
    def collect(self, document=None, recipes=None):
        return collect_article(document or build_document(), "https://example.com/guide/", HTML, recipes or [], set(), "uk/article.json")

    def test_keeps_multiple_builds_and_their_section_boundaries(self):
        article = self.collect()
        self.assertEqual([row["sectionIds"] for row in article["buildCandidates"]], [["example-one", "abilities-one"], ["example-two", "levels-two"]])
        self.assertEqual(article["buildCandidates"][0]["headingEn"], "Example Build – One")
        self.assertEqual(article["buildCandidates"][0]["sourceHref"], "https://example.com/guide/#example-one")

    def test_ratings_do_not_become_author_builds(self):
        article = self.collect()
        self.assertEqual(len(article["buildCandidates"]), 2)
        group = article["recommendationGroups"][0]
        self.assertEqual(group["sourceRef"]["ratingIds"], ["rating1"])
        self.assertEqual(group["options"][0]["score"], 4)
        self.assertEqual(group["disposition"], "source-section-unstructured")

    def test_finds_named_multiclass_builds_without_example_prefix(self):
        for heading in ["Hexadin Build – Knight of Knights", "Hexbuckler Build – The Boy Who Wouldn’t Grow Up", "The Build – Heavy Weapons Goliath"]:
            self.assertIsNotNone(BUILD_HEADING.search(heading))
        for heading in ["Barbarian Multiclass Builds", "Multiclass Wizard Builds", "Sample Poisons"]:
            self.assertIsNone(BUILD_HEADING.search(heading))

    def test_preserves_source_versions_and_explicit_missing_recipe(self):
        article = self.collect()
        candidate = article["buildCandidates"][0]
        self.assertEqual(candidate["disposition"], "incomplete-unstructured")
        self.assertEqual(candidate["sourceRef"]["sourceRevisionId"], "source-r1")
        self.assertEqual(candidate["sourceRef"]["translationRevisionId"], "translation-r1")
        changed = build_document()
        changed["translations"][0]["sections"][0]["heading"] = "Updated"
        self.assertNotEqual(self.collect(changed)["documentHash"], article["documentHash"])

    def test_recipe_mapping_does_not_promote_level_twenty(self):
        recipe = {"buildId": "build", "revisionId": "v1", "supportedLevels": [1], "coverage": "partial", "sourceRefs": [{"articleId": "article", "sectionId": "example-one"}]}
        candidate = self.collect(recipes=[recipe])["buildCandidates"][0]
        self.assertEqual(candidate["recipeMappings"][0]["supportedLevels"], [1])
        self.assertIn("compile-and-validate-requested-level-snapshots", candidate["remainingWork"])

    def test_excludes_homebrew_and_2024_and_merges_recipe_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for child in ["uk", "source", "builds", "ready-builds"]:
                (directory / child).mkdir()
            manifest = {"entries": [{"sourceId": "source", "disposition": "included", "rulesets": ["2014"], "canonicalUrl": "https://example.com/guide/"}, {"sourceId": "homebrew", "disposition": "excluded", "rulesets": ["2014"]}]}
            (directory / "manifest.json").write_text(json.dumps(manifest))
            (directory / "builds.json").write_text("[]")
            (directory / "source/source.html").write_text(HTML)
            original = build_document()
            homebrew, edition = copy.deepcopy(original), copy.deepcopy(original)
            homebrew["article"]["sourceId"] = "homebrew"
            edition["article"]["ruleset"] = "RULES_2024"
            for name, document in [("official", original), ("homebrew", homebrew), ("2024", edition)]:
                (directory / f"uk/rpgbot-{name}.json").write_text(json.dumps(document))
            recipe = {"buildId": "build", "revisionId": "v1", "ruleset": "RULES_2014", "supportedLevels": [1], "coverage": "partial", "sourceRefs": [{"articleId": "article", "sectionId": "example-one"}]}
            (directory / "builds/build.json").write_text(json.dumps(recipe))
            ledger = build_ledger(directory)
            self.assertEqual(ledger["summary"]["articles"], 1)
            self.assertEqual(ledger["summary"]["recipes"], 1)
            self.assertEqual(ledger["recipesMissingFromIndex"], ["build"])

    def test_blocked_spec_documents_the_reason_and_changes_the_disposition(self):
        spec = {"slug": "fixture-blocked", "status": "blocked", "articleSlug": "fixture-2014", "exampleSection": "example-one", "reasonCode": "needs-spells-at-level-one",
                "reason": "Приклад потребує заклинань на 1-му рівні.", "missing": ["spells"], "reviewedRevision": {"translationRevisionId": "translation-r1", "sourceRevisionId": "source-r1"}}
        article = collect_article(build_document(), "https://example.com/guide/", HTML, [], set(), "uk/article.json", [spec])
        first, second = article["buildCandidates"]
        self.assertEqual(first["disposition"], "incomplete-documented")
        self.assertEqual(first["blockers"][0]["reasonCode"], "needs-spells-at-level-one")
        self.assertEqual(first["remainingWork"], ["resolve-documented-blocker:needs-spells-at-level-one"])
        self.assertEqual(second["disposition"], "incomplete-unstructured")
        self.assertEqual(second["blockers"], [])

    def test_ready_spec_keeps_the_recipe_disposition(self):
        spec = {"slug": "fixture-ready", "status": "ready", "articleSlug": "fixture-2014", "exampleSection": "example-one"}
        recipe = {"buildId": "build", "revisionId": "v1", "supportedLevels": [1], "coverage": "partial", "sourceRefs": [{"articleId": "article", "sectionId": "example-one"}]}
        article = collect_article(build_document(), "https://example.com/guide/", HTML, [recipe], set(), "uk/article.json", [spec])
        self.assertEqual(article["buildCandidates"][0]["disposition"], "recipe-present")
        self.assertEqual(article["buildCandidates"][0]["blockers"], [])

    def test_rejects_a_spec_that_points_to_no_candidate(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for child in ["uk", "source", "builds", "ready-builds", "build-specs"]:
                (directory / child).mkdir()
            manifest = {"entries": [{"sourceId": "source", "disposition": "included", "rulesets": ["2014"], "canonicalUrl": "https://example.com/guide/"}]}
            (directory / "manifest.json").write_text(json.dumps(manifest))
            (directory / "builds.json").write_text("[]")
            (directory / "source/source.html").write_text(HTML)
            (directory / "uk/rpgbot-official.json").write_text(json.dumps(build_document()))
            spec = {"status": "blocked", "articleSlug": "fixture-2014", "exampleSection": "missing-section", "reasonCode": "other", "reason": "x", "reviewedRevision": {}}
            (directory / "build-specs/orphan.json").write_text(json.dumps(spec))
            with self.assertRaisesRegex(ValueError, "orphan"):
                build_ledger(directory)
            (directory / "build-specs/orphan.json").unlink()
            self.assertEqual(build_ledger(directory)["summary"]["buildSpecs"], 0)


if __name__ == "__main__":
    unittest.main()
