import { normalizeBaseClassValue } from "@/lib/spell-class-facets";

type LeveledSpell = { level: number; spellClasses: Array<{ className: string }> };

export type CharacterSpellLevelLimits = {
  maxSpellLevel: number | null;
  maxSpellLevelByClass: Map<string, number> | null;
};

export function isWithinCharacterSpellLevel(spell: LeveledSpell, limits: CharacterSpellLevelLimits): boolean {
  if (limits.maxSpellLevel !== null && spell.level > limits.maxSpellLevel) return false;
  if (limits.maxSpellLevelByClass) return isPreparableBySomeClass(spell, limits.maxSpellLevelByClass);
  return true;
}

function isPreparableBySomeClass(spell: LeveledSpell, maxSpellLevelByClass: Map<string, number>): boolean {
  if (spell.level === 0) return true;
  return spell.spellClasses.some(
    (entry) => spell.level <= (maxSpellLevelByClass.get(normalizeBaseClassValue(entry.className)) ?? 0)
  );
}
