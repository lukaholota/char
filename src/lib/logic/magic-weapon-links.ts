import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findMagicWeaponTraits, type WeaponHitDamage } from "@/rules/magic-weapons";
import { parseExtraDamage, parseExtraDamageFormula, type ExtraDamage, type WeaponProfile } from "@/rules/weapon-profile";
import { sumAbilityTerms } from "@/rules/weapon-damage-formula";
import type { AbilityKey } from "@/rules/types";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { isMagicItemActive } from "./magic-item-activation";

type MagicItemLink = NonNullable<PersWithRelations["magicItems"]>[number];

export type WeaponMagicItem = { name: string; bonus: number; hits: WeaponHitDamage[]; profile: WeaponProfile | null; isActive: boolean };

export function listActiveMagicItemLinks(pers: PersWithRelations): MagicItemLink[] {
  return (pers.magicItems ?? []).filter(isMagicItemActive);
}

/// Предмети, які гравець привʼязав до цього рядка зброї; магічні рахуються лише активні, звичайна хомбрю-зброя — завжди.
export function listWeaponMagicItems(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): WeaponMagicItem[] {
  return (pers.magicItems ?? []).flatMap((link) => {
    const traits = link.persWeaponId === pw.persWeaponId && link.magicItem ? findMagicWeaponTraits(link.magicItem) : null;
    return traits ? [{ name: link.magicItem.name, ...traits, isActive: link.magicItem.isMundane || isMagicItemActive(link) }] : [];
  });
}

type WeaponWithExtras = Pick<PersWeaponWithWeapon, "persWeaponId"> & { extraDamage?: unknown };

function listWeaponExtraDamage(pers: PersWithRelations, pw: WeaponWithExtras) {
  const ownDamage = parseExtraDamage(pw.extraDamage).map((extra) => ({ extra, label: describeExtraType(extra) }));
  const itemDamage = listWeaponMagicItems(pers, pw)
    .filter((item) => item.isActive)
    .flatMap((item) => item.hits.filter((hit) => !hit.condition).map((extra) => ({ extra, label: extra.formula && describeExtraType(extra) ? `${item.name} · ${describeExtraType(extra)}` : item.name })));
  return [...ownDamage, ...itemDamage];
}

function describeExtraType(extra: ExtraDamage): string {
  return extra.customType ?? (extra.damageType ? damageTypeTranslations[extra.damageType] : "");
}

export function listWeaponExtraDice(pers: PersWithRelations, pw: WeaponWithExtras) {
  return listWeaponExtraDamage(pers, pw).flatMap(({ extra, label }) => {
    const groups = extra.formula === undefined ? [extra] : (parseExtraDamageFormula(extra.formula)?.dice ?? []);
    return groups.flatMap(({ count, sides }) => Array.from({ length: count }, () => ({ sides, sign: 1 as const, label })));
  });
}

export function sumWeaponExtraDamageBonus(pers: PersWithRelations, pw: WeaponWithExtras, findModifier: (ability: AbilityKey) => number): number {
  return listWeaponExtraDamage(pers, pw).reduce((total, { extra }) => {
    const formula = extra.formula ? parseExtraDamageFormula(extra.formula) : null;
    return formula ? total + formula.flat + sumAbilityTerms(formula.abilities, findModifier) : total;
  }, 0);
}

export function sumWeaponItemBonus(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): number {
  return listWeaponMagicItems(pers, pw).reduce((total, item) => total + (item.isActive ? item.bonus : 0), 0);
}

export function hasManualWeaponBonus(pw: Pick<PersWeaponWithWeapon, "attackBonus" | "customDamageBonus">): boolean {
  return (Number(pw.attackBonus) || 0) !== 0 || (Number(pw.customDamageBonus) || 0) !== 0;
}
