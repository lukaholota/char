import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async () => undefined,
  deleteMediaObject: async () => undefined,
}));

import type { GameRoll } from "@/rules/game-roll";
import { findMemberSpellbook } from "@/server/db/game-area-spells";
import { changeHeroConditions } from "@/server/db/game-conditions";
import { advanceCombatTurn, endOwnCombatTurn, startCombat } from "@/server/db/game-combat";
import { insertGameRollEvent } from "@/server/db/game-roll-events";
import { moveGameToken } from "@/server/db/game-scenes";
import {
  bindMemberPers,
  createGameSession,
  findGameSessionView,
  GAME_SESSION_LIMITS,
  joinGameSessionByToken,
  leaveGameSession,
  listGameSessionsForUser,
  removeGameSessionMember,
  setRoomHeroCutout,
  toggleRoomHero,
} from "@/server/db/game-sessions";
import { setActiveSceneMap } from "./game-scene-setup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@heroes.test`, name: `${label} Тестовий` } });
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
  const firstPersId = await createPers(player.id, "Арвен");
  const secondPersId = await createPers(player.id, "Боромир");
  await toggleRoomHero(sessionId, player.id, firstPersId);
  await toggleRoomHero(sessionId, player.id, secondPersId);
  return { gm, player, other, sessionId, inviteToken, firstPersId, secondPersId };
}

async function setUpMap(sessionId: number, gmId: number) {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  await setActiveSceneMap(sessionId, gmId, new Blob([new Uint8Array(bytes)], { type: "image/png" }));
  return (await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId }, select: { activeSceneId: true } })).activeSceneId!;
}

async function findHero(sessionId: number, viewerId: number, persId: number) {
  const view = await findGameSessionView(sessionId, viewerId);
  return view!.members.find((member) => member.persId === persId)!;
}

const countRows = (sessionId: number, userId: number) => prisma.gameSessionMember.count({ where: { gameSessionId: sessionId, userId } });

