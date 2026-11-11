import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { LIGHT_LIMITS } from "@/rules/game-lighting";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import { addMapCreatures, setMapCreatureLight } from "@/server/db/game-map-creatures";
import { removeSceneLights, saveSceneLight, setSceneLighting } from "@/server/db/game-scene-lighting";
import { moveGameToken, replaceGameSceneMap, setHeroDarkvision, setHeroTokenLight } from "@/server/db/game-scenes";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { setActiveSceneMap } from "./game-scene-setup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const torch = { at: { x: 0.3, y: 0.4 }, brightFeet: 20, dimFeet: 20, isOn: true };

async function createMapImage() {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#223344" } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

/// Герой гравця — дворф: темний зір 60 фт приходить з рис виду.
async function createPers(userId: number) {
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const race = await prisma.race.findFirstOrThrow({ where: { traits: { some: { feature: { darkvisionRange: 60, ruleset: "RULES_2014" } } } } });
  const background = await prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });
  const pers = await prisma.pers.create({
    data: { userId, name: "Борін", ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  return pers.persId;
}

async function createTable() {
  const [gm, player, other] = await Promise.all(["gm", "player", "other"].map((label) => prisma.user.create({ data: { email: `${label}-${randomUUID()}@light.test`, name: label } })));
  const created = await createGameSession(gm.id, "Підземелля");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  for (const user of [player, other]) await joinGameSessionByToken(inviteToken, user.id);
  await bindMemberPers(sessionId, player.id, await createPers(player.id));
  await setActiveSceneMap(sessionId, gm.id, await createMapImage());
  const sceneId = (await findGameSessionView(sessionId, gm.id))!.viewedSceneId!;
  const heroId = (await prisma.gameSessionMember.findFirstOrThrow({ where: { gameSessionId: sessionId, userId: player.id, heroSlot: 0 }, select: { id: true } })).id;
  return { gm, player, other, sessionId, sceneId, heroId };
}

const findHero = async (sessionId: number, viewerId: number, heroId: number) => (await findGameSessionView(sessionId, viewerId))!.members.find((member) => member.heroId === heroId)!;

describe("освітлення сцени", () => {
  it("майстер вмикає темряву й ставить світло; гравець не може й не бачить вимкнених джерел; нова мапа все скидає", async () => {
    const { gm, player, sessionId, sceneId } = await createTable();
    expect((await findGameSessionView(sessionId, player.id))!.lighting).toBe("off");
    expect(await setSceneLighting(sessionId, player.id, sceneId, "dark")).toEqual({ ok: false, error: "forbidden" });
    expect(await saveSceneLight(sessionId, player.id, sceneId, null, torch)).toEqual({ ok: false, error: "forbidden" });

    expect(await setSceneLighting(sessionId, gm.id, sceneId, "dark")).toEqual({ ok: true, value: null });
    const lit = await saveSceneLight(sessionId, gm.id, sceneId, null, torch);
    const candle = await saveSceneLight(sessionId, gm.id, sceneId, null, { ...torch, brightFeet: 5, dimFeet: 5 });
    if (!lit.ok || !candle.ok) throw new Error("light not saved");
    expect(await saveSceneLight(sessionId, gm.id, sceneId, candle.value.id, { ...torch, brightFeet: 5, dimFeet: 5, isOn: false })).toEqual({ ok: true, value: { id: candle.value.id } });

    const playerView = (await findGameSessionView(sessionId, player.id))!;
    expect(playerView.lighting).toBe("dark");
    expect(playerView.lights).toEqual([{ id: lit.value.id, at: torch.at, brightFeet: 20, dimFeet: 20, isOn: true }]);
    expect((await findGameSessionView(sessionId, gm.id))!.lights.map((light) => light.isOn)).toEqual([true, false]);

    expect(await removeSceneLights(sessionId, gm.id, sceneId, [candle.value.id])).toEqual({ ok: true, value: null });
    expect(await saveSceneLight(sessionId, gm.id, sceneId, candle.value.id, torch)).toEqual({ ok: false, error: "light_gone" });

    expect(await replaceGameSceneMap(sessionId, gm.id, sceneId, { kind: "upload", file: await createMapImage() })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!).toMatchObject({ lighting: "off", lights: [] });
  });

  it("на сцені не більше джерел світла, ніж ліміт", async () => {
    const { gm, sessionId, sceneId } = await createTable();
    await prisma.gameSceneLight.createMany({ data: Array.from({ length: LIGHT_LIMITS.perScene }, () => ({ sceneId, x: 0.5, y: 0.5, brightFeet: 5, dimFeet: 5 })) });
    expect(await saveSceneLight(sessionId, gm.id, sceneId, null, torch)).toEqual({ ok: false, error: "light_limit" });
  });

  it("смолоскип героєві дає його гравець або майстер; темний зір — з листа, перебиває лише майстер", async () => {
    const { gm, player, other, sessionId, sceneId, heroId } = await createTable();
    const light = { brightFeet: 20, dimFeet: 20 };
    expect(await setHeroTokenLight(sessionId, player.id, sceneId, heroId, light)).toEqual({ ok: false, error: "no_map" });
    await moveGameToken(sessionId, player.id, sceneId, heroId, { x: 0.2, y: 0.2 });
    expect((await findHero(sessionId, player.id, heroId)).darkvisionFeet).toBe(60);

    expect(await setHeroTokenLight(sessionId, other.id, sceneId, heroId, light)).toEqual({ ok: false, error: "forbidden" });
    expect(await setHeroTokenLight(sessionId, player.id, sceneId, heroId, light)).toEqual({ ok: true, value: null });
    expect((await findHero(sessionId, other.id, heroId)).light).toEqual(light);

    expect(await setHeroDarkvision(sessionId, player.id, sceneId, heroId, 120)).toEqual({ ok: false, error: "forbidden" });
    expect(await setHeroDarkvision(sessionId, gm.id, sceneId, heroId, 0)).toEqual({ ok: true, value: null });
    expect((await findHero(sessionId, player.id, heroId)).darkvisionFeet).toBe(0);
    await setHeroDarkvision(sessionId, gm.id, sceneId, heroId, null);
    expect((await findHero(sessionId, player.id, heroId)).darkvisionFeet).toBe(60);
  });

  it("світло істоті ставить лише майстер", async () => {
    const { gm, player, sessionId } = await createTable();
    const added = await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null });
    if (!added.ok) throw new Error(added.error);
    const creatureId = (await findGameSessionView(sessionId, gm.id))!.creatures[0].id;
    expect(await setMapCreatureLight(sessionId, player.id, creatureId, { brightFeet: 20, dimFeet: 20 })).toEqual({ ok: false, error: "forbidden" });
    expect(await setMapCreatureLight(sessionId, gm.id, creatureId, { brightFeet: 0, dimFeet: 10 })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].light).toEqual({ brightFeet: 0, dimFeet: 10 });
  });
});
