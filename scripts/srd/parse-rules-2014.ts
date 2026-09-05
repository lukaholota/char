import { readFileSync } from "fs";
import { join } from "path";

import { SRD_2014_DIR, SRD_2014_FILES } from "./2014-srd-source";
import { linkCatalogTables, RULES_2014_CATALOG_PREFIX } from "./catalog-table-links";
import {
  buildSummary,
  claimSlug,
  collectHeadings,
  kebabCase,
  MarkdownHeading,
  numberArticlesWithinCategory,
  ParsedRuleCategoryKey,
  ParsedRuleSubSection,
  sliceByLevel,
} from "./rules-markdown";

export type ParsedRule2014Article = {
  id: string;
  slug: string;
  category: ParsedRuleCategoryKey;
  engTitle: string;
  engSummary: string;
  engTags: string[];
  sourceFile: string;
  order: number;
  subsections: ParsedRuleSubSection[];
};

const CATEGORY_BY_DIRECTORY: Record<string, ParsedRuleCategoryKey> = {
  "03_Characterization": "abilities",
  "04_Equipment": "equipment",
  "06_Gameplay": "adventuring",
  "07_Spells": "spellcasting",
  "08_Gamemastering": "gamemaster",
  "09_Magic_Items": "gamemaster",
};

const CATEGORY_BY_FILE: Record<string, ParsedRuleCategoryKey> = {
  "03_Characterization/Alignment.md": "gamemaster",
  "04_Equipment/Trade_Goods.md": "gamemaster",
  "04_Equipment/Selling_Treasure.md": "gamemaster",
  "06_Gameplay/Order_of_Combat.md": "combat",
  "06_Gameplay/Using_Ability_Scores.md": "abilities",
  "08_Gamemastering/Conditions.md": "conditions",
  "03_Characterization/Backgrounds.md": "abilities",
  "01_Races/Racial_Traits.md": "abilities",
  "05_Feats/Feats.md": "abilities",
};

const RULE_FILES = SRD_2014_FILES.filter((file) => file !== "Legal.md");

export function parseRules2014(
  options: { srdDir?: string; reservedSlugs?: string[] } = {}
): ParsedRule2014Article[] {
  const srdDir = options.srdDir ?? SRD_2014_DIR;
  const takenSlugs = new Set(options.reservedSlugs ?? []);

  const articles = RULE_FILES.flatMap((file) => parseRuleFile(srdDir, file, takenSlugs));
  return numberArticlesWithinCategory(articles);
}

export function parseRuleFile2014(
  file: string,
  options: { srdDir?: string; reservedSlugs?: string[] } = {}
): ParsedRule2014Article[] {
  const articles = parseRuleFile(options.srdDir ?? SRD_2014_DIR, file, new Set(options.reservedSlugs ?? []));
  return numberArticlesWithinCategory(articles);
}

function parseRuleFile(
  srdDir: string,
  file: string,
  takenSlugs: Set<string>
): Omit<ParsedRule2014Article, "order">[] {
  const lines = repairText(readFileSync(join(srdDir, file), "utf-8")).split("\n");
  const headings = collectHeadings(lines).map(cleanHeading);
  if (headings.length === 0) return [];

  const articleLevel = Math.min(...headings.map((heading) => heading.level));
  const category = pickCategory(file);

  return sliceByLevel(headings, articleLevel, lines.length)
    .map((slice) => buildArticle({ slice, lines, headings, articleLevel, category, file, takenSlugs }))
    .filter((article) => article !== null);
}

function buildArticle(input: {
  slice: { heading: MarkdownHeading; endLine: number };
  lines: string[];
  headings: MarkdownHeading[];
  articleLevel: number;
  category: ParsedRuleCategoryKey;
  file: string;
  takenSlugs: Set<string>;
}): Omit<ParsedRule2014Article, "order"> | null {
  const { slice, lines, headings, articleLevel, category, file, takenSlugs } = input;

  const inside = headings.filter((heading) => heading.line > slice.heading.line && heading.line < slice.endLine);
  const subLevel = inside.length > 0 ? Math.min(...inside.map((heading) => heading.level)) : articleLevel + 1;
  const subHeadings = inside.filter((heading) => heading.level === subLevel);

  const intro = readBody(lines, slice.heading.line + 1, subHeadings[0]?.line ?? slice.endLine);
  if (!intro && subHeadings.length === 0) return null;

  const engTitle = slice.heading.title;
  const slug = claimSlug(kebabCase(engTitle), "rule", takenSlugs);
  const subsectionSlugs = new Set<string>();

  const subsections = [
    ...(intro ? [buildSubSection(slug, engTitle, intro, subsectionSlugs)] : []),
    ...subHeadings.map((heading, index) =>
      buildSubSection(
        slug,
        heading.title,
        readBody(lines, heading.line + 1, subHeadings[index + 1]?.line ?? slice.endLine),
        subsectionSlugs
      )
    ),
  ].filter((subsection) => subsection.engContent.length > 0);

  if (subsections.length === 0) return null;

  return {
    id: `srd51-${slug}`,
    slug,
    category,
    engTitle,
    engSummary: buildSummary(subsections[0].engContent),
    engTags: [engTitle, readFileTitle(file)],
    sourceFile: file,
    subsections,
  };
}

function buildSubSection(
  articleSlug: string,
  engTitle: string,
  body: string,
  takenSlugs: Set<string>
): ParsedRuleSubSection {
  return {
    id: `${articleSlug}--${claimSlug(kebabCase(engTitle), null, takenSlugs)}`,
    engTitle,
    engContent: body,
  };
}

function readBody(lines: string[], from: number, to: number): string {
  const body = lines
    .slice(from, to)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return linkCatalogTables(body, RULES_2014_CATALOG_PREFIX);
}

/// Upstream is a "reMastered" conversion of the official PDF and carries three artefacts:
/// literal "appendix ##" placeholders, soft-hyphen debris inside words, and one em dash that
/// survived as a combining stroke.
function repairText(markdown: string): string {
  return markdown
    .replace(/appendix ##/g, "appendix A")
    .replace(/[­​]/g, "")
    .replace(/[‐‑]/g, "-")
    .replace(/̶/g, "—");
}

function cleanHeading(heading: MarkdownHeading): MarkdownHeading {
  const stripped = heading.title.replace(/[*_`]/g, "").replace(/\s*#+\s*$/, "").trim();
  return { ...heading, title: isAllCaps(stripped) ? toTitleCase(stripped) : stripped };
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

function readFileTitle(file: string): string {
  return file.split("/").pop()!.replace(/\.md$/, "").replace(/_/g, " ");
}

function pickCategory(file: string): ParsedRuleCategoryKey {
  return CATEGORY_BY_FILE[file] ?? CATEGORY_BY_DIRECTORY[file.split("/")[0]] ?? "gamemaster";
}
