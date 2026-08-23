/**
 * Build src/lib/generated/rules-2024.json from the pinned SRD 5.2.1 markdown
 * plus the Ukrainian translations in data/2024/rules-uk/.
 * Run: npx tsx scripts/generate-rules-2024.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { parseRules2024, ParsedRuleArticle } from "./srd/parse-rules";
import { SRD_COMMIT } from "./srd/srd-source";
import { RULE_ARTICLES_2024 } from "../src/lib/rulesData";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/rules-2024.json");
const TRANSLATIONS_DIR = join(process.cwd(), "data/2024/rules-uk");

export type RuleArticleTranslation = {
  title: string;
  summary: string;
  tags: string[];
  subsections: Record<string, { title: string; content: string }>;
};

export type GeneratedRuleArticle = {
  id: string;
  slug: string;
  category: ParsedRuleArticle["category"];
  title: string;
  engTitle: string;
  summary: string;
  ruleset: "RULES_2024";
  order: number;
  tags: string[];
  subsections: { id: string; title: string; engTitle: string; content: string }[];
  sourceFile: ParsedRuleArticle["source"];
  srdCommit: string;
  isTranslated: boolean;
};

export function buildRuleArticles2024(): GeneratedRuleArticle[] {
  const parsed = parseRules2024({ reservedSlugs: RULE_ARTICLES_2024.map((article) => article.slug) });
  const translations = readTranslations();
  return parsed.map((article) => mergeTranslation(article, translations.get(article.id)));
}

function readTranslations(): Map<string, RuleArticleTranslation> {
  const merged = new Map<string, RuleArticleTranslation>();
  if (!existsSync(TRANSLATIONS_DIR)) return merged;

  for (const fileName of readdirSync(TRANSLATIONS_DIR).filter((name) => name.endsWith(".json")).sort()) {
    const batch = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, fileName), "utf-8")) as Record<
      string,
      RuleArticleTranslation
    >;
    for (const [articleId, translation] of Object.entries(batch)) {
      if (merged.has(articleId)) throw new Error(`Переклад "${articleId}" трапляється двічі (${fileName})`);
      merged.set(articleId, translation);
    }
  }

  return merged;
}

function mergeTranslation(
  article: ParsedRuleArticle,
  translation: RuleArticleTranslation | undefined
): GeneratedRuleArticle {
  const subsections = article.subsections.map((subsection) => {
    const translated = translation?.subsections?.[subsection.id];
    return {
      id: subsection.id,
      title: translated?.title?.trim() || subsection.engTitle,
      engTitle: subsection.engTitle,
      content: translated?.content?.trim() || subsection.engContent,
    };
  });

  return {
    id: article.id,
    slug: article.slug,
    category: article.category,
    title: translation?.title?.trim() || article.engTitle,
    engTitle: article.engTitle,
    summary: translation?.summary?.trim() || article.engSummary,
    ruleset: "RULES_2024",
    order: article.order,
    tags: translation?.tags?.length ? translation.tags : article.engTags,
    subsections,
    sourceFile: article.source,
    srdCommit: SRD_COMMIT,
    isTranslated: isFullyTranslated(article, translation),
  };
}

function isFullyTranslated(article: ParsedRuleArticle, translation: RuleArticleTranslation | undefined): boolean {
  if (!translation?.title?.trim() || !translation.summary?.trim()) return false;
  return article.subsections.every((subsection) => {
    const translated = translation.subsections?.[subsection.id];
    return Boolean(translated?.title?.trim() && translated?.content?.trim());
  });
}

function main(): void {
  const articles = buildRuleArticles2024();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(articles, null, 2)}\n`, "utf-8");

  const untranslated = articles.filter((article) => !article.isTranslated);
  console.log(`✅ ${articles.length} статей правил 2024 → ${OUTPUT_PATH}`);
  console.log(`   перекладено: ${articles.length - untranslated.length}, без перекладу: ${untranslated.length}`);
  if (untranslated.length > 0) {
    console.log(`   без перекладу: ${untranslated.map((article) => article.id).join(", ")}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("generate-rules-2024.ts")) {
  main();
}
