import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

const stored = vi.hoisted(() => new Map<string, Uint8Array>());
const deletedKeys = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array) => void stored.set(key, bytes),
  deleteMediaObject: async (key: string) => {
    deletedKeys.push(key);
    stored.delete(key);
  },
}));
vi.mock("@/lib/refs/map-library-catalog", () => ({
  MAP_LIBRARY: [{ slug: "forest", name: "Ліс", originalName: "Forest", pack: "dndavid", key: "library/maps/forest", width: 1600, height: 1200, grid: null }],
}));

import { startCombat } from "@/server/db/game-combat";
import { addMapCreatures, moveMapCreature } from "@/server/db/game-map-creatures";
import { activateGameScene, createGameScene, deleteGameScene, moveGameToken, openGameScene, renameGameScene, replaceGameSceneMap } from "@/server/db/game-scenes";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { parseUvttScene } from "@/rules/uvtt-import";

vi.setConfig({ testTimeout: 60_000 });

const findViewedScene = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))?.viewedSceneId ?? null;

beforeEach(async () => {
  stored.clear();
  deletedKeys.length = 0;
  await resetUserData();
});
afterAll(disconnectDatabase);

const goblins = { creatureKey: "goblin", ruleset: "RULES_2014" as const, count: 1, isAlly: false, customName: null };

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@scene.test`, name: `${label} Тестовий` } });
}

async function createPers(userId: number, name: string) {
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const race = await prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } });
  const background = await prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });
  const pers = await prisma.pers.create({
    data: { userId, name, ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  return pers.persId;
}

async function createMapImage() {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  return { kind: "upload" as const, file: new Blob([new Uint8Array(bytes)], { type: "image/png" }) };
}

async function createTable() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, player.id);
  await bindMemberPers(sessionId, player.id, await createPers(player.id, "Арвен"));
  return { gm, player, sessionId };
}

async function createScene(sessionId: number, gmId: number, name: string) {
  const created = await createGameScene(sessionId, gmId, name, await createMapImage());
  if (!created.ok) throw new Error(created.error);
  return created.value.id;
}

const seeScenes = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))!;

async function findHeroId(sessionId: number, userId: number): Promise<number> {
  return (await prisma.gameSessionMember.findFirstOrThrow({ where: { gameSessionId: sessionId, userId, heroSlot: 0 }, select: { id: true } })).id;
}

const readSceneSetup = (sceneId: number) =>
  prisma.gameScene.findUniqueOrThrow({ where: { id: sceneId }, select: { lighting: true, gridColumns: true, _count: { select: { walls: true, lights: true } } } });

describe("сцени кімнати", () => {
  it("нова сцена з картинки чи бібліотеки — без стін і світла, зі звичайним освітленням і сіткою бібліотеки", async () => {
    const { gm, sessionId } = await createTable();
    const uploaded = await createScene(sessionId, gm.id, "Ліс");
    const fromLibrary = await createGameScene(sessionId, gm.id, "Бібліотека", { kind: "library", slug: "forest" });
    if (!fromLibrary.ok) throw new Error(fromLibrary.error);
    expect(await readSceneSetup(uploaded)).toEqual({ lighting: "off", gridColumns: null, _count: { walls: 0, lights: 0 } });
    expect(await readSceneSetup(fromLibrary.value.id)).toEqual({ lighting: "off", gridColumns: null, _count: { walls: 0, lights: 0 } });
  });

  it("сцена з файлу Universal VTT приходить зі стінами, дверима, світлом, сіткою й темрявою; гравець бачить лише лінії зору", async () => {
    const { gm, player, sessionId } = await createTable();
    const parsed = parseUvttScene(JSON.parse(readFileSync(`${__dirname}/../fixtures/uvtt/dungeondraft-room.dd2vtt`, "utf8")));
    if (!parsed.ok) throw new Error(parsed.error);
    const { imageBase64: _image, ...layout } = parsed.value;
    const created = await createGameScene(sessionId, gm.id, "Склеп", await createMapImage(), layout);
    if (!created.ok) throw new Error(created.error);
    expect(await readSceneSetup(created.value.id)).toEqual({ lighting: "dark", gridColumns: 8, _count: { walls: 5, lights: 1 } });
    const gmView = (await findGameSessionView(sessionId, gm.id))!;
    expect(gmView.walls.filter((wall) => wall.kind === "door").map((door) => door.isOpen)).toEqual([false, true]);
    expect(gmView.lights).toMatchObject([{ at: layout.lights[0].at, brightFeet: 10, dimFeet: 10, isOn: true }]);
    const playerView = (await findGameSessionView(sessionId, player.id))!;
    expect(playerView).toMatchObject({ lighting: "dark", walls: [] });
    expect(playerView.sightLines).toHaveLength(4);
  });

  it("файл Universal VTT не ляже без власної картинки, від гравця чи понад ліміт сцен — і не лишить ні стін, ні світла", async () => {
    const { gm, player, sessionId } = await createTable();
    const parsed = parseUvttScene(JSON.parse(readFileSync(`${__dirname}/../fixtures/uvtt/dungeondraft-room.dd2vtt`, "utf8")));
    if (!parsed.ok) throw new Error(parsed.error);
    const { imageBase64: _image, ...layout } = parsed.value;
    expect(await createGameScene(sessionId, gm.id, "Ліс", { kind: "library", slug: "forest" }, layout)).toEqual({ ok: false, error: "bad_image" });
    expect(await createGameScene(sessionId, player.id, "Склеп", await createMapImage(), layout)).toEqual({ ok: false, error: "forbidden" });
    for (let index = 0; index < 20; index++) await createScene(sessionId, gm.id, `Сцена ${index}`);
    expect(await createGameScene(sessionId, gm.id, "Зайва", await createMapImage(), layout)).toEqual({ ok: false, error: "scene_limit" });
    expect(await prisma.gameSceneWall.count()).toBe(0);
    expect(await prisma.gameSceneLight.count()).toBe(0);
  });

  it("гравець отримує лише активну сцену: ні списку, ні назв, ні чужих мап та істот", async () => {
    const { gm, player, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    const second = await createScene(sessionId, gm.id, "Підземелля");
    await addMapCreatures(sessionId, gm.id, goblins);

    const gmView = await seeScenes(sessionId, gm.id);
    expect(gmView.scenes).toEqual([
      { id: first, name: "Ліс", hasMap: true, isActive: true },
      { id: second, name: "Підземелля", hasMap: true, isActive: false },
    ]);
    expect([gmView.activeSceneId, gmView.viewedSceneId]).toEqual([first, second]);
    expect(gmView.creatures).toHaveLength(1);

    const playerView = await seeScenes(sessionId, player.id);
    expect(playerView.scenes).toEqual([]);
    expect([playerView.activeSceneId, playerView.viewedSceneId]).toEqual([null, first]);
    expect(playerView.creatures).toEqual([]);
    expect(JSON.stringify(playerView)).not.toContain("Підземелля");
    expect(playerView.mapImageUrl).not.toBe(gmView.mapImageUrl);
  });

  it("майстер відкриває будь-яку сцену, гравець ні; сцена з іншої кімнати не підходить", async () => {
    const { gm, player, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    const second = await createScene(sessionId, gm.id, "Підземелля");
    const foreign = await createTable();
    const foreignScene = await createScene(foreign.sessionId, foreign.gm.id, "Чужа");

    expect(await openGameScene(sessionId, player.id, second)).toEqual({ ok: false, error: "forbidden" });
    expect(await activateGameScene(sessionId, player.id, second)).toEqual({ ok: false, error: "forbidden" });
    expect(await deleteGameScene(sessionId, player.id, second)).toEqual({ ok: false, error: "forbidden" });
    expect(await renameGameScene(sessionId, player.id, second, "Хак")).toEqual({ ok: false, error: "forbidden" });
    expect(await openGameScene(sessionId, gm.id, foreignScene)).toEqual({ ok: false, error: "bad_scene" });
    expect(await activateGameScene(sessionId, gm.id, foreignScene)).toEqual({ ok: false, error: "bad_scene" });
    expect(await deleteGameScene(sessionId, gm.id, foreignScene)).toEqual({ ok: false, error: "bad_scene" });

    await openGameScene(sessionId, gm.id, first);
    expect((await seeScenes(sessionId, gm.id)).viewedSceneId).toBe(first);
    expect((await seeScenes(sessionId, player.id)).viewedSceneId).toBe(first);
  });

  it("«показати гравцям» міняє те, що бачать гравці, разом з істотами й токенами героїв сцени", async () => {
    const { gm, player, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    await addMapCreatures(sessionId, gm.id, goblins);
    const creatureId = (await seeScenes(sessionId, gm.id)).creatures[0].id;
    await moveMapCreature(sessionId, gm.id, creatureId, { x: 0.3, y: 0.3 });
    await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), await findHeroId(sessionId, player.id), { x: 0.2, y: 0.2 });
    const second = await createScene(sessionId, gm.id, "Підземелля");

    expect((await seeScenes(sessionId, player.id)).creatures).toHaveLength(1);
    expect(await activateGameScene(sessionId, gm.id, second)).toEqual({ ok: true, value: null });
    const emptyScene = await seeScenes(sessionId, player.id);
    expect(emptyScene.creatures).toEqual([]);
    expect(emptyScene.members.find((member) => member.userId === player.id)!.token).toBeNull();

    await activateGameScene(sessionId, gm.id, first);
    expect((await seeScenes(sessionId, player.id)).members.find((member) => member.userId === player.id)!.token).toEqual({ x: 0.2, y: 0.2 });
  });

  it("сцену, яку бачать гравці, не видалити — ні останню, ні просто активну; а в кімнаті не більше 20 сцен", async () => {
    const { gm, player, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    expect(await deleteGameScene(sessionId, gm.id, first)).toEqual({ ok: false, error: "scene_active" });
    const second = await createScene(sessionId, gm.id, "Підземелля");
    await addMapCreatures(sessionId, gm.id, goblins);
    await activateGameScene(sessionId, gm.id, second);
    expect(await deleteGameScene(sessionId, gm.id, second)).toEqual({ ok: false, error: "scene_active" });
    expect(await deleteGameScene(sessionId, gm.id, first)).toEqual({ ok: true, value: null });
    expect((await seeScenes(sessionId, player.id)).viewedSceneId).toBe(second);
    expect(await prisma.gameMapCreature.count({ where: { gameSceneId: second } })).toBe(1);
    expect(stored.size).toBe(1);

    for (let index = 0; index < 19; index++) await createScene(sessionId, gm.id, `Сцена ${index}`);
    expect(await createGameScene(sessionId, gm.id, "Зайва", await createMapImage())).toEqual({ ok: false, error: "scene_limit" });
    expect(await createGameScene(sessionId, gm.id, "   ", { kind: "none" })).toEqual({ ok: false, error: "bad_scene_name" });
  });

  it("під час бою активну сцену не перемкнути, не видалити й не змінити їй мапу", async () => {
    const { gm, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    const second = await createScene(sessionId, gm.id, "Підземелля");
    await addMapCreatures(sessionId, gm.id, goblins);
    await moveMapCreature(sessionId, gm.id, (await seeScenes(sessionId, gm.id)).creatures[0].id, { x: 0.3, y: 0.3 });
    await openGameScene(sessionId, gm.id, first);
    await addMapCreatures(sessionId, gm.id, goblins);
    await moveMapCreature(sessionId, gm.id, (await seeScenes(sessionId, gm.id)).creatures[0].id, { x: 0.5, y: 0.5 });
    expect((await startCombat(sessionId, gm.id)).ok).toBe(true);

    expect(await activateGameScene(sessionId, gm.id, second)).toEqual({ ok: false, error: "scene_in_combat" });
    expect(await deleteGameScene(sessionId, gm.id, first)).toEqual({ ok: false, error: "scene_active" });
    expect(await replaceGameSceneMap(sessionId, gm.id, first, await createMapImage())).toEqual({ ok: false, error: "scene_in_combat" });
    expect(await activateGameScene(sessionId, gm.id, first)).toEqual({ ok: true, value: null });
    expect(await deleteGameScene(sessionId, gm.id, second)).toEqual({ ok: true, value: null });
    expect((await seeScenes(sessionId, gm.id)).combat!.combatants).toHaveLength(2);
  });

  it("нова мапа знімає з мапи істот і токени лише цієї сцени, а самі істоти лишаються в сцені", async () => {
    const { gm, player, sessionId } = await createTable();
    const first = await createScene(sessionId, gm.id, "Ліс");
    await addMapCreatures(sessionId, gm.id, goblins);
    await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), await findHeroId(sessionId, player.id), { x: 0.2, y: 0.2 });
    const second = await createScene(sessionId, gm.id, "Підземелля");
    await addMapCreatures(sessionId, gm.id, goblins);
    await openGameScene(sessionId, gm.id, first);
    const before = stored.size;

    expect(await replaceGameSceneMap(sessionId, gm.id, second, await createMapImage())).toEqual({ ok: true, value: null });
    expect(stored.size).toBe(before);
    expect(await prisma.gameMapCreature.count({ where: { gameSceneId: first } })).toBe(1);
    expect(await prisma.gameMapCreature.findMany({ where: { gameSceneId: second }, select: { tokenX: true, tokenY: true, hpMax: true } })).toEqual([{ tokenX: null, tokenY: null, hpMax: expect.any(Number) }]);
    expect(await prisma.gameSceneHeroToken.count({ where: { sceneId: first } })).toBe(1);

    expect(await replaceGameSceneMap(sessionId, gm.id, first, await createMapImage())).toEqual({ ok: true, value: null });
    expect(await prisma.gameSceneHeroToken.count({ where: { sceneId: first } })).toBe(0);
    expect(await replaceGameSceneMap(sessionId, gm.id, first, new Blob(["не картинка"]) as never)).toEqual({ ok: false, error: "bad_image" });
  });

  it("рух токена, що запізнився після перемикання сцени, відхиляється й не лягає на нову сцену", async () => {
    const { gm, player, sessionId } = await createTable();
    const tavern = await createScene(sessionId, gm.id, "Таверна");
    const cave = await createScene(sessionId, gm.id, "Печера");
    expect(await moveGameToken(sessionId, player.id, tavern, await findHeroId(sessionId, player.id), { x: 0.2, y: 0.2 })).toEqual({ ok: true, value: null });
    await activateGameScene(sessionId, gm.id, cave);

    expect(await moveGameToken(sessionId, player.id, tavern, await findHeroId(sessionId, player.id), { x: 0.8, y: 0.8 })).toEqual({ ok: false, error: "scene_changed" });
    expect(await moveGameToken(sessionId, gm.id, tavern, await findHeroId(sessionId, player.id), { x: 0.8, y: 0.8 })).toEqual({ ok: false, error: "scene_changed" });
    expect(await prisma.gameSceneHeroToken.findMany({ select: { sceneId: true, tokenX: true } })).toEqual([{ sceneId: tavern, tokenX: 0.2 }]);
    expect(await moveGameToken(sessionId, player.id, cave, await findHeroId(sessionId, player.id), { x: 0.8, y: 0.8 })).toEqual({ ok: true, value: null });
  });

  it("картинки бібліотеки не видаляються ні з мапою сцени, ні після заміни; власні завантаження видаляються", async () => {
    const { gm, sessionId } = await createTable();
    stored.set("library/maps/forest", new Uint8Array([1]));
    stored.set("library/maps/forest-96.webp", new Uint8Array([1]));
    const created = await createGameScene(sessionId, gm.id, "Ліс", { kind: "library", slug: "forest" });
    if (!created.ok) throw new Error(created.error);
    expect((await seeScenes(sessionId, gm.id)).mapImageUrl).toContain("library/maps/forest");
    expect(await createGameScene(sessionId, gm.id, "Немає", { kind: "library", slug: "no-such-map" })).toEqual({ ok: false, error: "bad_image" });

    await replaceGameSceneMap(sessionId, gm.id, created.value.id, await createMapImage());
    expect(deletedKeys.filter((key) => key.startsWith("library/"))).toEqual([]);
    expect(stored.has("library/maps/forest")).toBe(true);

    await replaceGameSceneMap(sessionId, gm.id, created.value.id, { kind: "library", slug: "forest" });
    expect(deletedKeys.length).toBeGreaterThan(0);
    await deleteGameScene(sessionId, gm.id, created.value.id);
    expect(deletedKeys.filter((key) => key.startsWith("library/"))).toEqual([]);
    expect([...stored.keys()].sort()).toEqual(["library/maps/forest", "library/maps/forest-96.webp"]);
  });
});

describe("перенесення старої кімнати в сцену", () => {
  const sql = readFileSync("db/changes/2026-11-06-game-scenes.sql", "utf8");
  const backfill = sql.slice(sql.indexOf("-- backfill:start"), sql.indexOf("-- backfill:end"));

  it("кімната зі старою мапою, токенами й істотами стає однією активною сценою; повторний прогін нічого не дублює", async () => {
    const { gm, player, sessionId } = await createTable();
    await prisma.$executeRawUnsafe(`UPDATE game_session SET map_image_key = 'games/${sessionId}/map/old' WHERE game_session_id = ${sessionId}`);
    await prisma.$executeRawUnsafe(`UPDATE game_session_member SET token_x = 0.4, token_y = 0.6 WHERE game_session_id = ${sessionId} AND user_id = ${player.id}`);
    const oldCreature = await prisma.gameMapCreature.create({ data: { gameSessionId: sessionId, creatureKey: "goblin", ruleset: "RULES_2014", number: 1, tokenX: 0.1, tokenY: 0.2 } });
    const emptyRoom = await createGameSession(gm.id, "Порожня");
    if (!emptyRoom.ok) throw new Error(emptyRoom.error);

    await prisma.$executeRawUnsafe(backfill.replaceAll(/^-- .*$/gm, ""));
    await prisma.$executeRawUnsafe(backfill.replaceAll(/^-- .*$/gm, ""));

    const scenes = await prisma.gameScene.findMany({ where: { sessionId } });
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({ name: "Сцена 1", mapImageKey: `games/${sessionId}/map/old` });
    expect((await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId } })).activeSceneId).toBe(scenes[0].id);
    expect((await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: oldCreature.id } })).gameSceneId).toBe(scenes[0].id);
    expect(await prisma.gameSceneHeroToken.findMany({ where: { sceneId: scenes[0].id } })).toMatchObject([{ memberId: await findHeroId(sessionId, player.id), tokenX: 0.4, tokenY: 0.6 }]);
    expect(await prisma.gameScene.count({ where: { sessionId: emptyRoom.value.id } })).toBe(0);

    const playerView = await seeScenes(sessionId, player.id);
    expect(playerView.mapImageUrl).toContain(`games/${sessionId}/map/old`);
    expect(playerView.members.find((member) => member.userId === player.id)!.token).toEqual({ x: 0.4, y: 0.6 });
    expect((await seeScenes(sessionId, gm.id)).creatures).toHaveLength(1);
  });
});
