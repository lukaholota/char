import { prisma } from "@/lib/prisma";
import { createGameScene, replaceGameSceneMap } from "@/server/db/game-scenes";

export async function setActiveSceneMap(sessionId: number, gmId: number, file: Blob) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { activeSceneId: true } });
  if (session?.activeSceneId) return replaceGameSceneMap(sessionId, gmId, session.activeSceneId, { kind: "upload", file });
  const created = await createGameScene(sessionId, gmId, "Сцена", { kind: "upload", file });
  return created.ok ? { ok: true as const, value: null } : created;
}
