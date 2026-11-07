import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RollTargets } from "@/rules/map-target-picks";
import { BLESSED_MARK, canChangeTokenConditions, type TokenConditionChange } from "@/rules/token-conditions";
import { findActiveGmSession, findMembership, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });

/// Ввімкнення й вимкнення — самі в SQL: дві одночасні зміни різних станів не затруть одна одну.
function buildConditionAssignment(change: TokenConditionChange): Prisma.Sql {
  if (change.kind === "exhaustion") return Prisma.sql`exhaustion_level = ${change.level}::smallint`;
  if (!change.isActive) return Prisma.sql`conditions = array_remove(conditions, ${change.condition})`;
  return Prisma.sql`conditions = CASE WHEN ${change.condition} = ANY(conditions) THEN conditions ELSE array_append(conditions, ${change.condition}) END`;
}

export async function changeCreatureConditions(sessionId: number, userId: number, creatureId: number, change: TokenConditionChange): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.$executeRaw`
    UPDATE game_map_creature SET ${buildConditionAssignment(change)}
    WHERE game_map_creature_id = ${creatureId} AND game_session_id = ${sessionId}`;
  if (!changed) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function changeHeroConditions(sessionId: number, userId: number, heroUserId: number, change: TokenConditionChange): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (!canChangeTokenConditions({ userId, isGm: membership.role === "GM" }, { userId: heroUserId })) return fail("forbidden");
  const changed = await prisma.$executeRaw`
    UPDATE game_session_member SET ${buildConditionAssignment(change)}
    WHERE game_session_id = ${sessionId} AND user_id = ${heroUserId} AND pers_id IS NOT NULL`;
  if (!changed) return fail("no_map");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

/// «Благословення» кладе будь-хто з кімнати на будь-кого: заклинач обирає цілі на мапі, як дротики.
export async function markBlessedTargets(sessionId: number, userId: number, targets: RollTargets): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  const blessing = buildConditionAssignment({ kind: "toggle", condition: BLESSED_MARK, isActive: true });
  await prisma.$transaction([
    prisma.$executeRaw`UPDATE game_session_member SET ${blessing} WHERE game_session_id = ${sessionId} AND pers_id = ANY(${targets.persIds}::int[])`,
    prisma.$executeRaw`UPDATE game_map_creature SET ${blessing} WHERE game_session_id = ${sessionId} AND game_map_creature_id = ANY(${targets.creatureIds}::int[])`,
  ]);
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

/// Концентрація на «Благословенні» скінчилась — позначка зникає з усіх токенів кімнати.
/// shortcut: двоє заклиначів «Благословення» одночасно — кінець одного знімає обидва; зберігати автора, якщо таке трапиться в грі.
export async function clearBlessedMarks(sessionId: number, userId: number): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  await prisma.$transaction([
    prisma.$executeRaw`UPDATE game_session_member SET conditions = array_remove(conditions, ${BLESSED_MARK}) WHERE game_session_id = ${sessionId} AND ${BLESSED_MARK} = ANY(conditions)`,
    prisma.$executeRaw`UPDATE game_map_creature SET conditions = array_remove(conditions, ${BLESSED_MARK}) WHERE game_session_id = ${sessionId} AND ${BLESSED_MARK} = ANY(conditions)`,
  ]);
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}
