import type { RuleCategory } from "@/lib/rulesData";

export type RulesHubCard = {
  key: string;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  categoryKey?: RuleCategory["key"];
};

const RPGBOT_ANALYSIS_CARD: RulesHubCard = {
  key: "rpgbot",
  title: "Аналітика RPGbot",
  description: "Розбір класів, підкласів, рас, рис і заклинань з оцінками від RPGbot — повністю українською.",
  imageSrc: "/images/categories/rpgbot.webp",
  href: "/rules/optimization",
};

export function buildRulesHubCards(categories: readonly RuleCategory[], basePath: string, is2024: boolean): RulesHubCard[] {
  const categoryCards = categories.map((category): RulesHubCard => ({
    key: category.key,
    title: category.title,
    description: category.description,
    imageSrc: category.imageSrc,
    href: `${basePath}/${category.key}`,
    categoryKey: category.key,
  }));
  return is2024 ? categoryCards : [RPGBOT_ANALYSIS_CARD, ...categoryCards];
}
