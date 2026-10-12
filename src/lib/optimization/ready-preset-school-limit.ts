import { describeSchoolLimit2014, findSchoolLimit2014, isOutsideSchools } from "@/rules/class-spell-choices-2014";
import type { SpellSchoolLimit } from "@/rules/spell-choice-filter";
import type { LevelSpell, OpenPickSlot } from "./ready-preset-levels";

type SchoolLimitedSlot = Pick<OpenPickSlot, "classKey" | "classLevel" | "schoolLimitedSubclassKey">;

export function findSchoolLimitForSlot(slot: SchoolLimitedSlot, ownedBefore: readonly LevelSpell[]): SpellSchoolLimit | null {
  if (!slot.schoolLimitedSubclassKey) return null;
  return findSchoolLimit2014({
    caster: { className: slot.classKey, subclassName: slot.schoolLimitedSubclassKey },
    classLevel: slot.classLevel,
    ownedOfClass: ownedBefore.map((spell) => ({ level: spell.level, school: spell.school, badgeText: null, excludeFromPreparedCount: false, spellLists: [] })),
  });
}

export function filterBySchoolAllowance(limit: SpellSchoolLimit, pickedInStep: readonly LevelSpell[], candidates: readonly LevelSpell[]): LevelSpell[] {
  if (countSpellsOutsideSchools(limit, pickedInStep) < limit.outsideAllowed) return [...candidates];
  return candidates.filter((spell) => !isOutsideSchools(limit.schools, spell.school));
}

export function findSchoolLimitMessage(limit: SpellSchoolLimit, pickedInStep: readonly LevelSpell[]): string | null {
  return countSpellsOutsideSchools(limit, pickedInStep) > limit.outsideAllowed ? describeSchoolLimit2014(limit) : null;
}

function countSpellsOutsideSchools(limit: SpellSchoolLimit, spells: readonly LevelSpell[]): number {
  return spells.filter((spell) => spell.level > 0 && isOutsideSchools(limit.schools, spell.school)).length;
}
