import { prisma } from "@/lib/prisma";
import { applyHitPointChange, findCreatureHitPoints, rollCreatureMaxHitPoints, type HitPointChange } from "@/rules/creature-hit-points";
import type { TokenLight } from "@/rules/game-lighting";
import { findPastePosition, type TokenPosition } from "@/rules/game-map";
import {
  MAP_CREATURE_LIMITS,
  findCreatureGroupKey,
  findFreeCreatureNumbers,
  type CreatureBorderColor,
  type CreatureTokenSize,
  type MapCreatureRuleset,
  type NewMapCreatures,
  type TokenNameMode,
} from "@/rules/game-map-creatures";
import { findViewedSceneId } from "@/rules/game-scenes";
import { canSummon, type SummonRequest } from "@/rules/summon-spells";
import type { TokenTransform } from "@/rules/token-transform";
import { findRoomCreature } from "@/server/db/room-creatures";
import { findActiveGmSession, findMembership, findRoomHero, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import { buildCreatureLookFilter, isOwnTokenImage } from "@/server/db/token-images";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });

/// Майстер керує будь-якою істотою, гравець — лише тією, яку майстер передав його героєві.
export async function findCreatureCommand(sessionId: number, userId: number, creatureId: number): Promise<GameSessionResult<null>> {
  const [membership, creature] = await Promise.all([
    findMembership(sessionId, userId),
    prisma.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { controller: { select: { userId: true } } } }),
  ]);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (!creature) return fail("creature_gone");
  if (membership.role !== "GM" && creature.controller?.userId !== userId) return fail("forbidden");
  return { ok: true, value: null };
}

/// heroId null повертає істоту майстрові.
export async function setMapCreatureController(sessionId: number, userId: number, creatureId: number, heroId: number | null): Promise<GameSessionResult<null>> {
  const [gm, hero] = await Promise.all([findActiveGmSession(sessionId, userId), heroId === null ? null : findRoomHero(sessionId, heroId)]);
  if (!gm.ok) return gm;
  if (heroId !== null && hero?.persId == null) return fail("bad_pers");
  const changed = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { controllerMemberId: heroId } });
  if (!changed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function addMapCreatures(sessionId: number, userId: number, input: NewMapCreatures): Promise<GameSessionResult<{ name: string }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (input.imageKey && !(await isOwnTokenImage(userId, input.imageKey))) return fail("token_image_gone");
  return placeSceneCreatures(sessionId, findGmSceneId(gm.value), input, {});
}

/// Гравець кличе істоту заклинанням на сцену, яку бачить: вона стає там, куди він дивиться, і керує нею його герой.
export async function summonMapCreature(sessionId: number, userId: number, summon: SummonRequest): Promise<GameSessionResult<{ name: string }>> {
  const [membership, hero] = await Promise.all([
    findMembership(sessionId, userId),
    prisma.gameSessionMember.findFirst({ where: { gameSessionId: sessionId, userId, persId: { not: null } }, orderBy: { heroSlot: "asc" }, select: { id: true, pers: { select: { ruleset: true } } } }),
  ]);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (!hero?.pers) return fail("no_map");
  if (!canSummon(hero.pers.ruleset, summon.spellEngName, summon.creatureKey)) return fail("bad_creature");
  const sceneId = findViewedSceneId({ isGm: membership.role === "GM", activeSceneId: membership.gameSession.activeSceneId, openSceneId: membership.openSceneId });
  const input = { creatureKey: summon.creatureKey, ruleset: hero.pers.ruleset, count: 1, customName: null };
  return placeSceneCreatures(sessionId, sceneId, input, { tokenX: summon.position.x, tokenY: summon.position.y, controllerMemberId: hero.id });
}

type CreaturePlacement = { tokenX?: number; tokenY?: number; controllerMemberId?: number };

