import type { MagicSystem } from "./house-rules";

export const SPELL_POINT_COSTS = [2, 3, 5, 6, 7, 9, 10, 11, 13] as const;

export function findSpellPointCost(slotLevel: number): number {
  return SPELL_POINT_COSTS[slotLevel - 1] ?? 0;
}

export function findMaxSpellPoints(maxSpellSlots: readonly number[]): number {
  return maxSpellSlots.reduce((total, slots, index) => total + Math.max(0, slots) * findSpellPointCost(index + 1), 0);
}

export function findCurrentSpellPoints(maxSpellSlots: readonly number[], spent: number): number {
  return Math.max(0, findMaxSpellPoints(maxSpellSlots) - Math.max(0, spent));
}

/// shortcut: the DMG limit of one 6th+ level spell per long rest is not enforced; add a per-level counter if players ask.
export function listSpellPointLevels(maxSpellSlots: readonly number[]): number[] {
  const highest = maxSpellSlots.reduce((top, slots, index) => (slots > 0 ? index + 1 : top), 0);
  return Array.from({ length: highest }, (_, index) => index + 1);
}

export function findCastingSpellPoints(magicSystem: MagicSystem, maxSpellSlots: readonly number[], spent: number | undefined): number | null {
  if (magicSystem !== "POINTS" || findMaxSpellPoints(maxSpellSlots) <= 0) return null;
  return findCurrentSpellPoints(maxSpellSlots, spent ?? 0);
}
