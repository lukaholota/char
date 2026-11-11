import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { OBJECT_LIMITS, type ObjectPlacement } from "@/rules/game-objects";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));
vi.mock("@/lib/refs/object-library-catalog", () => ({ OBJECT_LIBRARY: [{ slug: "chest", category: "storage", widthCells: 1 }] }));

import { addSceneObject, changeSceneObject, removeSceneObjects } from "@/server/db/game-scene-objects";
import { createGameScene, replaceGameSceneMap } from "@/server/db/game-scenes";
import { createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { deleteTokenImage } from "@/server/db/token-images";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const chest: ObjectPlacement = { at: { x: 0.4, y: 0.6 }, widthCells: 2, rotation: 90, name: "Скриня", isHidden: false, sortOrder: 0 };

async function createMapImage() {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  return { kind: "upload" as const, file: new Blob([new Uint8Array(bytes)], { type: "image/png" }) };
}

async function createTable() {
  const [gm, player] = await Promise.all(["gm", "player"].map((label) => prisma.user.create({ data: { email: `${label}-${randomUUID()}@objects.test`, name: label } })));
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, player.id);
  const scene = await createGameScene(sessionId, gm.id, "Сцена", await createMapImage());
  if (!scene.ok) throw new Error(scene.error);
  const imageKey = `token-images/${gm.id}/${randomUUID()}`;
  await prisma.userTokenImage.create({ data: { userId: gm.id, imageKey } });
  return { gm, player, sessionId, sceneId: scene.value.id, imageKey };
}

const seeObjects = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))!.objects;

async function addChest(table: Awaited<ReturnType<typeof createTable>>, placement = chest) {
  const added = await addSceneObject(table.sessionId, table.gm.id, table.sceneId, table.imageKey, placement);
  if (!added.ok) throw new Error(added.error);
  return added.value.id;
}

describe("обʼєкти сцени", () => {
  it("майстер ставить, змінює й прибирає обʼєкт; гравець не може", async () => {
    const table = await createTable();
    expect(await addSceneObject(table.sessionId, table.player.id, table.sceneId, table.imageKey, chest)).toEqual({ ok: false, error: "forbidden" });

    const id = await addChest(table);
    expect(await seeObjects(table.sessionId, table.player.id)).toMatchObject([{ id, at: chest.at, widthCells: 2, rotation: 90, name: "Скриня" }]);

    expect(await changeSceneObject(table.sessionId, table.player.id, table.sceneId, id, { ...chest, rotation: 0 })).toEqual({ ok: false, error: "forbidden" });
    expect(await changeSceneObject(table.sessionId, table.gm.id, table.sceneId, id, { ...chest, rotation: 45 })).toEqual({ ok: true, value: null });
    expect((await seeObjects(table.sessionId, table.gm.id))[0].rotation).toBe(45);

    expect(await removeSceneObjects(table.sessionId, table.player.id, table.sceneId, [id])).toEqual({ ok: false, error: "forbidden" });
    await removeSceneObjects(table.sessionId, table.gm.id, table.sceneId, [id]);
    expect(await seeObjects(table.sessionId, table.gm.id)).toEqual([]);
    expect(await changeSceneObject(table.sessionId, table.gm.id, table.sceneId, id, chest)).toEqual({ ok: false, error: "object_gone" });
  });

  it("схований обʼєкт гравець не отримує зовсім", async () => {
    const table = await createTable();
    const visible = await addChest(table);
    const hidden = await addChest(table, { ...chest, isHidden: true, sortOrder: 1 });

    expect((await seeObjects(table.sessionId, table.player.id)).map((object) => object.id)).toEqual([visible]);
    expect((await seeObjects(table.sessionId, table.gm.id)).map((object) => object.id)).toEqual([visible, hidden]);
  });

  it("чуже зображення й переповнена сцена не приймаються", async () => {
    const table = await createTable();
    expect(await addSceneObject(table.sessionId, table.gm.id, table.sceneId, "token-images/0/foreign", chest)).toEqual({ ok: false, error: "token_image_gone" });

    await prisma.gameSceneObject.createMany({ data: Array.from({ length: OBJECT_LIMITS.perScene }, () => ({ sceneId: table.sceneId, imageKey: table.imageKey, x: 0.5, y: 0.5 })) });
    expect(await addSceneObject(table.sessionId, table.gm.id, table.sceneId, table.imageKey, chest)).toEqual({ ok: false, error: "object_limit" });
  });

  it("обʼєкт з базового набору ставиться без власної бібліотеки, вигаданий ключ набору — ні", async () => {
    const table = await createTable();
    expect(await addSceneObject(table.sessionId, table.gm.id, table.sceneId, "library/objects/chest", chest)).toMatchObject({ ok: true });
    expect(await addSceneObject(table.sessionId, table.gm.id, table.sceneId, "library/objects/made-up", chest)).toEqual({ ok: false, error: "token_image_gone" });
    expect(await addSceneObject(table.sessionId, table.player.id, table.sceneId, "library/objects/chest", chest)).toEqual({ ok: false, error: "forbidden" });
    expect(await seeObjects(table.sessionId, table.player.id)).toMatchObject([{ imageKey: "library/objects/chest" }]);
  });

  it("нова мапа прибирає обʼєкти, стіни, світло й вимикає освітлення", async () => {
    const table = await createTable();
    await addChest(table);
    await prisma.gameSceneWall.create({ data: { sceneId: table.sceneId, kind: "wall", points: [0, 0, 1, 1] } });
    await prisma.gameSceneLight.create({ data: { sceneId: table.sceneId, x: 0.5, y: 0.5, brightFeet: 20, dimFeet: 20 } });
    await prisma.gameScene.update({ where: { id: table.sceneId }, data: { lighting: "dark" } });

    const replaced = await replaceGameSceneMap(table.sessionId, table.gm.id, table.sceneId, await createMapImage());
    expect(replaced.ok).toBe(true);

    const counts = await Promise.all([prisma.gameSceneObject.count({ where: { sceneId: table.sceneId } }), prisma.gameSceneWall.count({ where: { sceneId: table.sceneId } }), prisma.gameSceneLight.count({ where: { sceneId: table.sceneId } })]);
    expect(counts).toEqual([0, 0, 0]);
    expect((await prisma.gameScene.findUniqueOrThrow({ where: { id: table.sceneId } })).lighting).toBe("off");
  });

  it("видалене з бібліотеки зображення забирає свої обʼєкти з мап", async () => {
    const table = await createTable();
    await addChest(table);
    expect(await deleteTokenImage(table.gm.id, table.imageKey)).toEqual({ ok: true, value: null });
    expect(await seeObjects(table.sessionId, table.gm.id)).toEqual([]);
  });
});
