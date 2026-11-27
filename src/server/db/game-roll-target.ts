import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { findDamageDefense, resolveCreatureSave, type SaveEffect } from "@/rules/creature-save";
import { resolveTypedDamage, toCreatureDamageType, type DamageDefenseNote } from "@/rules/damage-parts";
import { buildDamageReview, type DamageReview } from "@/rules/damage-review";
import { resolveHeroSave } from "@/rules/hero-save";
import type { GameRollSavesDraft, SaveDamageParts, StoredSaveRow, StoredSaves } from "@/rules/game-roll-saves";
import { buildMapCreatureViews } from "@/rules/game-map-creatures";
import { findAttackHit, parseArmorClass, type GameRollTargetDraft } from "@/rules/game-roll-target";
import type { GameRoll } from "@/rules/game-roll";
import { BLESSED_DIE, BLESSED_MARK, type RuleConditionKey } from "@/rules/token-conditions";
import { CREATURE_HIT_POINT_LIMIT } from "@/rules/creature-hit-points";
import { parseCreatureHitPoints } from "@/rules/wildshape";
import type { RoomHero } from "@/server/db/game-room-heroes";
import type { GameSessionResult } from "@/server/db/game-sessions";
import { loadRoomCreatures, type RoomCreatureLookup } from "@/server/db/room-creatures";

export type RollTargetEffect = {
  targetCreatureId: number;
  targetName: string;
  rollKind: GameRollTargetDraft["kind"];
  targetAc: number | null;
  isHit: boolean | null;
  hpBefore: number | null;
  hpChange: number | null;
};

const CREATURE_ROW_SELECT = {
  id: true,
  creatureKey: true,
  ruleset: true,
  number: true,
  borderColor: true,
  customName: true,
  tokenSize: true,
  isCutout: true,
  customImageKey: true,
  tokenX: true,
  tokenY: true,
  tokenRotation: true,
  tokenScalePercent: true,
  hpMax: true,
  hpCurrent: true,
  hpTemp: true,
  conditions: true,
  exhaustionLevel: true,
  lightBrightFeet: true,
  lightDimFeet: true,
  isNameHidden: true,
} satisfies Prisma.GameMapCreatureSelect;

/// Ціль — лише істота активної сцени, що стоїть на мапі: підготовка майстра (під мапою чи в іншій сцені) не видає себе в журналі.
/// Істота зникла або знята з мапи, поки кидок чекав у черзі, — кидок лишається без цілі; чужа кімната — відмова.
/// damageDefenses — опори цілі, що змінили шкоду: їх бачать усі в журналі.
/// review — шкода чекає майстра: хіти не знято, захисти цілі лише запропоновано.
/// tempHpChange — скільки шкоди забрали тимчасові хіти: скасування повертає їх окремо від звичайних.
export type RolledTarget = { columns: RollTargetEffect; damage: number; damageDefenses: DamageDefenseNote[]; tempHpChange?: number; review?: DamageReview };

export async function applyRollTarget(tx: Prisma.TransactionClient, sessionId: number, target: GameRollTargetDraft, roll: GameRoll, isReviewed = false): Promise<GameSessionResult<RolledTarget | null>> {
  const rows = await tx.gameMapCreature.findMany({ where: { gameSessionId: sessionId, scene: { activeIn: { some: { id: sessionId } } } }, select: CREATURE_ROW_SELECT });
  const findCreature = await loadRoomCreatures(rows);
  const creature = buildMapCreatureViews(rows, findCreature, true).find((view) => view.id === target.creatureId);
  const row = rows.find((candidate) => candidate.id === target.creatureId);
  if (!row && (await tx.gameMapCreature.count({ where: { id: target.creatureId } }))) return { ok: false, error: "bad_target" };
  if (!creature?.token || !row) return { ok: true, value: null };
  const statblock = findCreature(row.creatureKey, row.ruleset);
  const base = { targetCreatureId: creature.id, targetName: creature.playerLabel, rollKind: target.kind };
  if (target.kind === "attack") {
    const targetAc = parseArmorClass(statblock?.ac);
    return { ok: true, value: { columns: { ...base, targetAc, isHit: findAttackHit(roll, roll.total, targetAc), hpBefore: null, hpChange: null }, damage: 0, damageDefenses: [] } };
  }
  const findDefense = (damageType: Parameters<typeof toCreatureDamageType>[0]) => (statblock ? findDamageDefense(statblock, toCreatureDamageType(damageType)) : null);
  if (isReviewed) return { ok: true, value: { columns: { ...base, targetAc: null, isHit: null, hpBefore: null, hpChange: null }, damage: 0, damageDefenses: [], review: buildDamageReview(roll, findDefense) } };
  const { damage, notes } = statblock ? resolveTypedDamage(roll, findDefense) : { damage: roll.total, notes: [] };
  const { tempHpChange, ...change } = await removeHitPoints(tx, sessionId, creature.id, damage, parseCreatureHitPoints(statblock?.hp ?? ""));
  return { ok: true, value: { columns: { ...base, targetAc: null, isHit: null, ...change }, damage, damageDefenses: notes, tempHpChange } };
}

