import { prisma } from "@/lib/prisma";
import { countWallSegments, findOpeningChangeFailure, WALL_LIMITS, type OpeningChange, type WallEdit, type WallLine } from "@/rules/game-walls";
import { fromStoredPoints, toStoredPoints } from "@/rules/map-strokes";
import { findSceneEditor, lockScene } from "@/server/db/game-scene-tools";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });
export const toWallColumns = (line: WallLine) => ({ kind: line.kind, isOpen: line.isOpen, doorLock: line.lock, isCurtained: line.isCurtained, points: toStoredPoints(line.points) });

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
      data: edit.added.map((line) => ({ sceneId, ...toWallColumns(line) })),
      select: { id: true },
    });
    return succeed({ ids: created.map((row) => row.id) });
  });
  if (edited.ok) await signalGameSession(sessionId, "session");
  return edited;
}

/// Хто що може міняти, вирішують правила; оновлення ще раз звіряє вид і замок — на випадок, якщо майстер змінив їх між читанням і записом.
export async function changeSceneOpening(sessionId: number, userId: number, sceneId: number, wallId: number, change: OpeningChange): Promise<GameSessionResult<null>> {
  const editor = await findSceneEditor(sessionId, userId, sceneId);
  if (!editor.ok) return editor;
  const where = { id: wallId, sceneId, scene: { sessionId } };
  const opening = await prisma.gameSceneWall.findFirst({ where, select: { kind: true, doorLock: true } });
  if (!opening) return fail("wall_gone");
  const failure = findOpeningChangeFailure({ kind: opening.kind, lock: opening.doorLock }, change, editor.value.isGm);
  if (failure) return fail(failure);
  const changed = await prisma.gameSceneWall.updateMany({ where: { ...where, ...opening }, data: { isOpen: change.isOpen, doorLock: change.lock, isCurtained: change.isCurtained } });
  if (!changed.count) return fail("wall_gone");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}
