import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AreaPlacement } from "@/rules/game-areas";
import { AREA_LIMITS } from "@/rules/game-areas";
import { DRAWING_LIMITS, type DrawingStroke } from "@/rules/game-drawings";
import { applyFogChange, parseSceneFog, serializeSceneFog, type FogChange } from "@/rules/game-fog";
import { GRID_OPACITY_RANGE, type SceneGrid } from "@/rules/game-grid";
import { toStoredPoints } from "@/rules/map-strokes";
import { findViewedSceneId } from "@/rules/game-scenes";
import { findActiveGmSession, findMembership, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

export async function changeSceneGrid(sessionId: number, userId: number, sceneId: number, grid: SceneGrid | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameScene.updateMany({
    where: { id: sceneId, sessionId },
    data: { gridColumns: grid?.columns ?? null, gridOffsetX: grid?.offsetX ?? 0, gridOffsetY: grid?.offsetY ?? 0, isGridVisible: grid?.isVisible ?? true, gridOpacity: grid?.opacity ?? GRID_OPACITY_RANGE.initial },
  });
  if (!changed.count) return fail("bad_scene");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function changeSceneFog(sessionId: number, userId: number, sceneId: number, change: FogChange): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    const stored = await tx.gameScene.findUniqueOrThrow({ where: { id: sceneId }, select: { fog: true } });
    const next = applyFogChange(parseSceneFog(stored.fog), change);
    if (next === "too_many") return fail("fog_limit");
    await tx.gameScene.update({ where: { id: sceneId }, data: { fog: next ? serializeSceneFog(next) : Prisma.DbNull } });
    return succeed(null);
  });
  if (changed.ok) await signalGameSession(sessionId, "session");
  return changed;
}

/// Гравець малює лише на сцені, яку бачить, і лише свої області; майстер — на будь-якій сцені кімнати.
export async function saveSceneArea(sessionId: number, userId: number, sceneId: number, areaId: number | null, placement: AreaPlacement): Promise<GameSessionResult<{ id: number }>> {
  const editor = await findAreaEditor(sessionId, userId, sceneId);
  if (!editor.ok) return editor;
  const data = { shape: placement.shape, sizeFeet: placement.sizeFeet, originX: placement.origin.x, originY: placement.origin.y, angle: placement.angle, label: placement.label };
  const saved = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    if (areaId === null) {
      if ((await tx.gameSceneArea.count({ where: { sceneId } })) >= AREA_LIMITS.perScene) return fail("area_limit");
      const created = await tx.gameSceneArea.create({ data: { sceneId, userId, ...data }, select: { id: true } });
      return succeed({ id: created.id });
    }
    const existing = await tx.gameSceneArea.findFirst({ where: { id: areaId, sceneId }, select: { userId: true } });
    if (!existing) return fail("area_gone");
    if (!editor.value.isGm && existing.userId !== userId) return fail("forbidden");
    await tx.gameSceneArea.update({ where: { id: areaId }, data });
    return succeed({ id: areaId });
  });
  if (saved.ok) await signalGameSession(sessionId, "session");
  return saved;
}

/// areaId null прибирає всі області сцени — лише майстер.
export async function removeSceneAreas(sessionId: number, userId: number, sceneId: number, areaId: number | null): Promise<GameSessionResult<null>> {
  const editor = await findAreaEditor(sessionId, userId, sceneId);
  if (!editor.ok) return editor;
  if (areaId === null) {
    if (!editor.value.isGm) return fail("forbidden");
    await prisma.gameSceneArea.deleteMany({ where: { sceneId, scene: { sessionId } } });
  } else {
    const existing = await prisma.gameSceneArea.findFirst({ where: { id: areaId, sceneId, scene: { sessionId } }, select: { userId: true } });
    if (!existing) return fail("area_gone");
    if (!editor.value.isGm && existing.userId !== userId) return fail("forbidden");
    const removed = await prisma.gameSceneArea.deleteMany({ where: { id: areaId } });
    if (!removed.count) return fail("area_gone");
  }
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// Малюють майстер і гравці, на тих самих умовах, що й області.
/// shortcut: скасоване «Стерти все» повертає чужі лінії від імені майстра; якщо гравцям треба стирати їх знову — передавати автора.
export async function saveSceneDrawings(sessionId: number, userId: number, sceneId: number, strokes: DrawingStroke[]): Promise<GameSessionResult<{ ids: number[] }>> {
  const editor = await findAreaEditor(sessionId, userId, sceneId);
  if (!editor.ok) return editor;
  const saved = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    if ((await tx.gameSceneDrawing.count({ where: { sceneId } })) + strokes.length > DRAWING_LIMITS.perScene) return fail("drawing_limit");
    const created = await tx.gameSceneDrawing.createManyAndReturn({
      data: strokes.map((stroke) => ({ sceneId, userId, color: stroke.color, width: stroke.width, points: toStoredPoints(stroke.points) })),
      select: { id: true },
    });
    return succeed({ ids: created.map((row) => row.id) });
  });
  if (saved.ok) await signalGameSession(sessionId, "session");
  return saved;
}

/// «all» — усе, що людина може стерти: майстер — усі лінії сцени, гравець — свої. Чужі id гравця просто пропускаються.
export async function removeSceneDrawings(sessionId: number, userId: number, sceneId: number, target: number[] | "all"): Promise<GameSessionResult<null>> {
  const editor = await findAreaEditor(sessionId, userId, sceneId);
  if (!editor.ok) return editor;
  const removed = await prisma.gameSceneDrawing.deleteMany({
    where: { sceneId, scene: { sessionId }, ...(target === "all" ? {} : { id: { in: target } }), ...(editor.value.isGm ? {} : { userId }) },
  });
  if (removed.count) await signalGameSession(sessionId, "session");
  return succeed(null);
}

async function findAreaEditor(sessionId: number, userId: number, sceneId: number): Promise<GameSessionResult<{ isGm: boolean }>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  const isGm = membership.role === "GM";
  if (!isGm && findViewedSceneId({ isGm, activeSceneId: membership.gameSession.activeSceneId, openSceneId: membership.openSceneId }) !== sceneId) return fail("scene_changed");
  return succeed({ isGm });
}

async function lockScene(tx: Prisma.TransactionClient, sessionId: number, sceneId: number): Promise<boolean> {
  const rows = await tx.$queryRaw<unknown[]>`SELECT 1 FROM game_scene WHERE game_scene_id = ${sceneId} AND game_session_id = ${sessionId} FOR UPDATE`;
  return rows.length > 0;
}
