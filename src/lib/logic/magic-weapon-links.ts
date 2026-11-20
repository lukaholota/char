import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findMagicWeaponTraits, type WeaponHitDamage } from "@/rules/magic-weapons";
import { isMagicItemActive } from "./magic-item-activation";

type MagicItemLink = NonNullable<PersWithRelations["magicItems"]>[number];

export type WeaponMagicItem = { name: string; bonus: number; hits: WeaponHitDamage[]; isActive: boolean };

export function listActiveMagicItemLinks(pers: PersWithRelations): MagicItemLink[] {
  return (pers.magicItems ?? []).filter(isMagicItemActive);
}

/// Магічні предмети, які гравець привʼязав до цього рядка зброї; рахуються лише активні.
export function listWeaponMagicItems(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): WeaponMagicItem[] {
  return (pers.magicItems ?? []).flatMap((link) => {
    const traits = link.persWeaponId === pw.persWeaponId && link.magicItem ? findMagicWeaponTraits(link.magicItem) : null;
    return traits ? [{ name: link.magicItem.name, ...traits, isActive: isMagicItemActive(link) }] : [];
  });
}

export function listWeaponItemExtraDice(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">) {
  return listWeaponMagicItems(pers, pw)
    .filter((item) => item.isActive)
    .flatMap((item) => item.hits.filter((hit) => !hit.condition).flatMap((hit) => Array.from({ length: hit.count }, () => ({ sides: hit.sides, sign: 1 as const, label: item.name }))));
}

export function sumWeaponItemBonus(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): number {
  return listWeaponMagicItems(pers, pw).reduce((total, item) => total + (item.isActive ? item.bonus : 0), 0);
}

export function hasManualWeaponBonus(pw: Pick<PersWeaponWithWeapon, "attackBonus" | "customDamageBonus">): boolean {
  return (Number(pw.attackBonus) || 0) !== 0 || (Number(pw.customDamageBonus) || 0) !== 0;
}