/// Кожна істота в зоні кидає свій ряткидок тут, на сервері: гравець не підкрутить чужий к20.
/// Істоти поза активною сценою чи зняті з мапи пропускаються — зона лишається такою, як її побачили всі.
/// Герой кидає теж тут, з бонусом свого листа; хіти з листа знімає сам гравець кнопкою в журналі.
export async function applySaveTargets(tx: Prisma.TransactionClient, sessionId: number, draft: GameRollSavesDraft, damage: SaveDamageParts, heroes: ReadonlyMap<number, RoomHero>): Promise<StoredSaves | null> {
  const { effect } = draft;
  const rows = await tx.gameMapCreature.findMany({ where: { gameSessionId: sessionId, scene: { activeIn: { some: { id: sessionId } } } }, select: CREATURE_ROW_SELECT });
  const findCreature = await loadRoomCreatures(rows);
  const views = buildMapCreatureViews(rows, findCreature, true);
  const saveRows: StoredSaveRow[] = [];
  for (const creatureId of draft.creatureIds) {
    const view = views.find((candidate) => candidate.id === creatureId);
    const row = rows.find((candidate) => candidate.id === creatureId);
    if (view?.token && row) saveRows.push(await applyCreatureSave(tx, sessionId, { row, name: view.playerLabel, statblock: findCreature(row.creatureKey, row.ruleset) }, effect, draft.dc, damage));
  }
  for (const persId of draft.persIds) {
    const hero = heroes.get(persId);
    if (hero) saveRows.push(await rollHeroSave(tx, sessionId, hero, effect, draft.dc, damage));
  }
  const condition = effect.condition ? { condition: effect.condition } : {};
  return saveRows.length ? { ability: effect.ability, dc: draft.dc, damageType: effect.damageType, ...(effect.secondDamageType ? { secondDamageType: effect.secondDamageType } : {}), isHalfOnSave: effect.isHalfOnSave, ...condition, rows: saveRows } : null;
}

type SaveTarget = { row: Prisma.GameMapCreatureGetPayload<{ select: typeof CREATURE_ROW_SELECT }>; name: string; statblock: ReturnType<RoomCreatureLookup> };

async function applyCreatureSave(tx: Prisma.TransactionClient, sessionId: number, { row, name, statblock }: SaveTarget, effect: SaveEffect, dc: number, damage: SaveDamageParts): Promise<StoredSaveRow> {
  const dice = rollSaveDice(row.conditions.includes(BLESSED_MARK) ? [BLESSED_DIE] : []);
  const save = resolveCreatureSave({ creature: statblock, conditions: row.conditions, effect, dc, ...damage, d20Pair: [randomInt(1, 21), randomInt(1, 21)], dice });
  const change = save.damage > 0 ? await removeHitPoints(tx, sessionId, row.id, save.damage, parseCreatureHitPoints(statblock?.hp ?? "")) : NO_HIT_POINT_CHANGE;
  const isConditionAdded = save.condition ? await addSaveCondition(tx, Prisma.sql`game_map_creature_id = ${row.id}`, save.condition, "creature") : null;
  return { ...save, creatureId: row.id, name, ...change, isUndone: false, ...(isConditionAdded === null ? {} : { isConditionAdded }) };
}

async function rollHeroSave(tx: Prisma.TransactionClient, sessionId: number, hero: RoomHero, effect: SaveEffect, dc: number, damage: SaveDamageParts): Promise<StoredSaveRow> {
  const { bonus, mode } = hero.saves[effect.ability];
  const dice = rollSaveDice(hero.saveDice);
  const save = resolveHeroSave({ bonus, mode, conditions: hero.conditions, resistances: hero.resistances, immunities: hero.immunities, effect, dc, ...damage, d20Pair: [randomInt(1, 21), randomInt(1, 21)], dice });
  const isConditionAdded = save.condition ? await addSaveCondition(tx, Prisma.sql`game_session_id = ${sessionId} AND pers_id = ${hero.persId}`, save.condition, "hero") : null;
  return { ...save, persId: hero.persId, name: hero.name, hpBefore: null, hpChange: null, isUndone: false, ...(isConditionAdded === null ? {} : { isConditionAdded }) };
}

