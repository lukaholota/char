/**
 * Звіт про дублі між рукописними статтями довідника й імпортованими зі SRD.
 * Run: npx tsx scripts/srd/report-rule-duplicates.ts > docs/o20-rules-canon/duplicates-report.md
 */

import { Ruleset } from "@prisma/client";

import { RULE_ARTICLES_2014, RULE_ARTICLES_2024, SUPERSEDED_BY_SRD } from "../../src/lib/rulesData";
import { findRuleOverlaps } from "./find-rule-overlaps";
import { findOverlapDecision } from "./rule-overlap-decisions";

function reportDuplicates(): void {
  console.log("# Звіт про дублі статей довідника\n");
  console.log(
    "Згенеровано `scripts/srd/report-rule-duplicates.ts`. Рішення живуть у `rule-overlap-decisions.ts`,\n" +
      "бо цей файл перезаписується прогоном.\n"
  );

  printEdition("2014", "RULES_2014");
  printEdition("2024", "RULES_2024");
}

function printEdition(label: string, ruleset: Ruleset): void {
  printMergedArticles(label, ruleset);
  printRemainingOverlaps(ruleset);
}

function printMergedArticles(label: string, ruleset: Ruleset): void {
  const merged = Object.entries(SUPERSEDED_BY_SRD[ruleset]);

  console.log(`## Редакція ${label}\n`);
  console.log(`### Зведено в KR20.4 — ${merged.length} статей\n`);
  console.log("Рукописна стаття знята з видачі, її слаг веде на канонічну статтю SRD.\n");
  for (const [retired, canonical] of merged) {
    const title = findHandwrittenTitle(ruleset, retired);
    const target = retired === canonical ? "слаг звільнено, його забрала стаття SRD" : `слаг веде на \`${canonical}\``;
    console.log(`- \`${retired}\` — ${title}: ${target}`);
  }
  console.log("");
}

function printRemainingOverlaps(ruleset: Ruleset): void {
  const overlaps = findRuleOverlaps(ruleset);

  console.log(`### Лишилися перетини — ${overlaps.length} пар\n`);
  console.log("| Рукописна | Імпортована зі SRD | Чому пара | Рішення |");
  console.log("|---|---|---|---|");
  for (const { handwritten, imported, reason } of overlaps) {
    const decision = findOverlapDecision(ruleset, handwritten.slug, imported.slug) ?? "**потрібне рішення**";
    console.log(
      `| \`${handwritten.slug}\` — ${handwritten.title} | \`${imported.slug}\` — ${imported.title} | ${reason} | ${decision} |`
    );
  }
  console.log("");
}

/// Перелік поглинутих будується зі SUPERSEDED_BY_SRD, а не з findHandwrittenArticles: поглинута
/// стаття вже не потрапляє у видачу, а заголовок для звіту треба взяти з сирого масиву.
function findHandwrittenTitle(ruleset: Ruleset, slug: string): string {
  const articles = ruleset === "RULES_2024" ? RULE_ARTICLES_2024 : RULE_ARTICLES_2014;
  return articles.find((article) => article.slug === slug)?.title ?? slug;
}

reportDuplicates();
