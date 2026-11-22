import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findMagicWeaponTraits, type WeaponHitDamage } from "@/rules/magic-weapons";
import { parseExtraDamage, type WeaponProfile } from "@/rules/weapon-profile";
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

/// Кубики, що кидаються разом зі шкодою: додаткова шкода з листа й безумовні кубики привʼязаних предметів.
export function listWeaponExtraDice(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId"> & { extraDamage?: unknown }) {
  const ownDice = parseExtraDamage(pw.extraDamage).map((extra) => ({ count: extra.count, sides: extra.sides, label: extra.customType ?? (extra.damageType ? damageTypeTranslations[extra.damageType] : "") }));
  const itemDice = listWeaponMagicItems(pers, pw)
    .filter((item) => item.isActive)
    .flatMap((item) => item.hits.filter((hit) => !hit.condition).map((hit) => ({ count: hit.count, sides: hit.sides, label: item.name })));
  return [...ownDice, ...itemDice].flatMap((group) => Array.from({ length: group.count }, () => ({ sides: group.sides, sign: 1 as const, label: group.label })));
}

export function sumWeaponItemBonus(pers: PersWithRelations, pw: Pick<PersWeaponWithWeapon, "persWeaponId">): number {
  return listWeaponMagicItems(pers, pw).reduce((total, item) => total + (item.isActive ? item.bonus : 0), 0);
}

export function hasManualWeaponBonus(pw: Pick<PersWeaponWithWeapon, "attackBonus" | "customDamageBonus">): boolean {
  return (Number(pw.attackBonus) || 0) !== 0 || (Number(pw.customDamageBonus) || 0) !== 0;
}
