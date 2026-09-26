import { Ruleset } from "@/lib/prisma-enums";

import beyondSrdArticles from "./generated/rules-beyond-srd.json";
import { RuleArticle } from "./rulesData";
import { ImportedRuleArticle } from "./rulesProvenance";

export const BEYOND_SRD_ATTRIBUTION = {
  text: "Варіантні й необовʼязкові правила поза SRD подано за дзеркалом 5etools; права на самі правила належать Wizards of the Coast.",
  sourceName: "5etools",
  sourceUrl: "https://5e.tools/variantrules.html",
};

const BEYOND_SRD_ARTICLES = beyondSrdArticles as unknown as ImportedRuleArticle[];

/// Обидві редакції — 2014 (варіанти DMG/XGtE/TCoE, дрібні реєстри KR23.5) і 2024 (глави XDMG,
/// KR23.4) — лежать в одному файлі; ruleset розрізняє їх при читанні.
export function getBeyondSrdArticles(): ImportedRuleArticle[] {
  return BEYOND_SRD_ARTICLES;
}

export function getBeyondSrdArticlesByRuleset(ruleset: Ruleset): ImportedRuleArticle[] {
  return BEYOND_SRD_ARTICLES.filter((article) => article.ruleset === ruleset);
}

export function findBeyondSrdByCategory(category: RuleArticle["category"]): ImportedRuleArticle[] {
  return BEYOND_SRD_ARTICLES.filter((article) => article.category === category);
}
