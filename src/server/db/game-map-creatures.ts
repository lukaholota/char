import { prisma } from "@/lib/prisma";
import type { TokenPosition } from "@/rules/game-map";
import {
  MAP_CREATURE_LIMITS,
  findCreatureGroupKey,
  findFreeCreatureNumbers,
  type CreatureTokenSize,
  type NewMapCreatures,
  type TokenNameMode,
} from "@/rules/game-map-creatures";
import { findActiveGmSession, findCatalogCreature, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });

export async function addMapCreatures(sessionId: number, userId: number, input: NewMapCreatures): Promise<GameSessionResult<{ name: string }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const entry = findCatalogCreature(input.creatureKey, input.ruleset);
  if (!entry) return fail("bad_creature");
  const added = await prisma.$transaction(async (tx) => {
    // Рядок кімнати під замком: два швидкі додавання не візьмуть ті самі номери.
    const [session] = await tx.$queryRaw<{ map_image_key: string | null }[]>`
      SELECT map_image_key FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    if (!session?.map_image_key) return fail("no_map");
    const existing = await tx.gameMapCreature.findMany({ where: { gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true, customName: true, number: true } });
    if (existing.length + input.count > MAP_CREATURE_LIMITS.perSession) return fail("creature_limit");
    const group = findCreatureGroupKey(input);
    const taken = existing.filter((row) => findCreatureGroupKey(row) === group).map((row) => row.number);
    await tx.gameMapCreature.createMany({
      data: findFreeCreatureNumbers(taken, input.count).map((number) => ({ gameSessionId: sessionId, creatureKey: input.creatureKey, ruleset: input.ruleset, number, isAlly: input.isAlly, customName: input.customName })),
    });
    return { ok: true as const, value: { name: input.customName ?? entry.name } };
  });
  if (added.ok) await signalGameSession(sessionId, "session");
  return added;
}

export async function moveMapCreature(sessionId: number, userId: number, creatureId: number, position: TokenPosition): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const moved = await prisma.gameMapCreature.updateMany({
    where: { id: creatureId, gameSessionId: sessionId, gameSession: { mapImageKey: { not: null } } },
    data: { tokenX: position.x, tokenY: position.y },
  });
  if (!moved.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

/// creatureId null прибирає всіх істот кімнати.
export async function removeMapCreatures(sessionId: number, userId: number, creatureId: number | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const removed = await prisma.gameMapCreature.deleteMany({ where: { gameSessionId: sessionId, ...(creatureId === null ? {} : { id: creatureId }) } });
  if (creatureId !== null && !removed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function setMapCreatureSize(sessionId: number, userId: number, creatureId: number, size: CreatureTokenSize): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const resized = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { tokenSize: size } });
  if (!resized.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function setCreatureNameMode(sessionId: number, userId: number, mode: TokenNameMode): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  await prisma.gameSession.update({ where: { id: sessionId }, data: { creatureNameMode: mode } });
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}
