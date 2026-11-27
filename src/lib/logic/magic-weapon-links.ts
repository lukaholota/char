import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findMagicWeaponTraits, type WeaponHitDamage } from "@/rules/magic-weapons";
import { parseExtraDamage, parseExtraDamageFormula, type ExtraDamage, type WeaponProfile } from "@/rules/weapon-profile";
import { sumAbilityTerms } from "@/rules/weapon-damage-formula";
import type { AbilityKey } from "@/rules/types";
import type { DamageBonusPart } from "@/rules/damage-parts";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { isMagicItemActive } from "./magic-item-activation";

type MagicItemLink = NonNullable<PersWithRelations["magicItems"]>[number];

export type WeaponMagicItem = { name: string; bonus: number; hits: WeaponHitDamage[]; profile: WeaponProfile | null; isActive: boolean; isMagic: boolean };

export function listActiveMagicItemLinks(pers: PersWithRelations): MagicItemLink[] {
  return (pers.magicItems ?? []).filter(isMagicItemActive);
}

/// Звичайна хомбрю-зброя живе рядком у «Зброї»: у магічних предметах вона була б дублем.
export function listMagicItemsCardLinks(pers: PersWithRelations): MagicItemLink[] {
  return (pers.magicItems ?? []).filter((link) => !(link.magicItem?.isMundane && link.persWeaponId !== null));
}

/// Предмети, які гравець привʼязав до цього рядка зброї; магічні рахуються лише активні, звичайна хомбрю-зброя — завжди.
export function listWeaponMagicItems(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): WeaponMagicItem[] {
  return (pers.magicItems ?? []).flatMap((link) => {
    const traits = link.persWeaponId === pw.persWeaponId && link.magicItem ? findMagicWeaponTraits(link.magicItem) : null;
    return traits ? [{ name: link.magicItem.name, ...traits, isActive: link.magicItem.isMundane || isMagicItemActive(link), isMagic: !link.magicItem.isMundane }] : [];
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
    const damageType = extra.damageType ? { damageType: extra.damageType } : {};
    return groups.flatMap(({ count, sides }) => Array.from({ length: count }, () => ({ sides, sign: 1 as const, label, ...damageType })));
  });
}

/// Пласкі «+5» з формул додаткової шкоди окремо від шкоди зброї: у них може бути свій тип і свій опір.
export function listWeaponExtraBonusParts(pers: PersWithRelations, pw: WeaponWithExtras, findModifier: (ability: AbilityKey) => number): DamageBonusPart[] {
  return listWeaponExtraDamage(pers, pw).flatMap(({ extra, label }) => {
    const formula = extra.formula ? parseExtraDamageFormula(extra.formula) : null;
    const value = formula ? formula.flat + sumAbilityTerms(formula.abilities, findModifier) : 0;
    return value ? [{ label, value, ...(extra.damageType ? { damageType: extra.damageType } : {}) }] : [];
  });
}

export function sumWeaponItemBonus(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): number {
  return listWeaponMagicItems(pers, pw).reduce((total, item) => total + (item.isActive ? item.bonus : 0), 0);
}

export function hasManualWeaponBonus(pw: Pick<PersWeaponWithWeapon, "attackBonus" | "customDamageBonus">): boolean {
  return (Number(pw.attackBonus) || 0) !== 0 || (Number(pw.customDamageBonus) || 0) !== 0;
}