async function placeSceneCreatures(sessionId: number, sceneId: number | null, input: NewMapCreatures, placement: CreaturePlacement): Promise<GameSessionResult<{ name: string }>> {
  const entry = await findRoomCreature(input.creatureKey, input.ruleset);
  if (!entry) return fail("bad_creature");
  if (sceneId === null) return fail("no_map");
  const added = await prisma.$transaction(async (tx) => {
    // Рядок кімнати під замком: два швидкі додавання не візьмуть ті самі номери.
    await tx.$queryRaw`SELECT 1 FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    const scene = await tx.gameScene.findFirst({ where: { id: sceneId, sessionId }, select: { mapImageKey: true } });
    if (!scene?.mapImageKey) return fail("no_map");
    const existing = await tx.gameMapCreature.findMany({ where: { gameSceneId: sceneId }, select: { creatureKey: true, ruleset: true, customName: true, number: true } });
    if (existing.length + input.count > MAP_CREATURE_LIMITS.perScene) return fail("creature_limit");
    const group = findCreatureGroupKey(input);
    const taken = existing.filter((row) => findCreatureGroupKey(row) === group).map((row) => row.number);
    const look = await tx.gameMapCreature.findFirst({ where: buildCreatureLookFilter(sessionId, input), select: { isCutout: true, customImageKey: true } });
    await tx.gameMapCreature.createMany({
      data: findFreeCreatureNumbers(taken, input.count).map((number) => {
        const hpMax = rollCreatureMaxHitPoints(entry.hp);
        return { gameSessionId: sessionId, gameSceneId: sceneId, creatureKey: input.creatureKey, ruleset: input.ruleset, number, customName: input.customName, hpMax, hpCurrent: hpMax, isCutout: look?.isCutout ?? false, customImageKey: input.imageKey ?? look?.customImageKey ?? null, ...placement };
      }),
    });
    return { ok: true as const, value: { name: input.customName ?? entry.name } };
  });
  if (added.ok) await signalGameSession(sessionId, "session");
  return added;
}

/// Копія на тій самій карті — нова істота: свій номер і хіти, без станів. На іншій карті це той самий НІП, що перейшов: хіти, стани й номер, якщо він вільний, лишаються.
export async function duplicateMapCreature(sessionId: number, userId: number, creatureId: number, step: number, sceneId: number): Promise<GameSessionResult<{ id: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const duplicated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    const [original, scene] = await Promise.all([tx.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId } }), tx.gameScene.findFirst({ where: { id: sceneId, sessionId }, select: { mapImageKey: true } })]);
    if (!original?.gameSceneId) return fail("creature_gone");
    if (!scene?.mapImageKey) return fail("no_map");
    const entry = await findRoomCreature(original.creatureKey, original.ruleset);
    if (!entry) return fail("bad_creature");
    const siblings = await tx.gameMapCreature.findMany({ where: { gameSceneId: sceneId }, select: { creatureKey: true, ruleset: true, customName: true, number: true } });
    if (siblings.length >= MAP_CREATURE_LIMITS.perScene) return fail("creature_limit");
    const group = findCreatureGroupKey(original);
    const taken = siblings.filter((row) => findCreatureGroupKey(row) === group).map((row) => row.number);
    const isWalking = original.gameSceneId !== sceneId;
    const [number] = isWalking && !taken.includes(original.number) ? [original.number] : findFreeCreatureNumbers(taken, 1);
    const at = original.tokenX === null || original.tokenY === null ? null : findPastePosition({ x: original.tokenX, y: original.tokenY }, step);
    const hpMax = rollCreatureMaxHitPoints(entry.hp);
    const { id: _id, createdAt: _createdAt, conditions, exhaustionLevel, ...look } = original;
    const state = isWalking ? { conditions, exhaustionLevel, floor: null } : { hpMax, hpCurrent: hpMax };
    const copy = await tx.gameMapCreature.create({ data: { ...look, ...state, gameSceneId: sceneId, number, tokenX: at?.x ?? null, tokenY: at?.y ?? null }, select: { id: true } });
    return { ok: true as const, value: copy };
  });
  if (duplicated.ok) await signalGameSession(sessionId, "session");
  return duplicated;
}

/// Нове імʼя переносить істоту в іншу групу нумерації, тому номер береться найменший вільний у новій групі.
export async function renameMapCreature(sessionId: number, userId: number, creatureId: number, customName: string | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const renamed = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    const creature = await tx.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { gameSceneId: true, creatureKey: true, ruleset: true, customName: true } });
    if (!creature) return fail("creature_gone");
    if (creature.customName === customName) return { ok: true as const, value: false };
    const group = findCreatureGroupKey({ ...creature, customName });
    const siblings = await tx.gameMapCreature.findMany({ where: { gameSceneId: creature.gameSceneId, id: { not: creatureId } }, select: { creatureKey: true, ruleset: true, customName: true, number: true } });
    const [number] = findFreeCreatureNumbers(siblings.filter((row) => findCreatureGroupKey(row) === group).map((row) => row.number), 1);
    await tx.gameMapCreature.update({ where: { id: creatureId }, data: { customName, number } });
    return { ok: true as const, value: true };
  });
  if (!renamed.ok) return renamed;
  if (renamed.value) await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function moveMapCreature(sessionId: number, userId: number, creatureId: number, position: TokenPosition, floor?: number | null): Promise<GameSessionResult<null>> {
  const command = await findCreatureCommand(sessionId, userId, creatureId);
  if (!command.ok) return command;
  const moved = await prisma.gameMapCreature.updateMany({
    where: { id: creatureId, gameSessionId: sessionId, scene: { mapImageKey: { not: null } } },
    data: { tokenX: position.x, tokenY: position.y, floor },
  });
  if (!moved.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

/// creatureId null прибирає всіх істот сцени, яку зараз відкрито в майстра.
export async function removeMapCreatures(sessionId: number, userId: number, creatureId: number | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const sceneId = findGmSceneId(gm.value);
  if (creatureId === null && sceneId === null) return { ok: true, value: null };
  const removed = await prisma.gameMapCreature.deleteMany({ where: { gameSessionId: sessionId, ...(creatureId === null ? { gameSceneId: sceneId } : { id: creatureId }) } });
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

export async function transformMapCreature(sessionId: number, userId: number, creatureId: number, transform: TokenTransform): Promise<GameSessionResult<null>> {
  const command = await findCreatureCommand(sessionId, userId, creatureId);
  if (!command.ok) return command;
  const changed = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { tokenRotation: transform.rotation, tokenScalePercent: transform.scale } });
  if (!changed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function setMapCreatureLight(sessionId: number, userId: number, creatureId: number, light: TokenLight): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { lightBrightFeet: light.brightFeet, lightDimFeet: light.dimFeet } });
  if (!changed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

/// Вибір стосується картинки, тож змінює всіх, хто ділить цей вигляд, а не одну істоту.
export async function setMapCreatureCutout(sessionId: number, userId: number, creatureId: number, isCutout: boolean): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const creature = await prisma.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true, customName: true } });
  if (!creature) return fail("creature_gone");
  await prisma.gameMapCreature.updateMany({ where: buildCreatureLookFilter(sessionId, creature), data: { isCutout } });
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function changeMapCreatureHitPoints(sessionId: number, userId: number, creatureId: number, change: HitPointChange): Promise<GameSessionResult<null>> {
  const command = await findCreatureCommand(sessionId, userId, creatureId);
  if (!command.ok) return command;
  const placed = await prisma.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true } });
  const statblockHp = placed ? (await findRoomCreature(placed.creatureKey, placed.ruleset))?.hp : undefined;
  const changed = await prisma.$transaction(async (tx) => {
    const [creature] = await tx.$queryRaw<{ creature_key: string; ruleset: MapCreatureRuleset; hp_max: number | null; hp_current: number | null }[]>`
      SELECT creature_key, ruleset, hp_max, hp_current FROM game_map_creature
      WHERE game_map_creature_id = ${creatureId} AND game_session_id = ${sessionId} FOR UPDATE`;
    if (!creature) return fail("creature_gone");
    const stored = { hpMax: creature.hp_max, hpCurrent: creature.hp_current };
    const next = applyHitPointChange(findCreatureHitPoints(stored, statblockHp), change);
    if (!next) return fail("no_hit_points");
    await tx.gameMapCreature.update({ where: { id: creatureId }, data: { hpMax: next.max, hpCurrent: next.current } });
    return { ok: true as const, value: null };
  });
  if (changed.ok) await signalGameSession(sessionId, "session");
  return changed;
}

export async function setCreatureNameMode(sessionId: number, userId: number, mode: TokenNameMode): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  await prisma.gameSession.update({ where: { id: sessionId }, data: { creatureNameMode: mode } });
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

function findGmSceneId(membership: { openSceneId: number | null; gameSession: { activeSceneId: number | null } }): number | null {
  return findViewedSceneId({ isGm: true, activeSceneId: membership.gameSession.activeSceneId, openSceneId: membership.openSceneId });
}

export async function setMapCreatureNameHidden(sessionId: number, userId: number, creatureId: number, isNameHidden: boolean): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { isNameHidden } });
  if (!changed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function setMapCreatureBorderColor(sessionId: number, userId: number, creatureId: number, borderColor: CreatureBorderColor): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameMapCreature.updateMany({ where: { id: creatureId, gameSessionId: sessionId }, data: { borderColor } });
  if (!changed.count) return fail("creature_gone");
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}
