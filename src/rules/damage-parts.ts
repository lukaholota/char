import type { DamageDefense, DamageType } from "./creature-save";
import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "./types";

/// Пласка частина шкоди іншого типу, уже врахована в bonus кидка: «+5» додаткової дробильної шкоди.
export type DamageBonusPart = { label: string; damageType?: DamageTypeKey; value: number };
type TypedDie = { sign: 1 | -1; label: string; value: number; damageType?: DamageTypeKey };
export type TypedDamageRoll = { damageType?: DamageTypeKey; groups: readonly { values: readonly number[] }[]; extra: readonly TypedDie[]; bonus: number; bonusParts?: readonly DamageBonusPart[] };
export type DamagePart = { damageType: DamageTypeKey | null; label: string; values: number[]; bonus: number };
export type DamageDefenseNote = { damageType: DamageTypeKey; defense: DamageDefense; before: number; after: number };

export function hasDamageTypes(roll: Pick<TypedDamageRoll, "damageType" | "extra" | "bonusParts">): boolean {
  return Boolean(roll.damageType || roll.bonusParts?.length || roll.extra.some((die) => die.damageType));
}

/// Той самий тип шкоди складається в одну частину: опір рахується від суми, а не від кожного кубика.
/// Кубик без типу («+к4 Збільшення») б'є типом зброї.
export function splitDamageByType(roll: TypedDamageRoll): DamagePart[] {
  const partsBonus = (roll.bonusParts ?? []).reduce((sum, part) => sum + part.value, 0);
  const parts: DamagePart[] = [{ damageType: roll.damageType ?? null, label: "", values: roll.groups.flatMap((group) => [...group.values]), bonus: roll.bonus - partsBonus }];
  const findPart = (damageType: DamageTypeKey | undefined, label: string) => {
    const found = parts.find((part) => (damageType ? part.damageType === damageType : !part.damageType && part.label === label));
    if (found) return found;
    const added: DamagePart = { damageType: damageType ?? null, label, values: [], bonus: 0 };
    parts.push(added);
    return added;
  };
  for (const die of roll.extra) findPart(die.damageType ?? roll.damageType, die.label).values.push(die.sign * die.value);
  for (const part of roll.bonusParts ?? []) findPart(part.damageType ?? roll.damageType, part.label).bonus += part.value;
  return parts.filter((part) => part.values.length || part.bonus);
}

export function sumDamagePart(part: Pick<DamagePart, "values" | "bonus">): number {
  return part.values.reduce((sum, value) => sum + value, 0) + part.bonus;
}

/// Опір ділить навпіл униз, вразливість подвоює, імунітет обнуляє — кожен тип окремо, як у правилах.
export function applyDamageDefenses(total: number, parts: readonly DamagePart[], findDefense: (damageType: DamageTypeKey) => DamageDefense | null): { damage: number; notes: DamageDefenseNote[] } {
  const notes = parts.flatMap((part): DamageDefenseNote[] => {
    const defense = part.damageType ? findDefense(part.damageType) : null;
    if (!part.damageType || !defense) return [];
    const before = Math.max(0, sumDamagePart(part));
    return [{ damageType: part.damageType, defense, before, after: defense === "immune" ? 0 : defense === "resistant" ? Math.floor(before / 2) : before * 2 }];
  });
  const change = notes.reduce((sum, note) => sum + note.after - note.before, 0);
  return { damage: Math.max(0, total + change), notes };
}

/// Шкода по одній цілі: кожен тип кидка проти захисту цілі.
export function resolveTypedDamage(roll: TypedDamageRoll & { total: number }, findDefense: (damageType: DamageTypeKey) => DamageDefense | null): { damage: number; notes: DamageDefenseNote[] } {
  return applyDamageDefenses(roll.total, splitDamageByType(roll), findDefense);
}

export function toCreatureDamageType(damageType: DamageTypeKey): DamageType {
  return damageType.toLowerCase() as DamageType;
}

export function toDamageTypeKey(damageType: DamageType): DamageTypeKey {
  return damageType.toUpperCase() as DamageTypeKey;
}

export function isDamageTypeKey(value: unknown): value is DamageTypeKey {
  return DAMAGE_TYPE_KEYS.includes(value as DamageTypeKey);
}
