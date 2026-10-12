import argparse
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path


class SourceHeadings(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.headings = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if re.fullmatch(r"h[1-6]", tag):
            self.current = {"anchor": dict(attrs).get("id"), "depth": int(tag[1]), "text": ""}

    def handle_data(self, data):
        if self.current is not None:
            self.current["text"] += data

    def handle_endtag(self, tag):
        if self.current is not None and tag == f"h{self.current['depth']}":
            self.current["text"] = " ".join(self.current["text"].split())
            self.headings.append(self.current)
            self.current = None


BUILD_HEADING = re.compile(r"\b(?:example\s+(?:\w+\s+){0,6}builds?\b|build\s+(?:one|two|three|\d+)\b|build\s*[-–—:]|(?:stealth|subterfuge)\s+build\b)", re.I)
GROUP_HEADINGS = {
    "ability-scores": r"\b(?:ability scores|abilities|ability score improvements)\b",
    "race": r"\braces?\b|\bspecies\b",
    "background": r"\bbackgrounds?\b",
    "skills-and-tools": r"\bskills?\b|\btools?\b",
    "feats": r"\bfeats?\b",
    "spells": r"\bspells?\b|\bcantrips?\b|\bmetamagic\b|\binvocations?\b",
    "equipment": r"\bweapons?\b|\barmor\b|\bequipment\b|\bmagic items?\b",
    "progression": r"\blevels?\b|\bprogression\b",
    "multiclass": r"\bmulticlass(?:ing)?\b",
}


def classify_group(heading):
    return next((kind for kind, pattern in GROUP_HEADINGS.items() if re.search(pattern, heading, re.I)), None)


def hash_content(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def list_section_range(sections, start, source_headings):
    anchor = sections[start].get("sourceAnchor")
    depth = source_headings.get(anchor, {}).get("depth")
    if depth is None:
        return sections[start:start + 1]
    end = start + 1
    while end < len(sections):
        next_depth = source_headings.get(sections[end].get("sourceAnchor"), {}).get("depth")
        if next_depth is not None and next_depth <= depth:
            break
        end += 1
    return sections[start:end]


def collect_article(document, source_url, source_html, recipes, ready_ids, relative_file, specs=()):
    article = document["article"]
    revision = document["translations"][-1]
    source = next(row for row in document["sourceRevisions"] if row["revisionId"] == revision["sourceRevisionId"])
    parser = SourceHeadings()
    parser.feed(source_html)
    headings = {row["anchor"]: row for row in parser.headings if row["anchor"]}
    sections = revision["sections"]
    builds, groups, section_rows = [], [], []
    for index, section in enumerate(sections):
        original = headings.get(section.get("sourceAnchor"))
        heading = original["text"] if original else section.get("sourceAnchor", "")
        ratings = [row for row in document["ratings"] if row["translationRevisionId"] == revision["translationRevisionId"] and row["sectionId"] == section["sectionId"]]
        ref = {
            "articleId": article["articleId"],
            "sourceRevisionId": revision["sourceRevisionId"],
            "translationRevisionId": revision["translationRevisionId"],
            "sectionId": section["sectionId"],
            "ratingIds": [row["ratingId"] for row in ratings],
        }
        source_anchor = section.get("sourceAnchor")
        row = {
            "sourceRef": ref, "headingUk": section["heading"],
            "headingEn": original["text"] if original else None,
            "sourceAnchor": source_anchor,
            "sourceHref": source_url + (f"#{source_anchor}" if source_anchor else ""),
            "articleHref": f"/rules/optimization/{article['slug']}#{section['sectionId']}",
            "contentHash": hash_content(section),
        }
        is_showcase = bool(re.search(r"\b(?:build showcase|multiclass .*builds|multiclass builds)\b", heading, re.I))
        is_build = bool(BUILD_HEADING.search(heading))
        group = classify_group(heading)
        disposition = "build-candidate" if is_build else "build-link-index" if is_showcase else "recommendation-section" if group else "other-section"
        section_rows.append({"sectionId": section["sectionId"], "headingEn": row["headingEn"], "contentHash": row["contentHash"], "disposition": disposition})
        if is_build:
            subtree = list_section_range(sections, index, headings)
            matches = [recipe for recipe in recipes if any(reference["articleId"] == article["articleId"] and reference["sectionId"] == section["sectionId"] for reference in recipe["sourceRefs"])]
            mapped = [{"buildId": recipe["buildId"], "revisionId": recipe["revisionId"], "supportedLevels": recipe["supportedLevels"], "coverage": recipe["coverage"], "readyPreset": recipe["buildId"] in ready_ids} for recipe in matches]
            blockers = [spec for spec in specs if spec["status"] == "blocked" and spec["articleSlug"] == article["slug"] and spec["exampleSection"] == section["sectionId"]]
            builds.append({
                **row, "candidateId": f"{article['slug']}:{section['sectionId']}",
                "disposition": "recipe-present" if mapped else "incomplete-documented" if blockers else "incomplete-unstructured",
                "recipeMappings": mapped,
                "blockers": [{"specSlug": spec["slug"], "reasonCode": spec["reasonCode"], "reason": spec["reason"], "missing": spec.get("missing", []), "reviewedRevision": spec["reviewedRevision"]} for spec in blockers],
                "sectionIds": [child["sectionId"] for child in subtree],
                "sourceDimensions": sorted({kind for child in subtree if (kind := classify_group(headings.get(child.get("sourceAnchor"), {}).get("text", "")))}),
                "remainingWork": (["compile-and-validate-requested-level-snapshots", "verify-full-character-db-and-sheet-state"] if mapped else [f"resolve-documented-blocker:{blockers[0]['reasonCode']}"] if blockers else ["review-source-build-boundaries-and-alternatives", "resolve-edition-specific-entities", "structure-starting-choices-and-ordered-progression", "compile-and-validate-requested-level-snapshots"]),
            })
        elif is_showcase or group:
            groups.append({**row, "kind": "build-link-index" if is_showcase else group, "disposition": "source-section-unstructured", "options": [{key: rating[key] for key in ("ratingId", "optionId", "context", "score", "targetBlockId", "explanationBlockId") if key in rating} for rating in ratings], "blockIds": [block["blockId"] for block in section["blocks"]]})
    unmapped = [heading for heading in parser.headings if BUILD_HEADING.search(heading["text"]) and (heading["anchor"] is None or not any(section.get("sourceAnchor") == heading["anchor"] for section in sections))]
    return {
        "articleId": article["articleId"], "slug": article["slug"], "ruleset": article["ruleset"],
        "titleEn": article["titleEn"], "sourceId": article["sourceId"],
        "sourceUrl": source_url, "sourceRevisionId": source["revisionId"], "sourceContentHash": source["contentHash"],
        "translationRevisionId": revision["translationRevisionId"],
        "documentHash": hash_content(document), "documentFile": relative_file,
        "reviewStatus": "source-heading-inventory-not-human-reviewed",
        "buildCandidates": builds, "recommendationGroups": groups,
        "sections": section_rows, "unmappedSourceBuildHeadings": unmapped,
    }


def read_build_specs(directory):
    specs_directory = directory / "build-specs"
    if not specs_directory.is_dir():
        return []
    return [{**json.loads(path.read_text()), "slug": path.stem} for path in sorted(specs_directory.glob("*.json"))]


def find_orphan_specs(specs, articles):
    sections = {(article["slug"], candidate["sourceRef"]["sectionId"]) for article in articles for candidate in article["buildCandidates"]}
    return sorted(spec["slug"] for spec in specs if (spec["articleSlug"], spec["exampleSection"]) not in sections)


def build_ledger(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    included = {row["sourceId"]: row for row in manifest["entries"] if row["disposition"] == "included" and "2014" in row["rulesets"]}
    indexed_recipes = json.loads((directory / "builds.json").read_text())
    file_recipes = [json.loads(path.read_text()) for path in sorted((directory / "builds").glob("*.json"))]
    recipes_by_id = {row["buildId"]: row for row in indexed_recipes}
    for recipe in file_recipes:
        existing = recipes_by_id.get(recipe["buildId"])
        if existing is not None and existing != recipe:
            raise ValueError(f"Recipe file differs from index: {recipe['buildId']}")
        recipes_by_id[recipe["buildId"]] = recipe
    recipes = [row for row in recipes_by_id.values() if row["ruleset"] == "RULES_2014"]
    ready_ids = {json.loads(path.read_text())["buildId"] for path in (directory / "ready-builds").glob("*.json")} & {recipe["buildId"] for recipe in recipes}
    specs = [spec for spec in read_build_specs(directory) if spec.get("ruleset", "RULES_2014") == "RULES_2014"]
    articles = []
    for path in sorted((directory / "uk").glob("rpgbot-*.json")):
        document = json.loads(path.read_text())
        article = document["article"]
        if article["ruleset"] != "RULES_2014" or article["sourceId"] not in included:
            continue
        revision = document["translations"][-1]
        source = next(row for row in document["sourceRevisions"] if row["revisionId"] == revision["sourceRevisionId"])
        html = (directory / source["sourceFile"]).read_text()
        articles.append(collect_article(document, included[article["sourceId"]]["canonicalUrl"], html, recipes, ready_ids, str(path.relative_to(directory)), specs))
    candidates = [row for article in articles for row in article["buildCandidates"]]
    orphans = find_orphan_specs(specs, articles)
    if orphans:
        raise ValueError(f"Build specs point to no build candidate: {orphans}")
    return {
        "schemaVersion": 1, "ruleset": "RULES_2014",
        "scope": "included-manifest-sources-only; excludes-homebrew-and-2024",
        "method": "source-HTML-heading-and-translation-section-inventory; prose-and-build-completeness-still-require-review",
        "summary": {
            "articles": len(articles), "articlesWithBuildCandidates": sum(bool(row["buildCandidates"]) for row in articles),
            "buildCandidates": len(candidates), "recipeMappedCandidates": sum(bool(row["recipeMappings"]) for row in candidates),
            "recipes": len(recipes), "readyPresets": len(ready_ids),
            "buildSpecs": len(specs), "blockedCandidates": sum(row["disposition"] == "incomplete-documented" for row in candidates),
            "unstructuredCandidates": sum(row["disposition"] == "incomplete-unstructured" for row in candidates),
            "recommendationSections": sum(len(row["recommendationGroups"]) for row in articles),
            "unmappedSourceBuildHeadings": sum(len(row["unmappedSourceBuildHeadings"]) for row in articles),
        },
        "recipesMissingFromIndex": sorted(recipe["buildId"] for recipe in recipes if not any(row["buildId"] == recipe["buildId"] for row in indexed_recipes)),
        "articles": articles,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path("data/rpgbot"))
    parser.add_argument("--output", type=Path, default=Path("data/rpgbot/build-ledger-2014.json"))
    args = parser.parse_args()
    ledger = build_ledger(args.directory)
    args.output.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(ledger["summary"]))


if __name__ == "__main__":
    main()
