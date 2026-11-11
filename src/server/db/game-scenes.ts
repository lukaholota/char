import { Prisma } from "@prisma/client";
import { MAP_LIBRARY } from "@/lib/refs/map-library-catalog";
import { prisma } from "@/lib/prisma";
import { buildLibraryGrid, GRID_OPACITY_RANGE, type SceneGrid } from "@/rules/game-grid";
import type { TokenLight } from "@/rules/game-lighting";
import type { TokenPosition } from "@/rules/game-map";
import type { TokenTransform } from "@/rules/token-transform";
import type { SceneLayout } from "@/rules/uvtt-import";
import { toStoredPoints } from "@/rules/map-strokes";
import { GAME_SCENE_LIMITS, findLibraryMap, findViewedSceneId, isRoomUploadedMapKey, parseSceneName, type SceneMapSource } from "@/rules/game-scenes";
import { findActiveGmSession, findMembership, findRoomHero, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import { deleteStoredImage, storeScreenshotImage } from "@/server/media/image-upload";

type Transaction = Prisma.TransactionClient;

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

/// layout — стіни, двері, світло й сітка з файлу Universal VTT; без картинки їх нема до чого прикласти.
export async function createGameScene(sessionId: number, userId: number, rawName: unknown, source: SceneMapSource, layout: SceneLayout | null = null): Promise<GameSessionResult<{ id: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const name = parseSceneName(rawName);
  if (!name) return fail("bad_scene_name");
  if (layout && source.kind !== "upload") return fail("bad_image");
  const resolvedMap = await resolveSceneMap(sessionId, source);
  if (!resolvedMap.ok) return resolvedMap;
  const created = await prisma.$transaction(async (tx) => {
    await lockSessionScenes(tx, sessionId);
    const sceneCount = await tx.gameScene.count({ where: { sessionId } });
    if (sceneCount >= GAME_SCENE_LIMITS.perRoom) return fail("scene_limit");
    const mapData = buildSceneMapData({ ...resolvedMap.value, grid: layout?.grid ?? resolvedMap.value.grid });
    const scene = await tx.gameScene.create({ data: { sessionId, name, ...mapData, lighting: layout?.lighting }, select: { id: true } });
    if (layout) await createSceneLayout(tx, scene.id, layout);
    await tx.gameSessionMember.update({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, data: { openSceneId: scene.id } });
    if (sceneCount === 0) await tx.gameSession.update({ where: { id: sessionId }, data: { activeSceneId: scene.id } });
    return succeed({ id: scene.id });
  });
  if (!created.ok) await removeSceneMapImage(sessionId, resolvedMap.value.key);
  else await signalGameSession(sessionId, "session");
  return created;
}

export async function renameGameScene(sessionId: number, userId: number, sceneId: number, rawName: unknown): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const name = parseSceneName(rawName);
  if (!name) return fail("bad_scene_name");
  const renamed = await prisma.gameScene.updateMany({ where: { id: sceneId, sessionId }, data: { name } });
  if (!renamed.count) return fail("bad_scene");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Нова мапа міняє геометрію: істоти лишаються в сцені, але сходять з мапи, токени героїв цієї сцени скидаються.
export async function replaceGameSceneMap(sessionId: number, userId: number, sceneId: number, source: SceneMapSource): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (source.kind === "none") return fail("bad_image");
  const resolvedMap = await resolveSceneMap(sessionId, source);
  if (!resolvedMap.ok) return resolvedMap;
  const replaced = await prisma.$transaction(async (tx) => {
    const locked = await lockSessionScenes(tx, sessionId);
    const scene = await tx.gameScene.findFirst({ where: { id: sceneId, sessionId }, select: { mapImageKey: true } });
    if (!scene) return fail("bad_scene");
    if (locked.isInCombat && locked.activeSceneId === sceneId) return fail("scene_in_combat");
    await tx.gameScene.update({ where: { id: sceneId }, data: { ...buildSceneMapData(resolvedMap.value), lighting: "off" } });
    await tx.gameSceneArea.deleteMany({ where: { sceneId } });
    await tx.gameSceneObject.deleteMany({ where: { sceneId } });
    await tx.gameSceneWall.deleteMany({ where: { sceneId } });
    await tx.gameSceneLight.deleteMany({ where: { sceneId } });
    await tx.gameMapCreature.updateMany({ where: { gameSceneId: sceneId }, data: { tokenX: null, tokenY: null } });
    await tx.gameSceneHeroToken.deleteMany({ where: { sceneId } });
    return succeed({ previousKey: scene.mapImageKey });
  });
  if (!replaced.ok) {
    await removeSceneMapImage(sessionId, resolvedMap.value.key);
    return replaced;
  }
  if (replaced.value.previousKey !== resolvedMap.value.key) await removeSceneMapImage(sessionId, replaced.value.previousKey);
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function openGameScene(sessionId: number, userId: number, sceneId: number): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (!(await isSceneInRoom(sessionId, sceneId))) return fail("bad_scene");
  await prisma.gameSessionMember.update({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, data: { openSceneId: sceneId } });
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function activateGameScene(sessionId: number, userId: number, sceneId: number): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const activated = await prisma.$transaction(async (tx) => {
    const locked = await lockSessionScenes(tx, sessionId);
    if (!(await isSceneInRoom(sessionId, sceneId, tx))) return fail("bad_scene");
    if (locked.activeSceneId !== sceneId && locked.isInCombat) return fail("scene_in_combat");
    await tx.gameSession.update({ where: { id: sessionId }, data: { activeSceneId: sceneId } });
    await tx.gameSessionMember.update({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, data: { openSceneId: sceneId } });
    return succeed(null);
  });
  if (activated.ok) await signalGameSession(sessionId, "session");
  return activated;
}

