import { readFileSync } from "node:fs";
import { DATA_ROOT } from "./build-spec-files";
import { flattenSectionText, readAbilityTableBaseScores, readLevelTableRows } from "../../src/lib/optimization/build-section-text";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { join } from "node:path";

const MAX_SECTION_CHARACTERS = Number(process.env.SECTION_LIMIT ?? 700);

function main(): void {
  const [articleSlug, exampleSection] = process.argv.slice(2);
  if (!articleSlug || !exampleSection) {
    console.error("bun scripts/rpgbot/show-build-source.ts <articleSlug> <exampleSection>  (SECTION_LIMIT=2000 для довшого тексту)");
    process.exit(2);
  }
  const document = parseArticleDocument(JSON.parse(readFileSync(join(DATA_ROOT, "uk", `rpgbot-${articleSlug}.json`), "utf8")));
  const translation = document.translations.at(-1)!;
  console.log(`article ${document.article.articleId} · ${document.article.ruleset}\nreviewedRevision: { "translationRevisionId": "${translation.translationRevisionId}", "sourceRevisionId": "${translation.sourceRevisionId}" }\n`);
  const subtree = translation.sections.filter((section) => section.sectionId === exampleSection || section.parentSectionId === exampleSection);
  if (!subtree.length) throw new Error(`Немає розділу ${exampleSection}. Розділи: ${translation.sections.map((section) => section.sectionId).join(", ")}`);
  for (const section of subtree) printSection(section);
}

type Section = ReturnType<typeof parseArticleDocument>["translations"][number]["sections"][number];

function printSection(section: Section): void {
  const levels = readLevelTableRows(section);
  if (levels.length) return printLevelTable(section, levels);
  const text = flattenSectionText(section);
  const scores = readAbilityTableBaseScores(section);
  console.log(`## ${section.sectionId} | ${section.heading}${scores ? ` | базові характеристики STR..CHA: ${scores.join(",")}` : ""}`);
  console.log(`${text.length > MAX_SECTION_CHARACTERS ? `${text.slice(0, MAX_SECTION_CHARACTERS)}… [+${text.length - MAX_SECTION_CHARACTERS} символів]` : text}\n`);
}

main();

function printLevelTable(section: Section, levels: ReturnType<typeof readLevelTableRows>): void {
  console.log(`## ${section.sectionId} | ${section.heading} | таблиця рівнів (${levels.length}); повний текст 1-го рівня, далі лише уміння`);
  for (const row of levels) console.log(row.level === levels[0].level ? `${row.level}: ${row.features}\n   ${row.notes}` : `${row.level}: ${row.features}`);
  console.log("");
}
