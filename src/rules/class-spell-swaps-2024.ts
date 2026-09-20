/**
 * L08-levelup-machine-11 — заміна одного заклинання на новому рівні класу 2024 (SRD 2024,
 * classes.md). Замовляння: «Whenever you gain a Bard level, you can replace one of your cantrips» —
 * бард, клірик, друїд, чародій, чорнокнижник (чарівник міняє на тривалому відпочинку). Підготовлене:
 * «Whenever you gain a Sorcerer level, you can replace one spell on your list» — бард, чародій,
 * чорнокнижник; клірик, друїд, паладин, слідопит і чарівник міняють на відпочинку, і це дія листа.
 * Заміна необовʼязкова, нове береться з того самого фільтра класу, що й нові заклинання рівня.
 */

export type SpellSwap = { dropId: number | null; addId: number | null };

export type ClassSpellSwapRule = { cantrip: boolean; prepared: boolean };

export type SwappableOwnedSpell = {
  spellId: number;
  level: number;
  isPrepared: boolean;
  badgeText: string | null;
  excludeFromPreparedCount: boolean;
};

const CANTRIP_SWAP_ON_LEVEL = new Set(["BARD_2024", "CLERIC_2024", "DRUID_2024", "SORCERER_2024", "WARLOCK_2024"]);
const PREPARED_SWAP_ON_LEVEL = new Set(["BARD_2024", "SORCERER_2024", "WARLOCK_2024"]);

export function findLevelUpSpellSwapRule(className: string): ClassSpellSwapRule | null {
  const rule = { cantrip: CANTRIP_SWAP_ON_LEVEL.has(className), prepared: PREPARED_SWAP_ON_LEVEL.has(className) };
  return rule.cantrip || rule.prepared ? rule : null;
}

export function collectSwappableSpellIds(
  rule: ClassSpellSwapRule,
  owned: readonly SwappableOwnedSpell[],
  classLabel: string,
): { cantripIds: number[]; preparedIds: number[] } {
  const ofClass = owned.filter((spell) => spell.badgeText === classLabel && !spell.excludeFromPreparedCount);
  return {
    cantripIds: rule.cantrip ? ofClass.filter((spell) => spell.level === 0).map((spell) => spell.spellId) : [],
    preparedIds: rule.prepared ? ofClass.filter((spell) => spell.level > 0 && spell.isPrepared).map((spell) => spell.spellId) : [],
  };
}

export function isSwapStarted(swap: SpellSwap | null | undefined): swap is SpellSwap {
  return Boolean(swap && (swap.dropId !== null || swap.addId !== null));
}

export function findSpellSwapProblem(input: {
  swap: SpellSwap | null | undefined;
  droppableIds: readonly number[];
  candidateIds: readonly number[];
}): string | null {
  const { swap } = input;
  if (!isSwapStarted(swap)) return null;
  if (swap.dropId === null || swap.addId === null) return "Для заміни оберіть і що прибрати, і що взяти натомість";
  if (!input.droppableIds.includes(swap.dropId)) return "Замінити можна лише заклинання цього класу, обране гравцем";
  if (!input.candidateIds.includes(swap.addId)) return "Обране заклинання не з вашого списку класу або зависокого рівня";
  return null;
}
