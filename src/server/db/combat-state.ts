import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signalPersRooms } from "@/server/db/game-sessions";

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

export async function saveCombatState(persId: number, data: Prisma.PersUpdateInput) {
  const saved = await prisma.pers.update({ where: { persId }, data, select: combatStateSelect });
  await signalPersRooms(persId).catch(() => undefined);
  return saved;
}
