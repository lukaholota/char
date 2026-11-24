import { prisma } from "@/lib/prisma";
import type { ArmorCategory, Ruleset, WeaponCategory } from "@prisma/client";
import { findAttunementCapacityForPers } from "@/rules/attunement";
import { findPersHouseRules } from "@/lib/logic/pers-house-rules";
import type { MagicItemCharges } from "@/rules/magic-item-charges";
import { fillDefaultCharges, findItemChargeRules, rollChargeRecovery } from "@/rules/magic-item-charge-text";

export type RegainedItemCharges = { name: string; regained: number };

export type MagicItemUpdates = {
  isEquipped?: boolean;
  isAttuned?: boolean;
  persWeaponId?: number | null;
};

export async function findMagicItemPersId(persMagicItemId: number): Promise<number | null> {
  const item = await prisma.persMagicItem.findUnique({
    where: { persMagicItemId },
    select: { persId: true },
  });

  return item?.persId ?? null;
}

export function updatePersMagicItem(persMagicItemId: number, { isEquipped, isAttuned, persWeaponId }: MagicItemUpdates) {
  return prisma.persMagicItem.update({
    where: { persMagicItemId },
    data: { isEquipped, isAttuned, persWeaponId },
  });
}

export async function isWeaponOfPers(persWeaponId: number, persId: number): Promise<boolean> {
  const weapon = await prisma.persWeapon.findUnique({ where: { persWeaponId }, select: { persId: true } });
  return weapon?.persId === persId;
}

/**
 * PHB 2014 с.141 / SRD 2024 «No More Than Three Items»: спроба налаштуватися понад стелю
 * («findAttunementCapacityForPers») провалюється — тут це відмова запису, а не м'яка порада, бо
 * бонус активних предметів рахує кожного, у кого `isAttuned` (bonus-calculator.ts).
 */
export async function findAttunementLimitError(
  persId: number,
  persMagicItemId: number
): Promise<string | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      class: { select: { name: true } },
      multiclasses: { select: { classLevel: true, class: { select: { name: true } } } },
      magicItems: { select: { persMagicItemId: true, isAttuned: true } },
      houseRules: true,
      gameSessionMembers: { where: { gameSession: { archivedAt: null } }, select: { gameSession: { select: { houseRules: true } } } },
    },
  });
  if (!pers) return "Персонажа не знайдено";

  const alreadyAttuned = pers.magicItems.some(
    (item) => item.persMagicItemId === persMagicItemId && item.isAttuned
  );
  if (alreadyAttuned) return null;

  const attunedCount = pers.magicItems.filter((item) => item.isAttuned).length;
  const capacity = findAttunementCapacityForPers(pers, findPersHouseRules(pers).attunementLimit);

  if (attunedCount >= capacity) {
    return `Налаштовано ${attunedCount} з ${capacity} — спершу скасуйте налаштування іншого предмета`;
  }

  return null;
}

export async function findPersMagicItemCharges(persMagicItemId: number): Promise<MagicItemCharges | null> {
  const link = await prisma.persMagicItem.findUnique({
    where: { persMagicItemId },
    select: { chargesMax: true, chargesCurrent: true, magicItem: { select: { description: true } } },
  });
  if (!link) return null;
  return fillDefaultCharges({ chargesMax: link.chargesMax, chargesCurrent: link.chargesCurrent }, findItemChargeRules(link.magicItem.description));
}

export async function restoreMagicItemChargesAtDawn(persId: number): Promise<RegainedItemCharges[]> {
  const links = await prisma.persMagicItem.findMany({
    where: { persId },
    select: { persMagicItemId: true, chargesMax: true, chargesCurrent: true, magicItem: { select: { name: true, description: true } } },
  });
  const recoveries = links.flatMap((link) => {
    const rules = findItemChargeRules(link.magicItem.description);
    if (!rules.recovery) return [];
    const before = fillDefaultCharges({ chargesMax: link.chargesMax, chargesCurrent: link.chargesCurrent }, rules);
    const after = rollChargeRecovery(before, rules.recovery);
    const gained = (after.chargesCurrent ?? 0) - (before.chargesCurrent ?? 0);
    return gained > 0 ? [{ link, after, gained }] : [];
  });
  await Promise.all(recoveries.map(({ link, after }) => savePersMagicItemCharges(link.persMagicItemId, after)));
  return recoveries.map(({ link, gained }) => ({ name: link.magicItem.name, regained: gained }));
}

