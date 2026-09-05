import type { Ruleset } from "@prisma/client";

/// Підпис каталогу видів/рас іде за омні-пошуком: «Вид» для 2024, «Раса» для 2014. Живе окремо
/// від `racesData`, бо картці виду потрібен лише цей підпис — а через каталог тягнула
/// `races.json` (docs/STATE.md дефект №9).
export const RACE_CATALOG_TITLE: Record<Ruleset, string> = {
  RULES_2014: "Раси",
  RULES_2024: "Види",
};

export const RACE_SINGULAR: Record<Ruleset, string> = {
  RULES_2014: "Раса",
  RULES_2024: "Вид",
};
