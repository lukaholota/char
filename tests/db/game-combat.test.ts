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

import { addMissingCombatants, advanceCombatTurn, endCombat, endOwnCombatTurn, setCombatantInitiative, startCombat } from "@/server/db/game-combat";
import { addMapCreatures, moveMapCreature, removeMapCreatures } from "@/server/db/game-map-creatures";
import { bindMemberPers, createGameSession, findGameSessionView, joinGameSessionByToken, setGameSessionArchived } from "@/server/db/game-sessions";
import { setActiveSceneMap } from "./game-scene-setup";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@combat.test`, name: `${label} Тестовий` } });
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

const GOBLIN_DEXTERITY_BONUS = 2;

async function createTable() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  await joinGameSessionByToken(inviteToken, player.id);
  await bindMemberPers(sessionId, player.id, await createPers(player.id, "Арвен"));
  await bindMemberPers(sessionId, gm.id, await createPers(gm.id, "Торин"));
  await setActiveSceneMap(sessionId, gm.id, await createMapImage());
  return { gm, player, sessionId };
}

async function placeCreatures(sessionId: number, gmId: number, count: number, customName: string | null = null) {
  const before = new Set((await findGameSessionView(sessionId, gmId))!.creatures.map((creature) => creature.id));
  await addMapCreatures(sessionId, gmId, { creatureKey: "goblin", ruleset: "RULES_2014", count, isAlly: false, customName });
  const added = (await findGameSessionView(sessionId, gmId))!.creatures.filter((creature) => !before.has(creature.id));
  for (const creature of added) await moveMapCreature(sessionId, gmId, creature.id, { x: 0.3, y: 0.4 });
  return added.map((creature) => creature.id);
}

const readCombat = async (sessionId: number, viewerId: number) => (await findGameSessionView(sessionId, viewerId))!.combat;

async function fixOrder(sessionId: number, gmId: number, initiatives: number[]) {
  const combat = (await readCombat(sessionId, gmId))!;
  for (const [index, combatant] of combat.combatants.entries()) await setCombatantInitiative(sessionId, gmId, combatant.id, initiatives[index]);
  return (await readCombat(sessionId, gmId))!;
}

describe("початок і кінець бою", () => {
  it("починає лише майстер: герої й поставлені на мапу істоти кидають ініціативу, невиставлені не беруть участі", async () => {
    const { gm, player, sessionId } = await createTable();
    expect(await startCombat(sessionId, player.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await readCombat(sessionId, gm.id)).toBeNull();

    await placeCreatures(sessionId, gm.id, 2);
    await addMapCreatures(sessionId, gm.id, { creatureKey: "goblin", ruleset: "RULES_2014", count: 1, isAlly: false, customName: "Запасний" });
    expect(await startCombat(sessionId, gm.id)).toEqual({ ok: true, value: { combatantCount: 4 } });
    expect(await startCombat(sessionId, gm.id)).toEqual({ ok: false, error: "combat_active" });

    const combat = (await readCombat(sessionId, gm.id))!;
    expect(combat.round).toBe(1);
    expect(combat.combatants).toHaveLength(4);
    expect(combat.currentId).toBe(combat.combatants[0].id);
    const initiatives = combat.combatants.map((combatant) => combatant.initiative);
    expect(initiatives).toEqual([...initiatives].sort((a, b) => b - a));
    for (const combatant of combat.combatants) {
      const bonus = combatant.hero ? 0 : GOBLIN_DEXTERITY_BONUS;
      expect(combatant.initiative).toBeGreaterThanOrEqual(1 + bonus);
      expect(combatant.initiative).toBeLessThanOrEqual(20 + bonus);
    }
    expect((await readCombat(sessionId, player.id))!.combatants).toHaveLength(4);
  });

  it("без героїв і без істот на мапі бій не починається, а в архівній кімнаті — теж", async () => {
    const gm = await createUser("gm");
    const created = await createGameSession(gm.id, "Порожня");
    if (!created.ok) throw new Error(created.error);
    expect(await startCombat(created.value.id, gm.id)).toEqual({ ok: false, error: "no_combatants" });
    await setGameSessionArchived(created.value.id, gm.id, true);
    expect(await startCombat(created.value.id, gm.id)).toEqual({ ok: false, error: "archived" });
  });

  it("завершує лише майстер; після кінця черги немає, а новий бій кидає ініціативу заново", async () => {
    const { gm, player, sessionId } = await createTable();
    await startCombat(sessionId, gm.id);
    await advanceCombatTurn(sessionId, gm.id, 1);
    await advanceCombatTurn(sessionId, gm.id, 1);
    expect(await endCombat(sessionId, player.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await endCombat(sessionId, gm.id)).toEqual({ ok: true, value: { rounds: 2 } });
    expect(await readCombat(sessionId, gm.id)).toBeNull();
    expect(await prisma.gameCombatant.count({ where: { gameSessionId: sessionId } })).toBe(0);
    expect(await endCombat(sessionId, gm.id)).toEqual({ ok: false, error: "no_combat" });
    expect(await startCombat(sessionId, gm.id)).toEqual({ ok: true, value: { combatantCount: 2 } });
  });
});

describe("ходи", () => {
  it("наступний хід іде по колу й додає раунд, «назад» повертається, але не раніше першого ходу першого раунду", async () => {
    const { gm, player, sessionId } = await createTable();
    await placeCreatures(sessionId, gm.id, 1);
    await startCombat(sessionId, gm.id);
    const ordered = await fixOrder(sessionId, gm.id, [30, 20, 10]);
    const ids = ordered.combatants.map((combatant) => combatant.id);
    const currentAfter = async () => {
      const combat = (await readCombat(sessionId, player.id))!;
      return [combat.round, combat.currentId] as const;
    };

    expect(await currentAfter()).toEqual([1, ids[0]]);
    expect(await advanceCombatTurn(sessionId, player.id, 1)).toEqual({ ok: false, error: "forbidden" });
    await advanceCombatTurn(sessionId, gm.id, -1);
    expect(await currentAfter()).toEqual([1, ids[0]]);
    await advanceCombatTurn(sessionId, gm.id, 1);
    await advanceCombatTurn(sessionId, gm.id, 1);
    expect(await currentAfter()).toEqual([1, ids[2]]);
    await advanceCombatTurn(sessionId, gm.id, 1);
    expect(await currentAfter()).toEqual([2, ids[0]]);
    await advanceCombatTurn(sessionId, gm.id, -1);
    expect(await currentAfter()).toEqual([1, ids[2]]);
  });

  it("ручна ініціатива пересортовує чергу, але хід лишається за тим, хто ходив", async () => {
    const { gm, player, sessionId } = await createTable();
    await placeCreatures(sessionId, gm.id, 1);
    await startCombat(sessionId, gm.id);
    const [first, second, third] = (await fixOrder(sessionId, gm.id, [30, 20, 10])).combatants;
    await advanceCombatTurn(sessionId, gm.id, 1);

    expect(await setCombatantInitiative(sessionId, player.id, third.id, 99)).toEqual({ ok: false, error: "forbidden" });
    expect(await setCombatantInitiative(sessionId, gm.id, third.id, 99)).toEqual({ ok: true, value: null });
    expect(await setCombatantInitiative(sessionId, gm.id, 999_999, 5)).toEqual({ ok: false, error: "combatant_gone" });
    const combat = (await readCombat(sessionId, gm.id))!;
    expect(combat.combatants.map((combatant) => combatant.id)).toEqual([third.id, first.id, second.id]);
    expect(combat.currentId).toBe(second.id);
    await advanceCombatTurn(sessionId, gm.id, 1);
    expect((await readCombat(sessionId, gm.id))!.round).toBe(2);
  });

  it("істота, прибрана з мапи, виходить із бою: чужий хід не зсувається, а поточний переходить до наступного в черзі", async () => {
    const { gm, sessionId } = await createTable();
    const [firstGoblin, secondGoblin] = await placeCreatures(sessionId, gm.id, 2);
    await startCombat(sessionId, gm.id);
    const combatants = (await readCombat(sessionId, gm.id))!.combatants;
    const [heroA, heroB] = combatants.filter((combatant) => combatant.hero).map((combatant) => combatant.id);
    const [goblinA, goblinB] = [firstGoblin, secondGoblin].map((creatureId) => combatants.find((combatant) => combatant.creature?.id === creatureId)!.id);
    for (const [combatantId, initiative] of [[heroA, 40], [goblinA, 30], [heroB, 20], [goblinB, 10]]) await setCombatantInitiative(sessionId, gm.id, combatantId, initiative);
    while ((await readCombat(sessionId, gm.id))!.currentId !== goblinA) await advanceCombatTurn(sessionId, gm.id, 1);

    await removeMapCreatures(sessionId, gm.id, secondGoblin);
    expect((await readCombat(sessionId, gm.id))!.currentId).toBe(goblinA);

    await removeMapCreatures(sessionId, gm.id, firstGoblin);
    const afterRemoval = (await readCombat(sessionId, gm.id))!;
    expect(afterRemoval.combatants.map((combatant) => combatant.id)).toEqual([heroA, heroB]);
    expect(afterRemoval.currentId).toBe(heroB);

    const roundBefore = afterRemoval.round;
    await advanceCombatTurn(sessionId, gm.id, 1);
    expect(await readCombat(sessionId, gm.id)).toMatchObject({ round: roundBefore + 1, currentId: heroA });
  });

  it("«додати нових» кидає ініціативу лише тим, хто з'явився після початку", async () => {
    const { gm, player, sessionId } = await createTable();
    await startCombat(sessionId, gm.id);
    expect(await addMissingCombatants(sessionId, gm.id)).toEqual({ ok: true, value: { addedCount: 0 } });
    expect(await addMissingCombatants(sessionId, player.id)).toEqual({ ok: false, error: "forbidden" });

    await placeCreatures(sessionId, gm.id, 2);
    expect((await readCombat(sessionId, gm.id))!.combatants).toHaveLength(2);
    expect(await addMissingCombatants(sessionId, gm.id)).toEqual({ ok: true, value: { addedCount: 2 } });
    expect((await readCombat(sessionId, gm.id))!.combatants).toHaveLength(4);
    expect(await addMissingCombatants(sessionId, gm.id)).toEqual({ ok: true, value: { addedCount: 0 } });

    await endCombat(sessionId, gm.id);
    expect(await addMissingCombatants(sessionId, gm.id)).toEqual({ ok: false, error: "no_combat" });
  });
});

describe("гравець завершує свій хід", () => {
  it("лише свого героя і лише поки хід ще його: подвійний тап не пропускає наступного", async () => {
    const { gm, player, sessionId } = await createTable();
    await placeCreatures(sessionId, gm.id, 1);
    await startCombat(sessionId, gm.id);
    const ordered = await fixOrder(sessionId, gm.id, [30, 20, 10]);
    const ids = ordered.combatants.map((combatant) => combatant.id);
    const playerCombatant = ordered.combatants.find((combatant) => combatant.hero?.userId === player.id)!.id;
    while ((await readCombat(sessionId, gm.id))!.currentId !== playerCombatant) await advanceCombatTurn(sessionId, gm.id, 1);
    const before = (await readCombat(sessionId, gm.id))!;
    const otherCombatant = ids.find((id) => id !== playerCombatant)!;

    expect(await endOwnCombatTurn(sessionId, player.id, otherCombatant)).toEqual({ ok: false, error: "turn_moved" });
    expect(await endOwnCombatTurn(sessionId, player.id, playerCombatant)).toEqual({ ok: true, value: null });
    const after = (await readCombat(sessionId, gm.id))!;
    const nextIndex = (ids.indexOf(playerCombatant) + 1) % ids.length;
    expect(after.currentId).toBe(ids[nextIndex]);
    expect(after.round).toBe(before.round + (nextIndex === 0 ? 1 : 0));
    expect(await endOwnCombatTurn(sessionId, player.id, playerCombatant)).toEqual({ ok: false, error: "turn_moved" });
    expect((await readCombat(sessionId, gm.id))!.currentId).toBe(ids[nextIndex]);
  });

  it("чужого героя чи істоту не завершує, без бою й в архіві — відмова", async () => {
    const { gm, player, sessionId } = await createTable();
    const stranger = await createUser("stranger");
    expect(await endOwnCombatTurn(sessionId, player.id, 1)).toEqual({ ok: false, error: "no_combat" });
    await placeCreatures(sessionId, gm.id, 1);
    await startCombat(sessionId, gm.id);
    const ordered = await fixOrder(sessionId, gm.id, [30, 20, 10]);
    const current = ordered.currentId!;
    const isPlayerTurn = ordered.combatants[0].hero?.userId === player.id;
    if (isPlayerTurn) await advanceCombatTurn(sessionId, gm.id, 1);
    const notMine = (await readCombat(sessionId, gm.id))!.currentId!;

    expect(await endOwnCombatTurn(sessionId, player.id, notMine)).toEqual({ ok: false, error: "forbidden" });
    expect(await endOwnCombatTurn(sessionId, stranger.id, notMine)).toEqual({ ok: false, error: "not_found" });
    expect((await readCombat(sessionId, gm.id))!.currentId).toBe(notMine);
    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await endOwnCombatTurn(sessionId, player.id, current)).toEqual({ ok: false, error: "archived" });
  });
});

describe("що бачить гравець", () => {
  it("перейменована істота: гравець бачить лише своє імʼя й картинку — ні ключа, ні імені зі статблока, ні бонусу", async () => {
    const { gm, player, sessionId } = await createTable();
    await placeCreatures(sessionId, gm.id, 1, "Тінь у кутку");
    await startCombat(sessionId, gm.id);

    const combat = (await readCombat(sessionId, player.id))!;
    const shadow = combat.combatants.find((combatant) => combatant.creature)!.creature!;
    expect(shadow).toMatchObject({ label: "Тінь у кутку", creatureKey: null, imageUrl: "/images/creatures/2014/goblin.webp", statblockName: null });
    const serialized = JSON.stringify(await findGameSessionView(sessionId, player.id)).replaceAll(shadow.imageUrl!, "");
    expect(serialized).not.toMatch(/goblin|Гоблін|initiativeBonus|sortTiebreak/i);

    const gmShadow = (await readCombat(sessionId, gm.id))!.combatants.find((combatant) => combatant.creature)!.creature!;
    expect(gmShadow.creatureKey).toBe("goblin");
  });
});
