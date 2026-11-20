import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findOwnSoundKeys, isOwnSoundKey, OWN_SOUND_LIMITS, readAmbience, readOwnSoundName, type AmbienceLayer, type OwnSoundKey } from "@/rules/game-atmosphere";
import { signalGameSession } from "@/server/db/game-sessions";
import { deleteSceneSound, storeSceneSound } from "@/server/media/sound-upload";

export type OwnSound = { key: OwnSoundKey; name: string };
export type AddedSoundResult = { sound: OwnSound } | { error: string };

export async function findOwnSounds(userId: number): Promise<OwnSound[]> {
  const sounds = await prisma.userSound.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { audioKey: true, name: true } });
  return sounds.flatMap(({ audioKey, name }) => (isOwnSoundKey(audioKey) ? [{ key: audioKey, name }] : []));
}

export async function addOwnSound(userId: number, file: unknown, fileName: string): Promise<AddedSoundResult> {
  const soundCount = await prisma.userSound.count({ where: { userId } });
  if (soundCount >= OWN_SOUND_LIMITS.perUser) return { error: `У бібліотеці вже ${OWN_SOUND_LIMITS.perUser} звуків — видаліть непотрібний` };
  const stored = await storeSceneSound(file);
  if ("error" in stored) return stored;
  const sound = { key: stored.key, name: readOwnSoundName(fileName) };
  await prisma.userSound.create({ data: { userId, audioKey: sound.key, name: sound.name } });
  return { sound };
}

/// Звук зникає й з фону сцен, де він грав: інакше гравці чекали б файл, якого вже немає.
export async function deleteOwnSound(userId: number, key: OwnSoundKey): Promise<void> {
  const removed = await prisma.userSound.deleteMany({ where: { userId, audioKey: key } });
  if (!removed.count) return;
  const scenes = await prisma.gameScene.findMany({ where: { ambience: { array_contains: [{ key }] } }, select: { id: true, sessionId: true, ambience: true } });
  for (const scene of scenes) {
    const layers = readAmbience(scene.ambience).filter((layer) => layer.key !== key);
    await prisma.gameScene.update({ where: { id: scene.id }, data: { ambience: layers.length ? layers : Prisma.DbNull } });
  }
  await Promise.all([...new Set(scenes.map((scene) => scene.sessionId))].map((sessionId) => signalGameSession(sessionId, "session")));
  await deleteSceneSound(key);
}

export async function isOwnSound(userId: number, key: OwnSoundKey): Promise<boolean> {
  return (await prisma.userSound.count({ where: { userId, audioKey: key } })) > 0;
}

export async function hasAllOwnSounds(userId: number, layers: AmbienceLayer[]): Promise<boolean> {
  const keys = findOwnSoundKeys(layers);
  if (!keys.length) return true;
  return (await prisma.userSound.count({ where: { userId, audioKey: { in: keys } } })) === keys.length;
}
