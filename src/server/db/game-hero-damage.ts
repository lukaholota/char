import type { Prisma } from "@prisma/client";
import { buildHeroDamageOperationId, type StoredHeroTarget } from "@/rules/game-roll-hero-target";
import type { StoredSaves } from "@/rules/game-roll-saves";
import type { RoomHero } from "@/server/db/game-room-heroes";
import { applyPersFieldOperationIn } from "@/server/db/offline-operations";

type Heroes = ReadonlyMap<number, RoomHero>;

/// Ідентифікатор той самий, що в кнопки «Зняти з листа» і в листа гравця: ці хіти зміняться рівно раз.
export async function changeHeroTargetHitPoints(tx: Prisma.TransactionClient, sessionId: number, seq: number, target: StoredHeroTarget | null, amount: number, heroes: Heroes): Promise<StoredHeroTarget | null> {
  const hero = target ? heroes.get(target.persId) : undefined;
  if (!target || !hero || target.kind === "attack" || amount <= 0) return target;
  await changeHeroHitPoints(tx, hero, target.kind, amount, buildHeroDamageOperationId(sessionId, seq));
  return { ...target, isAppliedToSheet: true };
}

export async function damageHeroSaveRows(tx: Prisma.TransactionClient, sessionId: number, seq: number, saves: StoredSaves | null, heroes: Heroes): Promise<StoredSaves | null> {
  if (!saves) return null;
  const rows: StoredSaves["rows"] = [];
  for (const [index, row] of saves.rows.entries()) {
    const hero = row.persId !== undefined ? heroes.get(row.persId) : undefined;
    if (hero && row.damage > 0) await changeHeroHitPoints(tx, hero, "damage", row.damage, buildHeroDamageOperationId(sessionId, seq, index));
    rows.push(hero && row.damage > 0 ? { ...row, isAppliedToSheet: true } : row);
  }
  return { ...saves, rows };
}

function changeHeroHitPoints(tx: Prisma.TransactionClient, hero: RoomHero, mode: "damage" | "heal", amount: number, operationId: string) {
  return applyPersFieldOperationIn(tx, hero.userId, { kind: "hp", mode, amount, operationId, persId: hero.persId, createdAt: new Date().toISOString() });
}
