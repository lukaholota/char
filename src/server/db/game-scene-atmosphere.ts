import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AmbienceLayer, SceneAtmosphere } from "@/rules/game-atmosphere";
import { findActiveGmSession, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import { hasAllOwnSounds } from "@/server/db/user-sounds";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

async function updateGmScene(sessionId: number, userId: number, sceneId: number, data: Prisma.GameSceneUpdateManyMutationInput): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const changed = await prisma.gameScene.updateMany({ where: { id: sceneId, sessionId }, data });
  if (!changed.count) return fail("bad_scene");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export function setSceneAtmosphere(sessionId: number, userId: number, sceneId: number, atmosphere: SceneAtmosphere) {
  return updateGmScene(sessionId, userId, sceneId, atmosphere);
}

export async function setSceneAmbience(sessionId: number, userId: number, sceneId: number, layers: AmbienceLayer[]): Promise<GameSessionResult<null>> {
  if (!(await hasAllOwnSounds(userId, layers))) return fail("sound_gone");
  return updateGmScene(sessionId, userId, sceneId, { ambience: layers.length ? layers : Prisma.DbNull });
}
