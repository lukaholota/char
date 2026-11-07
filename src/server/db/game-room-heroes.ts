import type { PersWithRelations } from "@/lib/actions/pers";
import { applyActiveStates, findRollState } from "@/lib/logic/active-states";
import { calculateDamageResistances, calculateFinalAC, calculateFinalSave, readStateEffects } from "@/lib/logic/bonus-calculator";
import { prisma } from "@/lib/prisma";
import type { D20Mode } from "@/rules/dice-roll";
import { listBonusDice, type BonusDie } from "@/rules/state-effects";
import { BLESSED_DIE, BLESSED_MARK } from "@/rules/token-conditions";
import { ABILITY_KEYS } from "@/rules/feat-grants";
import type { AbilityKey } from "@/rules/types";
import { PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";

/// Знімок героя на мить кидка: КЗ, ряткидки й опори рахуються з листа разом з активними станами.
export type RoomHero = {
  persId: number;
  userId: number;
  name: string;
  armorClass: number;
  conditions: string[];
  resistances: string[];
  saves: Record<AbilityKey, { bonus: number; mode: D20Mode }>;
  saveDice: Pick<BonusDie, "sides" | "sign">[];
};

/// Лист героя важкий, тож читаємо його до транзакції кидка: рядок сесії не стоїть замкненим, поки рахуються бонуси.
/// shortcut: форма звіра (Дика подоба) тут не враховується — КЗ і ряткидки беруться з листа героя; додати, коли сервер навчиться збирати форму.
export async function findRoomHeroes(sessionId: number, persIds: readonly number[]): Promise<Map<number, RoomHero>> {
  if (persIds.length === 0) return new Map();
  const members = await prisma.gameSessionMember.findMany({
    where: { gameSessionId: sessionId, persId: { in: [...persIds] } },
    select: { persId: true, conditions: true, pers: { include: PERS_SHEET_INCLUDE } },
  });
  return new Map(members.flatMap((member) => (member.pers && member.persId !== null ? [[member.persId, buildRoomHero(member.pers, member.conditions)] as const] : [])));
}

function buildRoomHero(rawPers: PersWithRelations, conditions: string[]): RoomHero {
  const pers = applyActiveStates(rawPers);
  const saves = Object.fromEntries(ABILITY_KEYS.map((ability) => [ability, { bonus: calculateFinalSave(pers, ability), mode: findRollState(pers, { kind: "save", ability }).mode }])) as RoomHero["saves"];
  const sheetDice = listBonusDice(readStateEffects(pers), "SAVE");
  const isBlessedOnlyInRoom = conditions.includes(BLESSED_MARK) && !sheetDice.some((die) => die.sourceKey === "BLESS");
  const saveDice = [...sheetDice.map(({ sides, sign }) => ({ sides, sign })), ...(isBlessedOnlyInRoom ? [BLESSED_DIE] : [])];
  return { persId: pers.persId, userId: pers.userId, name: pers.name, armorClass: calculateFinalAC(pers), conditions, resistances: calculateDamageResistances(pers), saves, saveDice };
}
