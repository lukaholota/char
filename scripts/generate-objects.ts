/**
 * Build src/lib/generated/objects.json — облогові знаряддя поза SRD (KR23.5), обидві редакції,
 * плюс українські переклади з data/2014/objects-uk/ і data/2024/objects-uk/.
 * Run: npx tsx scripts/generate-objects.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Ruleset } from "@prisma/client";

import { buildObjectUrl, OBJECT_MIRROR_ATTRIBUTION, ParsedObjectStatblock, parseObjectStatblocks } from "./5etools/objects";
import { findHandwrittenArticles } from "../src/lib/rulesData";
import { getImportedRuleArticles2014 } from "../src/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "../src/lib/rules2024Data";
import { getBeyondSrdArticles } from "../src/lib/rulesBeyondSrdData";
import { getTrapsHazards } from "../src/lib/trapsHazardsData";
import { GeneratedObjectStatblock } from "../src/lib/objectTypes";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/objects.json");
const TRANSLATIONS_DIR: Record<Ruleset, string> = {
  RULES_2014: join(process.cwd(), "data/2014/objects-uk"),
  RULES_2024: join(process.cwd(), "data/2024/objects-uk"),
};

/// Заголовки підрозділів — фіксовані назви полів схеми, а не текст із книги, тому не йдуть у
/// партію перекладу: перекладач заповнює лише `content`. Той самий прийом, що
/// `SUBSECTION_TITLES_UK` у `generate-traps-hazards.ts`.
const SUBSECTION_TITLES_UK: Record<string, string> = {
  description: "Опис",
  actions: "Дії",
};

export type ObjectTranslation = {
  title: string;
  tags: string[];
  subsections: Record<string, string>;
};

export function buildObjectArticles(): GeneratedObjectStatblock[] {
  const reservedSlugsByRuleset: Record<Ruleset, string[]> = {
    RULES_2014: [
      ...findHandwrittenArticles("RULES_2014").map((article) => article.slug),
      ...getImportedRuleArticles2014().map((article) => article.slug),
      ...getBeyondSrdArticles().map((article) => article.slug),
      ...getTrapsHazards("RULES_2014").map((article) => article.slug),
    ],
    RULES_2024: [
      ...findHandwrittenArticles("RULES_2024").map((article) => article.slug),
      ...getImportedRuleArticles2024().map((article) => article.slug),
      ...getTrapsHazards("RULES_2024").map((article) => article.slug),
    ],
  };

  const parsed = parseObjectStatblocks({ reservedSlugsByRuleset });
  const translations = {
    RULES_2014: readTranslations("RULES_2014"),
    RULES_2024: readTranslations("RULES_2024"),
  };

  return parsed.map((article) => mergeTranslation(article, translations[article.ruleset].get(article.id)));
}

function readTranslations(ruleset: Ruleset): Map<string, ObjectTranslation> {
  const merged = new Map<string, ObjectTranslation>();
  const dir = TRANSLATIONS_DIR[ruleset];
  if (!existsSync(dir)) return merged;

  for (const fileName of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
    const batch = JSON.parse(readFileSync(join(dir, fileName), "utf-8")) as Record<string, ObjectTranslation>;
    for (const [articleId, translation] of Object.entries(batch)) {
      if (merged.has(articleId)) throw new Error(`Переклад "${articleId}" трапляється двічі (${fileName})`);
      merged.set(articleId, translation);
    }
  }

  return merged;
}

function mergeTranslation(
  article: ParsedObjectStatblock,
  translation: ObjectTranslation | undefined
): GeneratedObjectStatblock {
  const subsections = article.subsections.map((subsection) => {
    const key = subsection.id.slice(`${article.slug}--`.length);
    const translatedContent = translation?.subsections?.[subsection.id];
    return {
      id: subsection.id,
      title: SUBSECTION_TITLES_UK[key] ?? subsection.engTitle,
      engTitle: subsection.engTitle,
      content: translatedContent?.trim() || subsection.engContent,
    };
  });

  return {
    id: article.id,
    slug: article.slug,
    category: article.category,
    title: translation?.title?.trim() || article.engTitle,
    engTitle: article.engTitle,
    ruleset: article.ruleset,
    order: article.order,
    tags: translation?.tags?.length ? translation.tags : article.engTags,
    size: article.size,
    objectType: article.objectType,
    ac: article.ac,
    hp: article.hp,
    immune: article.immune,
    subsections,
    provenance: {
      kind: "beyond-srd",
      repo: OBJECT_MIRROR_ATTRIBUTION.repository,
      revision: OBJECT_MIRROR_ATTRIBUTION.revision,
      book: article.bookSource,
      page: article.page,
      url: buildObjectUrl(article),
    },
    isTranslated: isFullyTranslated(article, translation),
  };
}

function isFullyTranslated(article: ParsedObjectStatblock, translation: ObjectTranslation | undefined): boolean {
  if (!translation?.title?.trim()) return false;
  return article.subsections.every((subsection) => Boolean(translation.subsections?.[subsection.id]?.trim()));
}

function main(): void {
  const articles = buildObjectArticles();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(articles, null, 2)}\n`, "utf-8");

  const untranslated = articles.filter((article) => !article.isTranslated);
  console.log(`✅ ${articles.length} обʼєктів поза SRD → ${OUTPUT_PATH}`);
  console.log(`   перекладено: ${articles.length - untranslated.length}, без перекладу: ${untranslated.length}`);
}

if (process.argv[1] && process.argv[1].endsWith("generate-objects.ts")) {
  main();
}
