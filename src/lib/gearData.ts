import type { Ruleset } from "@/lib/prisma-enums";
import { parseGear2014, parseGear2024, type GearItem } from "@/rules/adventuring-gear";
import { getAllRuleArticles2014 } from "./rules2014Data";
import { getAllRuleArticles2024 } from "./rules2024Data";

export const GEAR_RULES_ARTICLE_SLUG = "adventuring-gear";

const cachedGear: Partial<Record<Ruleset, GearItem[]>> = {};

export function getAllGear(ruleset: Ruleset): GearItem[] {
  return (cachedGear[ruleset] ??= ruleset === "RULES_2024" ? readGear2024() : readGear2014());
}

function readGear2014(): GearItem[] {
  const article = getAllRuleArticles2014().find((candidate) => candidate.slug === GEAR_RULES_ARTICLE_SLUG);
  return article ? parseGear2014(article.subsections[0].content) : [];
}

function readGear2024(): GearItem[] {
  const article = getAllRuleArticles2024().find((candidate) => candidate.slug === GEAR_RULES_ARTICLE_SLUG);
  return article ? parseGear2024(article.subsections) : [];
}
