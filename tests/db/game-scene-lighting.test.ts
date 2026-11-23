import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LIGHT_LOOK, LIGHT_LIMITS } from "@/rules/game-lighting";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import { addMapCreatures, moveMapCreature, setMapCreatureLight, setMapCreatureBorderColor } from "@/server/db/game-map-creatures";
import { startCombat } from "@/server/db/game-combat";
import { removeSceneLights, saveSceneLight, setDarkvisionLook, setSceneLighting } from "@/server/db/game-scene-lighting";
import { moveGameToken, replaceGameSceneMap, setHeroDarkvision, setHeroTokenLight } from "@/server/db/game-scenes";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { setActiveSceneMap } from "./game-scene-setup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const torch = { at: { x: 0.3, y: 0.4 }, brightFeet: 20, dimFeet: 20, isOn: true, look: DEFAULT_LIGHT_LOOK };

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
    expect(playerView.lights).toEqual([{ id: lit.value.id, at: torch.at, brightFeet: 20, dimFeet: 20, isOn: true, look: DEFAULT_LIGHT_LOOK }]);
    expect((await findGameSessionView(sessionId, gm.id))!.lights.map((light) => light.isOn)).toEqual([true, false]);

    const lantern = { ...torch, look: { color: "#38bdf8", coneDegrees: 60, directionDegrees: 90, effect: "flicker" as const, flickerSpeed: 50 } };
    const saved = await saveSceneLight(sessionId, gm.id, sceneId, null, lantern);
    if (!saved.ok) throw new Error("lantern not saved");
    expect((await findGameSessionView(sessionId, gm.id))!.lights.find((light) => light.id === saved.value.id)?.look).toEqual(lantern.look);
    expect((await findGameSessionView(sessionId, player.id))!.lights.find((light) => light.id === saved.value.id)?.look).toEqual(lantern.look);
    const { flickerSpeed: _speed, ...defaultSpeed } = lantern.look;
    expect(await saveSceneLight(sessionId, gm.id, sceneId, saved.value.id, { ...lantern, look: defaultSpeed })).toMatchObject({ ok: true });
    expect((await findGameSessionView(sessionId, player.id))!.lights.find((light) => light.id === saved.value.id)?.look).toEqual(defaultSpeed);
    await removeSceneLights(sessionId, gm.id, sceneId, [saved.value.id]);

    expect(await removeSceneLights(sessionId, gm.id, sceneId, [candle.value.id])).toEqual({ ok: true, value: null });
    expect(await saveSceneLight(sessionId, gm.id, sceneId, candle.value.id, torch)).toEqual({ ok: false, error: "light_gone" });

    expect(await replaceGameSceneMap(sessionId, gm.id, sceneId, { kind: "upload", file: await createMapImage() })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!).toMatchObject({ lighting: "off", lights: [] });
  });

  it("стиль темного зору для всієї кампанії міняє лише майстер", async () => {
    const { gm, player, sessionId } = await createTable();
    expect((await findGameSessionView(sessionId, player.id))!.darkvisionLook).toBe("grey");
    expect(await setDarkvisionLook(sessionId, player.id, "heat")).toEqual({ ok: false, error: "forbidden" });
    expect(await setDarkvisionLook(sessionId, gm.id, "heat")).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, player.id))!.darkvisionLook).toBe("heat");
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

    await prisma.pers.updateMany({ where: { userId: player.id }, data: { houseRules: { darkvisionRange: 90 } } });
    expect((await findHero(sessionId, player.id, heroId)).darkvisionFeet).toBe(90);
  });

  it("світло істоті ставить лише майстер", async () => {
    const { gm, player, sessionId } = await createTable();
    const added = await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, customName: null });
    if (!added.ok) throw new Error(added.error);
    const creatureId = (await findGameSessionView(sessionId, gm.id))!.creatures[0].id;
    expect(await setMapCreatureLight(sessionId, player.id, creatureId, { brightFeet: 20, dimFeet: 20 })).toEqual({ ok: false, error: "forbidden" });
    expect(await setMapCreatureLight(sessionId, gm.id, creatureId, { brightFeet: 0, dimFeet: 10 })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].light).toEqual({ brightFeet: 0, dimFeet: 10 });
  });

  it("майстер змінює колір обводки уже розміщеної істоти під час бою", async () => {
    const { gm, player, sessionId } = await createTable();
    expect(await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, customName: null })).toMatchObject({ ok: true });
    const creatureId = (await findGameSessionView(sessionId, gm.id))!.creatures[0].id;
    await moveMapCreature(sessionId, gm.id, creatureId, { x: 0.4, y: 0.5 });
    expect(await startCombat(sessionId, gm.id)).toMatchObject({ ok: true });
    const combatants = await prisma.gameCombatant.findMany({ where: { gameSessionId: sessionId } });
    expect(combatants.some((entry) => entry.gameMapCreatureId === creatureId)).toBe(true);
    expect(await setMapCreatureBorderColor(sessionId, player.id, creatureId, "green")).toEqual({ ok: false, error: "forbidden" });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].borderColor).toBeNull();
    for (const borderColor of ["green", "red", null] as const) {
      expect(await setMapCreatureBorderColor(sessionId, gm.id, creatureId, borderColor)).toMatchObject({ ok: true });
      expect((await findGameSessionView(sessionId, player.id))!.creatures).toContainEqual(expect.objectContaining({ id: creatureId, borderColor }));
    }
    expect(await prisma.gameCombatant.findMany({ where: { gameSessionId: sessionId } })).toEqual(combatants);
  });
});
