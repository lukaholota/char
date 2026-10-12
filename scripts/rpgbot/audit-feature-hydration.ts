import { readFile, readdir } from "node:fs/promises";
import { hydrateArticleDocument } from "../../src/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { findGlossaryMarkers } from "../../src/lib/refs/glossary-marker";
import { splitRatedLabel } from "../../src/lib/optimization/inline-view";
import type { InlineNode } from "../../src/lib/optimization/types";
import { listDraftSummaries } from "../../src/lib/optimization/draft-reader";

function findUnlinkedLabel(nodes: InlineNode[]) {
  const label = splitRatedLabel(nodes)?.label;
  if (!label || label.some((node) => node.type === "link")) return null;
  const text = label.map((node) => node.text).join("");
  const markers = findGlossaryMarkers(text);
  return markers.length ? { label: text, markers } : null;
}

async function auditFeatureLabels(filename: string) {
  const original = parseArticleDocument(JSON.parse(await readFile(`data/rpgbot/uk/${filename}`, "utf8")));
  const hydrated = await hydrateArticleDocument(original);
  const unresolvedLabels = hydrated.translations.at(-1)!.sections.flatMap((section) => {
    if (!original.article.slug.endsWith("-subclasses-2014") && !/features|optional-class|maneuvers|arcane-shot|disciplines|pact-boons/.test(section.sectionId)) return [];
    return section.blocks.flatMap((block) => (block.type === "list" ? block.items : block.type === "paragraph" ? [block.content] : [])
      .flatMap((nodes) => {
        const label = findUnlinkedLabel(nodes);
        return label ? [{ section: section.heading, ...label }] : [];
      }));
  });
  const unreadableReferences = hydrated.contentReferences.filter((reference) => reference.kind === "feature" && !reference.options && !/[А-Яа-яІіЇїЄє]/.test(reference.description ?? ""))
    .map((reference) => ({ name: reference.name, href: reference.href }));
  return { slug: original.article.slug, ruleset: original.article.ruleset, unresolvedLabels, unreadableReferences };
}

const included = new Set((await listDraftSummaries()).filter((summary) => summary.ruleset === "RULES_2014").map((summary) => `rpgbot-${summary.slug}.json`));
const filenames = (await readdir("data/rpgbot/uk")).filter((name) => included.has(name)).sort();
const articles: Awaited<ReturnType<typeof auditFeatureLabels>>[] = [];
for (const filename of filenames) articles.push(await auditFeatureLabels(filename));
console.log(JSON.stringify({ measuredAt: "2026-10-04", articleCount: articles.length,
  unresolvedLabelCount: articles.reduce((count, article) => count + article.unresolvedLabels.length, 0),
  unreadableReferenceCount: articles.reduce((count, article) => count + article.unreadableReferences.length, 0),
  note: "Unresolved labels include spell levels and editorial headings. Review these before claiming complete feature coverage.", articles }, null, 2));
