import { prisma } from "@/lib/prisma";
import { MAP_CREATURE_LIMITS } from "@/rules/game-map-creatures";
import { findActiveGmSession, signalGameSession, type GameSessionResult } from "@/server/db/game-sessions";
import { deleteStoredImage, storeSquareImage, type StoredImageResult } from "@/server/media/image-upload";

export async function findTokenImageKeys(userId: number): Promise<string[]> {
  const images = await prisma.userTokenImage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { imageKey: true } });
  return images.map((image) => image.imageKey);
}

export async function addTokenImage(userId: number, file: unknown): Promise<StoredImageResult> {
  const imageCount = await prisma.userTokenImage.count({ where: { userId } });
  if (imageCount >= MAP_CREATURE_LIMITS.imagesPerUser) return { error: `У бібліотеці вже ${MAP_CREATURE_LIMITS.imagesPerUser} зображень — видаліть непотрібне` };
  const stored = await storeSquareImage(file, `token-images/${userId}`);
  if ("error" in stored) return stored;
  await prisma.userTokenImage.create({ data: { userId, imageKey: stored.key } });
  return stored;
}

/// Вигляд спільний для всіх таких істот кімнати: майстер замінює «дракона», а не одного з трьох.
export async function setMapCreatureImage(sessionId: number, userId: number, creatureId: number, imageKey: string | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (imageKey !== null && !(await isOwnTokenImage(userId, imageKey))) return { ok: false, error: "token_image_gone" };
  const creature = await prisma.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true } });
  if (!creature) return { ok: false, error: "creature_gone" };
  await prisma.gameMapCreature.updateMany({ where: { gameSessionId: sessionId, creatureKey: creature.creatureKey, ruleset: creature.ruleset }, data: { customImageKey: imageKey } });
  await signalGameSession(sessionId, "session");
  return { ok: true, value: null };
}

export async function deleteTokenImage(userId: number, imageKey: string): Promise<GameSessionResult<null>> {
  if (!(await isOwnTokenImage(userId, imageKey))) return { ok: true, value: null };
  const roomsUsingImage = await findRoomsUsingImage(imageKey);
  await prisma.$transaction([prisma.gameSceneObject.deleteMany({ where: { imageKey } }), prisma.userTokenImage.deleteMany({ where: { userId, imageKey } })]);
  await Promise.all(roomsUsingImage.map((sessionId) => signalGameSession(sessionId, "session")));
  await deleteStoredImage(imageKey);
  return { ok: true, value: null };
}

/// Істота з цим зображенням повертається до стандартного вигляду, а обʼєкт без картинки зникає з мапи.
async function findRoomsUsingImage(imageKey: string): Promise<number[]> {
  const [creatures, objects] = await Promise.all([
    prisma.gameMapCreature.findMany({ where: { customImageKey: imageKey }, distinct: ["gameSessionId"], select: { gameSessionId: true } }),
    prisma.gameSceneObject.findMany({ where: { imageKey }, select: { scene: { select: { sessionId: true } } } }),
  ]);
  return [...new Set([...creatures.map((creature) => creature.gameSessionId), ...objects.map((object) => object.scene.sessionId)])];
}

export async function isOwnTokenImage(userId: number, imageKey: string): Promise<boolean> {
  return (await prisma.userTokenImage.count({ where: { userId, imageKey } })) > 0;
}
