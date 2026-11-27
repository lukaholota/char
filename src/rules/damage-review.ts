import type { DamageDefense } from "./creature-save";
import { isDamageTypeKey, splitDamageByType, sumDamagePart, type DamageDefenseNote, type TypedDamageRoll } from "./damage-parts";
import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "./types";

export const DAMAGE_DEFENSES: readonly DamageDefense[] = ["immune", "resistant", "vulnerable"];
export const REVIEWED_DAMAGE_LIMIT = 9999;

/// amount — кинуте до захисту цілі; defense — захист, який майстер лишив увімкненим.
export type DamageReviewPart = { damageType: DamageTypeKey | null; label: string; amount: number; defense: DamageDefense | null };
/// defenses — захисти цілі за кожним типом: коли майстер міняє тип рядка, захист підставляється зі статблоку.
export type DamageReview = { parts: DamageReviewPart[]; isPending: boolean; defenses?: Partial<Record<DamageTypeKey, DamageDefense>> };
export type DamageReviewChoice = Pick<DamageReviewPart, "amount" | "defense"> & Partial<Pick<DamageReviewPart, "damageType">>;

/// Кожен тип — окремий рядок із захистом цілі, увімкненим наперед; кидок без кубиків стає одним рядком.
export function buildDamageReviewParts(roll: TypedDamageRoll & { total: number }, findDefense: (damageType: DamageTypeKey) => DamageDefense | null): DamageReviewPart[] {
  const parts = splitDamageByType(roll).map((part) => ({ damageType: part.damageType, label: part.label, amount: Math.max(0, sumDamagePart(part)), defense: part.damageType ? findDefense(part.damageType) : null }));
  return parts.length ? parts : [{ damageType: roll.damageType ?? null, label: "", amount: Math.max(0, roll.total), defense: null }];
}

export function buildDamageReview(roll: TypedDamageRoll & { total: number }, findDefense: (damageType: DamageTypeKey) => DamageDefense | null): DamageReview {
  const defenses = Object.fromEntries(DAMAGE_TYPE_KEYS.flatMap((damageType) => {
    const defense = findDefense(damageType);
    return defense ? [[damageType, defense]] : [];
  }));
  return { parts: buildDamageReviewParts(roll, findDefense), isPending: true, defenses };
}

export function applyDamageDefense(amount: number, defense: DamageDefense | null): number {
  if (defense === "immune") return 0;
  if (defense === "resistant") return Math.floor(amount / 2);
  return defense === "vulnerable" ? amount * 2 : amount;
}

/// Нотатки лише для типізованих рядків: журнал пише «опір (вогняна) 8 → 4».
export function resolveReviewedDamage(parts: readonly DamageReviewPart[]): { damage: number; notes: DamageDefenseNote[] } {
  const damage = parts.reduce((sum, part) => sum + applyDamageDefense(part.amount, part.defense), 0);
  const notes = parts.flatMap((part): DamageDefenseNote[] => (part.damageType && part.defense ? [{ damageType: part.damageType, defense: part.defense, before: part.amount, after: applyDamageDefense(part.amount, part.defense) }] : []));
  return { damage: Math.min(REVIEWED_DAMAGE_LIMIT, damage), notes };
}

/// Підписи рядків бере сервер зі збереженого кидка — від майстра число, захист і, якщо змінив, тип; по одному на рядок.
export function parseDamageReviewChoices(raw: unknown, partCount: number): DamageReviewChoice[] | null {
  if (!Array.isArray(raw) || raw.length !== partCount) return null;
  const choices = raw.map((item): DamageReviewChoice | null => {
    if (typeof item !== "object" || item === null) return null;
    const { amount, defense, damageType } = item as Record<string, unknown>;
    if (!Number.isInteger(amount) || (amount as number) < 0 || (amount as number) > REVIEWED_DAMAGE_LIMIT) return null;
    if (defense !== null && !DAMAGE_DEFENSES.includes(defense as DamageDefense)) return null;
    const choice = { amount: amount as number, defense: defense as DamageDefense | null };
    if (damageType === undefined) return choice;
    return damageType === null || isDamageTypeKey(damageType) ? { ...choice, damageType } : null;
  });
  return choices.every((choice) => choice !== null) ? (choices as DamageReviewChoice[]) : null;
}

export function applyDamageReviewChoices(parts: readonly DamageReviewPart[], choices: readonly DamageReviewChoice[]): DamageReviewPart[] {
  return parts.map((part, index) => ({ ...part, ...choices[index] }));
}
