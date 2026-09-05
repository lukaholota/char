import { Classes, Ruleset, SpellcastingType } from "@prisma/client";
import { calculateCasterLevel as calculateRulesCasterLevel } from "@/rules/spellcasting";
import type { SpellcastingCharacter } from "@/rules/types";

export type SpellcastingClassLevel = {
  classLevel: number;
  class?: {
    name?: Classes | string | null;
    spellcastingType?: SpellcastingType | null;
  } | null;
  subclass?: {
    spellcastingType?: SpellcastingType | null;
  } | null;
};

export type SpellcastingPersLike = {
  ruleset: Ruleset;
  level: number;
  class?: { name?: Classes | string | null; spellcastingType?: SpellcastingType | null } | null;
  subclass?: { spellcastingType?: SpellcastingType | null } | null;
  multiclasses?: Array<{
    classLevel: number;
    class?: { name?: Classes | string | null; spellcastingType?: SpellcastingType | null } | null;
    subclass?: { spellcastingType?: SpellcastingType | null } | null;
  }>;
};

export type CasterLevelResult = {
  casterLevel: number; // for standard multiclass spell slots (FULL table)
  pactLevel: number; // total warlock levels (for PACT)
};

export function calculateCasterLevel(pers: SpellcastingPersLike): CasterLevelResult {
  return calculateRulesCasterLevel(toRulesSpellcastingCharacter(pers), pers.ruleset);
}

export function toRulesSpellcastingCharacter(pers: SpellcastingPersLike): SpellcastingCharacter {
  return {
    level: pers.level,
    characterClass: toRulesClass(pers.class),
    subclass: toRulesSubclass(pers.subclass),
    multiclasses: pers.multiclasses?.map((multiclass) => ({
      classLevel: multiclass.classLevel,
      characterClass: toRulesClass(multiclass.class),
      subclass: toRulesSubclass(multiclass.subclass),
    })),
  };
}

function toRulesClass(characterClass: SpellcastingClassLevel["class"]): SpellcastingCharacter["characterClass"] {
  if (!characterClass) return null;
  return { name: characterClass.name, spellcastingType: characterClass.spellcastingType ?? undefined };
}

function toRulesSubclass(subclass: SpellcastingClassLevel["subclass"]): SpellcastingCharacter["subclass"] {
  if (!subclass) return null;
  return { spellcastingType: subclass.spellcastingType ?? undefined };
}