describe("склад героїв гравця", () => {
  it("перший герой лягає на рядок людини, другий — на новий слот, повторний дотик знімає", async () => {
    const { player, sessionId, firstPersId, secondPersId } = await createTable();
    const view = (await findGameSessionView(sessionId, player.id))!;
    expect(view.myPersIds).toEqual([firstPersId, secondPersId]);
    expect(view.myPersId).toBe(firstPersId);
    expect(await countRows(sessionId, player.id)).toBe(2);

    expect(await toggleRoomHero(sessionId, player.id, secondPersId)).toEqual({ ok: true, value: null });
    expect((await findGameSessionView(sessionId, player.id))!.myPersIds).toEqual([firstPersId]);
    expect(await countRows(sessionId, player.id)).toBe(1);
  });

  it("зняття першого героя лишає людину в кімнаті, а наступний займає звільнений рядок", async () => {
    const { player, sessionId, firstPersId, secondPersId } = await createTable();
    await toggleRoomHero(sessionId, player.id, firstPersId);
    const view = (await findGameSessionView(sessionId, player.id))!;
    expect(view.myPersIds).toEqual([secondPersId]);
    expect(view.myRole).toBe("PLAYER");

    const third = await createPers(player.id, "Гімлі");
    await toggleRoomHero(sessionId, player.id, third);
    expect(await countRows(sessionId, player.id)).toBe(2);
    expect((await findGameSessionView(sessionId, player.id))!.myPersIds).toEqual([third, secondPersId]);
  });

  it("більше шести героїв на людину не можна", async () => {
    const { player, sessionId } = await createTable();
    for (const name of ["Третій", "Четвертий", "Пʼятий", "Шостий"]) expect((await toggleRoomHero(sessionId, player.id, await createPers(player.id, name))).ok).toBe(true);
    expect(await toggleRoomHero(sessionId, player.id, await createPers(player.id, "Сьомий"))).toEqual({ ok: false, error: "hero_limit" });
    expect(await countRows(sessionId, player.id)).toBe(GAME_SESSION_LIMITS.heroesPerMember);
  });

  it("чужого персонажа взяти не можна, а той самий лист не буває в кімнаті двічі", async () => {
    const { gm, other, sessionId, firstPersId } = await createTable();
    expect(await toggleRoomHero(sessionId, other.id, firstPersId)).toEqual({ ok: false, error: "bad_pers" });
    expect(await toggleRoomHero(sessionId, gm.id, firstPersId)).toEqual({ ok: false, error: "bad_pers" });
    expect(await findGameSessionView(sessionId, gm.id)).toMatchObject({ myPersIds: [] });
  });

  it("стороння людина й архів нічого не змінюють", async () => {
    const { gm, player, sessionId, firstPersId } = await createTable();
    const stranger = await createUser("stranger");
    expect(await toggleRoomHero(sessionId, stranger.id, await createPers(stranger.id, "Чужий"))).toEqual({ ok: false, error: "not_found" });
    await prisma.gameSession.update({ where: { id: sessionId }, data: { archivedAt: new Date() } });
    expect(await toggleRoomHero(sessionId, player.id, firstPersId)).toEqual({ ok: false, error: "archived" });
    expect((await findGameSessionView(sessionId, gm.id))!.members.filter((member) => member.persId !== null)).toHaveLength(2);
  });

  it("«грати без персонажа», вихід і виключення забирають усіх героїв людини", async () => {
    const { gm, player, other, sessionId } = await createTable();
    await bindMemberPers(sessionId, player.id, null);
    expect(await countRows(sessionId, player.id)).toBe(1);
    expect((await findGameSessionView(sessionId, player.id))!.myPersIds).toEqual([]);

    const persA = await createPers(other.id, "А");
    const persB = await createPers(other.id, "Б");
    await toggleRoomHero(sessionId, other.id, persA);
    await toggleRoomHero(sessionId, other.id, persB);
    await removeGameSessionMember(sessionId, gm.id, other.id);
    expect(await countRows(sessionId, other.id)).toBe(0);

    await toggleRoomHero(sessionId, player.id, await createPers(player.id, "В"));
    await toggleRoomHero(sessionId, player.id, await createPers(player.id, "Г"));
    await leaveGameSession(sessionId, player.id);
    expect(await countRows(sessionId, player.id)).toBe(0);
  });

  it("у списку кімнат і в ліміті учасників людина рахується один раз", async () => {
    const { player, sessionId, inviteToken } = await createTable();
    const rooms = await listGameSessionsForUser(player.id);
    expect(rooms.filter((room) => room.id === sessionId)).toHaveLength(1);
    expect(rooms.find((room) => room.id === sessionId)).toMatchObject({ memberCount: 3 });

    for (let joined = 3; joined < GAME_SESSION_LIMITS.members; joined += 1) expect((await joinGameSessionByToken(inviteToken, (await createUser(`u${joined}`)).id)).ok).toBe(true);
    expect(await joinGameSessionByToken(inviteToken, (await createUser("late")).id)).toEqual({ ok: false, error: "full" });
  });
});

