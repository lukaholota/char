/**
 * Джерела картки терміна — окремим чанком, як каталог заклинань у `spell-catalog-chunk.ts`
 * (KR25.1): `TermInfoModal` змонтована глобально, і статичний імпорт довідника обох редакцій,
 * словника й каталогів ліг би в бандл кожної сторінки. Динамічний імпорт тягне їх на першому
 * відкритому терміні, а сервісний воркер кешує чанк cache-first.
 */

import type { TermCard } from "@/lib/term-card";
import type { TermLink } from "@/lib/term-link";

export async function findTermCard(link: TermLink): Promise<TermCard> {
  const [
    { buildTermCard },
    { getAllConditions },
    { getAllRuleArticles2014 },
    { getAllRuleArticles2024, getConditions2024 },
    dictionary,
    { getAllWeapons },
    { getAllArmors },
    { findAliasVariants },
  ] = await Promise.all([
    import("@/lib/term-card"),
    import("@/lib/rulesData"),
    import("@/lib/rules2014Data"),
    import("@/lib/rules2024Data"),
    import("@/lib/refs/dictionary.json"),
    import("@/lib/weaponsData"),
    import("@/lib/armorData"),
    import("@/lib/search/searchAliases"),
  ]);

  return buildTermCard(link, {
    articles: { RULES_2014: getAllRuleArticles2014(), RULES_2024: getAllRuleArticles2024() },
    conditions: { RULES_2014: getAllConditions("RULES_2014"), RULES_2024: getConditions2024() },
    dictionary: dictionary.DND_DICTIONARY as Record<string, unknown>,
    weapons: { RULES_2014: getAllWeapons("RULES_2014"), RULES_2024: getAllWeapons("RULES_2024") },
    armors: { RULES_2014: getAllArmors("RULES_2014"), RULES_2024: getAllArmors("RULES_2024") },
    findAliases: findAliasVariants,
  });
}
