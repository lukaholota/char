import { findCreatureRolls, type CreatureRollSpot } from "./creature-rolls";

const CHARGE_COST = /витра[тч][\p{L}ʼ']*\s+(\d+)\s+(?:\p{L}+\s+)?заряд/iu;
const HEALING_AFTER = /^\s*(?:\p{L}+\s+){0,2}хіт/iu;
const DAMAGE_AFTER = /^\s*(?:\p{L}+\s+){0,2}шкод/iu;
const AFTER_LOOKAHEAD = 30;

/// «(витрачає 1 заряд)», «можете витратити 2 заряди персня»; «до 3» чи «1 або більше» — гравець вирішує сам, тож без ціни.
export function findItemActionChargeCost(text: string): number | null {
  const match = text.match(CHARGE_COST);
  return match ? Number(match[1]) : null;
}

/// Кубики в описі предмета: «2к4 + 2 хітів» — лікування, «4к6 шкоди блискавкою» — шкода; решта (заряди, кількість воїнів, рядок таблиці) — просто текст.
export function findItemRolls(text: string): CreatureRollSpot[] {
  return findCreatureRolls(text).flatMap((spot): CreatureRollSpot[] => {
    if (spot.roll.kind !== "damage") return [spot];
    const after = text.slice(spot.end, spot.end + AFTER_LOOKAHEAD);
    if (HEALING_AFTER.test(after)) return [{ ...spot, roll: { ...spot.roll, kind: "heal" } }];
    return DAMAGE_AFTER.test(after) ? [spot] : [];
  });
}
