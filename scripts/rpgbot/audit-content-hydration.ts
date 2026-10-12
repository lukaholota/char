import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { documentSchema } from "../../src/lib/optimization/schema";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { hydrateArticleDocument } from "../../src/lib/optimization/hydration-catalog";
import { splitGlossaryMarkers } from "../../src/lib/refs/glossary-marker";
import type { ContentBlock, InlineNode } from "../../src/lib/optimization/types";
import { listDraftSummaries } from "../../src/lib/optimization/draft-reader";

function collectBlockNodes(block: ContentBlock): InlineNode[] {
  if (block.type === "rating") return [];
  if (block.type === "list") return block.items.flat();
  if (block.type === "table") return [...(block.caption ?? []), ...block.headers.flat(), ...block.rows.flat(2)];
  return block.content;
}

async function auditArticle(path: string) {
  const original = parseArticleDocument(JSON.parse(await readFile(path, "utf8")));
  const hydrated = documentSchema.parse(await hydrateArticleDocument(original));
  const nodes = hydrated.translations.at(-1)!.sections.flatMap((section) => section.blocks.flatMap(collectBlockNodes));
  const links = nodes.filter((node) => node.type === "link").map((node) => node.href);
  const countLinks = (pattern: RegExp) => links.filter((href) => pattern.test(href)).length;
  const remainingMarkers = [...new Set(nodes.filter((node) => node.type !== "link").flatMap((node) => splitGlossaryMarkers(node.text).flatMap((segment) => segment.original ? [segment.original] : [])))].sort();
  return { slug: original.article.slug, ruleset: original.article.ruleset,
    spells: countLinks(/^\/(?:2024\/)?spells\//), terms: countLinks(/^\/(?:2024\/)?rules\/(?!optimization)/),
    features: countLinks(/^\/(?:2024\/)?classes\?.*feature=/), equipment: countLinks(/^\/(?:2024\/)?(?:weapons|armor)\//),
    references: hydrated.contentReferences?.length ?? 0,
    referenceKinds: Object.fromEntries([...new Set(hydrated.contentReferences?.map((reference) => reference.kind))].map((kind) =>
      [kind, links.filter((href) => hydrated.contentReferences?.some((reference) => reference.kind === kind && reference.href === href)).length])),
    remainingMarkers };
}

async function auditContentHydration() {
  const directory = "data/rpgbot/uk";
  const included = new Set((await listDraftSummaries()).filter((summary) => summary.ruleset === "RULES_2014").map((summary) => `rpgbot-${summary.slug}.json`));
  const paths = (await readdir(directory)).filter((name) => included.has(name)).sort();
  const articles: Awaited<ReturnType<typeof auditArticle>>[] = [];
  for (const path of paths) articles.push(await auditArticle(join(directory, path)));
  const total = (key: "spells" | "terms" | "features" | "equipment") => articles.reduce((sum, article) => sum + article[key], 0);
  console.log(JSON.stringify({ measuredAt: "2026-10-04", articleCount: articles.length,
    totals: { spells: total("spells"), terms: total("terms"), features: total("features"), equipment: total("equipment") },
    referenceKinds: Object.fromEntries([...new Set(articles.flatMap((article) => Object.keys(article.referenceKinds)))].map((kind) =>
      [kind, articles.reduce((sum, article) => sum + (article.referenceKinds[kind] ?? 0), 0)])), articles }, null, 2));
}

if (process.argv[1]?.endsWith("audit-content-hydration.ts")) await auditContentHydration();
