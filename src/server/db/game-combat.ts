import type { Prisma } from "@prisma/client";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { calculateFinalInitiative } from "@/lib/logic/bonus-calculator";
import { prisma } from "@/lib/prisma";
import {
  findCombatOrder,
  findCreatureInitiativeBonus,
  findTurnIndex,
  moveTurn,
  rollInitiative,
  type CombatantRow,
  type CombatPresence,
  type CombatState,
} from "@/rules/game-combat";
import { findActiveGmSession, findMembership, signalGameSession, type GameSessionFailure, type GameSessionResult } from "@/server/db/game-sessions";
import type { PersWithRelations } from "@/server/db/pers-actions";
import { PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";

type Transaction = Prisma.TransactionClient;
type NewCombatant = Pick<CombatantRow, "persId" | "gameMapCreatureId" | "initiative" | "initiativeBonus">;

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

export async function startCombat(sessionId: number, userId: number): Promise<GameSessionResult<{ combatantCount: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const newcomers = await rollNewCombatants(sessionId, { persIds: new Set(), creatureIds: new Set() });
  if (newcomers.length === 0) return fail("no_combatants");
  const started = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round !== null) return fail("combat_active");
    await tx.gameCombatant.createMany({ data: newcomers.map((newcomer) => ({ ...newcomer, gameSessionId: sessionId })) });
    const order = await readCombatOrder(tx, sessionId);
    await tx.gameSession.update({ where: { id: sessionId }, data: { combatRound: 1, combatTurn: 0, combatCurrentCombatantId: order[0]?.id ?? null } });
    return succeed({ combatantCount: order.length });
  });
  if (started.ok) await signalGameSession(sessionId, "session");
  return started;
}

export async function endCombat(sessionId: number, userId: number): Promise<GameSessionResult<{ rounds: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const ended = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round === null) return fail("no_combat");
    await tx.gameSession.update({ where: { id: sessionId }, data: { combatRound: null, combatTurn: null, combatCurrentCombatantId: null } });
    await tx.gameCombatant.deleteMany({ where: { gameSessionId: sessionId } });
    return succeed({ rounds: state.round });
  });
  if (ended.ok) await signalGameSession(sessionId, "session");
  return ended;
}

export async function advanceCombatTurn(sessionId: number, userId: number, step: 1 | -1): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const advanced = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round === null) return fail("no_combat");
    return moveCombatTurn(tx, sessionId, { ...state, round: state.round }, step);
  });
  if (advanced.ok) await signalGameSession(sessionId, "session");
  return advanced;
}

/// combatantId — чий хід бачив гравець: подвійний тап чи хід, який майстер уже передав, не пропустять наступного.
export async function endOwnCombatTurn(sessionId: number, userId: number, combatantId: number): Promise<GameSessionResult<null>> {
  const member = await findMembership(sessionId, userId);
  if (!member) return fail("not_found");
  if (member.gameSession.archivedAt) return fail("archived");
  if (member.persId === null) return fail("forbidden");
  const ended = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round === null) return fail("no_combat");
    if (state.currentCombatantId !== combatantId) return fail("turn_moved");
    const current = await tx.gameCombatant.findFirst({ where: { id: combatantId, gameSessionId: sessionId }, select: { persId: true } });
    if (current?.persId !== member.persId) return fail("forbidden");
    return moveCombatTurn(tx, sessionId, { ...state, round: state.round }, 1);
  });
  if (ended.ok) await signalGameSession(sessionId, "session");
  return ended;
}

async function moveCombatTurn(tx: Transaction, sessionId: number, state: CombatState & { round: number }, step: 1 | -1): Promise<GameSessionResult<null>> {
  const order = await readCombatOrder(tx, sessionId);
  if (order.length === 0) return fail("no_combatants");
  const index = findTurnIndex(order.map((row) => row.id), state.currentCombatantId, state.turn ?? 0);
  const next = moveTurn({ round: state.round, index }, order.length, step);
  await tx.gameSession.update({ where: { id: sessionId }, data: { combatRound: next.round, combatTurn: next.index, combatCurrentCombatantId: order[next.index].id } });
  return succeed(null);
}

export async function setCombatantInitiative(sessionId: number, userId: number, combatantId: number, initiative: number): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const edited = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round === null) return fail("no_combat");
    const updated = await tx.gameCombatant.updateMany({ where: { id: combatantId, gameSessionId: sessionId }, data: { initiative } });
    if (!updated.count) return fail("combatant_gone");
    await keepTurnOnCurrentCombatant(tx, sessionId, state);
    return succeed(null);
  });
  if (edited.ok) await signalGameSession(sessionId, "session");
  return edited;
}

