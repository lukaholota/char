import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildItemStateKey, findMagicItemState } from "@/rules/magic-item-states";
import { isDrinkableMagicItem, rollPotionDrink, type PotionDrinkRoll } from "@/rules/potions";
import { applyPersFieldOperationIn } from "./offline-operations";

export type PotionDrinkResult =
  | { success: true; name: string; roll: PotionDrinkRoll; healed: number; stateLabel: string | null }
  | { success: false; error: string };

/// Лікування, тимчасові ХП і стан зілля — в одній транзакції з прибиранням зілля: повтор уже не знайде його й не вип'є вдруге.
export async function drinkPersPotion(userId: number, persMagicItemId: number): Promise<PotionDrinkResult> {
  return prisma.$transaction(async (tx) => {
    const link = await tx.persMagicItem.findUnique({
      where: { persMagicItemId },
      select: { persId: true, magicItemId: true, magicItem: { select: { name: true, engName: true, ruleset: true, itemType: true } } },
    });
    if (!link) return { success: false, error: "Зілля вже випито або прибрано" };
    if (!isDrinkableMagicItem(link.magicItem)) return { success: false, error: "Це не зілля" };

    const roll = rollPotionDrink(link.magicItem);
    const hpBefore = await readCurrentHp(tx, link.persId);
    if (roll.healing > 0) await changeHitPoints(tx, userId, link.persId, "heal", roll.healing);
    const healed = (await readCurrentHp(tx, link.persId)) - hpBefore;
    if (roll.tempHp > 0) await changeHitPoints(tx, userId, link.persId, "temp", roll.tempHp);

    const state = findMagicItemState(link.magicItem);
    if (state) await switchOnPotionState(tx, link.persId, link.magicItemId);
    await tx.persMagicItem.delete({ where: { persMagicItemId } });
    return { success: true, name: link.magicItem.name, roll, healed, stateLabel: state ? state.activationLabel : null };
  });
}

async function readCurrentHp(tx: Prisma.TransactionClient, persId: number) {
  const pers = await tx.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } });
  return pers.currentHp;
}

function changeHitPoints(tx: Prisma.TransactionClient, userId: number, persId: number, mode: "heal" | "temp", amount: number) {
  return applyPersFieldOperationIn(tx, userId, { kind: "hp", mode, amount, persId, operationId: randomUUID(), createdAt: new Date().toISOString() });
}

function switchOnPotionState(tx: Prisma.TransactionClient, persId: number, magicItemId: number) {
  const effectKey = buildItemStateKey(magicItemId);
  return tx.persEffect.upsert({
    where: { persId_effectKey: { persId, effectKey } },
    create: { persId, effectKey, magicItemId },
    update: { magicItemId },
  });
}
