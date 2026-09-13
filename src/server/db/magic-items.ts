import { prisma } from "@/lib/prisma";
import { findAttunementCapacityForPers } from "@/rules/attunement";

export type MagicItemUpdates = {
  isEquipped?: boolean;
  isAttuned?: boolean;
};

export async function findMagicItemPersId(persMagicItemId: number): Promise<number | null> {
  const item = await prisma.persMagicItem.findUnique({
    where: { persMagicItemId },
    select: { persId: true },
  });

  return item?.persId ?? null;
}

export function updatePersMagicItem(persMagicItemId: number, updates: MagicItemUpdates) {
  return prisma.persMagicItem.update({
    where: { persMagicItemId },
    data: updates,
  });
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
    return `Ліміт налаштованих предметів: ${capacity} / ${capacity}`;
  }

  return null;
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

export function removeMagicItemLinks(persId: number, magicItemId: number) {
  return prisma.persMagicItem.deleteMany({ where: { persId, magicItemId } });
}

export function addMagicItemLink(persId: number, magicItemId: number) {
  return prisma.persMagicItem.create({
    data: { persId, magicItemId, isEquipped: false, isAttuned: false },
  });
}