/// false — стан уже був: скасування його тоді не зніме.
async function addSaveCondition(tx: Prisma.TransactionClient, where: Prisma.Sql, condition: RuleConditionKey, target: "creature" | "hero"): Promise<boolean> {
  const table = target === "creature" ? Prisma.sql`game_map_creature` : Prisma.sql`game_session_member`;
  const added = await tx.$executeRaw`UPDATE ${table} SET conditions = array_append(conditions, ${condition}) WHERE ${where} AND NOT (${condition} = ANY(conditions))`;
  return added > 0;
}

async function removeSaveCondition(tx: Prisma.TransactionClient, sessionId: number, claimed: { creature_id: number | null; pers_id: number | null }, condition: string): Promise<void> {
  if (claimed.creature_id !== null) await tx.$executeRaw`UPDATE game_map_creature SET conditions = array_remove(conditions, ${condition}) WHERE game_map_creature_id = ${claimed.creature_id} AND game_session_id = ${sessionId}`;
  else if (claimed.pers_id !== null) await tx.$executeRaw`UPDATE game_session_member SET conditions = array_remove(conditions, ${condition}) WHERE game_session_id = ${sessionId} AND pers_id = ${claimed.pers_id}`;
}

function rollSaveDice(dice: ReadonlyArray<{ sides: number; sign: number }>) {
  return dice.map(({ sides, sign }) => ({ sides, value: sign * randomInt(1, sides + 1) }));
}

const NO_HIT_POINT_CHANGE = { hpBefore: null, hpChange: null, tempHpChange: 0 };

/// Один UPDATE замикає рядок, читає хіти й пише нові: дві шкоди одночасно не затруть одна одну.
/// Істота без збережених хітів стартує з середніх хітів статблока; без них шкоди не буде. Шкода спершу знімає тимчасові хіти.
/// hpBefore і hpChange — лише звичайні хіти: «повалений» у журналі рахується з них.
async function removeHitPoints(tx: Prisma.TransactionClient, sessionId: number, creatureId: number, damage: number, statblockHitPoints: number | null) {
  const [changed] = await tx.$queryRaw<{ hp_before: number; hp_after: number; temp_change: number }[]>`
    UPDATE game_map_creature creature
    SET hp_max = old.hp_max, hp_temp = old.hp_temp - old.absorbed, hp_current = GREATEST(0, old.hp_before - (${damage}::int - old.absorbed))
    FROM (
      SELECT game_map_creature_id AS id, hp_temp, LEAST(hp_temp, ${damage}::int) AS absorbed,
             COALESCE(hp_max, ${statblockHitPoints}::int) AS hp_max,
             LEAST(COALESCE(hp_max, ${statblockHitPoints}::int), COALESCE(hp_current, hp_max, ${statblockHitPoints}::int)) AS hp_before
      FROM game_map_creature
      WHERE game_map_creature_id = ${creatureId} AND game_session_id = ${sessionId}
      FOR UPDATE
    ) old
    WHERE creature.game_map_creature_id = old.id AND old.hp_max >= 1
    RETURNING old.hp_before AS hp_before, creature.hp_current AS hp_after, old.absorbed AS temp_change`;
  return changed ? { hpBefore: changed.hp_before, hpChange: changed.hp_before - changed.hp_after, tempHpChange: changed.temp_change } : NO_HIT_POINT_CHANGE;
}

/// Підтверджена шкода знімається, навіть якщо істоту вже прибрали з мапи чи сховали в іншій сцені.
export async function applyReviewedCreatureDamage(tx: Prisma.TransactionClient, sessionId: number, creatureId: number, damage: number) {
  const row = await tx.gameMapCreature.findFirst({ where: { id: creatureId, gameSessionId: sessionId }, select: { creatureKey: true, ruleset: true } });
  if (!row || damage <= 0) return NO_HIT_POINT_CHANGE;
  const statblock = (await loadRoomCreatures([row]))(row.creatureKey, row.ruleset);
  return removeHitPoints(tx, sessionId, creatureId, damage, parseCreatureHitPoints(statblock?.hp ?? ""));
}

/// Позначка «скасовано» ставиться раніше за повернення хітів: два одночасні кліки не повернуть їх двічі.
export async function revertRollDamage(tx: Prisma.TransactionClient, sessionId: number, seq: number): Promise<GameSessionResult<null>> {
  const tempChange = Prisma.sql`COALESCE((roll->'targetDamage'->>'tempHpChange')::int, 0)`;
  const [claimed] = await tx.$queryRaw<{ creature_id: number; hp_change: number; temp_change: number }[]>`
    UPDATE game_roll_event SET hp_change_undone = true
    WHERE game_session_id = ${sessionId} AND seq = ${seq}::bigint AND roll_kind = 'damage' AND (COALESCE(hp_change, 0) > 0 OR ${tempChange} > 0)
      AND NOT hp_change_undone AND target_creature_id IS NOT NULL
    RETURNING target_creature_id AS creature_id, COALESCE(hp_change, 0) AS hp_change, ${tempChange} AS temp_change`;
  if (!claimed) return { ok: false, error: await findRevertFailure(tx, sessionId, seq) };
  return restoreHitPoints(tx, sessionId, claimed.creature_id, claimed.hp_change, claimed.temp_change);
}

