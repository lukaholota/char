import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { WALL_LIMITS, type WallLine } from "@/rules/game-walls";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import { editSceneWalls, setSceneDoorOpen } from "@/server/db/game-scene-walls";
import { createGameScene } from "@/server/db/game-scenes";
import { createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const at = (x: number, y: number) => ({ x, y });
const room: WallLine = { kind: "wall", isOpen: false, points: [at(0.1, 0.1), at(0.5, 0.1), at(0.5, 0.5), at(0.1, 0.5), at(0.1, 0.1)] };
const door: WallLine = { kind: "door", isOpen: false, points: [at(0.2, 0.7), at(0.3, 0.7)] };

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

const see = async (sessionId: number, userId: number) => {
  const view = (await findGameSessionView(sessionId, userId))!;
  return { walls: view.walls, sightLines: view.sightLines };
};

describe("стіни сцени", () => {
  it("майстер обводить кімнату з дверима; гравець не може й не бачить, що з ліній — двері", async () => {
    const table = await createTable();
    expect(await editSceneWalls(table.sessionId, table.player.id, table.sceneId, { removedIds: [], added: [room] })).toEqual({ ok: false, error: "forbidden" });

    const [roomId, doorId] = await addWalls(table, [room, door]);
    expect((await see(table.sessionId, table.gm.id)).walls).toEqual([{ ...room, id: roomId }, { ...door, id: doorId }]);
    expect(await see(table.sessionId, table.player.id)).toEqual({ walls: [], sightLines: [room.points, door.points] });

    expect(await setSceneDoorOpen(table.sessionId, table.player.id, table.sceneId, doorId, true)).toEqual({ ok: false, error: "forbidden" });
    expect(await setSceneDoorOpen(table.sessionId, table.gm.id, table.sceneId, doorId, true)).toEqual({ ok: true, value: null });
    expect((await see(table.sessionId, table.player.id)).sightLines).toEqual([room.points]);
    expect(await setSceneDoorOpen(table.sessionId, table.gm.id, table.sceneId, roomId, true)).toEqual({ ok: false, error: "wall_gone" });
  });

  it("одна правка прибирає стіну й ставить на її місце частини з дверима", async () => {
    const table = await createTable();
    const [roomId] = await addWalls(table, [room]);
    const parts: WallLine[] = [
      { kind: "wall", isOpen: false, points: [at(0.1, 0.1), at(0.2, 0.1)] },
      { kind: "wall", isOpen: false, points: [at(0.3, 0.1), at(0.5, 0.1)] },
      { kind: "door", isOpen: false, points: [at(0.2, 0.1), at(0.3, 0.1)] },
    ];
    const ids = await addWalls(table, parts, [roomId]);
    expect((await see(table.sessionId, table.gm.id)).walls.map((wall) => wall.id)).toEqual(ids);
  });

  it("переповнена сцена відмовляє й не губить стін, які правка мала прибрати", async () => {
    const table = await createTable();
    const long: WallLine = { kind: "wall", isOpen: false, points: Array.from({ length: 40 }, (_, index) => at(index / 40, 0.9)) };
    const ids = await addWalls(table, Array.from({ length: 10 }, () => long));
    const remaining = WALL_LIMITS.segmentsPerScene - 390;
    const tooLong: WallLine = { ...long, points: long.points.slice(0, remaining + 2) };

    expect(await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [], added: [tooLong] })).toEqual({ ok: false, error: "wall_limit" });
    expect(await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [ids[0]], added: [long, tooLong] })).toEqual({ ok: false, error: "wall_limit" });
    expect(await prisma.gameSceneWall.count({ where: { sceneId: table.sceneId } })).toBe(10);
    expect((await editSceneWalls(table.sessionId, table.gm.id, table.sceneId, { removedIds: [ids[0]], added: [tooLong] })).ok).toBe(true);
  });
});
