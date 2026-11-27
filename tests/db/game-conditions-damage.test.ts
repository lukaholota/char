import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { GameRoll } from "@/rules/game-roll";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import { changeCreatureConditions, changeHeroConditions, clearBlessedMarks, markBlessedTargets } from "@/server/db/game-conditions";
import { addMapCreatures, changeMapCreatureHitPoints, moveMapCreature, removeMapCreatures, setMapCreatureController, setMapCreatureNameHidden, summonMapCreature } from "@/server/db/game-map-creatures";
import { cancelGameRoll, confirmRollDamage, insertGameRollEvent, listEventsAfter, undoRollDamage, type GameRollDraft } from "@/server/db/game-roll-events";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken } from "@/server/db/game-sessions";
import { createGameScene, moveGameToken, openGameScene } from "@/server/db/game-scenes";
import { setActiveSceneMap } from "./game-scene-setup";
import { applyPersFieldOperation } from "@/server/db/offline-operations";
import { buildHeroDamageOperationId } from "@/rules/game-roll-hero-target";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const buildRoll = (overrides: Partial<GameRoll> = {}): GameRoll => ({ d20Mode: null, modeSources: [], groups: [{ sides: 6, values: [3] }], extra: [], bonus: 0, total: 3, check: null, ...overrides });
const buildD20Roll = (value: number, bonus: number): GameRoll => buildRoll({ d20Mode: "NORMAL", groups: [{ sides: 20, values: [value] }], bonus, total: value + bonus });

function buildDraft(overrides: Partial<GameRollDraft> = {}): GameRollDraft {
  return { idempotencyKey: randomUUID(), visibility: "PUBLIC", source: "FREE", persId: null, label: "Шкода", roll: buildRoll(), rolledAt: new Date(), target: null, ...overrides };
}

