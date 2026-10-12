import searchArticles from "@/lib/generated/optimization-omni-search-2014.json";
import searchPresets from "@/lib/generated/optimization-preset-search-2014.json";
import { findCatalogSearchTitle } from "@/lib/catalogs/catalog-registry";
import type { Ruleset } from "@/lib/prisma-enums";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import type { ReadyPresetSearchEntry } from "@/lib/optimization/ready-preset-search-index";
import type { RpgbotSearchArticleNames } from "@/lib/optimization/search-index-builder";

const RPGBOT_NAME_KEYWORDS = ["RPGbot", "рпгбот", "рпг бот", "рпджібот", "rpg bot", "rpgbot.net"];
const RPGBOT_RESULT_KINDS = ["article", "section", "preset"] as const;

export type RpgbotSearchResult = { result_kind: (typeof RPGBOT_RESULT_KINDS)[number]; result_id: string };

export function collectRpgbotSearchItems(ruleset: Ruleset): OmniSearchItem[] {
  if (ruleset !== "RULES_2014") return [];
  return [...searchArticles.flatMap(collectArticleSearchItems), ...searchPresets.map(buildReadyPresetSearchItem)];
}

export function buildReadyPresetSearchItem(preset: ReadyPresetSearchEntry): OmniSearchItem {
  return { category: "rpgbot", categoryLabel: findCatalogSearchTitle("rpgbot"), id: `rpgbot-preset-${preset.slug}`, title: preset.title,
    subtitle: `${preset.className} · ${preset.subclassName}`, href: `/char/create?preset=${preset.slug}&from=search`, badge: "Готовий персонаж",
    keywords: [...RPGBOT_NAME_KEYWORDS, "готовий персонаж", "пресет", "білд", preset.title, preset.className, preset.classEngName, preset.subclassName, preset.subclassEngName],
    aliases: [preset.classEngName, preset.subclassEngName, ...preset.aliases] };
}

export function collectArticleSearchItems(article: RpgbotSearchArticleNames): OmniSearchItem[] {
  const common = { category: "rpgbot" as const, categoryLabel: findCatalogSearchTitle("rpgbot") };
  const keywords = [...RPGBOT_NAME_KEYWORDS, "аналітика", "оптимізація", "гайд", article.title, article.titleEn, ...article.topics];
  return [{ ...common, id: `rpgbot-article-${article.articleId}`, title: article.title,
    subtitle: article.titleEn, href: article.href, badge: "Стаття", keywords, aliases: article.aliases },
  ...article.sections.map((section) => ({ ...common, id: `rpgbot-section-${article.articleId}-${section.sectionId}`,
    title: section.title, subtitle: article.title, href: `${article.href}#${section.sectionId}`, badge: "Розділ",
    keywords: [...keywords, ...article.aliases] }))];
}

export function findRpgbotSearchResult(itemId: string): RpgbotSearchResult | null {
  const result_kind = RPGBOT_RESULT_KINDS.find((kind) => itemId.startsWith(`rpgbot-${kind}-`));
  return result_kind ? { result_kind, result_id: itemId.slice(`rpgbot-${result_kind}-`.length) } : null;
}
