import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { AREA_LIMITS, type AreaPlacement } from "@/rules/game-areas";
import { FOG_LIMITS } from "@/rules/game-fog";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));
vi.mock("@/lib/refs/map-library-catalog", () => ({
  MAP_LIBRARY: [
    { slug: "crypt", name: "Склеп", originalName: "Crypt", pack: "dndavid", key: "library/maps/crypt", width: 1600, height: 1200, grid: { columns: 32, rows: 24 } },
    { slug: "forest", name: "Ліс", originalName: "Forest", pack: "dndavid", key: "library/maps/forest", width: 1600, height: 1200, grid: null },
  ],
}));

import { activateGameScene, createGameScene, openGameScene, replaceGameSceneMap } from "@/server/db/game-scenes";
import { changeSceneFog, changeSceneGrid, removeSceneAreas, saveSceneArea } from "@/server/db/game-scene-tools";
import { createGameSession, findGameSessionView, joinGameSessionByToken, setGameSessionArchived } from "@/server/db/game-sessions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const grid = { columns: 20, offsetX: 0.25, offsetY: 0, isVisible: true, opacity: 0.35 };
const fireball: AreaPlacement = { shape: "circle", sizeFeet: 20, origin: { x: 0.4, y: 0.6 }, angle: 0, label: "Вогняна куля" };
const rectangle = (isRevealed: boolean) => ({ kind: "area" as const, area: { isRevealed, x: 0.1, y: 0.2, width: 0.3, height: 0.4 } });

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@tools.test`, name: `${label} Тестовий` } });
}

async function createMapImage() {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  return { kind: "upload" as const, file: new Blob([new Uint8Array(bytes)], { type: "image/png" }) };
}

async function createTable() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const other = await createUser("other");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  await joinGameSessionByToken(inviteToken, player.id);
  await joinGameSessionByToken(inviteToken, other.id);
  return { gm, player, other, sessionId };
}

async function createScene(sessionId: number, gmId: number, source?: Parameters<typeof createGameScene>[3]) {
  const created = await createGameScene(sessionId, gmId, "Сцена", source ?? (await createMapImage()));
  if (!created.ok) throw new Error(created.error);
  return created.value.id;
}

const readFogColumn = async (sceneId: number) => (await prisma.$queryRaw<{ fog: unknown; is_null: boolean }[]>`SELECT fog, fog IS NULL AS is_null FROM game_scene WHERE game_scene_id = ${sceneId}`)[0];
const seeRoom = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))!;

describe("сітка сцени", () => {
  it("майстер задає й знімає сітку, гравець не може", async () => {
    const { gm, player, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);

    expect(await changeSceneGrid(sessionId, player.id, sceneId, grid)).toEqual({ ok: false, error: "forbidden" });
    expect((await seeRoom(sessionId, gm.id)).grid).toBeNull();

    expect(await changeSceneGrid(sessionId, gm.id, sceneId, grid)).toEqual({ ok: true, value: null });
    expect((await seeRoom(sessionId, player.id)).grid).toEqual(grid);

    await changeSceneGrid(sessionId, gm.id, sceneId, { ...grid, isVisible: false, opacity: 0.35 });
    expect((await seeRoom(sessionId, gm.id)).grid?.isVisible).toBe(false);

    await changeSceneGrid(sessionId, gm.id, sceneId, null);
    const cleared = await prisma.gameScene.findUniqueOrThrow({ where: { id: sceneId }, select: { gridColumns: true, gridOffsetX: true, gridOffsetY: true, isGridVisible: true } });
    expect(cleared).toEqual({ gridColumns: null, gridOffsetX: 0, gridOffsetY: 0, isGridVisible: true });
    expect((await seeRoom(sessionId, player.id)).grid).toBeNull();
  });

  it("чужа сцена, архівна кімната й нестача прав дають помилку", async () => {
    const { gm, sessionId } = await createTable();
    const foreign = await createTable();
    const foreignScene = await createScene(foreign.sessionId, foreign.gm.id);

    expect(await changeSceneGrid(sessionId, gm.id, foreignScene, grid)).toEqual({ ok: false, error: "bad_scene" });
    expect(await changeSceneFog(sessionId, gm.id, foreignScene, { kind: "cover" })).toEqual({ ok: false, error: "bad_scene" });
    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await changeSceneGrid(sessionId, gm.id, foreignScene, grid)).toEqual({ ok: false, error: "archived" });
  });
});

describe("туман сцени", () => {
  it("сховати все, відкрити ділянку, скасувати, прибрати; гравець не може", async () => {
    const { gm, player, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);

    expect(await changeSceneFog(sessionId, player.id, sceneId, { kind: "cover" })).toEqual({ ok: false, error: "forbidden" });
    expect((await seeRoom(sessionId, gm.id)).fog).toBeNull();

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "cover" });
    expect((await seeRoom(sessionId, player.id)).fog).toEqual({ areas: [] });

    await changeSceneFog(sessionId, gm.id, sceneId, rectangle(true));
    expect((await seeRoom(sessionId, player.id)).fog).toEqual({ areas: [{ isRevealed: true, x: 0.1, y: 0.2, width: 0.3, height: 0.4 }] });

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "undo" });
    expect((await seeRoom(sessionId, gm.id)).fog).toEqual({ areas: [] });

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "clear" });
    expect((await seeRoom(sessionId, player.id)).fog).toBeNull();
  });

  it("«прибрати туман» пише SQL NULL, а не JSON null", async () => {
    const { gm, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "cover" });
    expect((await readFogColumn(sceneId)).is_null).toBe(false);

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "clear" });
    expect(await readFogColumn(sceneId)).toEqual({ fog: null, is_null: true });

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "undo" });
    expect((await readFogColumn(sceneId)).is_null).toBe(true);
  });

  it("зайві ділянки туману не пишуться: fog_limit, а наявні лишаються", async () => {
    const { gm, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    await prisma.gameScene.update({
      where: { id: sceneId },
      data: { fog: { areas: Array.from({ length: FOG_LIMITS.areas }, () => ({ r: true, x: 0, y: 0, w: 0.1, h: 0.1 })) } },
    });

    expect(await changeSceneFog(sessionId, gm.id, sceneId, rectangle(false))).toEqual({ ok: false, error: "fog_limit" });
    expect((await seeRoom(sessionId, gm.id)).fog?.areas).toHaveLength(FOG_LIMITS.areas);
    expect(await changeSceneFog(sessionId, gm.id, sceneId, { kind: "cover" })).toEqual({ ok: true, value: null });
  });
});

describe("області на мапі", () => {
  it("гравець показує область на активній сцені; бачать усі, мапа без оновлення чужих", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);

    const saved = await saveSceneArea(sessionId, player.id, sceneId, null, fireball);
    if (!saved.ok) throw new Error(saved.error);
    const expected = { ...fireball, id: saved.value.id, userId: player.id };
    expect((await seeRoom(sessionId, gm.id)).areas).toEqual([expected]);
    expect((await seeRoom(sessionId, other.id)).areas).toEqual([expected]);

    expect(await saveSceneArea(sessionId, player.id, sceneId, saved.value.id, { ...fireball, sizeFeet: 40, angle: 90 })).toEqual({ ok: true, value: { id: saved.value.id } });
    expect((await seeRoom(sessionId, player.id)).areas).toEqual([{ ...expected, sizeFeet: 40, angle: 90 }]);
  });

  it("гравець не малює на неактивній сцені (scene_changed), а майстер може на будь-якій", async () => {
    const { gm, player, sessionId } = await createTable();
    const active = await createScene(sessionId, gm.id);
    const hidden = await createScene(sessionId, gm.id);

    expect(await saveSceneArea(sessionId, player.id, hidden, null, fireball)).toEqual({ ok: false, error: "scene_changed" });
    expect(await removeSceneAreas(sessionId, player.id, hidden, null)).toEqual({ ok: false, error: "scene_changed" });
    expect(await prisma.gameSceneArea.count()).toBe(0);

    expect((await saveSceneArea(sessionId, gm.id, hidden, null, fireball)).ok).toBe(true);
    await openGameScene(sessionId, gm.id, hidden);
    expect((await seeRoom(sessionId, gm.id)).areas).toHaveLength(1);
    expect((await seeRoom(sessionId, player.id)).areas).toEqual([]);
    expect(active).not.toBe(hidden);
  });

  it("чужу область гравець не змінює й не прибирає, майстер — може; прибрана область дає area_gone", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    const mine = await saveSceneArea(sessionId, player.id, sceneId, null, fireball);
    if (!mine.ok) throw new Error(mine.error);
    const areaId = mine.value.id;

    expect(await saveSceneArea(sessionId, other.id, sceneId, areaId, { ...fireball, sizeFeet: 60 })).toEqual({ ok: false, error: "forbidden" });
    expect(await removeSceneAreas(sessionId, other.id, sceneId, areaId)).toEqual({ ok: false, error: "forbidden" });
    expect(await removeSceneAreas(sessionId, player.id, sceneId, null)).toEqual({ ok: false, error: "forbidden" });
    expect((await prisma.gameSceneArea.findUniqueOrThrow({ where: { id: areaId } })).sizeFeet).toBe(20);

    expect(await saveSceneArea(sessionId, gm.id, sceneId, areaId, { ...fireball, sizeFeet: 60 })).toEqual({ ok: true, value: { id: areaId } });
    expect(await removeSceneAreas(sessionId, gm.id, sceneId, areaId)).toEqual({ ok: true, value: null });
    expect(await removeSceneAreas(sessionId, gm.id, sceneId, areaId)).toEqual({ ok: false, error: "area_gone" });
    expect(await saveSceneArea(sessionId, player.id, sceneId, areaId, fireball)).toEqual({ ok: false, error: "area_gone" });
  });

  it("гравець прибирає свою область, майстер — усі області сцени", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    const mine = await saveSceneArea(sessionId, player.id, sceneId, null, fireball);
    await saveSceneArea(sessionId, other.id, sceneId, null, fireball);
    if (!mine.ok) throw new Error(mine.error);

    await removeSceneAreas(sessionId, player.id, sceneId, mine.value.id);
    expect((await seeRoom(sessionId, gm.id)).areas.map((area) => area.userId)).toEqual([other.id]);
    await saveSceneArea(sessionId, gm.id, sceneId, null, fireball);
    await removeSceneAreas(sessionId, gm.id, sceneId, null);
    expect(await prisma.gameSceneArea.count()).toBe(0);
  });

  it("область з іншої сцени чи кімнати не редагується через чужий sceneId", async () => {
    const { gm, sessionId } = await createTable();
    const foreign = await createTable();
    const first = await createScene(sessionId, gm.id);
    const second = await createScene(sessionId, gm.id);
    const foreignScene = await createScene(foreign.sessionId, foreign.gm.id);
    const onFirst = await saveSceneArea(sessionId, gm.id, first, null, fireball);
    if (!onFirst.ok) throw new Error(onFirst.error);

    expect(await saveSceneArea(sessionId, gm.id, second, onFirst.value.id, fireball)).toEqual({ ok: false, error: "area_gone" });
    expect(await removeSceneAreas(sessionId, gm.id, second, onFirst.value.id)).toEqual({ ok: false, error: "area_gone" });
    expect(await saveSceneArea(sessionId, gm.id, foreignScene, null, fireball)).toEqual({ ok: false, error: "bad_scene" });
    expect(await removeSceneAreas(sessionId, gm.id, foreignScene, null)).toEqual({ ok: true, value: null });
    expect(await prisma.gameSceneArea.count()).toBe(1);
  });

  it("на сцені не більше 30 областей, а в заархівованій кімнаті області не міняються", async () => {
    const { gm, player, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    await prisma.gameSceneArea.createMany({ data: Array.from({ length: AREA_LIMITS.perScene }, () => ({ sceneId, userId: gm.id, shape: "circle", sizeFeet: 5, originX: 0.5, originY: 0.5 })) });

    expect(await saveSceneArea(sessionId, player.id, sceneId, null, fireball)).toEqual({ ok: false, error: "area_limit" });
    const first = await prisma.gameSceneArea.findFirstOrThrow({ orderBy: { id: "asc" } });
    expect((await saveSceneArea(sessionId, gm.id, sceneId, first.id, fireball)).ok).toBe(true);

    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await saveSceneArea(sessionId, player.id, sceneId, null, fireball)).toEqual({ ok: false, error: "archived" });
    expect(await removeSceneAreas(sessionId, gm.id, sceneId, null)).toEqual({ ok: false, error: "archived" });
  });
});

describe("інструменти сцени в стані кімнати", () => {
  it("гравець бачить сітку, туман і області лише активної сцени, майстер — відкритої", async () => {
    const { gm, player, sessionId } = await createTable();
    const active = await createScene(sessionId, gm.id);
    const opened = await createScene(sessionId, gm.id);
    await changeSceneGrid(sessionId, gm.id, active, grid);
    await changeSceneFog(sessionId, gm.id, opened, { kind: "cover" });
    await saveSceneArea(sessionId, gm.id, opened, null, fireball);

    const gmView = await seeRoom(sessionId, gm.id);
    expect(gmView.viewedSceneId).toBe(opened);
    expect([gmView.grid, gmView.fog, gmView.areas.length]).toEqual([null, { areas: [] }, 1]);
    const playerView = await seeRoom(sessionId, player.id);
    expect([playerView.grid, playerView.fog, playerView.areas]).toEqual([grid, null, []]);

    await activateGameScene(sessionId, gm.id, opened);
    const switched = await seeRoom(sessionId, player.id);
    expect([switched.grid, switched.fog, switched.areas.length]).toEqual([null, { areas: [] }, 1]);
  });

  it("кімната без сцен віддає порожні інструменти", async () => {
    const { gm, sessionId } = await createTable();
    const view = await seeRoom(sessionId, gm.id);
    expect([view.grid, view.fog, view.areas]).toEqual([null, null, []]);
  });
});

describe("нова мапа скидає геометрію", () => {
  it("бібліотечна мапа з сіткою ставить її одразу, без сітки — лишає порожньою", async () => {
    const { gm, sessionId } = await createTable();
    const crypt = await createScene(sessionId, gm.id, { kind: "library", slug: "crypt" });
    expect((await seeRoom(sessionId, gm.id)).grid).toEqual({ columns: 32, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 });
    const forest = await createScene(sessionId, gm.id, { kind: "library", slug: "forest" });
    await openGameScene(sessionId, gm.id, forest);
    expect((await seeRoom(sessionId, gm.id)).grid).toBeNull();
    expect(crypt).not.toBe(forest);
  });

  it("завантажена мапа не має сітки", async () => {
    const { gm, sessionId } = await createTable();
    await createScene(sessionId, gm.id);
    expect((await seeRoom(sessionId, gm.id)).grid).toBeNull();
  });

  it("заміна мапи прибирає сітку, туман і області та ставить сітку нової бібліотечної мапи", async () => {
    const { gm, player, sessionId } = await createTable();
    const sceneId = await createScene(sessionId, gm.id);
    await changeSceneGrid(sessionId, gm.id, sceneId, grid);
    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "cover" });
    await saveSceneArea(sessionId, player.id, sceneId, null, fireball);

    expect(await replaceGameSceneMap(sessionId, gm.id, sceneId, await createMapImage())).toEqual({ ok: true, value: null });
    const reset = await seeRoom(sessionId, gm.id);
    expect([reset.grid, reset.fog, reset.areas]).toEqual([null, null, []]);
    expect((await readFogColumn(sceneId)).is_null).toBe(true);

    await changeSceneFog(sessionId, gm.id, sceneId, { kind: "cover" });
    await saveSceneArea(sessionId, gm.id, sceneId, null, fireball);
    await replaceGameSceneMap(sessionId, gm.id, sceneId, { kind: "library", slug: "crypt" });
    const library = await seeRoom(sessionId, gm.id);
    expect([library.grid, library.fog, library.areas]).toEqual([{ columns: 32, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 }, null, []]);
  });
});
