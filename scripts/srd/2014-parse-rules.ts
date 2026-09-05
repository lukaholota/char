/**
 * Звіт по розбору SRD 5.1: скільки статей, підрозділів і слів дає парсер.
 * Run: npx tsx scripts/srd/2014-parse-rules.ts [--all | <файл>]
 */

import { relative } from "path";

import { SRD_2014_DIR, SRD_2014_FILES } from "./2014-srd-source";
import { parseRuleFile2014, ParsedRule2014Article } from "./parse-rules-2014";
import { countWords } from "./rules-markdown";

const DEFAULT_FILE = "06_Gameplay/Order_of_Combat.md";

function reportParsedRules(): void {
  const files = process.argv.includes("--all")
    ? SRD_2014_FILES.filter((file) => file !== "Legal.md")
    : [pickRequestedFile()];

  let articleCount = 0;
  let subsectionCount = 0;
  let wordCount = 0;

  for (const file of files) {
    const articles = parseRuleFile2014(file);
    articleCount += articles.length;
    subsectionCount += articles.reduce((sum, article) => sum + article.subsections.length, 0);
    wordCount += articles.reduce((sum, article) => sum + countArticleWords(article), 0);
    if (files.length === 1) articles.forEach(printArticle);
    else console.log(`${file} → ${articles.length} статей`);
  }

  console.log(
    `\n📊 ${files.length} файлів → ${articleCount} статей, ` +
      `${subsectionCount} підрозділів, ${wordCount.toLocaleString("uk-UA")} слів`
  );
}

function countArticleWords(article: ParsedRule2014Article): number {
  return countWords(article.subsections.map((subsection) => subsection.engContent));
}

function pickRequestedFile(): string {
  const requested = process.argv[2];
  if (!requested) return DEFAULT_FILE;
  return requested.startsWith(SRD_2014_DIR) ? relative(SRD_2014_DIR, requested) : requested;
}

function printArticle(article: ParsedRule2014Article): void {
  console.log(`\n── ${article.slug}  [${article.category}]`);
  console.log(`   engTitle: ${article.engTitle}`);
  console.log(`   subsections (${article.subsections.length}):`);
  for (const subsection of article.subsections) {
    console.log(`     · ${subsection.id.padEnd(44)} ${previewBody(subsection.engContent)}`);
  }
}

function previewBody(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length === 0 ? "(порожньо)" : `${countWords([flat])} сл. — ${flat.slice(0, 60)}…`;
}

reportParsedRules();
