/**
 * Build src/lib/generated/traps-hazards.json — іменовані пастки й небезпеки поза SRD (KR23.3),
 * обидві редакції, плюс українські переклади з data/2014/traps-hazards-uk/ і
 * data/2024/traps-hazards-uk/.
 * Run: npx tsx scripts/generate-traps-hazards.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Ruleset } from "@prisma/client";

import {
  buildTrapHazardUrl,
  parseTrapsHazards,
  ParsedTrapHazardArticle,
  TRAP_HAZARD_MIRROR_ATTRIBUTION,
} from "./5etools/traps-hazards";
import { findHandwrittenArticles } from "../src/lib/rulesData";
import { getImportedRuleArticles2014 } from "../src/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "../src/lib/rules2024Data";
import { getBeyondSrdArticles } from "../src/lib/rulesBeyondSrdData";
import { GeneratedTrapHazard } from "../src/lib/trapHazardTypes";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/traps-hazards.json");
const TRANSLATIONS_DIR: Record<Ruleset, string> = {
  RULES_2014: join(process.cwd(), "data/2014/traps-hazards-uk"),
  RULES_2024: join(process.cwd(), "data/2024/traps-hazards-uk"),
};

/// Заголовки підрозділів — фіксовані назви полів схеми (Trigger/Effect/…), а не текст із книги,
/// тому вони не йдуть у партію перекладу: перекладач заповнює лише `content`.
const SUBSECTION_TITLES_UK: Record<string, string> = {
  description: "Опис",
  trigger: "Тригер",
  effect: "Ефект",
  initiative: "Ініціатива",
  "active-elements": "Активні елементи",
  "dynamic-elements": "Динамічні елементи",
  "constant-elements": "Сталі елементи",
  countermeasures: "Протидії",
};

export type TrapHazardTranslation = {
  title: string;
  tags: string[];
  subsections: Record<string, string>;
};

export function buildTrapHazardArticles(): GeneratedTrapHazard[] {
  const reservedSlugsByRuleset: Record<Ruleset, string[]> = {
    RULES_2014: [
      ...findHandwrittenArticles("RULES_2014").map((article) => article.slug),
      ...getImportedRuleArticles2014().map((article) => article.slug),
      ...getBeyondSrdArticles().map((article) => article.slug),
    ],
    RULES_2024: [
      ...findHandwrittenArticles("RULES_2024").map((article) => article.slug),
      ...getImportedRuleArticles2024().map((article) => article.slug),
    ],
  };

  const parsed = parseTrapsHazards({ reservedSlugsByRuleset });
  const translations = {
    RULES_2014: readTranslations("RULES_2014"),
    RULES_2024: readTranslations("RULES_2024"),
  };

  return parsed.map((article) => mergeTranslation(article, translations[article.ruleset].get(article.id)));
}

function readTranslations(ruleset: Ruleset): Map<string, TrapHazardTranslation> {
  const merged = new Map<string, TrapHazardTranslation>();
  const dir = TRANSLATIONS_DIR[ruleset];
  if (!existsSync(dir)) return merged;

  for (const fileName of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
    const batch = JSON.parse(readFileSync(join(dir, fileName), "utf-8")) as Record<string, TrapHazardTranslation>;
    for (const [articleId, translation] of Object.entries(batch)) {
      if (merged.has(articleId)) throw new Error(`Переклад "${articleId}" трапляється двічі (${fileName})`);
      merged.set(articleId, translation);
    }
  }

  return merged;
}

function mergeTranslation(
  article: ParsedTrapHazardArticle,
  translation: TrapHazardTranslation | undefined
): GeneratedTrapHazard {
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
    kind: article.kind,
    category: article.category,
    title: translation?.title?.trim() || article.engTitle,
    engTitle: article.engTitle,
    ruleset: article.ruleset,
    order: article.order,
    tags: translation?.tags?.length ? translation.tags : article.engTags,
    trapHazType: article.trapHazType,
    rating: article.rating,
    subsections,
    provenance: {
      kind: "beyond-srd",
      repo: TRAP_HAZARD_MIRROR_ATTRIBUTION.repository,
      revision: TRAP_HAZARD_MIRROR_ATTRIBUTION.revision,
      book: article.bookSource,
      page: article.page,
      url: buildTrapHazardUrl(article),
    },
    isTranslated: isFullyTranslated(article, translation),
  };
}

function isFullyTranslated(
  article: ParsedTrapHazardArticle,
  translation: TrapHazardTranslation | undefined
): boolean {
  if (!translation?.title?.trim()) return false;
  return article.subsections.every((subsection) => Boolean(translation.subsections?.[subsection.id]?.trim()));
}

function main(): void {
  const articles = buildTrapHazardArticles();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(articles, null, 2)}\n`, "utf-8");

  const untranslated = articles.filter((article) => !article.isTranslated);
  console.log(`✅ ${articles.length} пасток і небезпек поза SRD → ${OUTPUT_PATH}`);
  console.log(`   перекладено: ${articles.length - untranslated.length}, без перекладу: ${untranslated.length}`);
}

if (process.argv[1] && process.argv[1].endsWith("generate-traps-hazards.ts")) {
  main();
}