export async function addMissingCombatants(sessionId: number, userId: number): Promise<GameSessionResult<{ addedCount: number }>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const known = await prisma.gameCombatant.findMany({ where: { gameSessionId: sessionId }, select: { persId: true, gameMapCreatureId: true } });
  const newcomers = await rollNewCombatants(sessionId, collectKnownPresence(known));
  const added = await prisma.$transaction(async (tx) => {
    const state = await lockCombatState(tx, sessionId);
    if (state.round === null) return fail("no_combat");
    const { count } = await tx.gameCombatant.createMany({ data: newcomers.map((newcomer) => ({ ...newcomer, gameSessionId: sessionId })), skipDuplicates: true });
    await keepTurnOnCurrentCombatant(tx, sessionId, state);
    return succeed({ addedCount: count });
  });
  if (added.ok && added.value.addedCount > 0) await signalGameSession(sessionId, "session");
  return added;
}

async function lockCombatState(tx: Transaction, sessionId: number): Promise<CombatState> {
  const [row] = await tx.$queryRaw<{ combat_round: number | null; combat_turn: number | null; combat_current_combatant_id: number | null }[]>`
    SELECT combat_round, combat_turn, combat_current_combatant_id FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
  return { round: row?.combat_round ?? null, turn: row?.combat_turn ?? null, currentCombatantId: row?.combat_current_combatant_id ?? null };
}

function findPlacedActiveSceneCreatures(sessionId: number): Prisma.GameMapCreatureWhereInput {
  return { gameSessionId: sessionId, tokenX: { not: null }, scene: { activeIn: { some: { id: sessionId } } } };
}

async function readCombatOrder(tx: Transaction, sessionId: number): Promise<CombatantRow[]> {
  const [rows, members, creatures] = await Promise.all([
    tx.gameCombatant.findMany({ where: { gameSessionId: sessionId } }),
    tx.gameSessionMember.findMany({ where: { gameSessionId: sessionId, persId: { not: null } }, select: { persId: true } }),
    tx.gameMapCreature.findMany({ where: findPlacedActiveSceneCreatures(sessionId), select: { id: true } }),
  ]);
  const presence: CombatPresence = {
    persIds: new Set(members.flatMap((member) => (member.persId === null ? [] : [member.persId]))),
    creatureIds: new Set(creatures.map((creature) => creature.id)),
  };
  return findCombatOrder(rows, presence);
}

async function keepTurnOnCurrentCombatant(tx: Transaction, sessionId: number, state: CombatState): Promise<void> {
  const order = await readCombatOrder(tx, sessionId);
  const index = findTurnIndex(order.map((row) => row.id), state.currentCombatantId, state.turn ?? 0);
  await tx.gameSession.update({ where: { id: sessionId }, data: { combatTurn: index, combatCurrentCombatantId: order[index]?.id ?? null } });
}

function collectKnownPresence(known: { persId: number | null; gameMapCreatureId: number | null }[]): CombatPresence {
  return {
    persIds: new Set(known.flatMap((row) => (row.persId === null ? [] : [row.persId]))),
    creatureIds: new Set(known.flatMap((row) => (row.gameMapCreatureId === null ? [] : [row.gameMapCreatureId]))),
  };
}

async function rollNewCombatants(sessionId: number, known: CombatPresence): Promise<NewCombatant[]> {
  const [members, creatures] = await Promise.all([
    prisma.gameSessionMember.findMany({ where: { gameSessionId: sessionId, persId: { not: null } }, select: { persId: true } }),
    prisma.gameMapCreature.findMany({ where: findPlacedActiveSceneCreatures(sessionId), select: { id: true, creatureKey: true, ruleset: true } }),
  ]);
  const newPersIds = members.flatMap((member) => (member.persId === null || known.persIds.has(member.persId) ? [] : [member.persId]));
  const heroes = await rollHeroes(newPersIds);
  const monsters = creatures
    .filter((creature) => !known.creatureIds.has(creature.id))
    .map((creature) => {
      const initiativeBonus = findCreatureInitiativeBonus(findCreatureByKey(creature.creatureKey, creature.ruleset)?.dexterity);
      return { persId: null, gameMapCreatureId: creature.id, initiative: rollInitiative(initiativeBonus), initiativeBonus };
    });
  return [...heroes, ...monsters];
}

async function rollHeroes(persIds: number[]): Promise<NewCombatant[]> {
  if (persIds.length === 0) return [];
  const persons: PersWithRelations[] = await prisma.pers.findMany({ where: { persId: { in: persIds } }, include: PERS_SHEET_INCLUDE });
  return persons.map((pers) => {
    const initiativeBonus = calculateFinalInitiative(pers);
    return { persId: pers.persId, gameMapCreatureId: null, initiative: rollInitiative(initiativeBonus), initiativeBonus };
  });
}
