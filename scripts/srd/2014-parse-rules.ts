import { readFileSync } from "fs";
import { relative } from "path";
import {
  SRD_2014_DIR,
  SRD_2014_FILES,
  findSrd2014FilePath,
} from "./2014-srd-source";

type RuleCategoryKey =
  | "combat"
  | "spellcasting"
  | "abilities"
  | "conditions"
  | "adventuring"
  | "gamemaster";

type ParsedSubSection = {
  id: string;
  title: string;
  content: string;
};

type ParsedArticle = {
  slug: string;
  engTitle: string;
  category: RuleCategoryKey;
  source: string;
  intro: string;
  subsections: ParsedSubSection[];
};

type Heading = { level: number; title: string; line: number };

const CATEGORY_BY_DIRECTORY: Record<string, RuleCategoryKey> = {
  "03_Characterization": "abilities",
  "04_Equipment": "adventuring",
  "06_Gameplay": "adventuring",
  "07_Spells": "spellcasting",
  "08_Gamemastering": "gamemaster",
  "09_Magic_Items": "gamemaster",
};

const CATEGORY_BY_FILE: Record<string, RuleCategoryKey> = {
  "06_Gameplay/Order_of_Combat.md": "combat",
  "06_Gameplay/Using_Ability_Scores.md": "abilities",
  "08_Gamemastering/Conditions.md": "conditions",
};

const DEFAULT_PROTOTYPE_FILE = "06_Gameplay/Order_of_Combat.md";

function runPrototype(): void {
  const files = process.argv.includes("--all")
    ? SRD_2014_FILES.filter((file) => file !== "Legal.md")
    : [pickRequestedFile()];

  let articleCount = 0;
  let subsectionCount = 0;
  let wordCount = 0;

  for (const file of files) {
    const articles = parseRuleFile(file);
    articleCount += articles.length;
    subsectionCount += articles.reduce((sum, a) => sum + a.subsections.length, 0);
    wordCount += articles.reduce((sum, a) => sum + countArticleWords(a), 0);
    if (files.length === 1) articles.forEach(printArticle);
    else console.log(`${file} → ${articles.length} статей`);
  }

  console.log(
    `\n📊 ${files.length} файлів → ${articleCount} статей, ` +
      `${subsectionCount} підрозділів, ${wordCount.toLocaleString("uk-UA")} слів`
  );
}

export function parseRuleFile(file: string): ParsedArticle[] {
  const markdown = readFileSync(findSrd2014FilePath(file), "utf-8");
  const lines = markdown.split("\n");
  const headings = collectHeadings(lines);
  if (headings.length === 0) return [];

  const articleLevel = Math.min(...headings.map((h) => h.level));
  const category = pickCategory(file);

  return sliceByLevel(headings, articleLevel, lines.length)
    .map((slice) => buildArticle(slice, lines, headings, articleLevel, category, file))
    .filter(hasContent);
}

/// A chapter heading whose whole body lives in sibling headings (e.g. "# ADVENTURING") leaves an
/// empty shell behind. The category already carries that name, so the shell is dropped.
function hasContent(article: ParsedArticle): boolean {
  return article.intro.length > 0 || article.subsections.length > 0;
}

function collectHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];

  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return;
    headings.push({ level: match[1].length, title: cleanTitle(match[2]), line: index });
  });

  return headings;
}

function sliceByLevel(
  headings: Heading[],
  level: number,
  totalLines: number
): { heading: Heading; endLine: number }[] {
  const starts = headings.filter((h) => h.level === level);

  return starts.map((heading, index) => ({
    heading,
    endLine: starts[index + 1]?.line ?? totalLines,
  }));
}

function buildArticle(
  slice: { heading: Heading; endLine: number },
  lines: string[],
  headings: Heading[],
  articleLevel: number,
  category: RuleCategoryKey,
  file: string
): ParsedArticle {
  const inside = headings.filter((h) => h.line > slice.heading.line && h.line < slice.endLine);
  const subLevel = inside.length > 0 ? Math.min(...inside.map((h) => h.level)) : articleLevel + 1;
  const subHeadings = inside.filter((h) => h.level === subLevel);

  const introEnd = subHeadings[0]?.line ?? slice.endLine;
  const intro = readBody(lines, slice.heading.line + 1, introEnd);

  const subsections = subHeadings.map((heading, index) => ({
    id: buildSlug(heading.title),
    title: heading.title,
    content: readBody(lines, heading.line + 1, subHeadings[index + 1]?.line ?? slice.endLine),
  }));

  return {
    slug: buildSlug(slice.heading.title),
    engTitle: slice.heading.title,
    category,
    source: `data/2014/srd/${file}`,
    intro,
    subsections,
  };
}

function readBody(lines: string[], from: number, to: number): string {
  return repairCrossReferences(lines.slice(from, to).join("\n")).trim();
}

/// Upstream left literal "appendix ##" placeholders where the PDF pointed at appendix PH-A.
function repairCrossReferences(body: string): string {
  return body.replace(/appendix ##/g, "appendix A");
}

function cleanTitle(raw: string): string {
  const stripped = raw.replace(/[*_`]/g, "").replace(/\s*#+\s*$/, "").trim();
  return isAllCaps(stripped) ? toTitleCase(stripped) : stripped;
}

function isAllCaps(text: string): boolean {
  return /[A-Z]/.test(text) && text === text.toUpperCase();
}

const LOWERCASE_TITLE_WORDS = new Set(["a", "an", "and", "at", "in", "of", "on", "or", "the", "to"]);

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_TITLE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pickCategory(file: string): RuleCategoryKey {
  const byFile = CATEGORY_BY_FILE[file];
  if (byFile) return byFile;
  return CATEGORY_BY_DIRECTORY[file.split("/")[0]] ?? "gamemaster";
}

function countArticleWords(article: ParsedArticle): number {
  const bodies = [article.intro, ...article.subsections.map((s) => s.content)];
  return bodies.join(" ").split(/\s+/).filter(Boolean).length;
}

function pickRequestedFile(): string {
  const requested = process.argv[2];
  if (!requested) return DEFAULT_PROTOTYPE_FILE;
  return requested.startsWith(SRD_2014_DIR) ? relative(SRD_2014_DIR, requested) : requested;
}

function printArticle(article: ParsedArticle): void {
  console.log(`\n── ${article.slug}  [${article.category}]`);
  console.log(`   engTitle: ${article.engTitle}`);
  console.log(`   intro:    ${previewBody(article.intro)}`);
  console.log(`   subsections (${article.subsections.length}):`);
  for (const sub of article.subsections) {
    console.log(`     · ${sub.id.padEnd(34)} ${previewBody(sub.content)}`);
  }
}

function previewBody(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const words = flat.split(" ").filter(Boolean).length;
  return flat.length === 0 ? "(порожньо)" : `${words} сл. — ${flat.slice(0, 70)}…`;
}

runPrototype();