describe("кожен герой окремо на столі", () => {
  it("токен кожного героя рухається окремо: власник своїх, майстер будь-яких, інший гравець — ні", async () => {
    const { gm, player, other, sessionId, firstPersId, secondPersId } = await createTable();
    const sceneId = await setUpMap(sessionId, gm.id);
    const first = await findHero(sessionId, player.id, firstPersId);
    const second = await findHero(sessionId, player.id, secondPersId);

    expect(await moveGameToken(sessionId, player.id, sceneId, first.heroId, { x: 0.1, y: 0.2 })).toEqual({ ok: true, value: null });
    expect(await moveGameToken(sessionId, player.id, sceneId, second.heroId, { x: 0.7, y: 0.8 })).toEqual({ ok: true, value: null });
    expect(await moveGameToken(sessionId, other.id, sceneId, second.heroId, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "forbidden" });
    expect(await findHero(sessionId, gm.id, firstPersId)).toMatchObject({ token: { x: expect.closeTo(0.1), y: expect.closeTo(0.2) } });
    expect(await findHero(sessionId, gm.id, secondPersId)).toMatchObject({ token: { x: expect.closeTo(0.7), y: expect.closeTo(0.8) } });

    expect(await moveGameToken(sessionId, gm.id, sceneId, second.heroId, { x: 0.4, y: 0.4 })).toEqual({ ok: true, value: null });
    expect(await findHero(sessionId, player.id, secondPersId)).toMatchObject({ token: { x: expect.closeTo(0.4) } });

    await toggleRoomHero(sessionId, player.id, secondPersId);
    expect(await prisma.gameSceneHeroToken.count({ where: { sceneId } })).toBe(1);
  });

  it("стани належать герою, а не людині", async () => {
    const { gm, player, other, sessionId, firstPersId, secondPersId } = await createTable();
    const second = await findHero(sessionId, player.id, secondPersId);
    const poisoned = { kind: "toggle", condition: "poisoned", isActive: true } as const;

    expect(await changeHeroConditions(sessionId, other.id, second.heroId, poisoned)).toEqual({ ok: false, error: "forbidden" });
    expect(await changeHeroConditions(sessionId, player.id, second.heroId, poisoned)).toEqual({ ok: true, value: null });
    expect((await findHero(sessionId, gm.id, secondPersId)).conditions.conditions).toEqual(["poisoned"]);
    expect((await findHero(sessionId, gm.id, firstPersId)).conditions.conditions).toEqual([]);
  });

  it("у бою кожен герой має свій рядок, і гравець завершує хід будь-якого свого", async () => {
    const { gm, player, other, sessionId, firstPersId, secondPersId } = await createTable();
    const sceneId = await setUpMap(sessionId, gm.id);
    for (const persId of [firstPersId, secondPersId]) await moveGameToken(sessionId, player.id, sceneId, (await findHero(sessionId, player.id, persId)).heroId, { x: 0.3, y: 0.3 });
    await startCombat(sessionId, gm.id);
    const combat = (await findGameSessionView(sessionId, gm.id))!.combat!;
    expect(combat.combatants.map((combatant) => combatant.hero?.persId).sort()).toEqual([firstPersId, secondPersId].sort());

    const secondCombatant = combat.combatants.find((combatant) => combatant.hero?.persId === secondPersId)!;
    if (combat.currentId !== secondCombatant.id) await advanceCombatTurn(sessionId, gm.id, 1);
    expect(await endOwnCombatTurn(sessionId, other.id, secondCombatant.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await endOwnCombatTurn(sessionId, player.id, secondCombatant.id)).toEqual({ ok: true, value: null });
  });

  it("прозорість вмикає власник або майстер, і лише цьому герою", async () => {
    const { gm, player, other, sessionId, firstPersId, secondPersId } = await createTable();
    const second = await findHero(sessionId, player.id, secondPersId);
    expect(await setRoomHeroCutout(sessionId, other.id, second.heroId, true)).toEqual({ ok: false, error: "forbidden" });
    expect((await findHero(sessionId, gm.id, secondPersId)).isCutout).toBe(false);

    expect(await setRoomHeroCutout(sessionId, player.id, second.heroId, true)).toEqual({ ok: true, value: null });
    expect((await findHero(sessionId, gm.id, secondPersId)).isCutout).toBe(true);
    expect((await findHero(sessionId, gm.id, firstPersId)).isCutout).toBe(false);

    expect(await setRoomHeroCutout(sessionId, gm.id, second.heroId, false)).toEqual({ ok: true, value: null });
    expect((await findHero(sessionId, player.id, secondPersId)).isCutout).toBe(false);
    expect(await setRoomHeroCutout(sessionId, player.id, 999_999, true)).toEqual({ ok: false, error: "no_map" });
  });

  it("книга заклинань обʼєднує героїв, а кидок із листа підписаний тим героєм, чий це лист", async () => {
    const { player, sessionId, firstPersId, secondPersId } = await createTable();
    const [spellA, spellB] = await prisma.spell.findMany({ take: 2, orderBy: { spellId: "asc" }, select: { spellId: true, engName: true } });
    await prisma.persSpell.createMany({ data: [{ persId: firstPersId, spellId: spellA.spellId, learnedAtLevel: 1 }, { persId: secondPersId, spellId: spellB.spellId, learnedAtLevel: 1 }] });
    const spellbook = await findMemberSpellbook(sessionId, player.id);
    expect([...spellbook!.knownEngNames].sort()).toEqual([spellA.engName, spellB.engName].sort());

    const roll: GameRoll = { d20Mode: "NORMAL", modeSources: [], groups: [{ sides: 20, values: [12] }], extra: [], bonus: 3, total: 15, check: null };
    const draft = { idempotencyKey: randomUUID(), visibility: "PUBLIC", source: "CHARACTER", persId: secondPersId, label: "Перевірка", roll, rolledAt: new Date() } as const;
    expect(await insertGameRollEvent(sessionId, player.id, draft)).toMatchObject({ ok: true, value: { persName: "Боромир" } });
  });
});