export async function deleteGameScene(sessionId: number, userId: number, sceneId: number): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const deleted = await prisma.$transaction(async (tx) => {
    const locked = await lockSessionScenes(tx, sessionId);
    const scene = await tx.gameScene.findFirst({ where: { id: sceneId, sessionId }, select: { mapImageKey: true } });
    if (!scene) return fail("bad_scene");
    if (locked.activeSceneId === sceneId) return fail("scene_active");
    await tx.gameScene.delete({ where: { id: sceneId } });
    return succeed({ mapImageKey: scene.mapImageKey });
  });
  if (!deleted.ok) return deleted;
  await removeSceneMapImage(sessionId, deleted.value.mapImageKey);
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Смолоскип у руці: світло героя ставить його гравець або майстер.
export async function setHeroTokenLight(sessionId: number, userId: number, sceneId: number, heroId: number, light: TokenLight): Promise<GameSessionResult<null>> {
  const access = await checkHeroTokenAccess(sessionId, userId, sceneId, heroId);
  if (!access.ok) return access;
  const changed = await prisma.gameSceneHeroToken.updateMany({ where: { sceneId, memberId: heroId }, data: { lightBrightFeet: light.brightFeet, lightDimFeet: light.dimFeet } });
  if (!changed.count) return fail("no_map");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// null повертає темний зір з листа героя; перебити його може лише майстер.
export async function setHeroDarkvision(sessionId: number, userId: number, sceneId: number, heroId: number, darkvisionFeet: number | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameSceneHeroToken.updateMany({ where: { sceneId, memberId: heroId, scene: { sessionId } }, data: { darkvisionFeet } });
  if (!changed.count) return fail("no_map");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Своїх героїв рухає гравець, будь-якого — майстер; position null повертає токен у ряд під мапою.
/// sceneId — сцена, на якій тягнули: рух, що запізнився після перемикання сцени, не ляже на нову.
export async function moveGameToken(sessionId: number, userId: number, sceneId: number | null, heroId: number, position: TokenPosition | null): Promise<GameSessionResult<null>> {
  const access = await checkHeroTokenAccess(sessionId, userId, sceneId, heroId);
  if (!access.ok) return access;
  const placedSceneId = access.value.sceneId;
  if (position === null) {
    await prisma.gameSceneHeroToken.deleteMany({ where: { sceneId: placedSceneId, memberId: heroId } });
  } else {
    const data = { tokenX: position.x, tokenY: position.y };
    await prisma.gameSceneHeroToken.upsert({ where: { sceneId_memberId: { sceneId: placedSceneId, memberId: heroId } }, create: { sceneId: placedSceneId, memberId: heroId, ...data }, update: data });
  }
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Поворот і масштаб живуть у рядку токена: героя, якого ще не поставили на мапу, крутити нічого.
export async function transformHeroToken(sessionId: number, userId: number, sceneId: number, heroId: number, transform: TokenTransform): Promise<GameSessionResult<null>> {
  const access = await checkHeroTokenAccess(sessionId, userId, sceneId, heroId);
  if (!access.ok) return access;
  const changed = await prisma.gameSceneHeroToken.updateMany({ where: { sceneId, memberId: heroId }, data: { tokenRotation: transform.rotation, tokenScalePercent: transform.scale } });
  if (!changed.count) return fail("no_map");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Своїх героїв рухає гравець, будь-якого — майстер; лише на сцені, яку він зараз бачить і де є мапа.
async function checkHeroTokenAccess(sessionId: number, userId: number, sceneId: number | null, heroId: number): Promise<GameSessionResult<{ sceneId: number }>> {
  const [membership, hero] = await Promise.all([findMembership(sessionId, userId), findRoomHero(sessionId, heroId)]);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (hero && hero.userId !== userId && membership.role !== "GM") return fail("forbidden");
  const viewedSceneId = findViewedSceneId({ isGm: membership.role === "GM", activeSceneId: membership.gameSession.activeSceneId, openSceneId: membership.openSceneId });
  if (viewedSceneId === null) return fail("no_map");
  if (sceneId !== viewedSceneId) return fail("scene_changed");
  const scene = await prisma.gameScene.findFirst({ where: { id: sceneId, sessionId, mapImageKey: { not: null } }, select: { id: true } });
  if (!scene || !hero || hero.persId === null) return fail("no_map");
  return succeed({ sceneId: scene.id });
}

async function lockSessionScenes(tx: Transaction, sessionId: number): Promise<{ activeSceneId: number | null; isInCombat: boolean }> {
  const [row] = await tx.$queryRaw<{ active_scene_id: number | null; combat_round: number | null }[]>`
    SELECT active_scene_id, combat_round FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
  return { activeSceneId: row?.active_scene_id ?? null, isInCombat: row?.combat_round != null };
}

async function isSceneInRoom(sessionId: number, sceneId: number, client: Transaction | typeof prisma = prisma): Promise<boolean> {
  return (await client.gameScene.count({ where: { id: sceneId, sessionId } })) > 0;
}

type ResolvedSceneMap = { key: string | null; grid: SceneGrid | null };

/// Нова картинка робить стару сітку, туман і області недійсними; бібліотечна мапа приносить свою сітку.
async function createSceneLayout(tx: Transaction, sceneId: number, layout: SceneLayout) {
  await tx.gameSceneWall.createMany({ data: layout.walls.map((line) => ({ sceneId, kind: line.kind, isOpen: line.isOpen, points: toStoredPoints(line.points) })) });
  await tx.gameSceneLight.createMany({ data: layout.lights.map((light) => ({ sceneId, x: light.at.x, y: light.at.y, brightFeet: light.brightFeet, dimFeet: light.dimFeet })) });
}

function buildSceneMapData(map: ResolvedSceneMap) {
  return {
    mapImageKey: map.key,
    gridColumns: map.grid?.columns ?? null,
    gridOffsetX: map.grid?.offsetX ?? 0,
    gridOffsetY: map.grid?.offsetY ?? 0,
    isGridVisible: map.grid?.isVisible ?? true,
    gridOpacity: map.grid?.opacity ?? GRID_OPACITY_RANGE.initial,
    fog: Prisma.DbNull,
  };
}

async function resolveSceneMap(sessionId: number, source: SceneMapSource): Promise<GameSessionResult<ResolvedSceneMap>> {
  if (source.kind === "none") return succeed({ key: null, grid: null });
  if (source.kind === "library") {
    const entry = findLibraryMap(source.slug, MAP_LIBRARY);
    return entry ? succeed({ key: entry.key, grid: buildLibraryGrid(entry.grid) }) : fail("bad_image");
  }
  try {
    const stored = await storeScreenshotImage(source.file, `games/${sessionId}/map`);
    if ("error" in stored) {
      console.warn("Мапу сцени не збережено", sessionId, stored.error);
      return fail("bad_image");
    }
    return succeed({ key: stored.key, grid: null });
  } catch (error) {
    console.warn("Мапу сцени не збережено", sessionId, error);
    return fail("bad_image");
  }
}

export async function removeSceneMapImage(sessionId: number, key: string | null): Promise<void> {
  if (key && isRoomUploadedMapKey(sessionId, key)) await deleteStoredImage(key);
}
