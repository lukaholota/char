import { isRecord } from "./abilities";
import { ABILITY_KEYS } from "./feat-grants";
import { DAMAGE_TYPE_KEYS, type AbilityKey, type DamageTypeKey } from "./types";
import { parseWeaponDamageFormula } from "./weapon-damage-formula";
import { parseCustomDamageTypes } from "./house-rules";

/// Без книжного типу шкода має назву зі «своїх типів шкоди» кампанії й не зважає на опір.
export type ExtraDamageRoll = { count: number; sides: number; formula?: never } | { formula: string; count?: never; sides?: never };
export type ExtraDamage = ExtraDamageRoll & { damageType: DamageTypeKey | null; customType?: string };
export type WeaponProfile = {
  attackAbility: AbilityKey | null;
  damage: string | null;
  damageType: DamageTypeKey | null;
  extraDamage: ExtraDamage[];
  normalRange: number | null;
  longRange: number | null;
};

export const EXTRA_DAMAGE_LIMIT = 4;
export const EXTRA_DAMAGE_FORMULA_LENGTH = 60;
export const EXTRA_DAMAGE_FORMULA_HINT = "Напр. 1к4+СИЛ або 2к6.";
const EMPTY_PROFILE: WeaponProfile = { attackAbility: null, damage: null, damageType: null, extraDamage: [], normalRange: null, longRange: null };

const isWholeIn = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const pickKey = <T extends string>(keys: readonly T[], value: unknown): T | null => (keys.includes(value as T) ? (value as T) : null);

export function parseExtraDamageFormula(text: string) {
  if (text.length > EXTRA_DAMAGE_FORMULA_LENGTH) return null;
  if (/[+-]{2}|[+-]$/.test(text.replace(/\s+/g, ""))) return null;
  const formula = parseWeaponDamageFormula(text);
  if (!formula || Math.abs(formula.flat) > 999 || formula.abilities.some(({ multiplier }) => Math.abs(multiplier) > 20)) return null;
  if (formula.dice.some(({ sides }) => sides > 100) || formula.dice.reduce((total, { count }) => total + count, 0) > 20) return null;
  return formula;
}

export function parseExtraDamage(value: unknown): ExtraDamage[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): ExtraDamage[] => {
      if (!isRecord(entry)) return [];
      const roll = readExtraDamageRoll(entry);
      if (!roll) return [];
      const damageType = pickKey(DAMAGE_TYPE_KEYS, entry.damageType);
      if (damageType) return [{ ...roll, damageType }];
      const [customType] = parseCustomDamageTypes([entry.customType]);
      return customType ? [{ ...roll, damageType: null, customType }] : [];
    })
    .slice(0, EXTRA_DAMAGE_LIMIT);
}

function readExtraDamageRoll(entry: Record<string, unknown>): ExtraDamageRoll | null {
  if (typeof entry.formula === "string" && parseExtraDamageFormula(entry.formula.trim())) return { formula: entry.formula.trim() };
  return isWholeIn(entry.count, 1, 20) && isWholeIn(entry.sides, 2, 100) ? { count: entry.count, sides: entry.sides } : null;
}

export function formatExtraDamageRoll(roll: ExtraDamageRoll): string {
  return roll.formula ?? `${roll.count}к${roll.sides}`;
}

export type ExtraDamageDraft = { dice: string; damageType: DamageTypeKey | null; customType?: string };

export function toExtraDamageDrafts(value: unknown): ExtraDamageDraft[] {
  return parseExtraDamage(value).map((extra) => ({ dice: formatExtraDamageRoll(extra), damageType: extra.damageType, customType: extra.customType }));
}

export function buildExtraDamage(drafts: readonly ExtraDamageDraft[]): ExtraDamage[] {
  return parseExtraDamage(drafts.flatMap((draft) => {
    const text = draft.dice.trim();
    const parsed = parseExtraDamageFormula(text);
    if (!parsed) return [];
    const roll = parsed.dice.length === 1 && parsed.flat === 0 && !parsed.abilities.length ? parsed.dice[0] : { formula: text };
    return [{ ...roll, damageType: draft.damageType, customType: draft.customType }];
  }));
}

export function parseWeaponProfile(value: unknown): WeaponProfile | null {
  if (!isRecord(value)) return null;
  const damage = typeof value.damage === "string" && value.damage.trim() ? value.damage.trim().slice(0, 60) : null;
  const profile: WeaponProfile = {
    attackAbility: pickKey(ABILITY_KEYS, value.attackAbility),
    damage,
    damageType: pickKey(DAMAGE_TYPE_KEYS, value.damageType),
    extraDamage: parseExtraDamage(value.extraDamage),
    normalRange: isWholeIn(value.normalRange, 1, 9999) ? value.normalRange : null,
    longRange: isWholeIn(value.longRange, 1, 9999) ? value.longRange : null,
  };
  return isEmptyProfile(profile) ? null : profile;
}

function isEmptyProfile(profile: WeaponProfile): boolean {
  return Object.entries(profile).every(([key, value]) => (Array.isArray(value) ? value.length === 0 : value === EMPTY_PROFILE[key as keyof WeaponProfile]));
}
