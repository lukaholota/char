import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { MAP_CREATURE_LIMITS } from "@/rules/game-map-creatures";
import { addMapCreatures } from "@/server/db/game-map-creatures";
import { createGameScene, openGameScene } from "@/server/db/game-scenes";
import { createGameSession, findGameSessionView } from "@/server/db/game-sessions";
import { addTokenImage, deleteTokenImage, findTokenImageKeys, setMapCreatureImage } from "@/server/db/token-images";
import { disconnectDatabase, resetUserData } from "../user-data";
import { setActiveSceneMap } from "./game-scene-setup";

const stored = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array) => void stored.set(key, bytes),
  deleteMediaObject: async (key: string) => void stored.delete(key),
}));

vi.setConfig({ testTimeout: 60_000 });

beforeEach(async () => {
  stored.clear();
  await resetUserData();
});
afterAll(disconnectDatabase);

const countTokenFiles = () => [...stored.keys()].filter((key) => key.includes("token-images/")).length;
const createUser = (label: string) => prisma.user.create({ data: { email: `${label}-${randomUUID()}@token.test`, name: label } });

async function createImageBlob() {
  const bytes = await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0 } } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function uploadImage(userId: number) {
  const result = await addTokenImage(userId, await createImageBlob());
  if ("error" in result) throw new Error(result.error);
  return result.key;
}

async function createRoomWithCreatures() {
  const gm = await createUser("gm");
  const created = await createGameSession(gm.id, "Лігво");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await setActiveSceneMap(sessionId, gm.id, await createImageBlob());
  await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 2, isAlly: false, customName: null });
  await addMapCreatures(sessionId, gm.id, { creatureKey: "wolf", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null });
  const creatures = await prisma.gameMapCreature.findMany({ where: { gameSessionId: sessionId }, orderBy: { id: "asc" } });
  return { gm, sessionId, goblinId: creatures[0].id };
}

const findImageKeys = async (sessionId: number) =>
  (await prisma.gameMapCreature.findMany({ where: { gameSessionId: sessionId }, orderBy: { id: "asc" }, select: { creatureKey: true, customImageKey: true } })).map((row) => [row.creatureKey, row.customImageKey]);

describe("власні зображення істот на мапі", () => {
  it("зображення зберігається в бібліотеці, ставиться всім таким істотам, а статблок лишається", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const imageKey = await uploadImage(gm.id);
    expect(await findTokenImageKeys(gm.id)).toEqual([imageKey]);

    expect(await setMapCreatureImage(sessionId, gm.id, goblinId, imageKey)).toEqual({ ok: true, value: null });

    expect(await findImageKeys(sessionId)).toEqual([["goblin", imageKey], ["goblin", imageKey], ["wolf", null]]);
    const [goblin] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect(goblin).toMatchObject({ creatureKey: "goblin", customImageKey: imageKey, isRoundImage: false });
    expect(goblin.imageUrl).toContain(imageKey);
    expect(countTokenFiles()).toBe(2);
  });

  it("те саме зображення з бібліотеки не завантажується вдруге: нові файли не зʼявляються", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const imageKey = await uploadImage(gm.id);
    const wolf = await prisma.gameMapCreature.findFirstOrThrow({ where: { gameSessionId: sessionId, creatureKey: "wolf" } });
    await setMapCreatureImage(sessionId, gm.id, goblinId, imageKey);
    await setMapCreatureImage(sessionId, gm.id, wolf.id, imageKey);
    expect(countTokenFiles()).toBe(2);
    expect(await findTokenImageKeys(gm.id)).toHaveLength(1);
  });

  it("нова істота того ж виду отримує замінене зображення, навіть на іншій сцені", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const imageKey = await uploadImage(gm.id);
    await setMapCreatureImage(sessionId, gm.id, goblinId, imageKey);
    const scene = await createGameScene(sessionId, gm.id, "Друга", { kind: "upload", file: await createImageBlob() });
    if (!scene.ok) throw new Error(scene.error);
    await openGameScene(sessionId, gm.id, scene.value.id);

    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null });

    expect((await findImageKeys(sessionId)).at(-1)).toEqual(["goblin", imageKey]);
  });

  it("чужого зображення не поставити, а гравець не може замінювати зовсім", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const stranger = await createUser("stranger");
    const strangerKey = await uploadImage(stranger.id);
    const ownKey = await uploadImage(gm.id);

    expect(await setMapCreatureImage(sessionId, gm.id, goblinId, strangerKey)).toEqual({ ok: false, error: "token_image_gone" });
    expect((await setMapCreatureImage(sessionId, stranger.id, goblinId, ownKey)).ok).toBe(false);
    expect((await findImageKeys(sessionId)).every(([, key]) => key === null)).toBe(true);
  });

  it("«Повернути стандартне» знімає заміну, а файл лишається в бібліотеці", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const imageKey = await uploadImage(gm.id);
    await setMapCreatureImage(sessionId, gm.id, goblinId, imageKey);

    await setMapCreatureImage(sessionId, gm.id, goblinId, null);

    expect((await findImageKeys(sessionId)).every(([, key]) => key === null)).toBe(true);
    expect(await findTokenImageKeys(gm.id)).toEqual([imageKey]);
    expect(countTokenFiles()).toBe(2);
  });

  it("видалення зображення повертає істотам стандартне й прибирає файли; чуже видалити не можна", async () => {
    const { gm, sessionId, goblinId } = await createRoomWithCreatures();
    const imageKey = await uploadImage(gm.id);
    await setMapCreatureImage(sessionId, gm.id, goblinId, imageKey);
    const stranger = await createUser("stranger");

    await deleteTokenImage(stranger.id, imageKey);
    expect(await findTokenImageKeys(gm.id)).toEqual([imageKey]);
    expect(countTokenFiles()).toBe(2);

    expect(await deleteTokenImage(gm.id, imageKey)).toEqual({ ok: true, value: null });
    expect(await findTokenImageKeys(gm.id)).toEqual([]);
    expect(countTokenFiles()).toBe(0);
    const [goblin] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect(goblin.customImageKey).toBeNull();
    expect(goblin.imageUrl).not.toContain(imageKey);
  });

  it("повна бібліотека й поганий файл не лишають ні рядка, ні файла", async () => {
    const gm = await createUser("gm");
    await prisma.userTokenImage.createMany({ data: Array.from({ length: MAP_CREATURE_LIMITS.imagesPerUser }, (_, index) => ({ userId: gm.id, imageKey: `token-images/${gm.id}/${index}` })) });
    expect(await addTokenImage(gm.id, await createImageBlob())).toEqual({ error: expect.stringContaining("видаліть непотрібне") });
    expect(countTokenFiles()).toBe(0);

    const other = await createUser("other");
    expect(await addTokenImage(other.id, new Blob(["не картинка"], { type: "image/png" }))).toHaveProperty("error");
    expect(await findTokenImageKeys(other.id)).toEqual([]);
  });
});
