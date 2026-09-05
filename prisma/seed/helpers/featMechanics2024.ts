/**
 * data/2024/normalized/feats.json тримає механіку риси прозою: передумови українським рядком
 * («4+ рівень, Сила або Спритність 13+»), а підвищення характеристики — англійським абзацом
 * benefitsEng. Ці функції перекладають прозу в поля, які вже є на `Feat`, — щоб сід не носив
 * ще однієї, руками написаної таблиці, яка розійдеться з даними.
 */

import { Ability, ArmorType } from "@prisma/client";

export type AbilityCode = keyof typeof Ability;

export type FeatPrerequisites2024 = {
  level: number | null;
  abilityScore: Record<string, number | boolean> | null;
  proficiency: { armor: ArmorType[] } | null;
  spellcasting: boolean;
};

const ABILITY_BY_UKRAINIAN_NAME: Record<string, AbilityCode> = {
  Сила: "STR",
  Спритність: "DEX",
  Статура: "CON",
  Інтелект: "INT",
  Мудрість: "WIS",
  Харизма: "CHA",
};

const ABILITY_BY_ENGLISH_NAME: Record<string, AbilityCode> = {
  Strength: "STR",
  Dexterity: "DEX",
  Constitution: "CON",
  Intelligence: "INT",
  Wisdom: "WIS",
  Charisma: "CHA",
};

const ARMOR_BY_UKRAINIAN_NAME: Record<string, ArmorType> = {
  "легким обладунком": ArmorType.LIGHT,
  "середнім обладунком": ArmorType.MEDIUM,
  "важким обладунком": ArmorType.HEAVY,
  щитом: ArmorType.SHIELD,
};

export const EVERY_ABILITY: AbilityCode[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export function findFeatPrerequisites(prerequisite: string | null | undefined): FeatPrerequisites2024 {
  const text = String(prerequisite ?? "");
  return {
    level: findRequiredLevel(text),
    abilityScore: findRequiredAbilityScore(text),
    proficiency: findRequiredArmorProficiency(text),
    spellcasting: hasSpellcastingPrerequisite(text),
  };
}

/**
 * Які характеристики риса піднімає на 1. Порожній масив — риса характеристик не чіпає,
 * один елемент — підвищення фіксоване, кілька — гравець обирає.
 */
export function findAbilityIncreaseOptions(
  benefits: Array<{ name?: string | null; description?: string | null }> | null | undefined,
): AbilityCode[] {
  const description = (benefits ?? []).find((benefit) => benefit?.name === "Ability Score Increase")?.description;
  if (!description) return [];
  if (/one ability score of your choice/i.test(description)) return [...EVERY_ABILITY];
  if (/Choose one ability in which you lack saving throw proficiency/i.test(description)) return [...EVERY_ABILITY];

  const named = Object.entries(ABILITY_BY_ENGLISH_NAME)
    .filter(([englishName]) => new RegExp(`\\b${englishName}\\b`).test(description))
    .map(([, ability]) => ability);
  return EVERY_ABILITY.filter((ability) => named.includes(ability));
}

/** `{ CHA: 1 }` для фіксованого підвищення, `{ STR_OR_DEX: 1 }` / `{ ANY: 1 }` для вибору — конвенція 2014. */
export function buildGrantedAbilityScoreIncrease(abilities: AbilityCode[]): Record<string, number> | null {
  if (abilities.length === 0) return null;
  if (abilities.length === EVERY_ABILITY.length) return { ANY: 1 };
  return { [abilities.join("_OR_")]: 1 };
}

function findRequiredLevel(text: string): number | null {
  const match = text.match(/(\d+)\+\s*рівень/);
  return match ? Number(match[1]) : null;
}

function findRequiredAbilityScore(text: string): Record<string, number | boolean> | null {
  const match = text.match(/((?:[А-ЯІЇЄҐ][а-яіїєґ']+(?:,\s*|\s+або\s+)?)+)\s*(\d+)\+/);
  if (!match) return null;

  const score = Number(match[2]);
  const abilities = match[1]
    .split(/,\s*|\s+або\s+/)
    .map((word) => ABILITY_BY_UKRAINIAN_NAME[word.trim()])
    .filter((ability): ability is AbilityCode => Boolean(ability));
  if (abilities.length === 0) return null;

  const required: Record<string, number | boolean> = Object.fromEntries(
    abilities.map((ability) => [ability, score]),
  );
  if (abilities.length > 1) required.or = true;
  return required;
}

function findRequiredArmorProficiency(text: string): { armor: ArmorType[] } | null {
  if (!text.includes("володіння")) return null;
  const armor = Object.entries(ARMOR_BY_UKRAINIAN_NAME)
    .filter(([ukrainianName]) => text.includes(ukrainianName))
    .map(([, armorType]) => armorType);
  return armor.length ? { armor } : null;
}

function hasSpellcastingPrerequisite(text: string): boolean {
  return text.includes("Накладання заклинань") || text.includes("Магія пакту");
}