export function savePersMagicItemCharges(persMagicItemId: number, charges: MagicItemCharges) {
  return prisma.persMagicItem.update({ where: { persMagicItemId }, data: charges });
}

export function deletePersMagicItem(persMagicItemId: number) {
  return prisma.persMagicItem.delete({ where: { persMagicItemId } });
}

export async function hasMagicItemLink(persId: number, magicItemId: number): Promise<boolean> {
  const link = await prisma.persMagicItem.findFirst({
    where: { persId, magicItemId },
    select: { persMagicItemId: true },
  });

  return link !== null;
}

export async function isMagicItemOfPersRuleset(persId: number, magicItemId: number): Promise<boolean> {
  const [pers, magicItem] = await Promise.all([
    prisma.pers.findUnique({ where: { persId }, select: { ruleset: true } }),
    prisma.magicItem.findUnique({ where: { magicItemId }, select: { ruleset: true, homebrewEntry: { select: { ruleset: true, deletedAt: true } } } }),
  ]);
  if (!pers || !magicItem) return false;
  const homebrew = magicItem.homebrewEntry;
  if (!homebrew) return pers.ruleset === magicItem.ruleset;
  return homebrew.deletedAt === null && (homebrew.ruleset === null || homebrew.ruleset === pers.ruleset);
}

export function removeMagicItemLinks(persId: number, magicItemId: number) {
  return prisma.persMagicItem.deleteMany({ where: { persId, magicItemId } });
}

/// Хомбрю-предмет з основою одразу дає рядок зброї чи обладунку на листі; зброю привʼязує до предмета.
/// Зброя без основи стоїть на кийку, як і кастомний рядок: шкоду й дальність дає профіль предмета.
export async function addMagicItemLink(persId: number, magicItemId: number) {
  const [pers, item] = await Promise.all([
    prisma.pers.findUniqueOrThrow({ where: { persId }, select: { ruleset: true } }),
    prisma.magicItem.findUniqueOrThrow({
      where: { magicItemId },
      select: { name: true, itemType: true, isMundane: true, armorBaseAC: true, baseWeapon: { select: { weaponId: true, name: true, ruleset: true } }, baseArmor: { select: { armorId: true, name: true, ruleset: true } } },
    }),
  ]);
  const [weaponId, armorId] = await Promise.all([
    item.baseWeapon ? findSameWeaponInRuleset(item.baseWeapon, pers.ruleset) : item.itemType === "WEAPON" ? findWeaponIdByName("CLUB", pers.ruleset) : null,
    item.baseArmor ? findSameArmorInRuleset(item.baseArmor, pers.ruleset) : null,
  ]);
  return prisma.$transaction(async (tx) => {
    const weapon = weaponId ? await tx.persWeapon.create({ data: { persId, weaponId, overrideName: item.name, isMagical: !item.isMundane }, select: { persWeaponId: true } }) : null;
    if (armorId) await tx.persArmor.create({ data: { persId, armorId, overrideName: item.name, overrideBaseAC: item.armorBaseAC } });
    return tx.persMagicItem.create({ data: { persId, magicItemId, isEquipped: false, isAttuned: false, persWeaponId: weapon?.persWeaponId ?? null } });
  });
}

async function findSameWeaponInRuleset(base: { weaponId: number; name: WeaponCategory; ruleset: Ruleset }, ruleset: Ruleset): Promise<number | null> {
  return base.ruleset === ruleset ? base.weaponId : findWeaponIdByName(base.name, ruleset);
}

async function findWeaponIdByName(name: WeaponCategory, ruleset: Ruleset): Promise<number | null> {
  const weapon = await prisma.weapon.findFirst({ where: { name, ruleset }, select: { weaponId: true } });
  return weapon?.weaponId ?? null;
}

async function findSameArmorInRuleset(base: { armorId: number; name: ArmorCategory; ruleset: Ruleset }, ruleset: Ruleset): Promise<number | null> {
  if (base.ruleset === ruleset) return base.armorId;
  const same = await prisma.armor.findFirst({ where: { name: base.name, ruleset }, select: { armorId: true } });
  return same?.armorId ?? null;
}
