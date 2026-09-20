import type { TermSources } from "@/lib/term-card";
import { getAllConditions } from "@/lib/rulesData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024, getConditions2024 } from "@/lib/rules2024Data";
import dictionary from "@/lib/refs/dictionary.json";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { findAliasVariants } from "@/lib/search/searchAliases";

/// Статичний імпорт довідника обох редакцій, словника й каталогів — тому цей модуль тягнуть лише
/// динамічно (`term-catalog-chunk.ts`), генератор `rule-term-cards.json` і тести.
export function collectTermSources(): TermSources {
  return {
    articles: { RULES_2014: getAllRuleArticles2014(), RULES_2024: getAllRuleArticles2024() },
    conditions: { RULES_2014: getAllConditions("RULES_2014"), RULES_2024: getConditions2024() },
    dictionary: dictionary.DND_DICTIONARY as Record<string, unknown>,
    weapons: { RULES_2014: getAllWeapons("RULES_2014"), RULES_2024: getAllWeapons("RULES_2024") },
    armors: { RULES_2014: getAllArmors("RULES_2014"), RULES_2024: getAllArmors("RULES_2024") },
    findAliases: findAliasVariants,
  };
}
