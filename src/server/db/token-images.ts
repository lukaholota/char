import { prisma } from "@/lib/prisma";
import { MAP_CREATURE_LIMITS, type MapCreatureRuleset } from "@/rules/game-map-creatures";
import { findActiveGmSession, signalGameSession, type GameSessionResult } from "@/server/db/game-sessions";
import { deleteStoredImage, storeObjectImage, storeSquareImage, type StoredImageResult } from "@/server/media/image-upload";

export async function findTokenImageKeys(userId: number): Promise<string[]> {
  const images = await prisma.userTokenImage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { imageKey: true } });
  return images.map((image) => image.imageKey);
}

export async function addTokenImage(userId: number, file: unknown): Promise<StoredImageResult> {
  return addImage(userId, file, null, storeSquareImage);
}

export async function addImageToLibrary(userId: number, file: unknown, folderId: number | null, isCropped: boolean): Promise<StoredImageResult> {
  if (folderId !== null && !(await prisma.userImageFolder.findFirst({ where: { id: folderId, userId }, select: { id: true } }))) return { error: "Папку не знайдено" };
  return addImage(userId, file, folderId, isCropped ? storeSquareImage : storeObjectImage);
}

async function addImage(userId: number, file: unknown, folderId: number | null, store: typeof storeSquareImage): Promise<StoredImageResult> {
  const imageCount = await prisma.userTokenImage.count({ where: { userId } });
  const libraryFull = { error: `У бібліотеці вже ${MAP_CREATURE_LIMITS.imagesPerUser} зображень — видаліть непотрібне` };
  if (imageCount >= MAP_CREATURE_LIMITS.imagesPerUser) return libraryFull;
  const stored = await store(file, `token-images/${userId}`);
  if ("error" in stored) return stored;
  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT user_id FROM "user" WHERE user_id = ${userId} FOR UPDATE`;
      if (await tx.userTokenImage.count({ where: { userId } }) >= MAP_CREATURE_LIMITS.imagesPerUser) return false;
      await tx.userTokenImage.create({ data: { userId, imageKey: stored.key, folderId } });
      return true;
    });
    if (created) return stored;
  } catch (error) {
    await deleteStoredImage(stored.key);
    throw error;
  }
  await deleteStoredImage(stored.key);
  return libraryFull;
}

export async function listImageLibrary(userId: number) {
  const [folders, images] = await Promise.all([
    prisma.userImageFolder.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.userTokenImage.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { imageKey: true, folderId: true } }),
  ]);
  return { folders, images };
}

export function createImageFolder(userId: number, name: string) {
  return prisma.userImageFolder.upsert({ where: { userId_name: { userId, name } }, create: { userId, name }, update: {}, select: { id: true, name: true } });
}

export async function moveLibraryImage(userId: number, imageKey: string, folderId: number | null): Promise<GameSessionResult<null>> {
  if (folderId !== null && !(await prisma.userImageFolder.findFirst({ where: { id: folderId, userId }, select: { id: true } }))) return { ok: false, error: "not_found" };
  const changed = await prisma.userTokenImage.updateMany({ where: { imageKey, userId }, data: { folderId } });
  return changed.count ? { ok: true, value: null } : { ok: false, error: "token_image_gone" };
}

/// Вигляд спільний для однакових істот кімнати: майстер замінює «дракона», а не одного з трьох.
/// Істота з власним імʼям — окремий персонаж: корчмар-простолюдин не перефарбовує стражника-простолюдина.
export function buildCreatureLookFilter(sessionId: number, creature: { creatureKey: string; ruleset: MapCreatureRuleset; customName: string | null }) {
  return { gameSessionId: sessionId, creatureKey: creature.creatureKey, ruleset: creature.ruleset, customName: creature.customName };
}

export async function setMapCreatureImage(sessionId: number, userId: number, creatureId: number, imageKey: string | null): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (imageKey !== null && !(await isOwnTokenImage(userId, imageKey))) return { ok: false, error: "token_image_gone" };
  const creature = await prisma.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true, customName: true } });
  if (!creature) return { ok: false, error: "creature_gone" };
  await prisma.gameMapCreature.updateMany({ where: buildCreatureLookFilter(sessionId, creature), data: { customImageKey: imageKey } });
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
