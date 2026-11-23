import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildLibraryObjectKey } from "@/lib/refs/object-library";
import { OBJECT_LIBRARY } from "@/lib/refs/object-library-catalog";
import { OBJECT_LIMITS, type ObjectPlacement } from "@/rules/game-objects";
import type { PositionMove } from "@/rules/map-group";
import { lockScene } from "@/server/db/game-scene-tools";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import { isOwnTokenImage } from "@/server/db/token-images";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

export const buildFloorPlanPrefix = (sessionId: number) => `games/${sessionId}/floors`;

const LIBRARY_OBJECT_KEYS = new Set(OBJECT_LIBRARY.map((object) => buildLibraryObjectKey(object.slug)));
/// План поверху належить кімнаті: його можна скопіювати чи повернути скасуванням у тій самій кімнаті.
const isUsableObjectImage = async (sessionId: number, userId: number, imageKey: string) =>
  LIBRARY_OBJECT_KEYS.has(imageKey) || imageKey.startsWith(`${buildFloorPlanPrefix(sessionId)}/`) || isOwnTokenImage(userId, imageKey);

const toObjectColumns = (placement: ObjectPlacement) => ({ x: placement.at.x, y: placement.at.y, widthCells: placement.widthCells, rotation: placement.rotation, name: placement.name, isHidden: placement.isHidden, sortOrder: placement.sortOrder, floor: placement.floor, aspect: placement.aspect, appearance: placement.appearance ?? Prisma.DbNull });

export async function addSceneObject(sessionId: number, userId: number, sceneId: number, imageKey: string, placement: ObjectPlacement): Promise<GameSessionResult<{ id: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (!(await isUsableObjectImage(sessionId, userId, imageKey))) return fail("token_image_gone");
  const added = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    if ((await tx.gameSceneObject.count({ where: { sceneId } })) >= OBJECT_LIMITS.perScene) return fail("object_limit");
    const created = await tx.gameSceneObject.create({ data: { sceneId, imageKey, ...toObjectColumns(placement) }, select: { id: true } });
    return succeed({ id: created.id });
  });
  if (added.ok) await signalGameSession(sessionId, "session");
  return added;
}

export async function changeSceneObject(sessionId: number, userId: number, sceneId: number, objectId: number, placement: ObjectPlacement): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameSceneObject.updateMany({ where: { id: objectId, sceneId, scene: { sessionId } }, data: toObjectColumns(placement) });
  if (!changed.count) return fail("object_gone");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function moveSceneObjects(sessionId: number, userId: number, sceneId: number, moves: PositionMove[]): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const found = await prisma.gameSceneObject.count({ where: { id: { in: moves.map((move) => move.id) }, sceneId, scene: { sessionId } } });
  if (found !== moves.length) return fail("object_gone");
  await prisma.$transaction(moves.map(({ id, at }) => prisma.gameSceneObject.updateMany({ where: { id, sceneId }, data: { x: at.x, y: at.y } })));
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function removeSceneObjects(sessionId: number, userId: number, sceneId: number, objectIds: number[]): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const removed = await prisma.gameSceneObject.deleteMany({ where: { id: { in: objectIds }, sceneId, scene: { sessionId } } });
  if (removed.count) await signalGameSession(sessionId, "session");
  return succeed(null);
}
