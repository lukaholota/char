import { prisma } from "@/lib/prisma";
import { findAttunementCapacityForPers } from "@/rules/attunement";
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
    },
  });
  if (!pers) return "Персонажа не знайдено";

  const alreadyAttuned = pers.magicItems.some(
    (item) => item.persMagicItemId === persMagicItemId && item.isAttuned
  );
  if (alreadyAttuned) return null;

  const attunedCount = pers.magicItems.filter((item) => item.isAttuned).length;
  const capacity = findAttunementCapacityForPers(pers);

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

export function addMagicItemLink(persId: number, magicItemId: number) {
  return prisma.persMagicItem.create({
    data: { persId, magicItemId, isEquipped: false, isAttuned: false },
  });
}
