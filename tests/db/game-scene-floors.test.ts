import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
const deleted = vi.hoisted(() => [] as string[]);
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async (key: string) => void deleted.push(key),
}));

import { parseSignal } from "@/server/db/game-session-signals";
import { setSceneAmbience, setSceneAtmosphere } from "@/server/db/game-scene-atmosphere";
import { DEFAULT_ATMOSPHERE } from "@/rules/game-atmosphere";
import { addFloorPlan, changeSceneFloors } from "@/server/db/game-scene-floors";
import { addMapCreatures, moveMapCreature } from "@/server/db/game-map-creatures";
import { moveGameToken } from "@/server/db/game-scenes";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { addOwnSound, deleteOwnSound, findOwnSounds, isOwnSound } from "@/server/db/user-sounds";
import { OWN_SOUND_LIMITS } from "@/rules/game-atmosphere";
import { setActiveSceneMap } from "./game-scene-setup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(async () => {
  deleted.length = 0;
  await resetUserData();
});
afterAll(disconnectDatabase);

async function createImage(width: number, height: number) {
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#223344" } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function createPers(userId: number) {
  const [cls, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
  ]);
  const pers = await prisma.pers.create({ data: { userId, name: "Ліра", ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
  return pers.persId;
}

async function createTable() {
  const [gm, player] = await Promise.all(["gm", "player"].map((label) => prisma.user.create({ data: { email: `${label}-${randomUUID()}@floors.test`, name: label } })));
  const created = await createGameSession(gm.id, "Вежа");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, player.id);
  await bindMemberPers(sessionId, player.id, await createPers(player.id));
  await setActiveSceneMap(sessionId, gm.id, await createImage(800, 600));
  const sceneId = (await findGameSessionView(sessionId, gm.id))!.viewedSceneId!;
  const heroId = (await prisma.gameSessionMember.findFirstOrThrow({ where: { gameSessionId: sessionId, userId: player.id, heroSlot: 0 }, select: { id: true } })).id;
  return { gm, player, sessionId, sceneId, heroId };
}

describe("поверхи сцени", () => {
  it("майстер додає поверх і план, токени стають на нього, а прибраний поверх спускає їх на мапу", async () => {
    const { gm, player, sessionId, sceneId, heroId } = await createTable();
    expect(await changeSceneFloors(sessionId, player.id, sceneId, { kind: "add", direction: "up" })).toEqual({ ok: false, error: "forbidden" });
    expect(await changeSceneFloors(sessionId, gm.id, sceneId, { kind: "add", direction: "up" })).toEqual({ ok: true, value: null });

    const plan = await addFloorPlan(sessionId, gm.id, sceneId, await createImage(400, 200), { at: { x: 0.5, y: 0.5 }, widthCells: 6, aspect: 2, rotation: 0, name: null, isHidden: false, sortOrder: 0, floor: 1 });
    expect(plan.ok).toBe(true);
    expect((await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null })).ok).toBe(true);
    const creature = await prisma.gameMapCreature.findFirstOrThrow({ where: { gameSceneId: sceneId }, select: { id: true } });
    expect(await moveGameToken(sessionId, player.id, sceneId, heroId, { x: 0.5, y: 0.5 }, 1)).toEqual({ ok: true, value: null });
    expect(await moveMapCreature(sessionId, gm.id, creature.id, { x: 0.5, y: 0.5 }, 1)).toEqual({ ok: true, value: null });

    const view = (await findGameSessionView(sessionId, player.id))!;
    expect(view.floors).toEqual([{ id: 1, name: "Поверх 2" }]);
    expect(view.shownFloor).toBe(1);
    expect(view.objects).toEqual([expect.objectContaining({ floor: 1, aspect: 2, widthCells: 6 })]);
    expect(view.members.find((member) => member.heroId === heroId)?.floor).toBe(1);

    expect(await changeSceneFloors(sessionId, gm.id, sceneId, { kind: "remove", id: 1 })).toEqual({ ok: true, value: null });
    const after = (await findGameSessionView(sessionId, player.id))!;
    expect(after).toMatchObject({ floors: [], shownFloor: null, objects: [] });
    expect(after.members.find((member) => member.heroId === heroId)?.floor).toBeNull();
    expect((await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creature.id }, select: { floor: true } })).floor).toBeNull();
    expect(deleted.length).toBeGreaterThan(0);
    expect(deleted.every((key) => key.startsWith(`games/${sessionId}/floors/`))).toBe(true);
  });

  it("не показує поверх, якого немає, і не додає понад межу", async () => {
    const { gm, sessionId, sceneId } = await createTable();
    expect(await changeSceneFloors(sessionId, gm.id, sceneId, { kind: "show", id: 2 })).toEqual({ ok: false, error: "bad_floor" });
    for (let index = 0; index < 6; index += 1) await changeSceneFloors(sessionId, gm.id, sceneId, { kind: "add", direction: index % 2 ? "down" : "up" });
    expect(await changeSceneFloors(sessionId, gm.id, sceneId, { kind: "add", direction: "up" })).toEqual({ ok: false, error: "floor_limit" });
  });
});

