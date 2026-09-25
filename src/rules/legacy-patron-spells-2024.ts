import patronSpellLists from "../../data/2014/warlock-expanded-spell-lists.json";
import { subclassTranslations } from "@/lib/refs/translation";
import { findLegacySubclass2024, findSpellEngName2024 } from "@/rules/legacy-subclasses-2024";
import type { ExtraSpellList } from "@/rules/spell-choice-filter";

export function findLegacyPatronSpellList(class2024: string, subclass: string | null): ExtraSpellList | null {
  if (!subclass || !findLegacySubclass2024(class2024, subclass)) return null;
  const list = patronSpellLists.lists.find((entry) => entry.subclass === subclass);
  if (!list) return null;

  return {
    name: subclassTranslations[subclass as keyof typeof subclassTranslations] ?? subclass,
    spellEngNames: [...new Set(list.spells.map((spell) => findSpellEngName2024(spell.engName)))],
  };
}
