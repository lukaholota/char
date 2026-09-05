/**
 * Build src/lib/generated/rules-beyond-srd.json — варіантні правила поза SRD з дзеркала 5etools
 * плюс українські переклади з data/2014/beyond-srd-uk/.
 * Run: npx tsx scripts/generate-rules-beyond-srd.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import {
  buildVariantRuleUrl,
  MIRROR_ATTRIBUTION,
  parseBeyondSrdRules,
  ParsedBeyondSrdArticle,
} from "./5etools/variant-rules";
import { parseSmallRegistries } from "./5etools/small-registries";
import {
  buildPhbChapterUrl,
  buildXdmgChapterUrl,
  parsePhbChapters,
  parseXdmgChapters,
} from "./5etools/xdmg-chapters";
import { findEditionBySource, RulesEdition } from "./5etools/schema";
import { findHandwrittenArticles } from "../src/lib/rulesData";
import { RuleProvenance } from "../src/lib/rulesProvenance";
import { getImportedRuleArticles2014 } from "../src/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "../src/lib/rules2024Data";
import { numberArticlesWithinCategory } from "./srd/rules-markdown";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/rules-beyond-srd.json");
/// 2014 (варіанти DMG/XGtE/TCoE, дрібні реєстри KR23.5) і 2024 (глави XDMG, KR23.4) тримають
/// переклади в окремих теках — той самий поділ, що й решта корпусу (`data/2014/…` / `data/2024/…`).
const TRANSLATIONS_DIRS: Record<RulesEdition, string> = {
  RULES_2014: join(process.cwd(), "data/2014/beyond-srd-uk"),
  RULES_2024: join(process.cwd(), "data/2024/beyond-srd-uk"),
};

export type RuleArticleTranslation = {
  title: string;
  summary: string;
  tags: string[];
  subsections: Record<string, { title: string; content: string }>;
};

export type GeneratedBeyondSrdArticle = {
  id: string;
  slug: string;
  category: ParsedBeyondSrdArticle["category"];
  title: string;
  engTitle: string;
  summary: string;
  ruleset: RulesEdition;
  order: number;
  tags: string[];
  subsections: { id: string; title: string; engTitle: string; content: string }[];
  provenance: RuleProvenance;
  isTranslated: boolean;
};

/// Порядок сталий: кожен наступний розкладач бачить слаги, зайняті попередніми, і сторінка
/// 5etools у кожного своя. KR29.1 дописала PHB 2014 в кінець — вставка посеред переліку зрушила б
/// слаги вже опублікованих статей через `claimSlug`.
const SOURCES: {
  parse: (options: { reservedSlugs?: string[] }) => ParsedBeyondSrdArticle[];
  buildUrl: (article: ParsedBeyondSrdArticle) => string;
}[] = [
  { parse: parseBeyondSrdRules, buildUrl: buildVariantRuleUrl },
  { parse: parseSmallRegistries, buildUrl: buildSmallRegistryUrl },
  { parse: parseXdmgChapters, buildUrl: buildXdmgChapterUrl },
  { parse: parsePhbChapters, buildUrl: buildPhbChapterUrl },
];

export function buildBeyondSrdArticles(): GeneratedBeyondSrdArticle[] {
  const claimedSlugs = [
    ...findHandwrittenArticles("RULES_2014").map((article) => article.slug),
    ...getImportedRuleArticles2014().map((article) => article.slug),
    ...findHandwrittenArticles("RULES_2024").map((article) => article.slug),
    ...getImportedRuleArticles2024().map((article) => article.slug),
  ];

  const buildUrlById = new Map<string, (article: ParsedBeyondSrdArticle) => string>();
  const parsedBySource: ParsedBeyondSrdArticle[][] = [];

  for (const { parse, buildUrl } of SOURCES) {
    const articles = parse({ reservedSlugs: claimedSlugs });
    for (const article of articles) {
      claimedSlugs.push(article.slug);
      buildUrlById.set(article.id, buildUrl);
    }
    parsedBySource.push(articles);
  }

  /// Кожен розкладач нумерує `order` у межах власного виклику — рахунок довелося звести заново
  /// по обʼєднаному списку, інакше запис у категорії, де вже є стаття з іншого джерела
  /// (наприклад «gamemaster»), дістав би той самий `order`, що й наявна.
  const parsed = numberArticlesWithinCategory(parsedBySource.flat());

  const translations = readTranslations();
  return parsed.map((article) =>
    mergeTranslation(article, translations.get(article.id), findArticleUrl(article, buildUrlById))
  );
}

function findArticleUrl(
  article: ParsedBeyondSrdArticle,
  buildUrlById: Map<string, (article: ParsedBeyondSrdArticle) => string>
): string {
  const buildUrl = buildUrlById.get(article.id);
  if (!buildUrl) throw new Error(`«${article.id}»: жоден розкладач не заявив цю статтю`);
  return buildUrl(article);
}

/// KR23.5: `actions.json`/`conditionsdiseases.json`/`senses.json` живуть на своїх сторінках
/// 5etools, не на `variantrules.html`. Якір той самий прийом, що й `buildVariantRuleUrl`.
function buildSmallRegistryUrl(article: ParsedBeyondSrdArticle): string {
  const page = SMALL_REGISTRY_PAGE_BY_TITLE.get(article.engTitle);
  if (!page) throw new Error(`«${article.engTitle}»: невідома сторінка 5etools для дрібного реєстру`);

  const anchor = `${article.engTitle.toLowerCase().replace(/[^a-z0-9]+/g, "%20").trim()}_${article.bookSource.toLowerCase()}`;
  return `https://5e.tools/${page}.html#${anchor}`;
}

const SMALL_REGISTRY_PAGE_BY_TITLE = new Map<string, string>([
  ["Identify a Spell", "actions"],
  ["Blinding Sickness", "conditionsdiseases"],
  ["Filth Fever", "conditionsdiseases"],
  ["Flesh Rot", "conditionsdiseases"],
  ["Mindfire", "conditionsdiseases"],
  ["Seizure", "conditionsdiseases"],
  ["Slimy Doom", "conditionsdiseases"],
  ["Blindsight", "senses"],
  ["Darkvision", "senses"],
  ["Truesight", "senses"],
]);

function readTranslations(): Map<string, RuleArticleTranslation> {
  const merged = new Map<string, RuleArticleTranslation>();

  for (const dir of Object.values(TRANSLATIONS_DIRS)) {
    if (!existsSync(dir)) continue;

    for (const fileName of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
      const batch = JSON.parse(readFileSync(join(dir, fileName), "utf-8")) as Record<
        string,
        RuleArticleTranslation
      >;
      for (const [articleId, translation] of Object.entries(batch)) {
        if (merged.has(articleId)) throw new Error(`Переклад "${articleId}" трапляється двічі (${fileName})`);
        merged.set(articleId, translation);
      }
    }
  }

  return merged;
}

function mergeTranslation(
  article: ParsedBeyondSrdArticle,
  translation: RuleArticleTranslation | undefined,
  url: string
): GeneratedBeyondSrdArticle {
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
    ruleset: findEditionBySource(article.bookSource),
    order: article.order,
    tags: translation?.tags?.length ? translation.tags : article.engTags,
    subsections,
    provenance: {
      kind: "beyond-srd",
      repo: MIRROR_ATTRIBUTION.repository,
      revision: MIRROR_ATTRIBUTION.revision,
      book: article.bookSource,
      page: article.page,
      url,
    },
    isTranslated: isFullyTranslated(article, translation),
  };
}

function isFullyTranslated(
  article: ParsedBeyondSrdArticle,
  translation: RuleArticleTranslation | undefined
): boolean {
  if (!translation?.title?.trim() || !translation.summary?.trim()) return false;
  return article.subsections.every((subsection) => {
    const translated = translation.subsections?.[subsection.id];
    return Boolean(translated?.title?.trim() && translated?.content?.trim());
  });
}

function main(): void {
  const articles = buildBeyondSrdArticles();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(articles, null, 2)}\n`, "utf-8");

  const untranslated = articles.filter((article) => !article.isTranslated);
  console.log(`✅ ${articles.length} правил поза SRD → ${OUTPUT_PATH}`);
  console.log(`   перекладено: ${articles.length - untranslated.length}, без перекладу: ${untranslated.length}`);
}

if (process.argv[1] && process.argv[1].endsWith("generate-rules-beyond-srd.ts")) {
  main();
}
