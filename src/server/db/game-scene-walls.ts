import { prisma } from "@/lib/prisma";
import { countWallSegments, WALL_LIMITS, type WallEdit } from "@/rules/game-walls";
import { fromStoredPoints, toStoredPoints } from "@/rules/map-strokes";
import { lockScene } from "@/server/db/game-scene-tools";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

/// Ліміт рахуємо під замком сцени й до видалення: відмова не має губити стіни, які правка прибирала б.
export async function editSceneWalls(sessionId: number, userId: number, sceneId: number, edit: WallEdit): Promise<GameSessionResult<{ ids: number[] }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const edited = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    const kept = await tx.gameSceneWall.findMany({ where: { sceneId, id: { notIn: edit.removedIds } }, select: { points: true } });
    const keptSegments = countWallSegments(kept.map((wall) => ({ points: fromStoredPoints(wall.points) ?? [] })));
    if (keptSegments + countWallSegments(edit.added) > WALL_LIMITS.segmentsPerScene) return fail("wall_limit");
    await tx.gameSceneWall.deleteMany({ where: { sceneId, id: { in: edit.removedIds } } });
    const created = await tx.gameSceneWall.createManyAndReturn({
      data: edit.added.map((line) => ({ sceneId, kind: line.kind, isOpen: line.isOpen, points: toStoredPoints(line.points) })),
      select: { id: true },
    });
    return succeed({ ids: created.map((row) => row.id) });
  });
  if (edited.ok) await signalGameSession(sessionId, "session");
  return edited;
}

export async function setSceneDoorOpen(sessionId: number, userId: number, sceneId: number, doorId: number, isOpen: boolean): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameSceneWall.updateMany({ where: { id: doorId, kind: "door", sceneId, scene: { sessionId } }, data: { isOpen } });
  if (!changed.count) return fail("wall_gone");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}
