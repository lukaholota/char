import type { ClassData } from "@/lib/classesData";

/// Каталог класів пише вид чарування готовим підписом («Повний», «Половинний», «Магія пакту»)
/// або `null`. Фільтр працює з тим самим підписом; порожнє значення дістає власний ключ.

export const NO_SPELLCASTING_KEY = "NONE";

export function findSpellcastingKey(characterClass: Pick<ClassData, "spellcasting">): string {
  return characterClass.spellcasting?.trim() || NO_SPELLCASTING_KEY;
}

const SPELLCASTING_ORDER = ["Повний", "Половинний", "Магія пакту", NO_SPELLCASTING_KEY];

export function collectSpellcastingKinds(classes: readonly ClassData[]): string[] {
  const present = new Set(classes.map(findSpellcastingKey));
  const known = SPELLCASTING_ORDER.filter((key) => present.has(key));
  const unknown = Array.from(present).filter((key) => !SPELLCASTING_ORDER.includes(key)).sort();
  return [...known, ...unknown];
}

export function collectHitDice(classes: readonly ClassData[]): number[] {
  return Array.from(new Set(classes.map((characterClass) => characterClass.hitDie))).sort((a, b) => a - b);
}
