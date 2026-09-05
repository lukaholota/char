import type { Ruleset } from "@prisma/client";

/// Категорії омні-пошуку та їхні підписи й адреси каталогів. Живуть окремо від `omniSearchData`,
/// бо той будує індекс і імпортує **всі** каталожні JSON: компонент, якому треба лише підпис
/// категорії, тягнув би за ним увесь індекс (docs/STATE.md дефект №9).
export type OmniSearchCategory =
  | "spells"
  | "magic-items"
  | "weapons"
  | "armor"
  | "bestiary"
  | "feats"
  | "invocations"
  | "bastions"
  | "backgrounds"
  | "classes"
  | "races"
  | "rules"
  | "characters";

export const OMNI_CATEGORY_LABELS: Record<OmniSearchCategory, string> = {
  spells: "Заклинання",
  "magic-items": "Магічні предмети",
  weapons: "Зброя",
  armor: "Обладунки",
  bestiary: "Бестіарій",
  feats: "Риси",
  invocations: "Потойбічні виклики",
  bastions: "Приміщення бастіону",
  backgrounds: "Походження",
  classes: "Класи",
  races: "Раси / Види",
  rules: "Довідник правил",
  characters: "Мої персонажі",
};

const CATEGORY_CATALOG_PATHS: Record<OmniSearchCategory, string> = {
  spells: "/spells",
  "magic-items": "/magic-items",
  weapons: "/weapons",
  armor: "/armor",
  bestiary: "/bestiary",
  feats: "/feats",
  invocations: "/invocations",
  bastions: "/bastions",
  backgrounds: "/backgrounds",
  classes: "/classes",
  races: "/races",
  rules: "/rules",
  characters: "/char/home",
};

export function findRoutePrefix(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "/2024" : "";
}

export function findCategoryCatalogHref(
  category: OmniSearchCategory,
  ruleset: Ruleset = "RULES_2014"
): string {
  if (category === "characters") return CATEGORY_CATALOG_PATHS.characters;
  return `${findRoutePrefix(ruleset)}${CATEGORY_CATALOG_PATHS[category]}`;
}
