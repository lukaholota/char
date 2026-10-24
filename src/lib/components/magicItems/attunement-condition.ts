import { classTranslations } from "@/lib/refs/translation";

const CLASS_KEYS = {
  Bard: "BARD_2024", Cleric: "CLERIC_2024", Druid: "DRUID_2024", Paladin: "PALADIN_2024",
  Ranger: "RANGER_2024", Sorcerer: "SORCERER_2024", Warlock: "WARLOCK_2024", Wizard: "WIZARD_2024",
} as const;

const SPECIAL_CONDITIONS: Record<string, string> = {
  "a Spellcaster": "істота зі здатністю накладати заклинання",
  "a Creature of the Weapon’s Choice": "істота, обрана цією зброєю",
  "a Dwarf or a Creature Attuned to a Belt of Dwarvenkind": "дворф або істота, налаштована на Пояс дворфів",
};

export function translateAttunementCondition(condition: string | null | undefined): string | null {
  const original = condition?.trim();
  if (!original) return null;
  if (SPECIAL_CONDITIONS[original]) return SPECIAL_CONDITIONS[original];
  const classes = original.replace(/^a /, "").split(/,? or |,\s*/);
  if (!classes.every((name) => Object.hasOwn(CLASS_KEYS, name))) return null;
  return classes.map((name) => classTranslations[CLASS_KEYS[name as keyof typeof CLASS_KEYS]].toLocaleLowerCase("uk")).join(" або ");
}
