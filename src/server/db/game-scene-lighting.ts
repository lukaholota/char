import { prisma } from "@/lib/prisma";
import { LIGHT_LIMITS, type LightSource, type SceneLighting } from "@/rules/game-lighting";
import { lockScene } from "@/server/db/game-scene-tools";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });
const toLightRow = (light: LightSource & { isOn: boolean }) => ({ x: light.at.x, y: light.at.y, brightFeet: light.brightFeet, dimFeet: light.dimFeet, isOn: light.isOn });

export async function setSceneLighting(sessionId: number, userId: number, sceneId: number, lighting: SceneLighting): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameScene.updateMany({ where: { id: sceneId, sessionId }, data: { lighting } });
  if (!changed.count) return fail("bad_scene");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

/// lightId null — нове джерело; ліміт рахуємо під замком сцени, щоб два дотики не проскочили разом.
export async function saveSceneLight(sessionId: number, userId: number, sceneId: number, lightId: number | null, light: LightSource & { isOn: boolean }): Promise<GameSessionResult<{ id: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const saved = await prisma.$transaction(async (tx) => {
    if (!(await lockScene(tx, sessionId, sceneId))) return fail("bad_scene");
    if (lightId !== null) {
      const changed = await tx.gameSceneLight.updateMany({ where: { id: lightId, sceneId }, data: toLightRow(light) });
      return changed.count ? succeed({ id: lightId }) : fail("light_gone");
    }
    if ((await tx.gameSceneLight.count({ where: { sceneId } })) >= LIGHT_LIMITS.perScene) return fail("light_limit");
    return succeed(await tx.gameSceneLight.create({ data: { sceneId, ...toLightRow(light) }, select: { id: true } }));
  });
  if (saved.ok) await signalGameSession(sessionId, "session");
  return saved;
}

export async function removeSceneLights(sessionId: number, userId: number, sceneId: number, lightIds: number[]): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  await prisma.gameSceneLight.deleteMany({ where: { id: { in: lightIds }, sceneId, scene: { sessionId } } });
  await signalGameSession(sessionId, "session");
  return succeed(null);
}