/// Гравець бʼє істоту лише з листа: кидок без листа з ціллю — справа майстра.
const buildSheetDraft = (overrides: Partial<GameRollDraft> = {}) => buildDraft({ source: "CHARACTER", ...overrides });

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@combat.test`, name: `${label} Тестовий` } });
}

async function createPers(userId: number) {
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const race = await prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } });
  const background = await prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });
  const pers = await prisma.pers.create({
    data: { userId, name: `Герой ${userId}`, ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  return pers.persId;
}

/// Більшість тестів тут про шкоду, що знімається одразу; перевірку майстром вмикає describe нижче.
async function createTable({ isDamageConfirmedByGm = false } = {}) {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const other = await createUser("other");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  for (const user of [player, other]) {
    await joinGameSessionByToken(inviteToken, user.id);
    await bindMemberPers(sessionId, user.id, await createPers(user.id));
  }
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  await setActiveSceneMap(sessionId, gm.id, new Blob([new Uint8Array(bytes)], { type: "image/png" }));
  await prisma.gameSession.update({ where: { id: sessionId }, data: { houseRules: { isDamageConfirmedByGm } } });
  return { gm, player, other, sessionId };
}

async function placeGoblin(sessionId: number, gmId: number, hp: { max: number; current: number } | null = { max: 10, current: 10 }, creatureKey = "goblin") {
  await addMapCreatures(sessionId, gmId, { creatureKey, ruleset: "RULES_2014", count: 1, customName: null });
  const [creature] = (await findGameSessionView(sessionId, gmId))!.creatures.slice(-1);
  await moveMapCreature(sessionId, gmId, creature.id, { x: 0.4, y: 0.4 });
  await prisma.gameMapCreature.update({ where: { id: creature.id }, data: { hpMax: hp?.max ?? null, hpCurrent: hp?.current ?? null } });
  return creature.id;
}

async function findHeroId(sessionId: number, userId: number) {
  return (await prisma.gameSessionMember.findUniqueOrThrow({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, select: { id: true } })).id;
}

async function findPlayerPersId(sessionId: number, userId: number) {
  return (await prisma.gameSessionMember.findUniqueOrThrow({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, select: { persId: true } })).persId!;
}

const readStoredHitPoints = (creatureId: number) => prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creatureId }, select: { hpMax: true, hpCurrent: true } });

describe("стани на токенах", () => {
  it("майстер міняє стан будь-якої істоти й героя, гравець — лише свого героя", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const poisoned = { kind: "toggle", condition: "poisoned", isActive: true } as const;

    expect(await changeCreatureConditions(sessionId, gm.id, creatureId, poisoned)).toEqual({ ok: true, value: null });
    expect(await changeCreatureConditions(sessionId, player.id, creatureId, poisoned)).toEqual({ ok: false, error: "forbidden" });
    expect(await changeHeroConditions(sessionId, player.id, await findHeroId(sessionId, player.id), poisoned)).toEqual({ ok: true, value: null });
    expect(await changeHeroConditions(sessionId, player.id, await findHeroId(sessionId, other.id), poisoned)).toEqual({ ok: false, error: "forbidden" });
    expect(await changeHeroConditions(sessionId, gm.id, await findHeroId(sessionId, other.id), { kind: "exhaustion", level: 3 })).toEqual({ ok: true, value: null });
    expect(await changeHeroConditions(sessionId, gm.id, await findHeroId(sessionId, gm.id), poisoned)).toEqual({ ok: false, error: "no_map" });
    expect(await changeCreatureConditions(sessionId, gm.id, creatureId + 999, poisoned)).toEqual({ ok: false, error: "creature_gone" });

    const view = (await findGameSessionView(sessionId, player.id))!;
    expect(view.creatures.find((creature) => creature.id === creatureId)!.conditions).toEqual({ conditions: ["poisoned"], exhaustionLevel: 0 });
    expect(view.members.find((member) => member.userId === player.id)!.conditions).toEqual({ conditions: ["poisoned"], exhaustionLevel: 0 });
    expect(view.members.find((member) => member.userId === other.id)!.conditions).toEqual({ conditions: [], exhaustionLevel: 3 });
  });

  it("«Невидимий» ховає токен від інших гравців, а власник і майстер його бачать; невидиму істоту бачить лише майстер", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const heroId = await findHeroId(sessionId, player.id);
    const invisible = { kind: "toggle", condition: "invisible", isActive: true } as const;
    expect(await moveGameToken(sessionId, player.id, (await findGameSessionView(sessionId, player.id))!.viewedSceneId, heroId, { x: 0.3, y: 0.3 })).toEqual({ ok: true, value: null });
    await changeHeroConditions(sessionId, player.id, heroId, invisible);
    await changeCreatureConditions(sessionId, gm.id, creatureId, invisible);

    const findHeroToken = async (viewerId: number) => (await findGameSessionView(sessionId, viewerId))!.members.find((member) => member.heroId === heroId)!.token;
    expect(await findHeroToken(player.id)).toEqual({ x: 0.3, y: 0.3 });
    expect(await findHeroToken(gm.id)).toEqual({ x: 0.3, y: 0.3 });
    expect(await findHeroToken(other.id)).toBeNull();
    expect((await findGameSessionView(sessionId, other.id))!.creatures.some((creature) => creature.id === creatureId)).toBe(false);
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.some((creature) => creature.id === creatureId)).toBe(true);
  });

  it("повторне ввімкнення не дублює стан, вимкнення прибирає, виснаження ставиться рівнем; поганий стан до бази не доходить", async () => {
    const { gm, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const toggle = (condition: string, isActive: boolean) => changeCreatureConditions(sessionId, gm.id, creatureId, { kind: "toggle", condition, isActive } as never);
    await toggle("prone", true);
    await toggle("prone", true);
    await toggle("stunned", true);
    await toggle("stunned", false);
    await changeCreatureConditions(sessionId, gm.id, creatureId, { kind: "exhaustion", level: 6 });
    expect(await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creatureId }, select: { conditions: true, exhaustionLevel: true } })).toEqual({ conditions: ["prone"], exhaustionLevel: 6 });
    await expect(prisma.gameMapCreature.update({ where: { id: creatureId }, data: { exhaustionLevel: 7 } })).rejects.toThrow();
  });

  it("новий вигляд підсвітки замінює попередній, а вимкнення знімає будь-який", async () => {
    const { gm, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const toggle = (condition: string, isActive: boolean) => changeCreatureConditions(sessionId, gm.id, creatureId, { kind: "toggle", condition, isActive } as never);
    const readConditions = async () => (await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creatureId }, select: { conditions: true } })).conditions;
    await toggle("prone", true);
    await toggle("spotlit", true);
    await toggle("spotlit-fire", true);
    expect(await readConditions()).toEqual(["prone", "spotlit-fire"]);
    await toggle("spotlit", false);
    expect(await readConditions()).toEqual(["prone"]);
  });

  it("одночасні зміни різних станів не затирають одна одну", async () => {
    const { gm, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    await Promise.all(["blinded", "charmed", "deafened", "frightened", "grappled"].map((condition) => changeCreatureConditions(sessionId, gm.id, creatureId, { kind: "toggle", condition, isActive: true } as never)));
    const stored = await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creatureId }, select: { conditions: true } });
    expect([...stored.conditions].sort()).toEqual(["blinded", "charmed", "deafened", "frightened", "grappled"]);
  });
});

describe("кидок із ціллю: атака", () => {
  it("натуральна 20 завжди влучає, натуральна 1 завжди мимо, інакше сума проти КЗ; КЗ бачить лише майстер", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const attack = (roll: GameRoll) => insertGameRollEvent(sessionId, player.id, buildSheetDraft({ label: "Атака", roll, target: { creatureId, kind: "attack" } }));
    const results = [await attack(buildD20Roll(20, -10)), await attack(buildD20Roll(1, 30)), await attack(buildD20Roll(10, 5)), await attack(buildD20Roll(10, 4))];
    expect(results.map((result) => (result.ok ? result.value.target?.isHit : "fail"))).toEqual([true, false, true, false]);

    const forPlayer = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, 0, 10);
    expect(forPlayer[0].target).toEqual({ name: "Гоблін", kind: "attack", isHit: true, damage: null, isDowned: false, damageDefenses: [], gm: null });
    expect(JSON.stringify(forPlayer)).not.toMatch(/armorClass|hitPointsBefore/);
    const forGm = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, 0, 10);
    expect(forGm[0].target?.gm).toMatchObject({ armorClass: 15 });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 10 });
  });

  it("кидок без цілі лишається звичайним записом журналу", async () => {
    const { player, gm, sessionId } = await createTable();
    await placeGoblin(sessionId, gm.id);
    const plain = await insertGameRollEvent(sessionId, player.id, buildDraft({ label: "Перевірка", roll: buildD20Roll(12, 3) }));
    expect(plain).toMatchObject({ ok: true, value: { target: null } });
  });
});

describe("кидок із ціллю: шкода", () => {
  it("шкода віднімає хіти одним оновленням і не опускає нижче нуля; гравці бачать лише число шкоди", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 10, current: 4 });
    const damage = (total: number) => insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total }), target: { creatureId, kind: "damage" } }));

    const first = await damage(3);
    expect(first).toMatchObject({ ok: true, value: { target: { name: "Гоблін", kind: "damage", damage: 3, gm: null } } });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 1 });
    await damage(8);
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 0 });
    expect(await prisma.gameRollEvent.findMany({ where: { gameSessionId: sessionId }, orderBy: { seq: "asc" }, select: { hpBefore: true, hpChange: true } })).toEqual([
      { hpBefore: 4, hpChange: 3 },
      { hpBefore: 1, hpChange: 1 },
    ]);

    const forPlayer = JSON.stringify(await listEventsAfter(sessionId, { userId: player.id, isGm: false }, 0, 10));
    expect(forPlayer).not.toMatch(/hitPointsBefore|hitPointsAfter|hpBefore|canUndo/);
    const [gmView] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, 0, 10);
    expect(gmView.target?.gm).toMatchObject({ hitPointsBefore: 4, hitPointsAfter: 1, canUndo: true });
    expect((await findGameSessionView(sessionId, player.id))!.creatures.find((creature) => creature.id === creatureId)).toMatchObject({ hitPoints: null, isDown: true });
  });

  it("приховане майстром імʼя не просочується в журнал: ціль підписана «Невідома істота», а гравець так і бачить токен", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 10, current: 10 });
    expect(await setMapCreatureNameHidden(sessionId, player.id, creatureId, true)).toMatchObject({ ok: false });
    expect(await setMapCreatureNameHidden(sessionId, gm.id, creatureId, true)).toEqual({ ok: true, value: null });

    const hit = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total: 2 }), target: { creatureId, kind: "damage" } }));
    expect(hit).toMatchObject({ ok: true, value: { target: { name: "Невідома істота" } } });
    expect((await findGameSessionView(sessionId, player.id))!.creatures.find((creature) => creature.id === creatureId)).toMatchObject({ label: "Невідома істота" });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.find((creature) => creature.id === creatureId)).toMatchObject({ label: "Гоблін", isNameHidden: true });
  });

  it("істота без збережених хітів стартує з середніх хітів статблока, п'ять одночасних ударів дають рівно п'ять знятих", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, null);
    const results = await Promise.all(Array.from({ length: 5 }, () => insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total: 1 }), target: { creatureId, kind: "damage" } }))));
    expect(results.every((result) => result.ok)).toBe(true);
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 7, hpCurrent: 2 });
  });

  it("імунітет істоти знімає свою частину шкоди, і це видно всім у журналі", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 20, current: 20 }, "skeleton");
    const roll = buildRoll({ groups: [{ sides: 8, values: [5] }], extra: [{ sides: 6, sign: 1, label: "Отрута", value: 4, damageType: "POISON" }], bonus: 3, total: 12, damageType: "SLASHING" });
    const created = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll, target: { creatureId, kind: "damage" } }));
    expect(created).toMatchObject({ ok: true, value: { target: { damage: 8, damageDefenses: [{ damageType: "POISON", defense: "immune", before: 4, after: 0 }] } } });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 20, hpCurrent: 12 });
    const [forPlayer] = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, 0, 1);
    expect(forPlayer.target).toMatchObject({ damage: 8, damageDefenses: [{ defense: "immune" }] });
    expect(forPlayer.roll).not.toHaveProperty("targetDamage");
  });

  it("шкода нульова лишає хіти на місці, і скасовувати нічого", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const created = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total: 0 }), target: { creatureId, kind: "damage" } }));
    expect(created).toMatchObject({ ok: true, value: { target: { damage: 0 } } });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 10 });
    expect(await undoRollDamage(sessionId, gm.id, created.ok ? created.value.seq : 0)).toEqual({ ok: false, error: "not_found" });
  });
});

describe("ціль на межі довіри", () => {
  it("істота з іншої кімнати — відмова, зниклу чи не виставлену на мапу кидок обходить без цілі", async () => {
    const { gm, player, sessionId } = await createTable();
    const foreign = await createTable();
    const foreignCreatureId = await placeGoblin(foreign.sessionId, foreign.gm.id);
    const target = { creatureId: foreignCreatureId, kind: "damage" } as const;
    expect(await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ target }))).toEqual({ ok: false, error: "bad_target" });
    expect(await readStoredHitPoints(foreignCreatureId)).toEqual({ hpMax: 10, hpCurrent: 10 });

    const removedId = await placeGoblin(sessionId, gm.id);
    await removeMapCreatures(sessionId, gm.id, removedId);
    expect(await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ target: { creatureId: removedId, kind: "damage" } }))).toMatchObject({ ok: true, value: { target: null } });

    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, customName: null });
    const unplaced = await prisma.gameMapCreature.findFirstOrThrow({ where: { gameSessionId: sessionId, tokenX: null } });
    expect(await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ target: { creatureId: unplaced.id, kind: "damage" } }))).toMatchObject({ ok: true, value: { target: null } });
    expect((await readStoredHitPoints(unplaced.id)).hpCurrent).toBe(unplaced.hpCurrent);
  });

  it("істота з підготовленої, ще не активної сцени — відмова, і хіти не змінюються", async () => {
    const { gm, player, sessionId } = await createTable();
    const bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#223355" } }).png().toBuffer();
    const prepared = await createGameScene(sessionId, gm.id, "Засідка", { kind: "upload", file: new Blob([new Uint8Array(bytes)], { type: "image/png" }) });
    if (!prepared.ok) throw new Error(prepared.error);
    await openGameScene(sessionId, gm.id, prepared.value.id);
    const hiddenId = await placeGoblin(sessionId, gm.id);
    expect(await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ target: { creatureId: hiddenId, kind: "damage" } }))).toEqual({ ok: false, error: "bad_target" });
    expect(await readStoredHitPoints(hiddenId)).toEqual({ hpMax: 10, hpCurrent: 10 });
  });

  it("повторна відправка того самого кидка не б'є двічі", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    const draft = buildSheetDraft({ roll: buildRoll({ total: 4 }), target: { creatureId, kind: "damage" } });
    await Promise.all([insertGameRollEvent(sessionId, player.id, draft), insertGameRollEvent(sessionId, player.id, draft)]);
    await insertGameRollEvent(sessionId, player.id, draft);
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(6);
  });

  it("таємний кидок із ціллю не показує ціль тим, хто не бачить значень", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id);
    await insertGameRollEvent(sessionId, gm.id, buildDraft({ visibility: "SECRET", roll: buildRoll({ total: 5 }), target: { creatureId, kind: "damage" } }));
    expect(await listEventsAfter(sessionId, { userId: player.id, isGm: false }, 0, 10)).toEqual([]);
    const [seenByGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, 0, 10);
    expect(seenByGm.target).toMatchObject({ damage: 5 });
  });
});

describe("тимчасові хіти істоти", () => {
  const readWithTemp = (creatureId: number) => prisma.gameMapCreature.findUniqueOrThrow({ where: { id: creatureId }, select: { hpCurrent: true, hpTemp: true } });

  it("шкода спершу знімає тимчасові, скасування повертає обидва запаси окремо; гравець тимчасових не бачить", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 10, current: 10 });
    expect(await changeMapCreatureHitPoints(sessionId, gm.id, creatureId, { kind: "set_temp", amount: 5 })).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, gm.id))!.creatures.find((creature) => creature.id === creatureId)?.hitPoints).toEqual({ current: 10, max: 10, temp: 5 });
    expect((await findGameSessionView(sessionId, player.id))!.creatures.find((creature) => creature.id === creatureId)?.hitPoints).toBeNull();

    const damage = async (total: number) => {
      const created = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total }), target: { creatureId, kind: "damage" } }));
      if (!created.ok) throw new Error(created.error);
      return created.value;
    };
    const absorbed = await damage(3);
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 10, hpTemp: 2 });
    const [absorbedForGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, absorbed.seq - 1, 1);
    expect(absorbedForGm.target).toMatchObject({ damage: 3, isDowned: false, gm: { hitPointsBefore: 10, hitPointsAfter: 10, canUndo: true } });
    const through = await damage(6);
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 6, hpTemp: 0 });

    expect(await undoRollDamage(sessionId, gm.id, absorbed.seq)).toMatchObject({ ok: true });
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 6, hpTemp: 3 });
    expect(await undoRollDamage(sessionId, gm.id, through.seq)).toMatchObject({ ok: true });
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 10, hpTemp: 5 });
  });

  it("підтверджена майстром шкода теж іде спершу в тимчасові", async () => {
    const { gm, player, sessionId } = await createTable({ isDamageConfirmedByGm: true });
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 20, current: 20 });
    await changeMapCreatureHitPoints(sessionId, gm.id, creatureId, { kind: "set_temp", amount: 4 });
    const created = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ roll: buildRoll({ total: 9 }), target: { creatureId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    const confirmed = await confirmRollDamage(sessionId, gm.id, created.value.seq, [{ amount: 9, defense: null }]);
    if (!confirmed.ok) throw new Error(confirmed.error);
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 15, hpTemp: 0 });
    await undoRollDamage(sessionId, gm.id, confirmed.value[1].seq);
    expect(await readWithTemp(creatureId)).toEqual({ hpCurrent: 20, hpTemp: 4 });
  });
});

describe("скасування шкоди", () => {
  async function createDamageEvent() {
    const table = await createTable();
    const creatureId = await placeGoblin(table.sessionId, table.gm.id, { max: 10, current: 10 });
    const created = await insertGameRollEvent(table.sessionId, table.player.id, buildSheetDraft({ roll: buildRoll({ total: 6 }), target: { creatureId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    return { ...table, creatureId, seq: created.value.seq };
  }

  it("повертає рівно зняті хіти один раз, далі відмова, далі подія заблокована", async () => {
    const { gm, sessionId, creatureId, seq } = await createDamageEvent();
    const undone = await undoRollDamage(sessionId, gm.id, seq);
    expect(undone).toMatchObject({ ok: true, value: { seq, target: { gm: { canUndo: false, isUndone: true } } } });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 10 });
    expect(await undoRollDamage(sessionId, gm.id, seq)).toEqual({ ok: false, error: "already_undone" });
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(10);
  });

  it("лише майстер, чужий номер події — не знайдено, двоє одночасних кліків повертають хіти один раз", async () => {
    const { gm, player, sessionId, creatureId, seq } = await createDamageEvent();
    expect(await undoRollDamage(sessionId, player.id, seq)).toEqual({ ok: false, error: "forbidden" });
    expect(await undoRollDamage(sessionId, gm.id, seq + 50)).toEqual({ ok: false, error: "not_found" });
    const clicks = await Promise.all([undoRollDamage(sessionId, gm.id, seq), undoRollDamage(sessionId, gm.id, seq), undoRollDamage(sessionId, gm.id, seq)]);
    expect(clicks.filter((click) => click.ok)).toHaveLength(1);
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(10);
  });

  it("не повертає понад максимум і відмовляє, коли істоти вже немає", async () => {
    const { gm, sessionId, creatureId, seq } = await createDamageEvent();
    await changeMapCreatureHitPoints(sessionId, gm.id, creatureId, { kind: "heal", amount: 3 });
    await undoRollDamage(sessionId, gm.id, seq);
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(10);

    const gone = await createDamageEvent();
    await removeMapCreatures(gone.sessionId, gone.gm.id, gone.creatureId);
    expect(await undoRollDamage(gone.sessionId, gone.gm.id, gone.seq)).toEqual({ ok: false, error: "creature_gone" });
  });
});

describe("майстер підтверджує шкоду гравця", () => {
  async function rollPendingDamage() {
    const table = await createTable({ isDamageConfirmedByGm: true });
    const creatureId = await placeGoblin(table.sessionId, table.gm.id, { max: 20, current: 20 });
    const roll = buildRoll({ groups: [{ sides: 6, values: [4] }], extra: [{ sides: 6, sign: 1, label: "Вогонь", value: 5, damageType: "FIRE" }], total: 9, damageType: "SLASHING" });
    const created = await insertGameRollEvent(table.sessionId, table.player.id, buildSheetDraft({ roll, target: { creatureId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    return { ...table, creatureId, seq: created.value.seq };
  }

  it("кидок гравця хітів не знімає; майстер бачить рядки за типами, гравець — лише стан", async () => {
    const { gm, player, sessionId, creatureId, seq } = await rollPendingDamage();
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(20);
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, seq - 1, 1);
    expect(forGm.damageReview).toEqual({ isPending: true, parts: [{ damageType: "SLASHING", label: "", amount: 4, defense: null }, { damageType: "FIRE", label: "Вогонь", amount: 5, defense: null }] });
    const [forPlayer] = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, seq - 1, 1);
    expect(forPlayer.damageReview).toEqual({ isPending: true, parts: [] });
  });

  it("майстер наносить свої числа й захисти рівно раз, і цю шкоду можна повернути", async () => {
    const { gm, player, sessionId, creatureId, seq } = await rollPendingDamage();
    const choices = [{ amount: 4, defense: "vulnerable" }, { amount: 5, defense: "immune" }];
    expect(await confirmRollDamage(sessionId, player.id, seq, choices)).toEqual({ ok: false, error: "forbidden" });
    expect(await confirmRollDamage(sessionId, gm.id, seq, [{ amount: 4, defense: null }])).toEqual({ ok: false, error: "bad_damage" });
    const clicks = await Promise.all([confirmRollDamage(sessionId, gm.id, seq, choices), confirmRollDamage(sessionId, gm.id, seq, choices)]);
    expect(clicks.filter((click) => click.ok)).toHaveLength(1);
    expect(clicks.find((click) => !click.ok)).toEqual({ ok: false, error: "already_confirmed" });
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(12);
    const confirmed = clicks.find((click) => click.ok)!;
    if (!confirmed.ok) throw new Error("no confirm");
    const [original, applied] = confirmed.value;
    expect(original).toMatchObject({ seq, damageReview: { isPending: false } });
    expect(applied).toMatchObject({ confirmsSeq: seq, total: 8, target: { kind: "damage", damage: 8, gm: { hitPointsBefore: 20, hitPointsAfter: 12, canUndo: true } } });
    expect(applied.target!.damageDefenses).toEqual([{ damageType: "SLASHING", defense: "vulnerable", before: 4, after: 8 }, { damageType: "FIRE", defense: "immune", before: 5, after: 0 }]);
    await undoRollDamage(sessionId, gm.id, applied.seq);
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(20);
  });

  it("відхилена шкода хітів не знімає й підтвердити її вже не можна", async () => {
    const { gm, sessionId, creatureId, seq } = await rollPendingDamage();
    expect(await cancelGameRoll(sessionId, gm.id, seq)).toMatchObject({ ok: true });
    expect(await confirmRollDamage(sessionId, gm.id, seq, [{ amount: 4, defense: null }, { amount: 5, defense: null }])).toEqual({ ok: false, error: "already_confirmed" });
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(20);
  });

  it("шкода майстра й кидок «лише мені» не чекають підтвердження", async () => {
    const { gm, player, sessionId } = await createTable({ isDamageConfirmedByGm: true });
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 20, current: 20 });
    const byGm = await insertGameRollEvent(sessionId, gm.id, buildDraft({ roll: buildRoll({ total: 5 }), target: { creatureId, kind: "damage" } }));
    expect(byGm).toMatchObject({ ok: true, value: { target: { damage: 5 } } });
    expect(byGm.ok && byGm.value.damageReview).toBeFalsy();
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(15);
    const onlyMe = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ visibility: "SELF", roll: buildRoll({ total: 3 }), target: { creatureId, kind: "damage" } }));
    expect(onlyMe.ok && onlyMe.value.damageReview).toBeFalsy();
  });
});

describe("зміна хітів майстром", () => {
  it("п'ять одночасних ударів по одному хіту знімають рівно п'ять хітів", async () => {
    const { gm, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 20, current: 20 });
    await Promise.all(Array.from({ length: 5 }, () => changeMapCreatureHitPoints(sessionId, gm.id, creatureId, { kind: "damage", amount: 1 })));
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 20, hpCurrent: 15 });
  });
});

describe("ряткидки зони", () => {
  const burningHands = { engName: "Burning Hands", level: 1, ruleset: "RULES_2014" as const };
  const fire = { ability: "DEX" as const, damageType: "fire" as const, isHalfOnSave: true };

  async function castOnGoblins() {
    const table = await createTable();
    const first = await placeGoblin(table.sessionId, table.gm.id, { max: 10, current: 10 });
    const second = await placeGoblin(table.sessionId, table.gm.id, { max: 10, current: 10 });
    const draft = buildDraft({ source: "CHARACTER", label: "Палючі долоні · Шкода", roll: buildRoll({ groups: [{ sides: 6, values: [3, 3] }], total: 6 }), saves: { creatureIds: [first, second], persIds: [], spell: burningHands, effect: fire, dc: 13 } });
    const created = await insertGameRollEvent(table.sessionId, table.player.id, draft);
    if (!created.ok) throw new Error(created.error);
    return { ...table, first, second, seq: created.value.seq };
  }

  it("кожна істота кидає свій ряткидок: провал знімає всю шкоду, успіх — половину; гравці бачать лише підсумок", async () => {
    const { gm, player, sessionId, first, second, seq } = await castOnGoblins();
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, seq - 1, 1);
    const [forPlayer] = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, seq - 1, 1);
    expect(forGm.saves?.rows).toHaveLength(2);
    for (const [index, creatureId] of [first, second].entries()) {
      const row = forGm.saves!.rows[index];
      expect(row.damage).toBe(row.isSaved ? 3 : 6);
      expect(row.gm).toMatchObject({ bonus: 2, total: row.gm!.d20[0] + 2, hitPointsBefore: 10, hitPointsAfter: 10 - row.damage, canUndo: true });
      expect(row.isSaved).toBe(row.gm!.total >= 13);
      expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 10 - row.damage });
    }
    expect(forPlayer.saves?.rows.every((row) => row.gm === null)).toBe(true);
    expect(forPlayer.roll).not.toHaveProperty("saves");
    expect(forGm.target).toBeNull();
  });

  it("шкода двох типів: половина рахується по кожній групі кубиків, запис несе другий тип", async () => {
    const { gm, player, sessionId } = await createTable();
    const goblin = await placeGoblin(sessionId, gm.id, { max: 40, current: 40 });
    const iceStorm = { ability: "DEX" as const, damageType: "bludgeoning" as const, isHalfOnSave: true, secondDamageType: "cold" as const };
    const roll = buildRoll({ groups: [{ sides: 8, values: [5, 4] }, { sides: 6, values: [6, 3, 2, 4] }], total: 24 });
    const draft = buildDraft({ source: "CHARACTER", label: "Крижаний шторм · Шкода", roll, saves: { creatureIds: [goblin], persIds: [], spell: { engName: "Ice Storm", level: 4, ruleset: "RULES_2014" }, effect: iceStorm, dc: 13 } });
    const created = await insertGameRollEvent(sessionId, player.id, draft);
    if (!created.ok) throw new Error(created.error);
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, created.value.seq - 1, 1);
    const [row] = forGm.saves!.rows;
    expect(forGm.saves).toMatchObject({ damageType: "bludgeoning", secondDamageType: "cold" });
    expect(row.damage).toBe(row.isSaved ? 4 + 7 : 24);
    expect(row.defenses).toEqual([]);
    expect(await readStoredHitPoints(goblin)).toEqual({ hpMax: 40, hpCurrent: 40 - row.damage });
  });

  it("майстер скасовує шкоду одного рядка рівно раз, навіть при одночасних кліках; гравцю не можна", async () => {
    const { gm, player, sessionId, first, second, seq } = await castOnGoblins();
    const secondBefore = await readStoredHitPoints(second);
    expect(await undoRollDamage(sessionId, player.id, seq, 0)).toEqual({ ok: false, error: "forbidden" });
    const clicks = await Promise.all([undoRollDamage(sessionId, gm.id, seq, 0), undoRollDamage(sessionId, gm.id, seq, 0)]);
    expect(clicks.filter((click) => click.ok)).toHaveLength(1);
    expect(clicks.find((click) => !click.ok)).toEqual({ ok: false, error: "already_undone" });
    expect(await readStoredHitPoints(first)).toEqual({ hpMax: 10, hpCurrent: 10 });
    expect(await readStoredHitPoints(second)).toEqual(secondBefore);
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, seq - 1, 1);
    expect(forGm.saves!.rows[0].gm).toMatchObject({ canUndo: false, isUndone: true });
    expect(forGm.saves!.rows[1].gm).toMatchObject({ canUndo: true, isUndone: false });
    expect(await undoRollDamage(sessionId, gm.id, seq, 7)).toEqual({ ok: false, error: "not_found" });
  });

  it("істоти поза мапою зона обходить, а без жодної цілі кидок лишається звичайним", async () => {
    const table = await createTable();
    const draft = buildDraft({ source: "CHARACTER", saves: { creatureIds: [999_999], persIds: [], spell: burningHands, effect: fire, dc: 13 } });
    const created = await insertGameRollEvent(table.sessionId, table.player.id, draft);
    expect(created).toMatchObject({ ok: true, value: { saves: null, target: null } });
  });

  it("зона зачіпає і своїх: герой кидає ряткидок з листа, і хіти одразу знімаються з його листа", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const goblin = await placeGoblin(sessionId, gm.id);
    const allyPersId = await findPlayerPersId(sessionId, other.id);
    const draft = buildDraft({ source: "CHARACTER", label: "Палючі долоні · Шкода", roll: buildRoll({ groups: [{ sides: 6, values: [3, 3] }], total: 6 }), saves: { creatureIds: [goblin], persIds: [allyPersId], spell: burningHands, effect: fire, dc: 13 } });
    const created = await insertGameRollEvent(sessionId, player.id, draft);
    if (!created.ok) throw new Error(created.error);
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, created.value.seq - 1, 1);
    const heroRow = forGm.saves!.rows[1];
    expect(heroRow).toMatchObject({ name: `Герой ${other.id}`, persId: allyPersId });
    expect(heroRow.damage).toBe(heroRow.isSaved ? 3 : 6);
    expect(heroRow.gm).toMatchObject({ bonus: 0, total: heroRow.gm!.d20[0], hitPointsBefore: null, canUndo: false });
    expect(heroRow.isAppliedToSheet).toBe(true);
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: allyPersId }, select: { currentHp: true } })).currentHp).toBe(10 - heroRow.damage);
    const fromOldButton = await applyPersFieldOperation(other.id, { kind: "hp", mode: "damage", amount: heroRow.damage, operationId: buildHeroDamageOperationId(sessionId, created.value.seq, 1), persId: allyPersId, createdAt: new Date().toISOString() });
    expect(fromOldButton).toEqual({ ok: true, duplicate: true });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: allyPersId }, select: { currentHp: true } })).currentHp).toBe(10 - heroRow.damage);
  });
});

describe("ряткидок без шкоди: стан при провалі", () => {
  const frightening = { ability: "WIS" as const, damageType: null, isHalfOnSave: false, condition: "frightened" as const };
  const saveOnlyRoll = buildRoll({ groups: [], total: 0 });

  async function gazeAt(table: Awaited<ReturnType<typeof createTable>>, targets: { creatureIds: number[]; persIds: number[] }, dc: number) {
    const draft = buildDraft({ label: "Погляд · Ряткидок", roll: saveOnlyRoll, saves: { ...targets, spell: null, effect: frightening, dc } });
    const created = await insertGameRollEvent(table.sessionId, table.gm.id, draft);
    if (!created.ok) throw new Error(created.error);
    const [forGm] = await listEventsAfter(table.sessionId, { userId: table.gm.id, isGm: true }, created.value.seq - 1, 1);
    return { seq: created.value.seq, forGm };
  }

  const readCreatureConditions = async (id: number) => (await prisma.gameMapCreature.findUniqueOrThrow({ where: { id }, select: { conditions: true } })).conditions;
  const readHeroConditions = async (sessionId: number, persId: number) => (await prisma.gameSessionMember.findFirstOrThrow({ where: { gameSessionId: sessionId, persId }, select: { conditions: true } })).conditions;

  it("провал накладає стан на істоту й героя, хіти не чіпає; майстер знімає стан скасуванням рядка рівно раз", async () => {
    const table = await createTable();
    const goblin = await placeGoblin(table.sessionId, table.gm.id);
    const allyPersId = await findPlayerPersId(table.sessionId, table.other.id);
    const { seq, forGm } = await gazeAt(table, { creatureIds: [goblin], persIds: [allyPersId] }, 30);
    expect(forGm.saves).toMatchObject({ ability: "WIS", dc: 30, damageType: null });
    expect(forGm.saves!.rows.map((row) => [row.isSaved, row.damage, row.condition, row.gm!.canUndo])).toEqual([[false, 0, "frightened", true], [false, 0, "frightened", true]]);
    expect(await readCreatureConditions(goblin)).toEqual(["frightened"]);
    expect(await readHeroConditions(table.sessionId, allyPersId)).toEqual(["frightened"]);
    expect(await readStoredHitPoints(goblin)).toEqual({ hpMax: 10, hpCurrent: 10 });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: allyPersId }, select: { currentHp: true } })).currentHp).toBe(10);
    const clicks = await Promise.all([undoRollDamage(table.sessionId, table.gm.id, seq, 0), undoRollDamage(table.sessionId, table.gm.id, seq, 0)]);
    expect(clicks.filter((click) => click.ok)).toHaveLength(1);
    expect(await readCreatureConditions(goblin)).toEqual([]);
    expect(await undoRollDamage(table.sessionId, table.gm.id, seq, 1)).toMatchObject({ ok: true });
    expect(await readHeroConditions(table.sessionId, allyPersId)).toEqual([]);
  });

  it("стан, що вже був, скасування не знімає; успіх стану не накладає", async () => {
    const table = await createTable();
    const scared = await placeGoblin(table.sessionId, table.gm.id);
    const brave = await placeGoblin(table.sessionId, table.gm.id);
    await prisma.gameMapCreature.update({ where: { id: scared }, data: { conditions: ["frightened"] } });
    const failed = await gazeAt(table, { creatureIds: [scared], persIds: [] }, 30);
    expect(failed.forGm.saves!.rows[0]).toMatchObject({ condition: "frightened", gm: { canUndo: false } });
    expect(await undoRollDamage(table.sessionId, table.gm.id, failed.seq, 0)).toMatchObject({ ok: false });
    expect(await readCreatureConditions(scared)).toEqual(["frightened"]);
    const saved = await gazeAt(table, { creatureIds: [brave], persIds: [] }, 1);
    expect(saved.forGm.saves!.rows[0]).toMatchObject({ isSaved: true, condition: null, gm: { canUndo: false } });
    expect(await readCreatureConditions(brave)).toEqual([]);
  });
});

describe("«Благословення» на мапі", () => {
  const burningHands = { engName: "Burning Hands", level: 1, ruleset: "RULES_2014" as const };
  const fire = { ability: "DEX" as const, damageType: "fire" as const, isHalfOnSave: true };

  it("гравець благословляє будь-кого в кімнаті, повторно — без дублю; чужий — відмова; кінець концентрації знімає позначки", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const goblin = await placeGoblin(sessionId, gm.id);
    const allyPersId = await findPlayerPersId(sessionId, other.id);
    const stranger = await createUser("stranger");
    const targets = { creatureIds: [goblin], persIds: [allyPersId] };

    expect(await markBlessedTargets(sessionId, stranger.id, targets)).toEqual({ ok: false, error: "not_found" });
    expect(await markBlessedTargets(sessionId, player.id, targets)).toEqual({ ok: true, value: null });
    expect(await markBlessedTargets(sessionId, player.id, targets)).toEqual({ ok: true, value: null });
    const blessed = (await findGameSessionView(sessionId, gm.id))!;
    expect(blessed.creatures.find((creature) => creature.id === goblin)!.conditions.conditions).toEqual(["blessed"]);
    expect(blessed.members.find((member) => member.userId === other.id)!.conditions.conditions).toEqual(["blessed"]);
    expect(blessed.members.find((member) => member.userId === player.id)!.conditions.conditions).toEqual([]);

    await changeCreatureConditions(sessionId, gm.id, goblin, { kind: "toggle", condition: "prone", isActive: true });
    expect(await clearBlessedMarks(sessionId, stranger.id)).toEqual({ ok: false, error: "not_found" });
    expect(await clearBlessedMarks(sessionId, player.id)).toEqual({ ok: true, value: null });
    const cleared = (await findGameSessionView(sessionId, gm.id))!;
    expect(cleared.creatures.find((creature) => creature.id === goblin)!.conditions.conditions).toEqual(["prone"]);
    expect(cleared.members.find((member) => member.userId === other.id)!.conditions.conditions).toEqual([]);
  });

  it("благословенні істота й герой додають к4 до ряткидку зони", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const goblin = await placeGoblin(sessionId, gm.id);
    const plainGoblin = await placeGoblin(sessionId, gm.id);
    const allyPersId = await findPlayerPersId(sessionId, other.id);
    await markBlessedTargets(sessionId, player.id, { creatureIds: [goblin], persIds: [allyPersId] });
    const draft = buildDraft({ source: "CHARACTER", label: "Палючі долоні · Шкода", saves: { creatureIds: [goblin, plainGoblin], persIds: [allyPersId], spell: burningHands, effect: fire, dc: 13 } });
    const created = await insertGameRollEvent(sessionId, player.id, draft);
    if (!created.ok) throw new Error(created.error);
    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, created.value.seq - 1, 1);
    const [blessedGoblin, plain, hero] = forGm.saves!.rows.map((row) => row.gm!);
    for (const row of [blessedGoblin, hero]) {
      expect(row.dice).toHaveLength(1);
      expect(row.dice[0]).toMatchObject({ sides: 4 });
      expect(row.dice[0].value).toBeGreaterThanOrEqual(1);
      expect(row.dice[0].value).toBeLessThanOrEqual(4);
      expect(row.total).toBe(row.d20[0] + row.bonus + row.dice[0].value);
    }
    expect(plain.dice).toEqual([]);
  });
});

describe("удар майстра по герою", () => {
  it("шкода майстра по герою одразу знімається з листа: спершу тимчасові хіти, рівно раз", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    await prisma.pers.update({ where: { persId }, data: { tempHp: 2 } });
    const created = await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "Гоблін · Шкода", roll: buildRoll({ total: 6 }), heroTarget: { persId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    const [forPlayer] = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, created.value.seq - 1, 1);
    expect(forPlayer.heroTarget).toEqual({ persId, name: `Герой ${player.id}`, kind: "damage", damage: 6, healing: null, isHit: null, armorClass: null, isAppliedToSheet: true, damageDefenses: [] });
    expect(forPlayer.roll).not.toHaveProperty("heroTarget");
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true, tempHp: true } })).toEqual({ currentHp: 6, tempHp: 0 });
    const fromSheet = await applyPersFieldOperation(player.id, { kind: "hp", mode: "damage", amount: 6, operationId: buildHeroDamageOperationId(sessionId, created.value.seq), persId, createdAt: new Date().toISOString() });
    expect(fromSheet).toEqual({ ok: true, duplicate: true });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(6);
  });

  it("опір героя ділить навпіл свій тип шкоди, а лист втрачає вже зменшене число", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    const tiefling = await prisma.race.findFirstOrThrow({ where: { name: "TIEFLING_2014" } });
    await prisma.pers.update({ where: { persId }, data: { raceId: tiefling.raceId } });
    const roll = buildRoll({ groups: [{ sides: 6, values: [4] }], extra: [{ sides: 6, sign: 1, label: "Вогонь", value: 5, damageType: "FIRE" }], total: 9, damageType: "PIERCING" });
    const created = await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "Пекельна гонча · Шкода", roll, heroTarget: { persId, kind: "damage" } }));
    expect(created).toMatchObject({ ok: true, value: { heroTarget: { damage: 6, damageDefenses: [{ damageType: "FIRE", defense: "resistant", before: 5, after: 2 }], isAppliedToSheet: true } } });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(4);
  });

  it("атака по герою хітів не знімає — лише шкода", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "Гоблін · Атака", roll: buildD20Roll(18, 4), heroTarget: { persId, kind: "attack" } }));
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(10);
  });

  it("атаку кімната порівнює з КЗ героя: влучання бачать усі, КЗ — лише майстер", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    const attack = (value: number) => insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "Гоблін · Атака", roll: buildD20Roll(value, 0), heroTarget: { persId, kind: "attack" } }));
    const hit = await attack(12);
    const miss = await attack(5);
    if (!hit.ok || !miss.ok) throw new Error("roll failed");
    const forPlayer = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, hit.value.seq - 1, 2);
    const forGm = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, hit.value.seq - 1, 2);
    expect(forPlayer.map((event) => event.heroTarget)).toMatchObject([{ isHit: true, armorClass: null, damage: null }, { isHit: false, armorClass: null }]);
    expect(forGm.map((event) => event.heroTarget?.armorClass)).toEqual([10, 10]);
  });

  it("гравець бʼє союзника з листа (вогонь по своїх), але не кидком без листа", async () => {
    const { player, other, sessionId } = await createTable();
    const allyPersId = await findPlayerPersId(sessionId, other.id);
    const playerPersId = await findPlayerPersId(sessionId, player.id);
    const created = await insertGameRollEvent(sessionId, player.id, buildDraft({ source: "CHARACTER", persId: playerPersId, label: "Пекучий промінь · Атака", roll: buildD20Roll(15, 5), heroTarget: { persId: allyPersId, kind: "attack" } }));
    expect(created).toMatchObject({ ok: true, value: { heroTarget: { persId: allyPersId, isHit: true } } });
  });

  it("гравець лікує союзника з листа: хіти додаються одразу, не понад максимум і рівно раз", async () => {
    const { player, other, sessionId } = await createTable();
    const allyPersId = await findPlayerPersId(sessionId, other.id);
    const playerPersId = await findPlayerPersId(sessionId, player.id);
    await prisma.pers.update({ where: { persId: allyPersId }, data: { currentHp: 3 } });
    const heal = (total: number) => insertGameRollEvent(sessionId, player.id, buildDraft({ source: "CHARACTER", persId: playerPersId, label: "Цілюще слово · Лікування", roll: buildRoll({ total }), heroTarget: { persId: allyPersId, kind: "heal" } }));
    const readHp = async () => (await prisma.pers.findUniqueOrThrow({ where: { persId: allyPersId }, select: { currentHp: true } })).currentHp;

    const first = await heal(5);
    if (!first.ok) throw new Error(first.error);
    expect(first.value.heroTarget).toMatchObject({ kind: "heal", healing: 5, damage: null, isAppliedToSheet: true });
    expect(await readHp()).toBe(8);
    const fromSheet = await applyPersFieldOperation(other.id, { kind: "hp", mode: "heal", amount: 5, operationId: buildHeroDamageOperationId(sessionId, first.value.seq), persId: allyPersId, createdAt: new Date().toISOString() });
    expect(fromSheet).toEqual({ ok: true, duplicate: true });
    expect(await readHp()).toBe(8);
    await heal(9);
    expect(await readHp()).toBe(10);
  });

  it("майстер передає істоту герою: той рухає її, міняє хіти й стани й бʼє з її статблоку; інші — ні, чужим статблоком не вдарити, а повернута — знову лише майстрова", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const familiar = await placeGoblin(sessionId, gm.id);
    const enemy = await placeGoblin(sessionId, gm.id);
    const playerHero = await findHeroId(sessionId, player.id);
    const ok = { ok: true, value: null };
    const forbidden = { ok: false, error: "forbidden" };
    const statblockAttack = (fromCreatureId?: number) => buildDraft({ target: { creatureId: enemy, kind: "damage" }, fromCreatureId });

    expect(await setMapCreatureController(sessionId, player.id, familiar, playerHero)).toEqual(forbidden);
    expect(await setMapCreatureController(sessionId, gm.id, familiar, playerHero)).toEqual(ok);
    expect((await findGameSessionView(sessionId, player.id))!.creatures.find((creature) => creature.id === familiar)).toMatchObject({ creatureKey: "goblin", hitPoints: { max: 10, current: 10 }, controllerHeroId: playerHero });
    expect((await findGameSessionView(sessionId, other.id))!.creatures.find((creature) => creature.id === familiar)).toMatchObject({ creatureKey: null, hitPoints: null, controllerHeroId: null });

    expect(await moveMapCreature(sessionId, player.id, familiar, { x: 0.6, y: 0.6 })).toEqual(ok);
    expect(await changeMapCreatureHitPoints(sessionId, player.id, familiar, { kind: "damage", amount: 3 })).toEqual(ok);
    expect(await changeCreatureConditions(sessionId, player.id, familiar, { kind: "toggle", condition: "prone", isActive: true })).toEqual(ok);
    expect(await moveMapCreature(sessionId, player.id, enemy, { x: 0.6, y: 0.6 })).toEqual(forbidden);
    expect(await moveMapCreature(sessionId, other.id, familiar, { x: 0.1, y: 0.1 })).toEqual(forbidden);
    expect(await insertGameRollEvent(sessionId, player.id, statblockAttack(familiar))).toMatchObject({ ok: true, value: { target: { name: "Гоблін 2", damage: 3 } } });
    expect(await readStoredHitPoints(enemy)).toMatchObject({ hpCurrent: 7 });
    expect(await insertGameRollEvent(sessionId, player.id, statblockAttack())).toEqual(forbidden);
    expect(await insertGameRollEvent(sessionId, player.id, statblockAttack(enemy))).toEqual(forbidden);
    expect(await insertGameRollEvent(sessionId, other.id, statblockAttack(familiar))).toEqual(forbidden);

    expect(await setMapCreatureController(sessionId, gm.id, familiar, null)).toEqual(ok);
    expect(await insertGameRollEvent(sessionId, player.id, statblockAttack(familiar))).toEqual(forbidden);
    expect(await changeMapCreatureHitPoints(sessionId, player.id, familiar, { kind: "heal", amount: 3 })).toEqual(forbidden);
    expect(await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: familiar }, select: { hpCurrent: true, conditions: true, tokenX: true } })).toEqual({ hpCurrent: 7, conditions: ["prone"], tokenX: 0.6 });
  });

  it("керування віддається лише герою з персонажем цієї кімнати; вигнаний гравець повертає істоту майстрові", async () => {
    const { gm, player, sessionId } = await createTable();
    const familiar = await placeGoblin(sessionId, gm.id);
    const stranger = await createTable();
    expect(await setMapCreatureController(sessionId, gm.id, familiar, await findHeroId(stranger.sessionId, stranger.player.id))).toEqual({ ok: false, error: "bad_pers" });
    expect(await setMapCreatureController(sessionId, gm.id, familiar, await findHeroId(sessionId, gm.id))).toEqual({ ok: false, error: "bad_pers" });
    await setMapCreatureController(sessionId, gm.id, familiar, await findHeroId(sessionId, player.id));
    await prisma.gameSessionMember.deleteMany({ where: { gameSessionId: sessionId, userId: player.id } });
    expect((await prisma.gameMapCreature.findUniqueOrThrow({ where: { id: familiar }, select: { controllerMemberId: true } })).controllerMemberId).toBeNull();
  });

  it("гравець закликає фамільяра: сова стає в обраній точці активної сцени й слухається його героя; чужа заклинанню істота й майстер без персонажа — відмова", async () => {
    const { gm, player, other, sessionId } = await createTable();
    const familiar = { spellEngName: "Find Familiar", creatureKey: "owl", position: { x: 0.3, y: 0.7 } };
    expect(await summonMapCreature(sessionId, player.id, familiar)).toEqual({ ok: true, value: { name: "Сова" } });
    expect(await summonMapCreature(sessionId, player.id, { ...familiar, creatureKey: "adult-red-dragon" })).toEqual({ ok: false, error: "bad_creature" });
    expect(await summonMapCreature(sessionId, gm.id, familiar)).toEqual({ ok: false, error: "no_map" });

    const stored = await prisma.gameMapCreature.findFirstOrThrow({ where: { gameSessionId: sessionId }, select: { id: true, tokenX: true, tokenY: true, gameSceneId: true, controllerMemberId: true, hpMax: true } });
    const { activeSceneId } = await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId }, select: { activeSceneId: true } });
    expect(stored).toMatchObject({ gameSceneId: activeSceneId, controllerMemberId: await findHeroId(sessionId, player.id) });
    expect([stored.tokenX, stored.tokenY, stored.hpMax]).toEqual([expect.closeTo(0.3), expect.closeTo(0.7), expect.any(Number)]);
    expect((await findGameSessionView(sessionId, player.id))!.creatures).toMatchObject([{ id: stored.id, creatureKey: "owl" }]);
    expect((await findGameSessionView(sessionId, other.id))!.creatures).toMatchObject([{ id: stored.id, creatureKey: null }]);
    expect(await moveMapCreature(sessionId, player.id, stored.id, { x: 0.5, y: 0.5 })).toEqual({ ok: true, value: null });
    expect(await moveMapCreature(sessionId, other.id, stored.id, { x: 0.1, y: 0.1 })).toEqual({ ok: false, error: "forbidden" });
  });

  it("гравцю цілитися в героя не можна, а чужий персонаж лишає кидок без цілі", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    expect(await insertGameRollEvent(sessionId, player.id, buildDraft({ heroTarget: { persId, kind: "damage" } }))).toEqual({ ok: false, error: "forbidden" });
    expect(await insertGameRollEvent(sessionId, player.id, buildDraft({ target: { creatureId: await placeGoblin(sessionId, gm.id), kind: "damage" } }))).toEqual({ ok: false, error: "forbidden" });
    const outsider = await createUser("outsider");
    const created = await insertGameRollEvent(sessionId, gm.id, buildDraft({ heroTarget: { persId: await createPers(outsider.id), kind: "damage" } }));
    expect(created).toMatchObject({ ok: true, value: { heroTarget: null } });
  });
});

describe("майстер скасовує кидок", () => {
  it("хіти істоти повертаються, у журналі запис для всіх, другий раз — відмова, гравцю заборонено", async () => {
    const { gm, player, sessionId } = await createTable();
    const creatureId = await placeGoblin(sessionId, gm.id, { max: 10, current: 10 });
    const created = await insertGameRollEvent(sessionId, player.id, buildSheetDraft({ label: "Меч · Шкода", roll: buildRoll({ total: 6 }), target: { creatureId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    const seq = created.value.seq;
    expect(await cancelGameRoll(sessionId, player.id, seq)).toEqual({ ok: false, error: "forbidden" });
    const cancelled = await cancelGameRoll(sessionId, gm.id, seq);
    expect(cancelled).toMatchObject({ ok: true, value: [{ seq, isCancelled: true, target: { gm: { isUndone: true } } }, { seq: seq + 1, cancelsSeq: seq, label: "Скасовано: Меч · Шкода" }] });
    expect(await readStoredHitPoints(creatureId)).toEqual({ hpMax: 10, hpCurrent: 10 });
    const forPlayer = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, seq - 1, 5);
    expect(forPlayer.map((event) => [event.seq, event.isCancelled, event.cancelsSeq])).toEqual([[seq, true, undefined], [seq + 1, undefined, seq]]);
    expect(forPlayer[0].roll).not.toHaveProperty("isCancelled");
    expect(await cancelGameRoll(sessionId, gm.id, seq)).toEqual({ ok: false, error: "already_cancelled" });
    expect(await cancelGameRoll(sessionId, gm.id, seq + 1)).toEqual({ ok: false, error: "not_found" });
    expect((await readStoredHitPoints(creatureId)).hpCurrent).toBe(10);
  });

  it("удар по герою лікується назад і лист бачить це як повернені хіти", async () => {
    const { gm, player, sessionId } = await createTable();
    const persId = await findPlayerPersId(sessionId, player.id);
    const created = await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "Гоблін · Шкода", roll: buildRoll({ total: 4 }), heroTarget: { persId, kind: "damage" } }));
    if (!created.ok) throw new Error(created.error);
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(6);
    const cancelled = await cancelGameRoll(sessionId, gm.id, created.value.seq);
    expect(cancelled).toMatchObject({ ok: true, value: [{ isCancelled: true }, { restoredHeroes: [{ persId, name: `Герой ${player.id}`, kind: "heal", amount: 4 }] }] });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(10);
  });

  it("повідомлення в журналі не скасовується", async () => {
    const { gm, sessionId } = await createTable();
    const message = await insertGameRollEvent(sessionId, gm.id, buildDraft({ source: "MESSAGE", label: "Привіт", roll: { ...buildRoll(), groups: [], total: 0 } }));
    if (!message.ok) throw new Error(message.error);
    expect(await cancelGameRoll(sessionId, gm.id, message.value.seq)).toEqual({ ok: false, error: "not_found" });
  });
});