/// Як revertRollDamage, але для одного рядка ряткидків зони: позначка в JSON події ставиться тим самим UPDATE, що й перевірка.
/// Стан, накладений провалом, знімається разом зі шкодою.
export async function revertSaveDamage(tx: Prisma.TransactionClient, sessionId: number, seq: number, rowIndex: number): Promise<GameSessionResult<null>> {
  const row = Prisma.sql`roll->'saves'->'rows'->${rowIndex}::int`;
  const [claimed] = await tx.$queryRaw<{ creature_id: number | null; pers_id: number | null; hp_change: number | null; temp_change: number; added_condition: string | null }[]>`
    UPDATE game_roll_event SET roll = jsonb_set(roll, ARRAY['saves', 'rows', ${String(rowIndex)}, 'isUndone'], 'true'::jsonb)
    WHERE game_session_id = ${sessionId} AND seq = ${seq}::bigint AND roll ? 'saves'
      AND (COALESCE((${row}->>'hpChange')::int, 0) > 0 OR COALESCE((${row}->>'tempHpChange')::int, 0) > 0 OR COALESCE((${row}->>'isConditionAdded')::boolean, false))
      AND NOT COALESCE((${row}->>'isUndone')::boolean, false)
    RETURNING (${row}->>'creatureId')::int AS creature_id, (${row}->>'persId')::int AS pers_id, (${row}->>'hpChange')::int AS hp_change,
      COALESCE((${row}->>'tempHpChange')::int, 0) AS temp_change,
      CASE WHEN COALESCE((${row}->>'isConditionAdded')::boolean, false) THEN ${row}->>'condition' END AS added_condition`;
  if (!claimed) return { ok: false, error: await findSaveRevertFailure(tx, sessionId, seq, rowIndex) };
  if (claimed.added_condition) await removeSaveCondition(tx, sessionId, claimed, claimed.added_condition);
  const isHitPointsTaken = (claimed.hp_change ?? 0) > 0 || claimed.temp_change > 0;
  return claimed.creature_id !== null && isHitPointsTaken ? restoreHitPoints(tx, sessionId, claimed.creature_id, claimed.hp_change ?? 0, claimed.temp_change) : { ok: true, value: null };
}

async function findSaveRevertFailure(tx: Prisma.TransactionClient, sessionId: number, seq: number, rowIndex: number): Promise<"not_found" | "already_undone"> {
  const event = await tx.gameRollEvent.findUnique({ where: { gameSessionId_seq: { gameSessionId: sessionId, seq } }, select: { roll: true } });
  const row = (event?.roll as { saves?: StoredSaves } | undefined)?.saves?.rows?.[rowIndex];
  return row?.isUndone ? "already_undone" : "not_found";
}

async function restoreHitPoints(tx: Prisma.TransactionClient, sessionId: number, creatureId: number, hpChange: number, tempHpChange: number): Promise<GameSessionResult<null>> {
  const restored = await tx.$executeRaw`
    UPDATE game_map_creature SET hp_current = LEAST(hp_max, COALESCE(hp_current, 0) + ${hpChange}::int), hp_temp = LEAST(${CREATURE_HIT_POINT_LIMIT}::int, hp_temp + ${tempHpChange}::int)
    WHERE game_map_creature_id = ${creatureId} AND game_session_id = ${sessionId}`;
  return restored ? { ok: true, value: null } : { ok: false, error: "creature_gone" };
}

async function findRevertFailure(tx: Prisma.TransactionClient, sessionId: number, seq: number): Promise<"not_found" | "already_undone" | "creature_gone"> {
  const event = await tx.gameRollEvent.findUnique({
    where: { gameSessionId_seq: { gameSessionId: sessionId, seq } },
    select: { rollKind: true, hpChange: true, hpChangeUndone: true, targetCreatureId: true, roll: true },
  });
  const tempHpChange = (event?.roll as { targetDamage?: { tempHpChange?: number } } | undefined)?.targetDamage?.tempHpChange;
  if (!event || event.rollKind !== "damage" || !(event.hpChange || tempHpChange)) return "not_found";
  if (event.hpChangeUndone) return "already_undone";
  return "creature_gone";
}
