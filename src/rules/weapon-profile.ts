import { isRecord } from "./abilities";
import { ABILITY_KEYS } from "./feat-grants";
import { DAMAGE_TYPE_KEYS, type AbilityKey, type DamageTypeKey } from "./types";
import { parseDiceGroup } from "./weapon-damage-formula";
import { parseCustomDamageTypes } from "./house-rules";

/// Без книжного типу шкода має назву зі «своїх типів шкоди» кампанії й не зважає на опір.
export type ExtraDamage = { count: number; sides: number; damageType: DamageTypeKey | null; customType?: string };
export type WeaponProfile = {
  attackAbility: AbilityKey | null;
  damage: string | null;
  damageType: DamageTypeKey | null;
  extraDamage: ExtraDamage[];
  normalRange: number | null;
  longRange: number | null;
};

export const EXTRA_DAMAGE_LIMIT = 4;
const EMPTY_PROFILE: WeaponProfile = { attackAbility: null, damage: null, damageType: null, extraDamage: [], normalRange: null, longRange: null };

const isWholeIn = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const pickKey = <T extends string>(keys: readonly T[], value: unknown): T | null => (keys.includes(value as T) ? (value as T) : null);

/// Кубики «+1к6 вогню» поверх основної шкоди; зламані записи мовчки відкидаються.
export function parseExtraDamage(value: unknown): ExtraDamage[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): ExtraDamage[] => {
      if (!isRecord(entry) || !isWholeIn(entry.count, 1, 20) || !isWholeIn(entry.sides, 2, 100)) return [];
      const damageType = pickKey(DAMAGE_TYPE_KEYS, entry.damageType);
      if (damageType) return [{ count: entry.count, sides: entry.sides, damageType }];
      const [customType] = parseCustomDamageTypes([entry.customType]);
      return customType ? [{ count: entry.count, sides: entry.sides, damageType: null, customType }] : [];
    })
    .slice(0, EXTRA_DAMAGE_LIMIT);
}

/// Рядок форми: кубики текстом «1к6» і тип шкоди.
export type ExtraDamageDraft = { dice: string; damageType: DamageTypeKey | null; customType?: string };

export function toExtraDamageDrafts(value: unknown): ExtraDamageDraft[] {
  return parseExtraDamage(value).map((extra) => ({ dice: `${extra.count}к${extra.sides}`, damageType: extra.damageType, customType: extra.customType }));
}

export function buildExtraDamage(drafts: readonly ExtraDamageDraft[]): ExtraDamage[] {
  return parseExtraDamage(drafts.flatMap((draft) => {
    const group = parseDiceGroup(draft.dice);
    return group ? [{ ...group, damageType: draft.damageType, customType: draft.customType }] : [];
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
