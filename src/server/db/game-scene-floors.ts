import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyFloorChange, readSceneFloors, readShownFloor, type FloorChange } from "@/rules/game-floors";
import type { ObjectPlacement } from "@/rules/game-objects";
import { addSceneObject, buildFloorPlanPrefix } from "@/server/db/game-scene-objects";
import { lockScene } from "@/server/db/game-scene-tools";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import { buildDetailedMapWebp } from "@/server/media/image-processing";
import { deleteStoredImage, storeScreenshotImage } from "@/server/media/image-upload";
import { MAX_MAP_UPLOAD_BYTES } from "@/lib/media-upload-limits";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T>(value: T) => ({ ok: true as const, value });

/// Прибраний поверх забирає свої обʼєкти; токени з нього спускаються на основну мапу.
export async function changeSceneFloors(sessionId: number, userId: number, sceneId: number, change: FloorChange): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const result = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    const stored = await tx.gameScene.findUniqueOrThrow({
      where: { id: sceneId },
      select: { floors: true, shownFloor: true },
    });
    const floors = readSceneFloors(stored.floors);
    const next = applyFloorChange({ floors, shown: readShownFloor(stored.shownFloor, floors) }, change);
    if (typeof next === "string") return fail(next);
    await tx.gameScene.update({
      where: { id: sceneId },
      data: {
        floors: next.floors.length ? next.floors : Prisma.DbNull,
        shownFloor: next.shown,
      },
    });
    if (change.kind !== "remove") return succeed([] as string[]);
    return succeed(await dropFloorContents(tx, sessionId, sceneId, change.id));
  });
  if (!result.ok) return result;
  await signalGameSession(sessionId, "session");
  await Promise.all(result.value.map((key) => deleteStoredImage(key)));
  return succeed(null);
}

async function dropFloorContents(tx: Prisma.TransactionClient, sessionId: number, sceneId: number, floor: number): Promise<string[]> {
  const objects = await tx.gameSceneObject.findMany({
    where: { sceneId, floor },
    select: { imageKey: true },
  });
  await Promise.all([
    tx.gameSceneObject.deleteMany({ where: { sceneId, floor } }),
    tx.gameSceneHeroToken.updateMany({
      where: { sceneId, floor },
      data: { floor: null },
    }),
    tx.gameMapCreature.updateMany({
      where: { gameSceneId: sceneId, floor },
      data: { floor: null },
    }),
  ]);
  return objects.map((object) => object.imageKey).filter((key) => key.startsWith(`${buildFloorPlanPrefix(sessionId)}/`));
}

/// План поверху — звичайний обʼєкт на своєму поверсі, лише картинка не квадратна й лежить під меблями.
/// shortcut: картинка плану, який прибрали поодинці, лишається в R2 до видалення поверху; якщо їх назбирається багато — чистити разом зі сценою.
export async function addFloorPlan(sessionId: number, userId: number, sceneId: number, file: unknown, placement: ObjectPlacement): Promise<GameSessionResult<{ id: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const stored = await storeScreenshotImage(file, buildFloorPlanPrefix(sessionId), buildDetailedMapWebp, MAX_MAP_UPLOAD_BYTES).catch((error: unknown) => ({ error: String(error) }));
  if ("error" in stored) {
    console.warn("План поверху не збережено", sessionId, stored.error);
    return fail("bad_image");
  }
  const added = await addSceneObject(sessionId, userId, sceneId, stored.key, placement);
  if (!added.ok) await deleteStoredImage(stored.key);
  return added;
}
