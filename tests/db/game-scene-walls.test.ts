import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildWall, WALL_LIMITS, type WallLine } from "@/rules/game-walls";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import { changeSceneOpening, editSceneWalls } from "@/server/db/game-scene-walls";
import { createGameScene } from "@/server/db/game-scenes";
import { createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const at = (x: number, y: number) => ({ x, y });
const room = buildWall([at(0.1, 0.1), at(0.5, 0.1), at(0.5, 0.5), at(0.1, 0.5), at(0.1, 0.1)]);
const door: WallLine = { kind: "door", isOpen: false, lock: "none", isCurtained: false, points: [at(0.2, 0.7), at(0.3, 0.7)] };
const locked: WallLine = { ...door, lock: "locked", points: [at(0.6, 0.7), at(0.7, 0.7)] };
const secret: WallLine = { ...door, lock: "secret", points: [at(0.6, 0.8), at(0.7, 0.8)] };
const window: WallLine = { ...door, kind: "window", points: [at(0.6, 0.9), at(0.7, 0.9)] };

async function createTable() {
  const [gm, player] = await Promise.all(["gm", "player"].map((label) => prisma.user.create({ data: { email: `${label}-${randomUUID()}@walls.test`, name: label } })));
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, player.id);
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  const scene = await createGameScene(sessionId, gm.id, "Сцена", { kind: "upload", file: new Blob([new Uint8Array(bytes)], { type: "image/png" }) });
  if (!scene.ok) throw new Error(scene.error);
  return { gm, player, sessionId, sceneId: scene.value.id };
}

async function addWalls(table: Awaited<ReturnType<typeof createTable>>, added: WallLine[], removedIds: number[] = []) {
  const edited = await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds, added });
  if (!edited.ok) throw new Error(edited.error);
  return edited.value.ids;
}

const see = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))!.walls;

describe("стіни сцени", () => {
  it("майстер ставить стіни, двері й вікна; гравець бачить секретні двері як стіну", async () => {
    const table = await createTable();
    expect(await editSceneWalls(table.sessionId, table.player.id, table.sceneId, { removedIds: [], added: [room] })).toEqual({ ok: false, error: "forbidden" });

    const [roomId, doorId, lockedId, secretId, windowId] = await addWalls(table, [room, door, locked, secret, window]);
    expect(await see(table.sessionId, table.gm.id)).toEqual([{ ...room, id: roomId }, { ...door, id: doorId }, { ...locked, id: lockedId }, { ...secret, id: secretId }, { ...window, id: windowId }]);
    expect(await see(table.sessionId, table.player.id)).toEqual([{ ...room, id: roomId }, { ...door, id: doorId }, { ...locked, id: lockedId }, { ...buildWall(secret.points), id: secretId }, { ...window, id: windowId }]);

    expect((await changeSceneOpening(table.sessionId, table.gm.id, table.sceneId, secretId, { isOpen: true })).ok).toBe(true);
    expect((await see(table.sessionId, table.player.id)).map((wall) => wall.id)).toEqual([roomId, doorId, lockedId, windowId]);
  });

  it("гравець відчиняє лише звичайні двері й не міняє ні виду дверей, ні штор", async () => {
    const table = await createTable();
    const [roomId, doorId, lockedId, secretId, windowId] = await addWalls(table, [room, door, locked, secret, window]);
    const playerChanges = (wallId: number, change: Parameters<typeof changeSceneOpening>[4]) => changeSceneOpening(table.sessionId, table.player.id, table.sceneId, wallId, change);

    expect(await playerChanges(doorId, { isOpen: true })).toEqual({ ok: true, value: null });
    expect(await playerChanges(lockedId, { isOpen: true })).toEqual({ ok: false, error: "door_locked" });
    expect(await playerChanges(secretId, { isOpen: true })).toEqual({ ok: false, error: "wall_gone" });
    expect(await playerChanges(windowId, { isOpen: true })).toEqual({ ok: false, error: "wall_gone" });
    expect(await playerChanges(roomId, { isOpen: true })).toEqual({ ok: false, error: "wall_gone" });
    expect(await playerChanges(doorId, { lock: "locked" })).toEqual({ ok: false, error: "forbidden" });
    expect(await playerChanges(windowId, { isCurtained: true })).toEqual({ ok: false, error: "forbidden" });
    expect((await see(table.sessionId, table.gm.id)).map((wall) => [wall.id, wall.isOpen, wall.lock, wall.isCurtained])).toEqual([
      [roomId, false, "none", false], [doorId, true, "none", false], [lockedId, false, "locked", false], [secretId, false, "secret", false], [windowId, false, "none", false],
    ]);
  });

  it("майстер відмикає двері, засуває штору й не ставить штору дверям чи замок вікну", async () => {
    const table = await createTable();
    const [roomId, , lockedId, , windowId] = await addWalls(table, [room, door, locked, secret, window]);
    const gmChanges = (wallId: number, change: Parameters<typeof changeSceneOpening>[4]) => changeSceneOpening(table.sessionId, table.gm.id, table.sceneId, wallId, change);

    expect(await gmChanges(lockedId, { lock: "none", isOpen: true })).toEqual({ ok: true, value: null });
    expect(await gmChanges(windowId, { isCurtained: true, isOpen: true })).toEqual({ ok: true, value: null });
    expect(await gmChanges(lockedId, { isCurtained: true })).toEqual({ ok: false, error: "wall_gone" });
    expect(await gmChanges(windowId, { lock: "secret" })).toEqual({ ok: false, error: "wall_gone" });
    expect(await gmChanges(roomId, { isOpen: true })).toEqual({ ok: false, error: "wall_gone" });
    const walls = await see(table.sessionId, table.gm.id);
    expect(walls.find((wall) => wall.id === lockedId)).toMatchObject({ lock: "none", isOpen: true });
    expect(walls.find((wall) => wall.id === windowId)).toMatchObject({ isCurtained: true, isOpen: true });
  });

  it("одна правка прибирає стіну й ставить на її місце частини з дверима", async () => {
    const table = await createTable();
    const [roomId] = await addWalls(table, [room]);
    const parts: WallLine[] = [
      buildWall([at(0.1, 0.1), at(0.2, 0.1)]),
      buildWall([at(0.3, 0.1), at(0.5, 0.1)]),
      { ...door, points: [at(0.2, 0.1), at(0.3, 0.1)] },
    ];
    const ids = await addWalls(table, parts, [roomId]);
    expect((await see(table.sessionId, table.gm.id)).map((wall) => wall.id)).toEqual(ids);
  });

  it("переповнена сцена відмовляє й не губить стін, які правка мала прибрати", async () => {
    const table = await createTable();
    const long = buildWall(Array.from({ length: 40 }, (_, index) => at(index / 40, 0.9)));
    const ids = await addWalls(table, Array.from({ length: 10 }, () => long));
    const remaining = WALL_LIMITS.segmentsPerScene - 390;
    const tooLong: WallLine = { ...long, points: long.points.slice(0, remaining + 2) };

    expect(await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [], added: [tooLong] })).toEqual({ ok: false, error: "wall_limit" });
    expect(await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [ids[0]], added: [long, tooLong] })).toEqual({ ok: false, error: "wall_limit" });
    expect(await prisma.gameSceneWall.count({ where: { sceneId: table.sceneId } })).toBe(10);
    expect((await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [ids[0]], added: [tooLong] })).ok).toBe(true);
  });
});
