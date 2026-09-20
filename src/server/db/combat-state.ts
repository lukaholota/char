import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const combatStateSelect = {
  currentHp: true,
  maxHp: true,
  tempHp: true,
  deathSaveSuccesses: true,
  deathSaveFailures: true,
  isDead: true,
  heroicInspirationCount: true,
  canStackHeroicInspiration: true,
} satisfies Prisma.PersSelect;

export function findCombatState(persId: number) {
  return prisma.pers.findUnique({ where: { persId }, select: combatStateSelect });
}

export function saveCombatState(persId: number, data: Prisma.PersUpdateInput) {
  return prisma.pers.update({ where: { persId }, data, select: combatStateSelect });
}
