import type { Prisma } from "@prisma/client";
import { buildHeroDamageOperationId, type StoredHeroTarget } from "@/rules/game-roll-hero-target";
import type { StoredSaves } from "@/rules/game-roll-saves";
import type { GameRoll } from "@/rules/game-roll";
import { resolveTypedDamage } from "@/rules/damage-parts";
import { findHeroDamageDefense } from "@/rules/hero-save";
import type { RoomHero } from "@/server/db/game-room-heroes";
import { applyPersFieldOperationIn } from "@/server/db/offline-operations";

type Heroes = ReadonlyMap<number, RoomHero>;

/// Ідентифікатор той самий, що в кнопки «Зняти з листа» і в листа гравця: ці хіти зміняться рівно раз.
export async function changeHeroTargetHitPoints(tx: Prisma.TransactionClient, sessionId: number, seq: number, target: StoredHeroTarget | null, roll: GameRoll, heroes: Heroes): Promise<StoredHeroTarget | null> {
  const hero = target ? heroes.get(target.persId) : undefined;
  if (!target || !hero || target.kind === "attack") return target;
  const { damage: amount, notes } = target.kind === "damage" ? resolveTypedDamage(roll, (damageType) => findHeroDamageDefense(hero, damageType)) : { damage: roll.total, notes: [] };
  const adjusted = notes.length ? { amount, damageDefenses: notes } : {};
  if (amount <= 0) return { ...target, ...adjusted };
  await changeHeroHitPoints(tx, hero, target.kind, amount, buildHeroDamageOperationId(sessionId, seq));
  return { ...target, ...adjusted, isAppliedToSheet: true };
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

export type RestoredHero = { persId: number; name: string; kind: "damage" | "heal"; amount: number };

/// Скасований удар лікує героя, скасоване лікування знову ранить; тимчасові хіти, що поглинули удар, не повертаються.
export async function revertHeroHitPoints(tx: Prisma.TransactionClient, sessionId: number, cancelSeq: number, cancelled: { heroTarget?: StoredHeroTarget; saves?: StoredSaves; total: number }, heroes: Heroes): Promise<RestoredHero[]> {
  const restored: RestoredHero[] = [];
  for (const change of listSheetChanges(cancelled)) {
    const hero = heroes.get(change.persId);
    if (!hero) continue;
    const kind = change.kind === "damage" ? "heal" : "damage";
    await changeHeroHitPoints(tx, hero, kind, change.amount, buildHeroDamageOperationId(sessionId, cancelSeq, restored.length));
    restored.push({ persId: hero.persId, name: hero.name, kind, amount: change.amount });
  }
  return restored;
}

function listSheetChanges({ heroTarget, saves, total }: { heroTarget?: StoredHeroTarget; saves?: StoredSaves; total: number }): { persId: number; kind: "damage" | "heal"; amount: number }[] {
  const fromTarget = heroTarget?.isAppliedToSheet && heroTarget.kind !== "attack" ? [{ persId: heroTarget.persId, kind: heroTarget.kind, amount: heroTarget.amount ?? total }] : [];
  const fromSaves = (saves?.rows ?? []).flatMap((row) => (row.isAppliedToSheet && row.persId !== undefined && row.damage > 0 ? [{ persId: row.persId, kind: "damage" as const, amount: row.damage }] : []));
  return [...fromTarget, ...fromSaves];
}
