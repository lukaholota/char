import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAllCreatures } from "@/lib/bestiaryData";
import { buildHomebrewCreatureKey } from "@/lib/logic/homebrew-catalog";
import { disconnectDatabase, resetUserData } from "../user-data";

const stored = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array) => void stored.set(key, bytes),
  deleteMediaObject: async (key: string) => void stored.delete(key),
}));

import {
  bindMemberPers,
  createGameSession,
  findGameSessionView,
  joinGameSessionByToken,
  setGameSessionArchived,
} from "@/server/db/game-sessions";
import { moveGameToken } from "@/server/db/game-scenes";
import { setActiveSceneMap } from "./game-scene-setup";
import { addMapCreatures, changeMapCreatureHitPoints, moveMapCreature, removeMapCreatures, renameMapCreature, setCreatureNameMode, setMapCreatureSize } from "@/server/db/game-map-creatures";
import { openGameSessionStream } from "@/server/game-sessions/game-session-stream";

vi.setConfig({ testTimeout: 60_000 });

const findViewedScene = async (sessionId: number, userId: number) => (await findGameSessionView(sessionId, userId))?.viewedSceneId ?? null;

beforeEach(async () => {
  stored.clear();
  await resetUserData();
});
afterAll(disconnectDatabase);

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@map.test`, name: `${label} Тестовий` } });
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
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function createTableWithHeroes() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const other = await createUser("other");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  for (const user of [player, other]) {
    await joinGameSessionByToken(inviteToken, user.id);
    await bindMemberPers(sessionId, user.id, await createPers(user.id, `Герой ${user.id}`));
  }
  return { gm, player, other, sessionId };
}

const findToken = async (sessionId: number, viewerId: number, tokenUserId: number) =>
  (await findGameSessionView(sessionId, viewerId))!.members.find((member) => member.userId === tokenUserId)!.token;

describe("мапа кімнати", () => {
  it("мапу ставить лише майстер; нова мапа прибирає стару картинку й повертає токени в ряд", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    expect(await setActiveSceneMap(sessionId, player.id, await createMapImage())).toEqual({ ok: false, error: "forbidden" });
    expect((await findGameSessionView(sessionId, player.id))!.mapImageUrl).toBeNull();

    expect(await setActiveSceneMap(sessionId, gm.id, await createMapImage())).toEqual({ ok: true, value: null });
    const firstUrl = (await findGameSessionView(sessionId, player.id))!.mapImageUrl!;
    expect(firstUrl).toMatch(new RegExp(`/games/${sessionId}/map/[0-9a-f-]+\\.webp$`));
    expect([...stored.keys()]).toHaveLength(1);
    await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, { x: 0.4, y: 0.6 });

    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    expect((await findGameSessionView(sessionId, player.id))!.mapImageUrl).not.toBe(firstUrl);
    expect([...stored.keys()]).toHaveLength(1);
    expect(await findToken(sessionId, player.id, player.id)).toBeNull();

    expect(await setActiveSceneMap(sessionId, gm.id, new Blob(["не картинка"]))).toEqual({ ok: false, error: "bad_image" });
    expect(stored.size).toBe(1);
  });

  it("гравець рухає лише свій токен, майстер — будь-який, а без мапи, персонажа чи в архіві токен стоїть", async () => {
    const { gm, player, other, sessionId } = await createTableWithHeroes();
    expect(await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "no_map" });
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());

    expect(await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, { x: 0.25, y: 0.75 })).toEqual({ ok: true, value: null });
    expect(await findToken(sessionId, other.id, player.id)).toEqual({ x: 0.25, y: 0.75 });
    expect(await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), other.id, { x: 0.1, y: 0.1 })).toEqual({ ok: false, error: "forbidden" });
    expect(await moveGameToken(sessionId, gm.id, await findViewedScene(sessionId, gm.id), other.id, { x: 0.9, y: 0.1 })).toEqual({ ok: true, value: null });
    expect(await findToken(sessionId, other.id, other.id)).toEqual({ x: 0.9, y: 0.1 });
    expect(await moveGameToken(sessionId, gm.id, await findViewedScene(sessionId, gm.id), gm.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "no_map" });

    await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, null);
    expect(await findToken(sessionId, gm.id, player.id)).toBeNull();

    await bindMemberPers(sessionId, other.id, null);
    expect(await findToken(sessionId, gm.id, other.id)).toBeNull();

    const outsider = await createUser("outsider");
    expect(await moveGameToken(sessionId, outsider.id, await findViewedScene(sessionId, outsider.id), player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "not_found" });
    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "archived" });
    expect(await setActiveSceneMap(sessionId, gm.id, await createMapImage())).toEqual({ ok: false, error: "archived" });
  });

  it("рух токена приходить іншим учасникам тим самим потоком кімнати", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    const abort = new AbortController();
    const reader = openGameSessionStream({ sessionId, userId: gm.id, afterSeq: null, abortSignal: abort.signal }).getReader();
    const decoder = new TextDecoder();
    let text = "";
    const readUntil = async (needle: string) => {
      while (!text.includes(needle)) text += decoder.decode((await reader.read()).value, { stream: true });
    };
    await readUntil("event: ready");

    await moveGameToken(sessionId, player.id, await findViewedScene(sessionId, player.id), player.id, { x: 0.3, y: 0.7 });
    await readUntil('"token":{"x":0.3,"y":0.7}');
    abort.abort();
  });

  it("істот кличе лише майстер на мапу; номери беруть найменші вільні, а гравці бачать лише поставлених", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    const goblins = { creatureKey: "goblin", ruleset: "RULES_2014" as const, count: 2, isAlly: false, customName: null };
    expect(await addMapCreatures(sessionId, gm.id, goblins)).toEqual({ ok: false, error: "no_map" });
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    expect(await addMapCreatures(sessionId, player.id, goblins)).toEqual({ ok: false, error: "forbidden" });
    expect(await addMapCreatures(sessionId, gm.id, { ...goblins, creatureKey: "no-such-beast" })).toEqual({ ok: false, error: "bad_creature" });

    expect(await addMapCreatures(sessionId, gm.id, { ...goblins, count: 3 })).toEqual({ ok: true, value: { name: "Гоблін" } });
    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin-boss", ruleset: "RULES_2014", count: 1, isAlly: true, customName: null });
    const [first, second] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.map((creature) => creature.label)).toEqual(["Гоблін 1", "Гоблін 2", "Гоблін 3", "Гоблін-ватажок"]);
    await removeMapCreatures(sessionId, gm.id, second.id);
    await addMapCreatures(sessionId, gm.id, { ...goblins, count: 1 });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.map((creature) => creature.badge)).toEqual([1, 3, null, 2]);

    expect((await findGameSessionView(sessionId, player.id))!.creatures).toEqual([]);
    expect(await moveMapCreature(sessionId, player.id, first.id, { x: 0.3, y: 0.4 })).toEqual({ ok: false, error: "forbidden" });
    expect(await moveMapCreature(sessionId, gm.id, first.id, { x: 0.3, y: 0.4 })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, player.id))!.creatures).toMatchObject([{ id: first.id, label: "Гоблін 1", token: { x: 0.3, y: 0.4 } }]);
    expect(await removeMapCreatures(sessionId, player.id, first.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await moveMapCreature(sessionId, gm.id, second.id, { x: 0.1, y: 0.1 })).toEqual({ ok: false, error: "creature_gone" });
  });

  it("на мапі не більше 40 істот; «прибрати всіх» очищує сцену, а нова мапа знімає істот з мапи", async () => {
    const { gm, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    const goblins = { creatureKey: "goblin", ruleset: "RULES_2014" as const, count: 10, isAlly: false, customName: null };
    for (let batch = 0; batch < 4; batch++) await addMapCreatures(sessionId, gm.id, goblins);
    expect(await addMapCreatures(sessionId, gm.id, { ...goblins, count: 1 })).toEqual({ ok: false, error: "creature_limit" });
    expect(await removeMapCreatures(sessionId, gm.id, null)).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures).toEqual([]);

    await addMapCreatures(sessionId, gm.id, { ...goblins, count: 2 });
    await moveMapCreature(sessionId, gm.id, (await findGameSessionView(sessionId, gm.id))!.creatures[0].id, { x: 0.5, y: 0.5 });
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.map((creature) => creature.token)).toEqual([null, null]);
  });

  it("гравці не отримують статблок жодної істоти, лише назву; розмір і показ імен змінює лише майстер", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    const shadows = { creatureKey: "goblin", ruleset: "RULES_2014" as const, count: 2, isAlly: false, customName: "Тінь" };
    expect(await addMapCreatures(sessionId, gm.id, shadows)).toEqual({ ok: true, value: { name: "Тінь" } });
    await addMapCreatures(sessionId, gm.id, { ...shadows, count: 1, customName: null });
    const gmCreatures = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect(gmCreatures.map((creature) => [creature.label, creature.statblockName])).toEqual([["Тінь 1", "Гоблін"], ["Тінь 2", "Гоблін"], ["Гоблін", null]]);

    for (const creature of gmCreatures) await moveMapCreature(sessionId, gm.id, creature.id, { x: 0.5, y: 0.5 });
    const [hidden, , plain] = (await findGameSessionView(sessionId, player.id))!.creatures;
    expect(hidden).toMatchObject({ label: "Тінь 1", creatureKey: null, statblockName: null, imageUrl: "/images/creatures/2014/goblin.webp" });
    expect(plain).toMatchObject({ label: "Гоблін", creatureKey: null });

    expect(await setMapCreatureSize(sessionId, player.id, hidden.id, "huge")).toEqual({ ok: false, error: "forbidden" });
    expect(await setMapCreatureSize(sessionId, gm.id, hidden.id, "huge")).toEqual({ ok: true, value: null });
    expect(await setCreatureNameMode(sessionId, player.id, "full")).toEqual({ ok: false, error: "forbidden" });
    expect(await setCreatureNameMode(sessionId, gm.id, "full")).toEqual({ ok: true, value: null });
    const seenByPlayer = (await findGameSessionView(sessionId, player.id))!;
    expect([seenByPlayer.creatureNameMode, seenByPlayer.creatures[0].tokenSize, seenByPlayer.creatures[2].tokenSize]).toEqual(["full", "huge", "small"]);

    expect(await renameMapCreature(sessionId, player.id, hidden.id, null)).toEqual({ ok: false, error: "forbidden" });
    expect(await renameMapCreature(sessionId, gm.id, hidden.id, null)).toEqual({ ok: true, value: null });
    expect(await renameMapCreature(sessionId, gm.id, plain.id, "Тінь")).toEqual({ ok: true, value: null });
    const renamed = (await findGameSessionView(sessionId, player.id))!.creatures;
    expect(renamed.map((creature) => [creature.label, creature.creatureKey])).toEqual([["Гоблін", null], ["Тінь 2", null], ["Тінь 1", null]]);
    expect(await renameMapCreature(sessionId, gm.id, 999_999, null)).toEqual({ ok: false, error: "creature_gone" });
  });

  it("кожна копія кидає свої хіти; майстер бачить числа, гравці — лише чи повалена істота", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 10, isAlly: false, customName: null });
    const stored = await prisma.gameMapCreature.findMany({ where: { gameSessionId: sessionId }, select: { hpMax: true, hpCurrent: true } });
    expect(stored).toHaveLength(10);
    for (const { hpMax, hpCurrent } of stored) {
      expect(hpMax).toBeGreaterThanOrEqual(2);
      expect(hpMax).toBeLessThanOrEqual(12);
      expect(hpCurrent).toBe(hpMax);
    }

    const [target] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    await moveMapCreature(sessionId, gm.id, target.id, { x: 0.5, y: 0.5 });
    const { max } = target.hitPoints!;
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, target.id, { kind: "damage", amount: 1 })).toEqual({ ok: true, value: null });

    const seenByPlayer = (await findGameSessionView(sessionId, player.id))!;
    expect(seenByPlayer.creatures).toMatchObject([{ id: target.id, hitPoints: null, isDown: false }]);
    expect(JSON.stringify(seenByPlayer)).not.toMatch(/hpMax|hpCurrent|"current"/);

    await changeMapCreatureHitPoints(sessionId, gm.id, target.id, { kind: "damage", amount: 500 });
    expect((await findGameSessionView(sessionId, player.id))!.creatures[0]).toMatchObject({ hitPoints: null, isDown: true });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].hitPoints).toEqual({ current: 0, max });
  });

  it("власна хоумбрю-істота стає на стіл зі своєю назвою й хітами", async () => {
    const { gm, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    const goblin = getAllCreatures("RULES_2014").find((creature) => creature.nameEng === "Goblin")!;
    const entry = await prisma.homebrewEntry.create({ data: { kind: "CREATURE", authorUserId: gm.id, ruleset: "RULES_2014", name: "Болотний гоблін" } });
    await prisma.homebrewCreature.create({
      data: { homebrewEntryId: entry.homebrewEntryId, engName: "Bog goblin", size: goblin.size, type: goblin.type, challenge: goblin.challenge, statBlock: { ...goblin, name: "Болотний гоблін", hp: "20 (3к8 + 7)" } },
    });

    const creatureKey = buildHomebrewCreatureKey(entry.homebrewEntryId);
    expect(await addMapCreatures(sessionId, gm.id, { creatureKey, ruleset: "RULES_2014", count: 1, isAlly: false, customName: null })).toEqual({ ok: true, value: { name: "Болотний гоблін" } });

    const [placed] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect(placed).toMatchObject({ label: "Болотний гоблін", creatureKey });
    expect(placed.hitPoints!.max).toBeGreaterThanOrEqual(10);
    expect(placed.hitPoints!.max).toBeLessThanOrEqual(31);
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, placed.id, { kind: "damage", amount: 3 })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].hitPoints).toEqual({ current: placed.hitPoints!.max - 3, max: placed.hitPoints!.max });
  });

  it("хіти міняє лише майстер: шкода не нижче нуля, лікування не вище максимуму, новий максимум підрізає поточні", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null });
    const [creature] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    const readHitPoints = async () => (await findGameSessionView(sessionId, gm.id))!.creatures[0].hitPoints;

    expect(await changeMapCreatureHitPoints(sessionId, player.id, creature.id, { kind: "damage", amount: 1 })).toEqual({ ok: false, error: "forbidden" });
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, creature.id + 999, { kind: "damage", amount: 1 })).toEqual({ ok: false, error: "creature_gone" });

    await changeMapCreatureHitPoints(sessionId, gm.id, creature.id, { kind: "set_max", amount: 20 });
    expect((await readHitPoints())!.max).toBe(20);
    await changeMapCreatureHitPoints(sessionId, gm.id, creature.id, { kind: "heal", amount: 100 });
    expect(await readHitPoints()).toEqual({ current: 20, max: 20 });
    await changeMapCreatureHitPoints(sessionId, gm.id, creature.id, { kind: "damage", amount: 8 });
    expect(await readHitPoints()).toEqual({ current: 12, max: 20 });
    await changeMapCreatureHitPoints(sessionId, gm.id, creature.id, { kind: "set_max", amount: 5 });
    expect(await readHitPoints()).toEqual({ current: 5, max: 5 });
    await changeMapCreatureHitPoints(sessionId, gm.id, creature.id, { kind: "damage", amount: 9 });
    expect(await readHitPoints()).toEqual({ current: 0, max: 5 });
  });

  it("стара істота без збережених хітів бере середнє зі статблоку; без числа в статблоці хіти спершу задають", async () => {
    const { gm, sessionId } = await createTableWithHeroes();
    await setActiveSceneMap(sessionId, gm.id, await createMapImage());
    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: null });
    await prisma.gameMapCreature.updateMany({ where: { gameSessionId: sessionId }, data: { hpMax: null, hpCurrent: null } });
    const [legacy] = (await findGameSessionView(sessionId, gm.id))!.creatures;
    expect(legacy).toMatchObject({ hitPoints: { current: 7, max: 7 }, isDown: false });
    await changeMapCreatureHitPoints(sessionId, gm.id, legacy.id, { kind: "damage", amount: 3 });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures[0].hitPoints).toEqual({ current: 4, max: 7 });

    const unknown = await prisma.gameMapCreature.create({ data: { gameSessionId: sessionId, creatureKey: "no-such-beast", ruleset: "RULES_2014", number: 1 } });
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, unknown.id, { kind: "damage", amount: 1 })).toEqual({ ok: false, error: "no_hit_points" });
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, unknown.id, { kind: "set_max", amount: 9 })).toEqual({ ok: true, value: null });
  });
});
