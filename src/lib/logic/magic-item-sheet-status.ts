import { Ability, Skills } from "@/lib/prisma-enums";
import type { PersWithRelations } from "@/lib/actions/pers";
import { getSaveBonus, getSimpleBonus, getSkillBonus, getStatBonus, listSwitchedOnItemStates } from "@/lib/logic/bonus-calculator";
import { abilityTranslations, skillTranslations } from "@/lib/refs/translation";
import type { MagicItemEffect } from "@/rules/magic-item-effects";
import { findMissingActivationSteps, type MagicItemActivationStep } from "@/lib/logic/magic-item-activation";
import { findSwitchableItemState, type MagicItemState } from "@/rules/magic-item-states";

export type OwnedItemState = {
  magicItemId: number;
  persMagicItemId: number | null;
  name: string;
  state: MagicItemState;
  isSwitchedOn: boolean;
  missingSteps: MagicItemActivationStep[];
};

/// Носимі предмети зі станом (вмикаються тут) і вже випиті зілля (лише вимикаються).
export function listOwnedItemStates(pers: PersWithRelations): OwnedItemState[] {
  const switchedOn = listSwitchedOnItemStates(pers);
  const switchedOnIds = new Set(switchedOn.map((entry) => entry.magicItemId));
  const byItem = new Map<number, OwnedItemState>();
  for (const link of pers.magicItems ?? []) {
    const state = link.magicItem ? findSwitchableItemState(link.magicItem) : null;
    if (!state || byItem.get(link.magicItemId)?.missingSteps.length === 0) continue;
    byItem.set(link.magicItemId, {
      magicItemId: link.magicItemId,
      persMagicItemId: link.persMagicItemId,
      name: link.magicItem.name,
      state,
      isSwitchedOn: switchedOnIds.has(link.magicItemId),
      missingSteps: findMissingActivationSteps(link),
    });
  }
  for (const entry of switchedOn) {
    if (!byItem.has(entry.magicItemId)) byItem.set(entry.magicItemId, { ...entry, persMagicItemId: null, isSwitchedOn: true, missingSteps: [] });
  }
  return [...byItem.values()];
}

/// Назви місць, де гравець уже вписав ручний бонус, а предмет тепер додає свій — можливий подвійний облік.
export function listManualBonusOverlaps(pers: PersWithRelations, effects: readonly MagicItemEffect[]): string[] {
  const labels = effects.flatMap((effect) => findManualOverlap(pers, effect));
  return [...new Set(labels)];
}

const anyAbility = (read: (ability: Ability) => number) => Object.values(Ability).some((ability) => read(ability) !== 0);
const anySkill = (read: (skill: Skills) => number) => Object.values(Skills).some((skill) => read(skill) !== 0);

function findManualOverlap(pers: PersWithRelations, effect: MagicItemEffect): string[] {
  switch (effect.kind) {
    case "AC_BONUS":
      return getSimpleBonus(pers, "ac") ? ["КБ"] : [];
    case "SAVE_BONUS":
      return (effect.ability ? getSaveBonus(pers, effect.ability) : anyAbility((ability) => getSaveBonus(pers, ability))) ? ["рятівних кидків"] : [];
    case "CHECK_BONUS":
      return anySkill((skill) => getSkillBonus(pers, skill)) ? ["навичок"] : [];
    case "SKILL_BONUS":
      return getSkillBonus(pers, effect.skill as Skills) ? [skillTranslations[effect.skill] ?? effect.skill] : [];
    case "ABILITY_BONUS":
      return getStatBonus(pers, effect.ability) ? [abilityTranslations[effect.ability]] : [];
    case "PROFICIENCY_BONUS":
      return getSimpleBonus(pers, "proficiency") ? ["бонусу майстерності"] : [];
    case "SPELL_ATTACK_BONUS":
      return getSimpleBonus(pers, "spellAttack") ? ["атаки заклинаннями"] : [];
    case "SPELL_DC_BONUS":
      return getSimpleBonus(pers, "spellDC") ? ["СК заклинань"] : [];
    default:
      return [];
  }
}