describe("погода й звуки сцени", () => {
  it("майстер ставить погоду, відтінок і фон, гравець бачить їх, але змінити не може", async () => {
    const { gm, player, sessionId, sceneId } = await createTable();
    expect(await setSceneAtmosphere(sessionId, player.id, sceneId, { ...DEFAULT_ATMOSPHERE, weather: "snow", tint: "night" })).toEqual({ ok: false, error: "forbidden" });
    expect(await setSceneAtmosphere(sessionId, gm.id, sceneId, { ...DEFAULT_ATMOSPHERE, weather: "snow", weatherSpeed: 150, tint: "custom", tintColor: "#22c55e", tintStrength: 60 })).toEqual({ ok: true, value: null });
    expect(await setSceneAmbience(sessionId, gm.id, sceneId, [{ key: "sea", volume: 60 }])).toEqual({ ok: true, value: null });
    expect(await findGameSessionView(sessionId, player.id)).toMatchObject({ atmosphere: { weather: "snow", weatherSpeed: 150, tint: "custom", tintColor: "#22c55e", tintStrength: 60 }, ambience: [{ key: "sea", volume: 60 }] });
    expect(await setSceneAmbience(sessionId, gm.id, sceneId, [])).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, player.id))!.ambience).toEqual([]);
  });

  it("сигнал звуку несе лише відомий ефект", () => {
    expect(parseSignal(JSON.stringify({ s: 7, k: "sound", u: 1, c: 3, n: "thunder" }))).toEqual({ sessionId: 7, wake: { soundUserId: 1, sceneId: 3, key: "thunder" } });
    expect(parseSignal(JSON.stringify({ s: 7, k: "sound", u: 1, c: 3, n: "own:5" }))).toBeNull();
    const ownKey = "own:0b6f3c1e-8a2d-4c4e-9f00-1234567890ab";
    expect(parseSignal(JSON.stringify({ s: 7, k: "sound", u: 1, c: 3, n: ownKey }))).toEqual({ sessionId: 7, wake: { soundUserId: 1, sceneId: 3, key: ownKey } });
    expect(parseSignal(JSON.stringify({ s: 7, k: "sound", u: 1, n: "thunder" }))).toBeNull();
  });
});

const MP3 = new Blob([new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0])], { type: "audio/mpeg" });

async function uploadSound(userId: number, fileName: string) {
  const added = await addOwnSound(userId, MP3, fileName);
  if ("error" in added) throw new Error(added.error);
  return added.sound;
}

describe("свої звуки майстра", () => {
  it("бібліотека приймає лише звуковий файл і тримає межу", async () => {
    const { gm } = await createTable();
    expect(await uploadSound(gm.id, "dragon_roar.mp3")).toMatchObject({ name: "dragon roar" });
    expect(await addOwnSound(gm.id, new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])]), "virus.mp3")).toEqual({ error: "Підходять лише MP3, M4A або WAV" });
    expect(await addOwnSound(gm.id, new Blob([new Uint8Array(OWN_SOUND_LIMITS.bytes + 1)]), "big.mp3")).toEqual({ error: "Файл завеликий — до 5 МБ" });
    await prisma.userSound.createMany({ data: Array.from({ length: OWN_SOUND_LIMITS.perUser - 1 }, (_, index) => ({ userId: gm.id, name: `${index}`, audioKey: `own:${randomUUID()}` })) });
    expect(await addOwnSound(gm.id, MP3, "one-more.mp3")).toEqual({ error: "У бібліотеці вже 20 звуків — видаліть непотрібний" });
  });

  it("фоном грає лише свій звук, а видалений зникає зі сцени й зі сховища", async () => {
    const { gm, player, sessionId, sceneId } = await createTable();
    const own = await uploadSound(gm.id, "tavern.m4a");
    const stranger = await uploadSound(player.id, "laugh.wav");
    expect(await setSceneAmbience(sessionId, gm.id, sceneId, [{ key: stranger.key, volume: 60 }])).toEqual({ ok: false, error: "sound_gone" });
    expect(await setSceneAmbience(sessionId, gm.id, sceneId, [{ key: "rain", volume: 25 }, { key: own.key, volume: 60 }])).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, player.id))!.ambience).toEqual([{ key: "rain", volume: 25 }, { key: own.key, volume: 60 }]);

    await deleteOwnSound(player.id, own.key);
    expect(await isOwnSound(gm.id, own.key)).toBe(true);

    await deleteOwnSound(gm.id, own.key);
    expect(await findOwnSounds(gm.id)).toEqual([]);
    expect((await findGameSessionView(sessionId, player.id))!.ambience).toEqual([{ key: "rain", volume: 25 }]);
    expect(deleted).toContain(own.key.replace("own:", "scene-sounds/"));
  });
});
